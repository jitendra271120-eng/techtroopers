import {

  useCallback,

  useEffect,

  useMemo,

  useRef,

  useState,

} from "react";



import {

  addDoc,

  collection,

  serverTimestamp,

} from "firebase/firestore";



import {

  useNavigate,

  useParams,

} from "react-router-dom";



import toast from "react-hot-toast";



import {

  exams as seedExams,

  questions as seedQuestions,

} from "../data/demoData";



import {

  useAuth,

} from "../contexts/AuthContext";



import useLiveCollection from "../hooks/useLiveCollection";



import {

  normalizeExam,

} from "./Exams";



import {

  db,

} from "../config/firebase";



import {

  listCollection,

} from "../services/firestoreService";



import {

  normalizeQuestionDoc,

  questionMatchesExam,

} from "../utils/firestoreAdapters";



/* ============================================================

   SHUFFLE QUESTIONS

============================================================ */



const shuffle = (items) => {

  const output = [

    ...items,

  ];



  for (

    let index =

      output.length - 1;

    index > 0;

    index--

  ) {

    const randomIndex =

      Math.floor(

        Math.random() *

          (index + 1)

      );



    [

      output[index],

      output[randomIndex],

    ] = [

      output[randomIndex],

      output[index],

    ];

  }



  return output;

};

const MAX_SECURITY_WARNINGS = 2;

/*
 * IMPORTANT:
 * Mobile Safari/Chrome may briefly lose focus while React changes
 * route, the address bar collapses, the page becomes interactive,
 * or fullscreen UI is prepared. Do not count those normal startup
 * transitions as exam violations.
 */
const SECURITY_STARTUP_GRACE_MS = 5000;
const SECURITY_EVENT_DEBOUNCE_MS = 1800;
const SECURITY_HEARTBEAT_MS = 300;

/*
 * A focus failure must remain present for several heartbeat cycles
 * before it becomes a warning.
 * 4 x 300ms = about 1.2 seconds of continuous focus loss.
 */
const FOCUS_FAILURE_THRESHOLD = 4;

const VIEWPORT_SHRINK_RATIO = 0.62;
const VIEWPORT_SCALE_LIMIT = 1.15;

const isLikelyMobileDevice = () => {
  if (typeof navigator === "undefined") return false;

  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth <= 1180)
  );
};



/* ============================================================

   EXAM ATTEMPT

============================================================ */



