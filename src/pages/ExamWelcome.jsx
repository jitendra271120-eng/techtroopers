import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import PageMeta from "../components/PageMeta";
import { exams as seed } from "../data/demoData";
import { useAuth } from "../contexts/AuthContext";
import useLiveCollection from "../hooks/useLiveCollection";
import { normalizeExam } from "./Exams";
import { db } from "../config/firebase";

/* ============================================================
   ROLL NUMBER CONFIGURATION
============================================================ */

const REQUIRED_ROLL_DIGITS = 13;

export default function ExamWelcome() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  /* =========================================================
     EXAM DATA
  ========================================================= */

  const {
    data: raw,
    loading,
  } = useLiveCollection(
    "categories",
    seed
  );

  const exams = useMemo(() => {
    return raw.map(normalizeExam);
  }, [raw]);

  const exam = exams.find(
    (item) =>
      item.id === examId
  );

  /* =========================================================
     STATES
  ========================================================= */

  const [
    code,
    setCode,
  ] = useState("");

  const [
    rollNumber,
    setRollNumber,
  ] = useState(
    user?.rollNumber
      ? String(
          user.rollNumber
        ).replace(
          /\D/g,
          ""
        ).slice(
          0,
          REQUIRED_ROLL_DIGITS
        )
      : ""
  );

  const [
    accepted,
    setAccepted,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    starting,
    setStarting,
  ] = useState(false);

  /* =========================================================
     LOAD USER ROLL NUMBER
  ========================================================= */

  useEffect(() => {
    if (
      user?.rollNumber
    ) {
      const cleaned =
        String(
          user.rollNumber
        )
          .replace(
            /\D/g,
            ""
          )
          .slice(
            0,
            REQUIRED_ROLL_DIGITS
          );

      setRollNumber(
        cleaned
      );
    }
  }, [
    user?.rollNumber,
  ]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loading &&
    !exam
  ) {
    return (
      <div className="section container-xxl">

        <div className="alert alert-info">
          Loading examination…
        </div>

      </div>
    );
  }

  /* =========================================================
     EXAM NOT FOUND
  ========================================================= */

  if (!exam) {
    return (
      <div className="section container-xxl">

        <h2>
          Exam not found
        </h2>

        <Link to="/exams">
          Back to exams
        </Link>

      </div>
    );
  }

  /* =========================================================
     START EXAM
  ========================================================= */

  const start =
    async () => {
      setError("");

      /* -------------------------------------------------------
         LOGIN CHECK
      ------------------------------------------------------- */

      if (!user) {
        setError(
          "Please log in before starting the exam."
        );

        return;
      }

      /* -------------------------------------------------------
         ROLL NUMBER
      ------------------------------------------------------- */

      const roll =
        rollNumber.trim();

      if (!roll) {
        setError(
          "Please enter your roll number."
        );

        return;
      }

      /* -------------------------------------------------------
         EXACTLY 13 DIGITS
      ------------------------------------------------------- */

      if (
        !/^\d{13}$/.test(
          roll
        )
      ) {
        setError(
          "Roll number must contain exactly 13 digits."
        );

        return;
      }

      /* -------------------------------------------------------
         EXAM START CODE
      ------------------------------------------------------- */

      const validCodes = (
        exam.secretCodes ||
        []
      )
        .map(
          (item) =>
            String(
              item
            ).trim()
        )
        .filter(Boolean);

      if (
        validCodes.length >
          0 &&
        !validCodes.includes(
          code.trim()
        )
      ) {
        setError(
          "Invalid exam start code."
        );

        return;
      }

      /* -------------------------------------------------------
         INSTRUCTION ACCEPTANCE
      ------------------------------------------------------- */

      if (!accepted) {
        setError(
          "Please accept the examination instructions."
        );

        return;
      }

      setStarting(true);

      try {
        /* =====================================================
           DUPLICATE CHECK

           IMPORTANT:

           Same roll number +
           same examination
           = NOT ALLOWED

           Secret code is intentionally NOT checked here.

           Therefore:

           Roll: 1234567890123
           Exam: WT-UNIT-1
           Code: ABC

           Once attempted, same roll cannot use:

           Code: XYZ

           to attempt WT-UNIT-1 again.
        ===================================================== */

        const scoreSnapshot =
          await getDocs(
            query(
              collection(
                db,
                "scores"
              ),
              where(
                "rollNumber",
                "==",
                roll
              )
            )
          );

        /* =====================================================
           CURRENT EXAM IDENTIFIERS
        ===================================================== */

        const examIdValue =
          String(
            exam.id ||
              ""
          )
            .trim()
            .toLowerCase();

        const categoryValue =
          String(
            exam.category ||
              exam.name ||
              exam.title ||
              ""
          )
            .trim()
            .toLowerCase();

        /* =====================================================
           CHECK SAME EXAM
        ===================================================== */

        const duplicate =
          scoreSnapshot.docs.some(
            (document) => {
              const data =
                document.data();

              const savedExamId =
                String(
                  data.examId ||
                    ""
                )
                  .trim()
                  .toLowerCase();

              const savedCategory =
                String(
                  data.category ||
                    ""
                )
                  .trim()
                  .toLowerCase();

              const savedCategoryName =
                String(
                  data.categoryName ||
                    ""
                )
                  .trim()
                  .toLowerCase();

              /* -----------------------------------------------
                 BEST MATCH:
                 Same Firebase exam document ID
              ----------------------------------------------- */

              if (
                examIdValue &&
                savedExamId &&
                savedExamId ===
                  examIdValue
              ) {
                return true;
              }

              /* -----------------------------------------------
                 BACKWARD COMPATIBILITY:

                 Older score records may not contain examId.
                 Therefore check category/categoryName too.
              ----------------------------------------------- */

              if (
                categoryValue &&
                (
                  savedCategory ===
                    categoryValue ||
                  savedCategoryName ===
                    categoryValue
                )
              ) {
                return true;
              }

              return false;
            }
          );

        /* =====================================================
           DUPLICATE FOUND
        ===================================================== */

        if (duplicate) {
          setError(
            `Roll number ${roll} has already attempted this examination. Multiple attempts are not allowed.`
          );

          setStarting(
            false
          );

          return;
        }

        /* =====================================================
           CATEGORY
        ===================================================== */

        const categoryKey =
          String(
            exam.category ||
              exam.name ||
              exam.title ||
              exam.id
          );

        /* =====================================================
           SAVE EXAM SESSION
        ===================================================== */

        sessionStorage.setItem(
          `tt_exam_session_${exam.id}`,
          JSON.stringify({
            rollNumber:
              roll,

            secretCode:
              code.trim(),

            category:
              categoryKey,

            examId:
              exam.id,

            startedAt:
              Date.now(),
          })
        );

        /* =====================================================
           FULLSCREEN
        ===================================================== */

        try {
          await document
            .documentElement
            .requestFullscreen?.();
        } catch (
          fullscreenError
        ) {
          console.warn(
            "Fullscreen could not be enabled:",
            fullscreenError
          );
        }

        /* =====================================================
           OPEN EXAM
        ===================================================== */

        navigate(
          `/exam/attempt/${exam.id}`
        );
      } catch (
        examError
      ) {
        console.error(
          "Exam validation error:",
          examError
        );

        setError(
          examError.message ||
            "Unable to validate exam attempt."
        );

        setStarting(
          false
        );
      }
    };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <>
      <PageMeta
        title={`${exam.subject} Exam`}
      />

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="page-hero">

        <div className="container-xxl">

          <span className="eyebrow">
            EXAM WELCOME DESK
          </span>

          <h1>
            {exam.title}
          </h1>

          <p>
            {exam.category}

            {" · "}

            {exam.questions} Questions

            {" · "}

            {exam.marks} Marks

            {" · "}

            {exam.duration} Minutes
          </p>

        </div>

      </section>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="section">

        <div className="container-xxl exam-welcome-grid">

          {/* =================================================
              INSTRUCTIONS
          ================================================= */}

          <article className="content-card">

            <h3>
              Before you begin
            </h3>

            <div className="instruction-list">

              {/* 01 */}

              <div>

                <span>
                  01
                </span>

                <p>
                  The timer starts after{" "}
                  <b>
                    Start Examination
                  </b>
                  . The exam is automatically
                  submitted when the timer reaches
                  zero.
                </p>

              </div>

              {/* 02 */}

              <div>

                <span>
                  02
                </span>

                <p>
                  Your roll number must contain
                  exactly{" "}
                  <b>
                    13 digits
                  </b>
                  .
                </p>

              </div>

              {/* 03 */}

              <div>

                <span>
                  03
                </span>

                <p>
                  A roll number can attempt the same
                  examination only{" "}
                  <b>
                    once
                  </b>
                  . Changing the exam start code
                  will not permit another attempt.
                </p>

              </div>

              {/* 04 */}

              <div>

                <span>
                  04
                </span>

                <p>
                  Use Previous, Next or the numbered
                  navigator. Answered questions are
                  highlighted.
                </p>

              </div>

              {/* 05 */}

              <div>

                <span>
                  05
                </span>

                <p>
                  Copy, paste, context menu and
                  common developer shortcuts are
                  blocked during the attempt.
                </p>

              </div>

              {/* 06 */}

              <div>

                <span>
                  06
                </span>

                <p>
                  You can see your result immediately
                  after the examination is finished.
                  You can also find the result in
                  your Dashboard.
                </p>

              </div>

            </div>

          </article>

          {/* =================================================
              CANDIDATE
          ================================================= */}

          <aside className="content-card">

            <span className="eyebrow">
              CANDIDATE
            </span>

            <h3>
              {user?.name ||
                "Login required"}
            </h3>

            <p>
              {user?.email ||
                "Use the Login button in the header."}
            </p>

            {/* ===============================================
                ROLL NUMBER
            =============================================== */}

            <label className="form-label mt-3">

              Roll Number

              <small className="ms-1">
                (13 digits)
              </small>

            </label>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{13}"
              maxLength={
                REQUIRED_ROLL_DIGITS
              }
              className="form-control"
              value={
                rollNumber
              }
              onChange={(
                event
              ) => {
                /* ---------------------------------------------
                   REMOVE NON-NUMERIC CHARACTERS
                --------------------------------------------- */

                const value =
                  event.target.value
                    .replace(
                      /\D/g,
                      ""
                    )
                    .slice(
                      0,
                      REQUIRED_ROLL_DIGITS
                    );

                setRollNumber(
                  value
                );

                setError("");
              }}
              placeholder="Enter 13 digit roll number"
              autoComplete="off"
            />

            {/* ROLL DIGIT COUNTER */}

            <div className="d-flex justify-content-between mt-1">

              <small className="text-muted">
                Numbers only
              </small>

              <small
                className={
                  rollNumber.length ===
                  REQUIRED_ROLL_DIGITS
                    ? "text-success"
                    : "text-muted"
                }
              >
                {
                  rollNumber.length
                }
                /
                {
                  REQUIRED_ROLL_DIGITS
                }
              </small>

            </div>

            {/* ===============================================
                EXAM START CODE
            =============================================== */}

            <label className="form-label mt-3">
              Exam start code
            </label>

            <input
              className="form-control"
              value={code}
              onChange={(
                event
              ) => {
                setCode(
                  event.target
                    .value
                );

                setError("");
              }}
              placeholder={
                exam.secretCodes
                  ?.length
                  ? "Enter code provided by faculty"
                  : "No start code configured"
              }
            />

            {/* ===============================================
                ACCEPT
            =============================================== */}

            <label className="check-row mt-3">

              <input
                type="checkbox"
                checked={
                  accepted
                }
                onChange={(
                  event
                ) =>
                  setAccepted(
                    event.target
                      .checked
                  )
                }
              />

              <span>
                I have read the instructions and I
                am ready.
              </span>

            </label>

            {/* ===============================================
                ERROR
            =============================================== */}

            {error && (

              <div className="alert alert-danger py-2 mt-3">
                {error}
              </div>

            )}

            {/* ===============================================
                START
            =============================================== */}

            <button
              type="button"
              className="btn btn-primary w-100 mt-3"
              onClick={start}
              disabled={
                starting
              }
            >

              {starting
                ? "Validating…"
                : "Start Examination →"}

            </button>

            {/* ===============================================
                BACK
            =============================================== */}

            <Link
              className="btn btn-light border w-100 mt-2"
              to="/exams"
            >
              Back to Exam Library
            </Link>

          </aside>

        </div>

      </main>
    </>
  );
}