export default function ExamAttempt() {

  const {

    examId,

  } = useParams();



  const navigate =

    useNavigate();



  const {

    user,

  } = useAuth();



  /* =========================================================

     EXAMS

  ========================================================= */



  const {

    data: rawExams,

    loading: examLoading,

  } = useLiveCollection(

    "categories",

    seedExams

  );



  const exams =

    useMemo(() => {

      return rawExams.map(

        normalizeExam

      );

    }, [rawExams]);



  const exam =

    exams.find(

      (item) =>

        item.id === examId

    );



  /* =========================================================

     STATES

  ========================================================= */



  const [

    questionSet,

    setQuestionSet,

  ] = useState([]);



  const [

    questionsLoading,

    setQuestionsLoading,

  ] = useState(true);



  const [

    questionError,

    setQuestionError,

  ] = useState("");



  const [

    current,

    setCurrent,

  ] = useState(0);



  /*

   * Local exam answer format:

   *

   * [

   *   0,

   *   2,

   *   null,

   *   1

   * ]

   *

   * 0 = A

   * 1 = B

   * 2 = C

   * 3 = D

   */



  const [

    answers,

    setAnswers,

  ] = useState([]);



  const [

    timeLeft,

    setTimeLeft,

  ] = useState(null);



  const [

    showSubmit,

    setShowSubmit,

  ] = useState(false);



  const [

    result,

    setResult,

  ] = useState(null);



  const [

    warnings,

    setWarnings,

  ] = useState(0);



  const [

    fullscreen,

    setFullscreen,

  ] = useState(

    Boolean(

      document.fullscreenElement

    )

  );



  const [

    submitting,

    setSubmitting,

  ] = useState(false);

  const [

    securityMasked,

    setSecurityMasked,

  ] = useState(false);

  const [

    securityMessage,

    setSecurityMessage,

  ] = useState("");

  const [

    mobileDevice,

    setMobileDevice,

  ] = useState(() => isLikelyMobileDevice());



  /* =========================================================

     REFS

  ========================================================= */



  const submitted =

    useRef(false);



  const initialized =

    useRef("");

  const warningsRef =

    useRef(0);

  const lastSecurityViolationRef =

    useRef(0);

  const fullscreenWasActiveRef =

    useRef(Boolean(document.fullscreenElement));

  const focusRestoreTimerRef =

    useRef(null);

  const inactiveEpisodeRef =

    useRef(false);

  const viewportBaselineRef =

    useRef({
      width: typeof window !== "undefined" ? window.innerWidth : 0,
      height: typeof window !== "undefined" ? window.innerHeight : 0,
    });

  const lastViewportViolationRef =

    useRef(0);

  /*
   * Security is intentionally NOT armed immediately.
   * This prevents the Start Exam navigation itself from creating
   * false warnings on Safari/Chrome mobile.
   */
  const securityArmedRef =

    useRef(false);

  const securityArmTimerRef =

    useRef(null);

  const consecutiveFocusFailuresRef =

    useRef(0);

  const autoSubmitScheduledRef =

    useRef(false);



  /* =========================================================

     EXAM SESSION

  ========================================================= */



  const session =

    useMemo(() => {

      try {

        return JSON.parse(

          sessionStorage.getItem(

            `tt_exam_session_${examId}`

          ) || "null"

        );

      } catch {

        return null;

      }

    }, [examId]);

  useEffect(() => {
    warningsRef.current = warnings;
  }, [warnings]);

  /* =========================================================
     ARM SECURITY AFTER STARTUP GRACE PERIOD

     The exam must be loaded and visible first. This avoids false
     warnings caused by the Start Exam button, route transition,
     mobile browser toolbar animation and initial focus settling.
  ========================================================= */

  useEffect(() => {
    if (
      result ||
      !exam ||
      !questionSet.length ||
      questionsLoading
    ) {
      return undefined;
    }

    securityArmedRef.current = false;
    consecutiveFocusFailuresRef.current = 0;
    inactiveEpisodeRef.current = false;
    autoSubmitScheduledRef.current = false;

    setSecurityMasked(false);
    setSecurityMessage("");

    if (securityArmTimerRef.current) {
      window.clearTimeout(securityArmTimerRef.current);
    }

    securityArmTimerRef.current = window.setTimeout(() => {
      if (submitted.current || result) {
        return;
      }

      /*
       * Record the real state at the moment security becomes active.
       * This prevents the initial fullscreen state from being treated
       * as "fullscreen exited".
       */
      fullscreenWasActiveRef.current =
        Boolean(document.fullscreenElement);

      const viewport = window.visualViewport;

      viewportBaselineRef.current = {
        width: viewport?.width || window.innerWidth,
        height: viewport?.height || window.innerHeight,
      };

      consecutiveFocusFailuresRef.current = 0;
      inactiveEpisodeRef.current = false;
      securityArmedRef.current = true;
    }, SECURITY_STARTUP_GRACE_MS);

    return () => {
      if (securityArmTimerRef.current) {
        window.clearTimeout(securityArmTimerRef.current);
        securityArmTimerRef.current = null;
      }
    };
  }, [
    exam,
    questionSet.length,
    questionsLoading,
    result,
  ]);

  useEffect(() => {
    const updateDeviceType = () => {
      setMobileDevice(isLikelyMobileDevice());
    };

    updateDeviceType();
    window.addEventListener("resize", updateDeviceType);

    return () => {
      window.removeEventListener("resize", updateDeviceType);
    };
  }, []);

  /*
   * Best-effort browser hardening.
   *
   * This disables selection, long-press callouts, drag/drop,
   * pinch/double-tap zoom gestures and browser text selection
   * inside the exam page.
   *
   * IMPORTANT: a website still cannot directly disable the
   * iPhone/Android hardware screenshot buttons or OS-level
   * Siri/Gemini/Google Assistant. Those require native-app
   * controls.
   */
  useEffect(() => {
    if (result) return undefined;

    const body = document.body;
    const root = document.documentElement;

    const previous = {
      bodyUserSelect: body.style.userSelect,
      bodyWebkitUserSelect: body.style.webkitUserSelect,
      bodyTouchCallout: body.style.webkitTouchCallout,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyTouchAction: body.style.touchAction,
      rootOverscroll: root.style.overscrollBehavior,
    };

    body.style.userSelect = "none";
    body.style.webkitUserSelect = "none";
    body.style.webkitTouchCallout = "none";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "pan-y";
    root.style.overscrollBehavior = "none";

    const clearSelection = () => {
      try {
        window.getSelection?.()?.removeAllRanges?.();
      } catch {
        // Selection APIs may be unavailable in some browsers.
      }
    };

    const preventGesture = (event) => {
      event.preventDefault();
      clearSelection();
    };

    document.addEventListener("selectionchange", clearSelection);
    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });

    return () => {
      body.style.userSelect = previous.bodyUserSelect;
      body.style.webkitUserSelect = previous.bodyWebkitUserSelect;
      body.style.webkitTouchCallout = previous.bodyTouchCallout;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      body.style.touchAction = previous.bodyTouchAction;
      root.style.overscrollBehavior = previous.rootOverscroll;

      document.removeEventListener("selectionchange", clearSelection);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
    };
  }, [result]);


  /* =========================================================

     LOAD QUESTIONS

  ========================================================= */



  useEffect(() => {

    if (

      !exam ||

      initialized.current ===

        exam.id

    ) {

      return;

    }



    let cancelled =

      false;



    const loadQuestions =

      async () => {

        setQuestionsLoading(

          true

        );



        setQuestionError(

          ""

        );



        try {

          /* ===============================================

             FIRESTORE QUESTIONS

          =============================================== */



          const live =

            await listCollection(

              "questions"

            );



          if (cancelled) {

            return;

          }



          let pool =

            live

              .map(

                normalizeQuestionDoc

              )

              .filter(

                (question) =>

                  questionMatchesExam(

                    question,

                    exam

                  )

              );



          /* ===============================================

             FALLBACK QUESTIONS

          =============================================== */



          if (

            !pool.length

          ) {

            pool =

              seedQuestions

                .map(

                  normalizeQuestionDoc

                )

                .filter(

                  (question) =>

                    questionMatchesExam(

                      question,

                      exam

                    )

                );

          }



          /* ===============================================

             NUMBER OF QUESTIONS

          =============================================== */



          const requested =

            Number(

              exam.numQuestions ||

                exam.questions ||

                pool.length

            );



          const count =

            requested > 0

              ? requested

              : pool.length;



          /* ===============================================

             RANDOM QUESTIONS

          =============================================== */



          const selected =

            shuffle(

              pool

            ).slice(

              0,

              Math.min(

                count,

                pool.length

              )

            );



          setQuestionSet(

            selected

          );



          setAnswers(

            Array(

              selected.length

            ).fill(null)

          );



          /* ===============================================

             TIMER

          =============================================== */



          setTimeLeft(

            (

              Number(

                exam.timer ||

                  exam.duration

              ) || 45

            ) * 60

          );



          setCurrent(0);



          initialized.current =

            exam.id;

        } catch (

          error

        ) {

          console.error(

            "Question loading failed:",

            error

          );



          setQuestionError(

            error?.message ||

              "Could not load questions from Firestore."

          );



          setQuestionSet(

            []

          );

        } finally {

          if (!cancelled) {

            setQuestionsLoading(

              false

            );

          }

        }

      };



    loadQuestions();



    return () => {

      cancelled =

        true;

    };

  }, [exam]);



  /* =========================================================

     BUILD SAVED ATTEMPT ANSWERS



     THIS IS THE IMPORTANT PART.



     Instead of saving:

     [1, 3, null, 0]



     We save:



     [

       {

         questionId: "...",

         selectedAnswer: 1

       }

     ]



     This allows Dashboard to know exactly which question

     the student answered.

  ========================================================= */



  const buildSavedAnswers =

    useCallback(() => {

      return questionSet.map(

        (

          question,

          index

        ) => ({

          questionId:

            question.id,



          selectedAnswer:

            answers[index] ===

              null ||

            answers[index] ===

              undefined

              ? null

              : Number(

                  answers[

                    index

                  ]

                ),

        })

      );

    }, [

      questionSet,

      answers,

    ]);



  /* =========================================================

     SUBMIT EXAM

  ========================================================= */



  const submitExam =

    useCallback(

      async (

        auto = false,

        reason = ""

      ) => {

        /* ===============================================

           PREVENT DUPLICATE SUBMISSION

        =============================================== */



        if (

          submitted.current ||

          !exam ||

          !questionSet.length

        ) {

          return;

        }



        submitted.current =

          true;

        autoSubmitScheduledRef.current = false;



        setSubmitting(

          true

        );



        /* ===============================================

           CALCULATE CORRECT ANSWERS

        =============================================== */



        let correct = 0;



        answers.forEach(

          (

            selectedAnswer,

            index

          ) => {

            if (

              selectedAnswer !==

                null &&

              Number(

                selectedAnswer

              ) ===

                Number(

                  questionSet[

                    index

                  ]?.answer

                )

            ) {

              correct++;

            }

          }

        );



        /* ===============================================

           ATTEMPTED

        =============================================== */



        const attempted =

          answers.filter(

            (answer) =>

              answer !==

              null

          ).length;



        /* ===============================================

           MARKS

        =============================================== */



        const marksPerQuestion =

          Number(

            exam.marksPerQuestion ||

              1

          );



        const calculatedScore =

          correct *

          marksPerQuestion;



        /* ===============================================

           TOTAL MARKS

        =============================================== */



        const configuredTotal =

          Number(

            exam.totalMarks ||

              exam.marks ||

              0

          );



        const total =

          configuredTotal > 0

            ? configuredTotal

            : questionSet.length *

              marksPerQuestion;



        /* ===============================================

           PERCENTAGE

        =============================================== */



        const percentage =

          total

            ? Math.round(

                (

                  calculatedScore /

                  total

                ) * 100

              )

            : 0;



        /* ===============================================

           CATEGORY

        =============================================== */



        const categoryKey =

          exam.category ||

          exam.name ||

          exam.title ||

          exam.id;



        /* ===============================================

           ROLL NUMBER

        =============================================== */



        const rollNumber =

          session?.rollNumber ||

          user?.rollNumber ||

          "";



        /* ===============================================

           SCORE PAYLOAD

        =============================================== */



        const payload = {

          userId:

            user?.uid ||

            "",



          name:

            user?.name ||

            user?.displayName ||

            "",



          email:

            user?.email ||

            "",



          rollNumber,



          score:

            calculatedScore,



          total,



          correct,



          attempted,



          percentage,



          category:

            categoryKey,



          categoryName:

            exam.title,



          examId:

            exam.id,



          secretCode:

            session?.secretCode ||

            "",



          warnings,



          autoSubmitted:

            auto,



          submitReason:

            reason || "",



          timestamp:

            serverTimestamp(),

        };



        try {

          /* =============================================

             SAVE SCORE

          ============================================= */



          const scoreRef =

            await addDoc(

              collection(

                db,

                "scores"

              ),

              payload

            );



          /* =============================================

             SAVE EXACT USER RESPONSES

          ============================================= */



          const savedAnswers =

            buildSavedAnswers();



          await addDoc(

            collection(

              db,

              "userAnswers"

            ),

            {

              /*

               * User information

               */



              userId:

                user?.uid ||

                "",



              name:

                user?.name ||

                user?.displayName ||

                "",



              email:

                user?.email ||

                "",



              rollNumber,



              /*

               * Exam information

               */



              category:

                categoryKey,



              examId:

                exam.id,



              secretCode:

                payload.secretCode,



              /*

               * IMPORTANT:

               *

               * [

               *   {

               *     questionId: "...",

               *     selectedAnswer: 2

               *   }

               * ]

               */



              answers:

                savedAnswers,



              /*

               * Link this response directly to the score.

               */



              scoreRefId:

                scoreRef.id,



              timestamp:

                serverTimestamp(),

            }

          );



          /* =============================================

             LOCAL RESULT

          ============================================= */



          const savedResult =

            {

              ...payload,



              id:

                scoreRef.id,



              /*

               * serverTimestamp() is a Firestore sentinel.

               * We do not need it on the local result screen.

               */



              percentage,

            };



          setResult(

            savedResult

          );



          setShowSubmit(

            false

          );



          /* =============================================

             REMOVE SESSION

          ============================================= */



          sessionStorage.removeItem(

            `tt_exam_session_${exam.id}`

          );



          /* =============================================

             AUTO SUBMIT MESSAGE

          ============================================= */



          if (auto) {

            toast.error(

              reason ||

                "Exam submitted automatically."

            );

          } else {

            toast.success(

              "Exam submitted successfully."

            );

          }



          /* =============================================

             EXIT FULLSCREEN

          ============================================= */



          try {

            if (

              document.fullscreenElement

            ) {

              await document.exitFullscreen();

            }

          } catch (

            fullscreenError

          ) {

            console.warn(

              "Could not exit fullscreen:",

              fullscreenError

            );

          }

        } catch (

          error

        ) {

          console.error(

            "Exam submission error:",

            error

          );



          /*

           * Permit the student to retry saving if Firebase

           * temporarily fails.

           */



          submitted.current =

            false;



          setSubmitting(

            false

          );



          toast.error(

            error?.message ||

              "Could not save exam result."

          );

        }

      },

      [

        answers,

        exam,

        questionSet,

        session,

        user,

        buildSavedAnswers,

      ]

    );



  /* =========================================================
     SECURITY VIOLATION HANDLER
  ========================================================= */

  const registerSecurityViolation =
    useCallback(
      (reason) => {
        /*
         * Never punish the normal Start Exam transition.
         */
        if (
          !securityArmedRef.current ||
          submitted.current ||
          result
        ) {
          return;
        }

        const now = Date.now();

        if (
          now - lastSecurityViolationRef.current <
          SECURITY_EVENT_DEBOUNCE_MS
        ) {
          return;
        }

        lastSecurityViolationRef.current = now;

        const previous = warningsRef.current;

        /*
         * Do not keep registering the same final warning while an
         * automatic submission is already scheduled.
         */
        if (
          previous >= MAX_SECURITY_WARNINGS ||
          autoSubmitScheduledRef.current
        ) {
          return;
        }

        const next = Math.min(
          previous + 1,
          MAX_SECURITY_WARNINGS
        );

        warningsRef.current = next;
        setWarnings(next);
        setSecurityMessage(reason);

        toast.error(
          `Exam warning ${next}/${MAX_SECURITY_WARNINGS}: ${reason}`
        );

        if (next >= MAX_SECURITY_WARNINGS) {
          autoSubmitScheduledRef.current = true;

          window.setTimeout(() => {
            if (!submitted.current) {
              submitExam(
                true,
                reason || "Violation limit reached"
              );
            }
          }, 250);
        }
      },
      [result, submitExam]
    );



  /* =========================================================

     TIMER

  ========================================================= */



  useEffect(() => {

    if (

      result ||

      timeLeft === null ||

      timeLeft <= 0

    ) {

      return;

    }



    const timer =

      setInterval(() => {

        setTimeLeft(

          (previous) => {

            if (

              previous <= 1

            ) {

              clearInterval(

                timer

              );



              setTimeout(

                () =>

                  submitExam(

                    true,

                    "Time is over"

                  ),

                0

              );



              return 0;

            }



            return (

              previous - 1

            );

          }

        );

      }, 1000);



    return () => {

      clearInterval(

        timer

      );

    };

  }, [

    result,

    timeLeft,

    submitExam,

  ]);



  /* =========================================================

     KEYBOARD / COPY / PASTE / PRINT SECURITY

  ========================================================= */

  useEffect(() => {
    if (result) return undefined;

    const blockInteraction = (event) => {
      event.preventDefault();
    };

    const handleKeyDown = (event) => {
      if (result) return;

      const key = String(event.key || "").toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;

      const blockedBasicShortcut =
        ctrlOrMeta &&
        ["c", "v", "x", "u", "s", "p", "a"].includes(key);

      const blockedDevShortcut =
        (ctrlOrMeta && event.shiftKey && ["i", "j", "c"].includes(key)) ||
        event.key === "F12";

      if (blockedBasicShortcut || blockedDevShortcut) {
        event.preventDefault();
        event.stopPropagation();
        toast("This shortcut is disabled during the examination.");
        return;
      }

      if (event.key === "ArrowRight") {
        setCurrent((previous) =>
          Math.min(questionSet.length - 1, previous + 1)
        );
      }

      if (event.key === "ArrowLeft") {
        setCurrent((previous) =>
          Math.max(0, previous - 1)
        );
      }
    };

    const handleScreenshotKey = (event) => {
      if (event.key !== "PrintScreen") return;

      setSecurityMasked(true);
      setSecurityMessage("Screenshot attempt detected.");

      try {
        navigator.clipboard?.writeText("");
      } catch {
        // Clipboard access can be unavailable in some browsers.
      }

      registerSecurityViolation(
        "Screenshot/Print Screen attempt detected"
      );

      window.setTimeout(() => {
        if (!document.hidden && document.hasFocus()) {
          setSecurityMasked(false);
        }
      }, 1000);
    };

    const handleBeforePrint = (event) => {
      event?.preventDefault?.();
      setSecurityMasked(true);
      setSecurityMessage("Printing is disabled during the exam.");
      registerSecurityViolation("Print attempt detected");
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleScreenshotKey, true);
    document.addEventListener("copy", blockInteraction, true);
    document.addEventListener("cut", blockInteraction, true);
    document.addEventListener("paste", blockInteraction, true);
    document.addEventListener("contextmenu", blockInteraction, true);
    document.addEventListener("selectstart", blockInteraction, true);
    document.addEventListener("dragstart", blockInteraction, true);
    window.addEventListener("beforeprint", handleBeforePrint);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleScreenshotKey, true);
      document.removeEventListener("copy", blockInteraction, true);
      document.removeEventListener("cut", blockInteraction, true);
      document.removeEventListener("paste", blockInteraction, true);
      document.removeEventListener("contextmenu", blockInteraction, true);
      document.removeEventListener("selectstart", blockInteraction, true);
      document.removeEventListener("dragstart", blockInteraction, true);
      window.removeEventListener("beforeprint", handleBeforePrint);
    };
  }, [
    questionSet.length,
    registerSecurityViolation,
    result,
  ]);



  /* =========================================================

     MOBILE / TAB / APP SWITCH / VOICE ASSISTANT MONITORING

     FIXED VERSION:
     - no warning during initial Start Exam navigation
     - requires persistent focus loss
     - ignores expected mobile Safari viewport animation
     - prevents one event from causing two warnings
     - auto-submit can be scheduled only once

  ========================================================= */

  useEffect(() => {
    if (result) return undefined;

    const revealIfSafe = () => {
      if (focusRestoreTimerRef.current) {
        window.clearTimeout(
          focusRestoreTimerRef.current
        );
      }

      focusRestoreTimerRef.current =
        window.setTimeout(() => {
          if (
            !document.hidden &&
            document.hasFocus() &&
            !submitted.current
          ) {
            consecutiveFocusFailuresRef.current = 0;
            inactiveEpisodeRef.current = false;

            if (securityArmedRef.current) {
              setSecurityMasked(false);
              setSecurityMessage("");
            }
          }
        }, 300);
    };

    const hideExam = (message) => {
      if (!securityArmedRef.current) {
        return;
      }

      setSecurityMessage(message);
      setSecurityMasked(true);
    };

    const registerInactiveEpisode = (
      reason,
      message = reason
    ) => {
      if (
        submitted.current ||
        !securityArmedRef.current
      ) {
        return;
      }

      hideExam(message);

      /*
       * One continuous focus-loss episode = one warning.
       */
      if (inactiveEpisodeRef.current) {
        return;
      }

      inactiveEpisodeRef.current = true;
      registerSecurityViolation(reason);
    };

    const handleVisibility = () => {
      if (
        submitted.current ||
        !securityArmedRef.current
      ) {
        return;
      }

      if (document.hidden) {
        registerInactiveEpisode(
          "Tab/app switching detected",
          "Exam content hidden because the page is no longer visible."
        );
      } else {
        revealIfSafe();
      }
    };

    const handleBlur = () => {
      if (
        submitted.current ||
        !securityArmedRef.current
      ) {
        return;
      }

      /*
       * Do not warn immediately on blur.
       * Mobile Safari can emit a tiny temporary blur while its own
       * browser chrome changes. The heartbeat below confirms whether
       * focus is genuinely lost.
       */
      hideExam(
        "Exam content temporarily hidden while focus is being checked."
      );
    };

    const handleFocus = () => {
      consecutiveFocusFailuresRef.current = 0;
      revealIfSafe();
    };

    const handlePageHide = () => {
      if (
        submitted.current ||
        !securityArmedRef.current
      ) {
        return;
      }

      registerInactiveEpisode(
        "Exam page/app was left",
        "Exam page is being left."
      );
    };

    const handlePageShow = () => {
      consecutiveFocusFailuresRef.current = 0;
      revealIfSafe();
    };

    const handleFullscreen = () => {
      const active =
        Boolean(document.fullscreenElement);

      setFullscreen(active);

      /*
       * Always synchronize the state, but only count an exit after
       * security has been armed.
       */
      if (!securityArmedRef.current) {
        fullscreenWasActiveRef.current =
          active;
        return;
      }

      if (
        fullscreenWasActiveRef.current &&
        !active &&
        !submitted.current
      ) {
        registerInactiveEpisode(
          "Fullscreen exited",
          "Fullscreen was exited."
        );
      }

      fullscreenWasActiveRef.current =
        active;
    };

    const viewportLooksSuspicious = () => {
      const viewport =
        window.visualViewport;

      if (!viewport) {
        return false;
      }

      const baseline =
        viewportBaselineRef.current;

      if (
        !baseline.width ||
        !baseline.height
      ) {
        viewportBaselineRef.current = {
          width:
            viewport.width ||
            window.innerWidth,
          height:
            viewport.height ||
            window.innerHeight,
        };

        return false;
      }

      const heightRatio =
        viewport.height /
        baseline.height;

      const widthRatio =
        viewport.width /
        baseline.width;

      const zoomed =
        viewport.scale >
        VIEWPORT_SCALE_LIMIT;

      const severelyShrunk =
        heightRatio <
          VIEWPORT_SHRINK_RATIO ||
        widthRatio <
          VIEWPORT_SHRINK_RATIO;

      return zoomed || severelyShrunk;
    };

    const handleViewportChange = () => {
      if (
        submitted.current ||
        document.hidden ||
        !securityArmedRef.current
      ) {
        return;
      }

      /*
       * Safari's address bar appearing/disappearing causes ordinary
       * viewport changes. Only severe/zoomed changes count.
       */
      if (!viewportLooksSuspicious()) {
        return;
      }

      const now = Date.now();

      if (
        now -
          lastViewportViolationRef.current <
        SECURITY_EVENT_DEBOUNCE_MS
      ) {
        return;
      }

      lastViewportViolationRef.current =
        now;

      hideExam(
        "The visible exam area changed unexpectedly. Return to the normal exam view."
      );

      registerSecurityViolation(
        "Suspicious screen overlay/zoom detected"
      );
    };

    const handleOrientationChange = () => {
      if (
        submitted.current ||
        !securityArmedRef.current
      ) {
        return;
      }

      /*
       * Rotation itself should not instantly submit an exam.
       * Rebuild the viewport baseline instead of counting rotation
       * as a security warning.
       */
      securityArmedRef.current = false;
      consecutiveFocusFailuresRef.current = 0;

      window.setTimeout(() => {
        const viewport =
          window.visualViewport;

        viewportBaselineRef.current = {
          width:
            viewport?.width ||
            window.innerWidth,
          height:
            viewport?.height ||
            window.innerHeight,
        };

        fullscreenWasActiveRef.current =
          Boolean(
            document.fullscreenElement
          );

        securityArmedRef.current = true;
        revealIfSafe();
      }, 900);
    };

    /*
     * Continuous heartbeat.
     *
     * IMPORTANT FIX:
     * One failed document.hasFocus() check is NOT enough.
     * The page must remain unfocused for several consecutive checks.
     */
    const heartbeat =
      window.setInterval(() => {
        if (
          submitted.current ||
          result ||
          !securityArmedRef.current
        ) {
          consecutiveFocusFailuresRef.current = 0;
          return;
        }

        const focusMissing =
          document.hidden ||
          !document.hasFocus();

        if (focusMissing) {
          consecutiveFocusFailuresRef.current += 1;

          if (
            consecutiveFocusFailuresRef.current >=
            FOCUS_FAILURE_THRESHOLD
          ) {
            registerInactiveEpisode(
              "Exam window lost focus",
              "Another app, tab or system overlay took focus from the exam."
            );
          }

          return;
        }

        consecutiveFocusFailuresRef.current = 0;

        if (
          inactiveEpisodeRef.current
        ) {
          inactiveEpisodeRef.current = false;
        }

        if (securityMasked) {
          revealIfSafe();
        }
      }, SECURITY_HEARTBEAT_MS);

    const visualViewport =
      window.visualViewport;

    /*
     * Do not establish a violation baseline until the arming effect
     * has completed. We only initialize a harmless fallback here.
     */
    if (
      !viewportBaselineRef.current.width ||
      !viewportBaselineRef.current.height
    ) {
      viewportBaselineRef.current = {
        width:
          visualViewport?.width ||
          window.innerWidth,
        height:
          visualViewport?.height ||
          window.innerHeight,
      };
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    document.addEventListener(
      "fullscreenchange",
      handleFullscreen
    );

    window.addEventListener(
      "blur",
      handleBlur
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    window.addEventListener(
      "pagehide",
      handlePageHide
    );

    window.addEventListener(
      "pageshow",
      handlePageShow
    );

    window.addEventListener(
      "orientationchange",
      handleOrientationChange
    );

    visualViewport?.addEventListener(
      "resize",
      handleViewportChange
    );

    /*
     * Do not monitor VisualViewport "scroll".
     * Safari moves the viewport while its own address/navigation bars
     * animate, which created false positives in the previous version.
     */

    return () => {
      window.clearInterval(heartbeat);

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      document.removeEventListener(
        "fullscreenchange",
        handleFullscreen
      );

      window.removeEventListener(
        "blur",
        handleBlur
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );

      window.removeEventListener(
        "pagehide",
        handlePageHide
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow
      );

      window.removeEventListener(
        "orientationchange",
        handleOrientationChange
      );

      visualViewport?.removeEventListener(
        "resize",
        handleViewportChange
      );

      if (
        focusRestoreTimerRef.current
      ) {
        window.clearTimeout(
          focusRestoreTimerRef.current
        );
      }
    };
  }, [
    registerSecurityViolation,
    result,
    securityMasked,
  ]);


  /* =========================================================

     FORMAT TIMER

  ========================================================= */



  const formatTime = (

    seconds

  ) => {

    const value =

      seconds || 0;



    const minutes =

      Math.floor(

        value / 60

      );



    const remainingSeconds =

      value % 60;



    return `${String(

      minutes

    ).padStart(

      2,

      "0"

    )}:${String(

      remainingSeconds

    ).padStart(

      2,

      "0"

    )}`;

  };



  /* =========================================================

     LOADING EXAM

  ========================================================= */



  if (

    (

      examLoading ||

      !exam

    ) &&

    !result

  ) {

    return (

      <div className="attempt-page result-screen">



        <div className="result-card">



          <div className="spinner-border text-primary" />



          <h3 className="mt-3">

            Loading examination…

          </h3>



        </div>



      </div>

    );

  }



  /* =========================================================

     NO SESSION

  ========================================================= */



  if (

    !session &&

    !result

  ) {

    return (

      <div className="attempt-page result-screen">



        <div className="result-card">



          <h2>

            Exam session not found

          </h2>



          <p>

            Please open the exam welcome page and enter the

            start code first.

          </p>



          <button

            type="button"

            className="btn btn-primary"

            onClick={() =>

              navigate(

                `/exam/welcome/${examId}`

              )

            }

          >

            Go to Welcome Page

          </button>



        </div>



      </div>

    );

  }



  /* =========================================================

     LOADING QUESTIONS

  ========================================================= */



  if (

    questionsLoading

  ) {

    return (

      <div className="attempt-page result-screen">



        <div className="result-card">



          <div className="spinner-border text-primary" />



          <h3 className="mt-3">

            Loading questions from Firebase…

          </h3>



          <p>

            Matching category:{" "}

            <b>

              {exam.category}

            </b>

          </p>



        </div>



      </div>

    );

  }



  /* =========================================================

     NO QUESTIONS

  ========================================================= */



  if (

    !questionSet.length

  ) {

    return (

      <div className="attempt-page result-screen">



        <div className="result-card">



          <h2>

            No matching questions found

          </h2>



          <p>

            Exam category is{" "}

            <b>

              {exam.category}

            </b>

            . Questions in Firestore must have the same

            value in{" "}

            <code>

              questions.category

            </code>

            .

          </p>



          {questionError && (



            <div className="alert alert-danger">

              {questionError}

            </div>



          )}



          <button

            type="button"

            className="btn btn-primary"

            onClick={() =>

              navigate(

                "/exams"

              )

            }

          >

            Back to Exams

          </button>



        </div>



      </div>

    );

  }



  /* =========================================================

     RESULT SCREEN



     IMPORTANT:

     Correct answers are NOT displayed here.



     They must be controlled by showAnswerKey from Dashboard.

  ========================================================= */



  if (

    result

  ) {

    return (

      <div className="attempt-page result-screen">



        <div className="result-card">



          <div className="result-check">

            ✓

          </div>



          <span className="eyebrow">

            EXAM SUBMITTED

          </span>



          <h1>

            {exam.title}

          </h1>



          <div className="score-ring">



            <strong>

              {result.percentage}%

            </strong>



            <span>

              Score

            </span>



          </div>



          <div className="result-grid">



            <div>



              <b>

                {result.score}

                /

                {result.total}

              </b>



              <span>

                Marks

              </span>



            </div>



            <div>



              <b>

                {result.correct}

              </b>



              <span>

                Correct

              </span>



            </div>



            <div>



              <b>

                {result.attempted}

              </b>



              <span>

                Attempted

              </span>



            </div>



          </div>



          <div className="d-flex gap-2 mt-4">



            <button

              type="button"

              className="btn btn-primary flex-fill"

              onClick={() =>

                navigate(

                  "/dashboard"

                )

              }

            >

              View Dashboard

            </button>



            <button

              type="button"

              className="btn btn-light border flex-fill"

              onClick={() =>

                navigate(

                  "/exams"

                )

              }

            >

              Exam Library

            </button>



          </div>



          <small className="d-block text-muted mt-3">



            Correct answers will be available from your

            Dashboard only when the faculty releases the

            answer key.



          </small>



        </div>



      </div>

    );

  }



  /* =========================================================

     CURRENT QUESTION

  ========================================================= */



  const question =

    questionSet[

      current

    ];



  const answeredCount =

    answers.filter(

      (answer) =>

        answer !==

        null

    ).length;



  const watermarkText =

    `${session?.rollNumber || user?.rollNumber || user?.email || "Candidate"} • ${exam?.title || exam?.category || "Exam"}`;



  /* =========================================================

     EXAM

  ========================================================= */



  return (

    <div className="attempt-page">

      <style>{`
        .attempt-page,
        .attempt-page * {
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }

        .attempt-page img {
          -webkit-user-drag: none !important;
        }

        .exam-privacy-shield {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: grid;
          place-items: center;
          padding: 24px;
          background: #07111f;
          color: #ffffff;
          text-align: center;
        }

        .exam-privacy-shield-card {
          width: min(520px, 92vw);
          padding: 28px;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 20px;
          background: rgba(255,255,255,.08);
          box-shadow: 0 20px 60px rgba(0,0,0,.35);
        }

        .exam-privacy-shield-icon {
          display: grid;
          place-items: center;
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          border-radius: 50%;
          background: rgba(255,255,255,.12);
          font-size: 28px;
        }

        .exam-mobile-security-note {
          margin-top: 8px;
          font-size: 12px;
          opacity: .8;
        }

        .exam-watermark-layer {
          position: fixed;
          inset: 0;
          z-index: 9999;
          pointer-events: none;
          overflow: hidden;
          display: grid;
          grid-template-columns: repeat(3, minmax(180px, 1fr));
          grid-auto-rows: 150px;
          gap: 34px 18px;
          padding: 40px 0;
          opacity: .085;
        }

        .exam-watermark-item {
          display: grid;
          place-items: center;
          transform: rotate(-24deg);
          color: #0b4da2;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: .6px;
          white-space: nowrap;
        }

        .attempt-page .question-panel h2,
        .attempt-page .options-list,
        .attempt-page .question-nav {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
        }

        @media (max-width: 768px) {
          .exam-watermark-layer {
            grid-template-columns: repeat(2, minmax(150px, 1fr));
            grid-auto-rows: 125px;
            gap: 24px 8px;
            opacity: .075;
          }

          .exam-watermark-item {
            font-size: 11px;
          }
        }

        @media print {
          html,
          body,
          #root,
          .attempt-page {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      {!result && (
        <div className="exam-watermark-layer" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, index) => (
            <span className="exam-watermark-item" key={index}>
              {watermarkText}
            </span>
          ))}
        </div>
      )}

      {securityMasked && !result && (
        <div className="exam-privacy-shield" aria-live="assertive">
          <div className="exam-privacy-shield-card">
            <div className="exam-privacy-shield-icon">
              <i className="bi bi-shield-lock-fill" />
            </div>

            <h2>Exam content protected</h2>

            <p className="mb-2">
              {securityMessage ||
                "Return to the examination window to continue."}
            </p>

            <small>
              Warnings {warnings}/{MAX_SECURITY_WARNINGS}
            </small>
          </div>
        </div>
      )}



      {/* =====================================================

          FULLSCREEN NOTICE

      ===================================================== */}



      {!fullscreen && (



        <div className="exam-security-banner">



          <span>



            <i className="bi bi-shield-exclamation" />



            {" "}

            Fullscreen is recommended for this examination.

            {mobileDevice && (
              <small className="exam-mobile-security-note d-block">
                Leaving this screen, changing apps, abnormal overlay/zoom,
                or an assistant taking browser focus will count as a warning.
                Hardware screenshots and OS assistants cannot be fully blocked
                by Safari/Chrome; candidate watermarking is enabled.
              </small>
            )}



          </span>



          <button

            type="button"

            onClick={() =>

              document.documentElement

                .requestFullscreen?.()

            }

          >

            Enter Fullscreen

          </button>



        </div>



      )}



      {/* =====================================================

          HEADER

      ===================================================== */}



      <header className="attempt-topbar">



        <div>



          <span className="live-dot">



            <i />



            Exam in progress



          </span>



          <h1>

            {exam.title}

          </h1>



          <p>

            {exam.category}

            {" · "}

            {questionSet.length} Questions

            {" · "}

            {exam.marks} Marks

            {" · "}

            Warnings {warnings}/{MAX_SECURITY_WARNINGS}

          </p>



        </div>



        <div className="attempt-actions">



          <div

            className={`timer-box ${

              timeLeft <= 300

                ? "danger"

                : ""

            }`}

          >



            <span>

              Time left

            </span>



            <strong>

              {formatTime(

                timeLeft

              )}

            </strong>



          </div>



          <button

            type="button"

            className="btn btn-danger"

            disabled={

              submitting

            }

            onClick={() =>

              setShowSubmit(

                true

              )

            }

          >

            Submit

          </button>



        </div>



      </header>



      {/* =====================================================

          EXAM BODY

      ===================================================== */}



      <main className="attempt-shell">



        {/* ===================================================

            QUESTION NAVIGATION

        =================================================== */}



        <aside className="question-nav">



          <div className="nav-head">



            <b>

              Questions

            </b>



            <span>

              {answeredCount}

              /

              {questionSet.length} answered

            </span>



          </div>



          <div className="question-grid">



            {questionSet.map(

              (

                _,

                index

              ) => (



                <button

                  type="button"

                  key={

                    index

                  }

                  disabled={

                    submitting

                  }

                  onClick={() =>

                    setCurrent(

                      index

                    )

                  }

                  className={`

                    ${

                      current ===

                      index

                        ? "current"

                        : ""

                    }



                    ${

                      answers[

                        index

                      ] !== null

                        ? "answered"

                        : ""

                    }

                  `}

                >

                  {index + 1}

                </button>



              )

            )}



          </div>



          {/* =================================================

              LEGEND

          ================================================= */}



          <div className="legend">



            <span>



              <i className="lg current" />



              Current



            </span>



            <span>



              <i className="lg answered" />



              Answered



            </span>



            <span>



              <i className="lg" />



              Unanswered



            </span>



          </div>



        </aside>



        {/* ===================================================

            QUESTION PANEL

        =================================================== */}



        <section className="question-panel">



          <div className="question-kicker">



            QUESTION{" "}

            {current + 1}{" "}

            OF{" "}

            {questionSet.length}



          </div>



          <h2>

            {question.question}

          </h2>



          {/* =================================================

              OPTIONS

          ================================================= */}



          <div className="options-list">



            {(

              question.options ||

              []

            ).map(

              (

                option,

                index

              ) => (



                <button

                  type="button"

                  key={

                    index

                  }

                  disabled={

                    submitting

                  }

                  className={

                    answers[

                      current

                    ] === index

                      ? "selected"

                      : ""

                  }

                  onClick={() => {

                    const next = [

                      ...answers,

                    ];



                    /*

                     * Save option index:

                     *

                     * A = 0

                     * B = 1

                     * C = 2

                     * D = 3

                     */



                    next[

                      current

                    ] = index;



                    setAnswers(

                      next

                    );

                  }}

                >



                  <span>

                    {String.fromCharCode(

                      65 +

                        index

                    )}

                  </span>



                  <b>

                    {option}

                  </b>



                </button>



              )

            )}



          </div>



          {/* =================================================

              BOTTOM NAVIGATION

          ================================================= */}



          <div className="question-bottom">



            <button

              type="button"

              className="btn btn-light border"

              disabled={

                current === 0 ||

                submitting

              }

              onClick={() =>

                setCurrent(

                  current - 1

                )

              }

            >

              ← Previous

            </button>



            <span>



              {answers[

                current

              ] === null

                ? "Not answered"

                : "Answer saved"}



            </span>



            {current ===

            questionSet.length -

              1 ? (



              <button

                type="button"

                className="btn btn-primary"

                disabled={

                  submitting

                }

                onClick={() =>

                  setShowSubmit(

                    true

                  )

                }

              >

                Review & Submit

              </button>



            ) : (



              <button

                type="button"

                className="btn btn-primary"

                disabled={

                  submitting

                }

                onClick={() =>

                  setCurrent(

                    current + 1

                  )

                }

              >

                Next →

              </button>



            )}



          </div>



        </section>



      </main>



      {/* =====================================================

          SUBMIT POPUP

      ===================================================== */}



      {showSubmit && (



        <div

          className="auth-overlay"

          onMouseDown={(

            event

          ) => {

            if (

              event.target ===

                event.currentTarget &&

              !submitting

            ) {

              setShowSubmit(

                false

              );

            }

          }}

        >



          <div className="auth-card">



            <span className="eyebrow">

              SUBMIT EXAM

            </span>



            <h2>

              Ready to finish?

            </h2>



            <p>

              You answered{" "}

              <b>

                {answeredCount}

              </b>{" "}

              of{" "}

              <b>

                {questionSet.length}

              </b>{" "}

              questions. Unanswered questions will receive

              no marks.

            </p>



            {/* ===============================================

                REVIEW SUMMARY

            =============================================== */}



            <div className="row g-2 mt-3">



              <div className="col-4">



                <div className="border rounded p-2 text-center">



                  <small className="text-muted d-block">

                    Total

                  </small>



                  <b>

                    {

                      questionSet.length

                    }

                  </b>



                </div>



              </div>



              <div className="col-4">



                <div className="border rounded p-2 text-center">



                  <small className="text-muted d-block">

                    Answered

                  </small>



                  <b className="text-success">

                    {

                      answeredCount

                    }

                  </b>



                </div>



              </div>



              <div className="col-4">



                <div className="border rounded p-2 text-center">



                  <small className="text-muted d-block">

                    Unanswered

                  </small>



                  <b className="text-danger">



                    {questionSet.length -

                      answeredCount}



                  </b>



                </div>



              </div>



            </div>



            {/* ===============================================

                BUTTONS

            =============================================== */}



            <div className="d-flex gap-2 mt-4">



              <button

                type="button"

                className="btn btn-light border flex-fill"

                disabled={

                  submitting

                }

                onClick={() =>

                  setShowSubmit(

                    false

                  )

                }

              >

                Go Back

              </button>



              <button

                type="button"

                className="btn btn-primary flex-fill"

                disabled={

                  submitting

                }

                onClick={() =>

                  submitExam(

                    false

                  )

                }

              >



                {submitting ? (

                  <>

                    <span

                      className="spinner-border spinner-border-sm me-2"

                      role="status"

                    />



                    Submitting…

                  </>

                ) : (

                  "Submit Exam"

                )}



              </button>



            </div>



          </div>



        </div>



      )}



    </div>

  );

}