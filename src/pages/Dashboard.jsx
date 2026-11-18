import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import PageMeta from "../components/PageMeta";

import {
  useAuth,
} from "../contexts/AuthContext";

import {
  listCollection,
  timestampToText,
} from "../services/firestoreService";

import {
  normalizeQuestionDoc,
} from "../utils/firestoreAdapters";

/* ============================================================
   HELPERS
============================================================ */

const normalizeValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const normalizeRole = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

const toBoolean = (value) => {
  if (value === true) return true;

  if (
    value === 1 ||
    value === "1"
  ) {
    return true;
  }

  const text = String(
    value ?? ""
  )
    .trim()
    .toLowerCase();

  return [
    "true",
    "yes",
    "on",
    "visible",
    "enabled",
  ].includes(text);
};

/* ============================================================
   ANSWER INDEX

   Your system:
   0 = A
   1 = B
   2 = C
   3 = D
============================================================ */

const parseAnswerIndex = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const text = String(
    value
  )
    .trim()
    .toUpperCase();

  if (
    ["A", "B", "C", "D"].includes(
      text
    )
  ) {
    return (
      text.charCodeAt(0) -
      65
    );
  }

  const number =
    Number(text);

  if (
    Number.isInteger(
      number
    ) &&
    number >= 0 &&
    number <= 3
  ) {
    return number;
  }

  return null;
};

/* ============================================================
   COMPONENT
============================================================ */

export default function Dashboard() {
  const {
    user,
  } = useAuth();

  /* ==========================================================
     MAIN DATA
  ========================================================== */

  const [
    all,
    setAll,
  ] = useState([]);

  const [
    userAnswers,
    setUserAnswers,
  ] = useState([]);

  const [
    categories,
    setCategories,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* ==========================================================
     ANSWER REVIEW MODAL
  ========================================================== */

  const [
    showAnswers,
    setShowAnswers,
  ] = useState(false);

  const [
    selectedAttempt,
    setSelectedAttempt,
  ] = useState(null);

  const [
    reviewRows,
    setReviewRows,
  ] = useState([]);

  const [
    answersLoading,
    setAnswersLoading,
  ] = useState(false);

  const [
    answerError,
    setAnswerError,
  ] = useState("");

  const [
    comparisonWarning,
    setComparisonWarning,
  ] = useState("");

  /* ==========================================================
     ROLE
  ========================================================== */

  const role =
    normalizeRole(
      user?.role
    );

  const isStudent =
    role === "student";

  const isAdmin =
    role === "admin" ||
    role === "superadmin";

  /* ==========================================================
     LOAD DASHBOARD DATA

     1. scores
     2. userAnswers
     3. categories
  ========================================================== */

  useEffect(() => {
    if (
      !user?.uid &&
      !user?.email
    ) {
      setAll([]);
      setUserAnswers([]);
      setCategories([]);
      setLoading(false);

      return;
    }

    const loadDashboard =
      async () => {
        try {
          setLoading(
            true
          );

          /* ===============================================
             SCORE QUERY
          =============================================== */

          const scoreFilters =
            user?.email
              ? [
                  [
                    "email",
                    "==",
                    user.email,
                  ],
                ]
              : [
                  [
                    "userId",
                    "==",
                    user.uid,
                  ],
                ];

          /* ===============================================
             USER ANSWERS QUERY
          =============================================== */

          let answerPromise =
            Promise.resolve(
              []
            );

          if (
            user?.email
          ) {
            answerPromise =
              listCollection(
                "userAnswers",
                {
                  filters: [
                    [
                      "email",
                      "==",
                      user.email,
                    ],
                  ],
                }
              );
          } else if (
            user?.rollNumber
          ) {
            answerPromise =
              listCollection(
                "userAnswers",
                {
                  filters: [
                    [
                      "rollNumber",
                      "==",
                      user.rollNumber,
                    ],
                  ],
                }
              );
          }

          /* ===============================================
             LOAD ALL
          =============================================== */

          const [
            scoreRecords,
            answerRecords,
            categoryRecords,
          ] =
            await Promise.all([
              listCollection(
                "scores",
                {
                  filters:
                    scoreFilters,
                }
              ),

              answerPromise,

              listCollection(
                "categories"
              ),
            ]);

          setAll(
            scoreRecords
          );

          setUserAnswers(
            answerRecords
          );

          setCategories(
            categoryRecords
          );
        } catch (
          error
        ) {
          console.error(
            "Dashboard loading error:",
            error
          );

          setAll([]);
          setUserAnswers([]);
          setCategories([]);
        } finally {
          setLoading(
            false
          );
        }
      };

    loadDashboard();
  }, [
    user?.uid,
    user?.email,
    user?.rollNumber,
  ]);

  /* ==========================================================
     CURRENT USER ATTEMPTS
  ========================================================== */

  const mine =
    useMemo(() => {
      return all.filter(
        (record) => {
          return (
            record.userId ===
              user?.uid ||
            record.email ===
              user?.email ||
            (
              user?.rollNumber &&
              String(
                record.rollNumber ||
                  ""
              ) ===
                String(
                  user.rollNumber
                )
            )
          );
        }
      );
    }, [
      all,
      user?.uid,
      user?.email,
      user?.rollNumber,
    ]);

  /* ==========================================================
     SCORE %
  ========================================================== */

  const getPercentage = (
    record
  ) => {
    if (
      record?.percentage !==
        undefined &&
      record?.percentage !==
        null
    ) {
      return (
        Number(
          record.percentage
        ) || 0
      );
    }

    const total =
      Number(
        record?.total
      ) || 0;

    const score =
      Number(
        record?.score
      ) || 0;

    if (
      total <= 0
    ) {
      return 0;
    }

    return (
      score /
      total
    ) * 100;
  };

  /* ==========================================================
     PERCENTAGES
  ========================================================== */

  const percentages =
    useMemo(() => {
      return mine.map(
        getPercentage
      );
    }, [mine]);

  /* ==========================================================
     AVERAGE
  ========================================================== */

  const avg =
    percentages.length
      ? Math.round(
          percentages.reduce(
            (
              total,
              current
            ) =>
              total +
              current,
            0
          ) /
            percentages.length
        )
      : 0;

  /* ==========================================================
     BEST
  ========================================================== */

  const best =
    percentages.length
      ? Math.max(
          ...percentages.map(
            (value) =>
              Math.round(
                value
              )
          )
        )
      : 0;

  /* ==========================================================
     DISPLAY NAME
  ========================================================== */

  const displayName =
    user?.name ||
    user?.displayName ||
    "Learner";

  /* ==========================================================
     FIND EXAM CONFIGURATION

     Matches score with categories collection.
  ========================================================== */

  const findExamConfig = (
    record
  ) => {
    if (!record) {
      return null;
    }

    const recordKeys = [
      record.examId,
      record.category,
      record.categoryName,
      record.exam,
      record.title,
    ]
      .map(
        normalizeValue
      )
      .filter(Boolean);

    return (
      categories.find(
        (exam) => {
          const examKeys = [
            exam.id,
            exam.category,
            exam.name,
            exam.title,
            exam.subject,
          ]
            .map(
              normalizeValue
            )
            .filter(
              Boolean
            );

          return (
            examKeys.some(
              (key) =>
                recordKeys.includes(
                  key
                )
            )
          );
        }
      ) || null
    );
  };

  /* ==========================================================
     ANSWER KEY VISIBILITY

     FAIL CLOSED:
     If category cannot be found or showAnswerKey is false,
     answers are NOT shown.
  ========================================================== */

  const isAnswerKeyVisible = (
    record
  ) => {
    const examConfig =
      findExamConfig(
        record
      );

    if (!examConfig) {
      return false;
    }

    return toBoolean(
      examConfig.showAnswerKey
    );
  };

  /* ==========================================================
     FIND USER ANSWER RECORD
  ========================================================== */

  const findUserAnswerRecord = (
    score
  ) => {
    if (!score) {
      return null;
    }

    /* ===============================================
       BEST MATCH:
       scoreRefId
    =============================================== */

    const direct =
      userAnswers.find(
        (record) =>
          String(
            record.scoreRefId ||
              ""
          ) ===
          String(
            score.id ||
              ""
          )
      );

    if (direct) {
      return direct;
    }

    /* ===============================================
       OLD DATA FALLBACK
    =============================================== */

    const scoreCategoryKeys =
      [
        score.category,
        score.categoryName,
        score.examId,
        score.exam,
      ]
        .map(
          normalizeValue
        )
        .filter(
          Boolean
        );

    return (
      userAnswers.find(
        (record) => {
          const sameRoll =
            !score.rollNumber ||
            !record.rollNumber ||
            String(
              score.rollNumber
            ) ===
              String(
                record.rollNumber
              );

          const answerCategory =
            normalizeValue(
              record.category
            );

          const sameCategory =
            answerCategory &&
            scoreCategoryKeys.includes(
              answerCategory
            );

          const sameCode =
            !score.secretCode ||
            !record.secretCode ||
            String(
              score.secretCode
            ) ===
              String(
                record.secretCode
              );

          return (
            sameRoll &&
            sameCategory &&
            sameCode
          );
        }
      ) || null
    );
  };

  /* ==========================================================
     QUESTION ID FROM SAVED ANSWER
  ========================================================== */

  const getSavedQuestionId = (
    item
  ) => {
    if (
      !item ||
      typeof item !==
        "object"
    ) {
      return "";
    }

    return String(
      item.questionId ??
        item.questionID ??
        item.qid ??
        item.id ??
        ""
    );
  };

  /* ==========================================================
     SELECTED ANSWER FROM SAVED ANSWER
  ========================================================== */

  const getSavedAnswerIndex = (
    item
  ) => {
    if (
      item === null ||
      item === undefined
    ) {
      return null;
    }

    /* Primitive */

    if (
      typeof item !==
      "object"
    ) {
      return parseAnswerIndex(
        item
      );
    }

    /* Object */

    return parseAnswerIndex(
      item.selectedAnswer ??
        item.selectedIndex ??
        item.selected ??
        item.answer ??
        item.option ??
        item.value
    );
  };

  /* ==========================================================
     CONVERT SAVED ANSWERS INTO ENTRIES
  ========================================================== */

  const getSavedAnswerEntries = (
    answerRecord
  ) => {
    const answers =
      answerRecord?.answers;

    if (!answers) {
      return [];
    }

    /* ===============================================
       ARRAY
    =============================================== */

    if (
      Array.isArray(
        answers
      )
    ) {
      return answers.map(
        (
          item,
          index
        ) => ({
          index,

          questionId:
            getSavedQuestionId(
              item
            ),

          selectedIndex:
            getSavedAnswerIndex(
              item
            ),

          raw:
            item,
        })
      );
    }

    /* ===============================================
       OBJECT:
       {
         questionId1: 2,
         questionId2: 0
       }
    =============================================== */

    if (
      typeof answers ===
      "object"
    ) {
      return Object.entries(
        answers
      ).map(
        (
          [
            questionId,
            value,
          ],
          index
        ) => ({
          index,

          questionId:
            String(
              questionId
            ),

          selectedIndex:
            getSavedAnswerIndex(
              value
            ),

          raw:
            value,
        })
      );
    }

    return [];
  };

  /* ==========================================================
     QUESTION OPTIONS
  ========================================================== */

  const getOptions = (
    question
  ) => {
    if (
      Array.isArray(
        question?.options
      )
    ) {
      return question.options;
    }

    return [
      question?.optionA ??
        question?.a ??
        "",

      question?.optionB ??
        question?.b ??
        "",

      question?.optionC ??
        question?.c ??
        "",

      question?.optionD ??
        question?.d ??
        "",
    ];
  };

  /* ==========================================================
     CORRECT ANSWER INDEX
  ========================================================== */

  const getCorrectIndex = (
    question
  ) => {
    return (
      parseAnswerIndex(
        question?.answer ??
          question?.correctAnswer ??
          question?.correctOption
      ) ?? 0
    );
  };

  /* ==========================================================
     FIND QUESTIONS BELONGING TO SCORE
  ========================================================== */

  const isQuestionForExam = (
    question,
    score,
    examConfig
  ) => {
    const questionKeys =
      [
        question?.category,
        question?.examId,
        question?.categoryName,
      ]
        .map(
          normalizeValue
        )
        .filter(
          Boolean
        );

    const examKeys =
      [
        score?.examId,
        score?.category,
        score?.categoryName,
        score?.exam,

        examConfig?.id,
        examConfig?.category,
        examConfig?.name,
        examConfig?.title,
      ]
        .map(
          normalizeValue
        )
        .filter(
          Boolean
        );

    return questionKeys.some(
      (key) =>
        examKeys.includes(
          key
        )
    );
  };

  /* ==========================================================
     OPEN ANSWER REVIEW

     SECURITY:
     Re-check showAnswerKey BEFORE fetching/displaying questions.
  ========================================================== */

  const openAnswerReview =
    async (record) => {
      /* ===============================================
         ANSWER KEY MUST BE RELEASED
      =============================================== */

      if (
        !isAnswerKeyVisible(
          record
        )
      ) {
        return;
      }

      setSelectedAttempt(
        record
      );

      setShowAnswers(
        true
      );

      setReviewRows(
        []
      );

      setAnswerError(
        ""
      );

      setComparisonWarning(
        ""
      );

      setAnswersLoading(
        true
      );

      try {
        const examConfig =
          findExamConfig(
            record
          );

        /* ===============================================
           SECOND SECURITY CHECK
        =============================================== */

        if (
          !examConfig ||
          !toBoolean(
            examConfig.showAnswerKey
          )
        ) {
          throw new Error(
            "Answer key has not been released."
          );
        }

        /* ===============================================
           SAVED USER ATTEMPT
        =============================================== */

        const answerRecord =
          findUserAnswerRecord(
            record
          );

        const savedEntries =
          getSavedAnswerEntries(
            answerRecord
          );

        /* ===============================================
           LOAD QUESTIONS
        =============================================== */

        const rawQuestions =
          await listCollection(
            "questions"
          );

        const questions =
          rawQuestions.map(
            normalizeQuestionDoc
          );

        /* ===============================================
           QUESTIONS OF THIS EXAM
        =============================================== */

        let examQuestions =
          questions.filter(
            (question) =>
              isQuestionForExam(
                question,
                record,
                examConfig
              )
          );

        /* ===============================================
           ANSWERS SAVED WITH QUESTION IDs
        =============================================== */

        const entriesWithIds =
          savedEntries.filter(
            (entry) =>
              entry.questionId
          );

        let reliableComparison =
          entriesWithIds.length >
          0;

        /* ===============================================
           IF QUESTION IDS WERE SAVED,
           SHOW EXACT QUESTIONS FROM THIS ATTEMPT.
        =============================================== */

        if (
          reliableComparison
        ) {
          const entryMap =
            new Map(
              entriesWithIds.map(
                (entry) => [
                  String(
                    entry.questionId
                  ),
                  entry,
                ]
              )
            );

          const orderMap =
            new Map(
              entriesWithIds.map(
                (
                  entry,
                  index
                ) => [
                  String(
                    entry.questionId
                  ),
                  index,
                ]
              )
            );

          examQuestions =
            examQuestions
              .filter(
                (question) =>
                  entryMap.has(
                    String(
                      question.id
                    )
                  )
              )
              .sort(
                (
                  first,
                  second
                ) =>
                  (
                    orderMap.get(
                      String(
                        first.id
                      )
                    ) ?? 99999
                  ) -
                  (
                    orderMap.get(
                      String(
                        second.id
                      )
                    ) ?? 99999
                  )
              );
        } else if (
          savedEntries.length >
          0
        ) {
          /*
           * OLD FORMAT:
           * answers may contain only [1, 2, 0, 3].
           *
           * Because your exam questions can be randomized,
           * we must NOT pretend those indexes belong to the
           * current Firestore question order.
           */

          setComparisonWarning(
            "This older attempt does not contain question IDs, so the student's exact selected answers cannot be matched safely with the randomized questions. Correct answers are available, but exact attempt comparison requires questionId + selectedAnswer to be saved during submission."
          );
        } else {
          setComparisonWarning(
            "The selected answers for this attempt were not found. The correct answer key is available, but exact comparison is unavailable for this attempt."
          );
        }

        /* ===============================================
           CREATE REVIEW ROWS
        =============================================== */

        const rows =
          examQuestions.map(
            (
              question,
              index
            ) => {
              const options =
                getOptions(
                  question
                );

              const correctIndex =
                getCorrectIndex(
                  question
                );

              /* =========================================
                 STUDENT ANSWER
              ========================================= */

              let selectedIndex =
                null;

              if (
                reliableComparison
              ) {
                const matchingEntry =
                  entriesWithIds.find(
                    (entry) =>
                      String(
                        entry.questionId
                      ) ===
                      String(
                        question.id
                      )
                  );

                selectedIndex =
                  matchingEntry
                    ?.selectedIndex ??
                  null;
              }

              const correctLetter =
                String.fromCharCode(
                  65 +
                    correctIndex
                );

              const selectedLetter =
                selectedIndex !==
                  null
                  ? String.fromCharCode(
                      65 +
                        Number(
                          selectedIndex
                        )
                    )
                  : "";

              const correctText =
                options[
                  correctIndex
                ] ?? "";

              const selectedText =
                selectedIndex !==
                  null
                  ? (
                      options[
                        selectedIndex
                      ] ?? ""
                    )
                  : "";

              const isCorrect =
                selectedIndex !==
                  null &&
                Number(
                  selectedIndex
                ) ===
                  Number(
                    correctIndex
                  );

              return {
                id:
                  question.id,

                number:
                  index + 1,

                question:
                  question.question ||
                  question.title ||
                  `Question ${
                    index + 1
                  }`,

                selectedIndex,

                selectedLetter,

                selectedText,

                correctIndex,

                correctLetter,

                correctText,

                isCorrect,

                explanation:
                  question.getQuesDesc ||
                  question.explanation ||
                  "",
              };
            }
          );

        setReviewRows(
          rows
        );

        if (
          rows.length === 0
        ) {
          setAnswerError(
            "No matching questions were found for this examination."
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Answer review error:",
          error
        );

        setAnswerError(
          error?.message ||
            "Unable to load answer review."
        );
      } finally {
        setAnswersLoading(
          false
        );
      }
    };

  /* ==========================================================
     CLOSE REVIEW
  ========================================================== */

  const closeAnswerReview =
    () => {
      setShowAnswers(
        false
      );

      setSelectedAttempt(
        null
      );

      setReviewRows(
        []
      );

      setAnswerError(
        ""
      );

      setComparisonWarning(
        ""
      );
    };

  /* ==========================================================
     RETURN
  ========================================================== */

  return (
    <>
      <PageMeta
        title="Dashboard"
      />

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="page-hero dashboard-hero">

        <div className="container-xxl">

          <span className="eyebrow">
            LEARNER DASHBOARD
          </span>

          <h1>
            Welcome,{" "}
            {displayName}.
          </h1>

          <p>
            Track your Firebase-saved examinations,
            performance and next actions.
          </p>

        </div>

      </section>

      {/* =====================================================
          DASHBOARD
      ===================================================== */}

      <main className="section pt-4">

        <div className="container-xxl">

          {/* =================================================
              STATS
          ================================================= */}

          <div className="dashboard-stats">

            <div>

              <span>
                Exams Attempted
              </span>

              <b>
                {loading
                  ? "…"
                  : mine.length}
              </b>

            </div>

            <div>

              <span>
                Average Score
              </span>

              <b>
                {avg}%
              </b>

            </div>

            <div>

              <span>
                Best Score
              </span>

              <b>
                {best}%
              </b>

            </div>

            <div>

              <span>
                Role
              </span>

              <b className="text-capitalize">
                {user?.role ||
                  "student"}
              </b>

            </div>

          </div>

          {/* =================================================
              CONTENT
          ================================================= */}

          <div className="dashboard-grid mt-4">

            {/* ===============================================
                EXAM HISTORY
            =============================================== */}

            <section className="content-card">

              <div className="section-head split compact-head">

                <div>

                  <span className="eyebrow">
                    HISTORY
                  </span>

                  <h3>
                    Recent attempts
                  </h3>

                </div>

                <Link to="/exams">
                  Take Exam →
                </Link>

              </div>

              {mine.length ? (

                <div className="table-responsive">

                  <table className="table align-middle">

                    <thead>

                      <tr>

                        <th>
                          Exam
                        </th>

                        <th>
                          Date
                        </th>

                        <th>
                          Score
                        </th>

                        <th>
                          %
                        </th>

                        <th>
                          Answer Review
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {mine
                        .slice()
                        .reverse()
                        .map(
                          (
                            record
                          ) => {
                            const total =
                              Number(
                                record.total
                              ) || 0;

                            const score =
                              Number(
                                record.score
                              ) || 0;

                            const percentage =
                              Math.round(
                                getPercentage(
                                  record
                                )
                              );

                            const answerKeyVisible =
                              isAnswerKeyVisible(
                                record
                              );

                            return (

                              <tr
                                key={
                                  record.id
                                }
                              >

                                {/* EXAM */}

                                <td>

                                  {record.categoryName ||
                                    record.exam ||
                                    record.category ||
                                    record.examId ||
                                    "-"}

                                </td>

                                {/* DATE */}

                                <td>

                                  {timestampToText(
                                    record.timestamp ||
                                      record.date ||
                                      record.createdAt
                                  ).slice(
                                    0,
                                    10
                                  )}

                                </td>

                                {/* SCORE */}

                                <td>

                                  {score}
                                  /
                                  {total}

                                </td>

                                {/* PERCENTAGE */}

                                <td>

                                  <span
                                    className={`score-badge ${
                                      percentage >=
                                      75
                                        ? "good"
                                        : ""
                                    }`}
                                  >
                                    {
                                      percentage
                                    }
                                    %
                                  </span>

                                </td>

                                {/* =================================
                                    ANSWER REVIEW
                                ================================= */}

                                <td>

                                  {answerKeyVisible ? (

                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-success"
                                      onClick={() =>
                                        openAnswerReview(
                                          record
                                        )
                                      }
                                    >
                                      View Answers
                                    </button>

                                  ) : (

                                    <span className="badge text-bg-secondary">
                                      🔒 Not Released
                                    </span>

                                  )}

                                </td>

                              </tr>

                            );
                          }
                        )}

                    </tbody>

                  </table>

                </div>

              ) : (

                <div className="empty-state">

                  {loading
                    ? "Loading attempts…"
                    : "No attempts yet. Start from the exam library."}

                </div>

              )}

            </section>

            {/* ===============================================
                QUICK ACTIONS
            =============================================== */}

            <aside className="content-card">

              <h4>
                Quick actions
              </h4>

              <div className="quick-links">

                <Link to="/exams">
                  📝 Online Exams
                </Link>

                <Link to="/answer-keys">
                  🔑 Published Answer Keys
                </Link>

                <Link to="/ebooks">
                  📚 E-Books & Notes
                </Link>

                {/* =========================================
                    STUDENTS MUST NOT SEE QUESTION BANK
                ========================================= */}

                {!isStudent && (

                  <Link to="/question-banks">
                    ❓ Question Banks
                  </Link>

                )}

                <Link to="/resume-builder">
                  📄 Resume Studio
                </Link>

                <Link to="/vacancies">
                  💼 Vacancies
                </Link>

                <Link to="/talk">
                  💬 TroopersTalk
                </Link>

                {isAdmin && (

                  <Link to="/admin">
                    ⚙️ Admin Portal
                  </Link>

                )}

              </div>

            </aside>

          </div>

        </div>

      </main>

      {/* =====================================================
          ANSWER REVIEW POPUP

          This modal is rendered only after showAnswerKey
          has been verified.
      ===================================================== */}

      {showAnswers && (

        <>
          {/* BACKDROP */}

          <div
            className="modal-backdrop fade show"
            onClick={
              closeAnswerReview
            }
          />

          {/* MODAL */}

          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >

            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">

              <div className="modal-content">

                {/* ===========================================
                    HEADER
                =========================================== */}

                <div className="modal-header">

                  <div>

                    <span className="eyebrow">
                      ANSWER REVIEW
                    </span>

                    <h5 className="modal-title mt-1">

                      {selectedAttempt?.categoryName ||
                        selectedAttempt?.exam ||
                        selectedAttempt?.category ||
                        selectedAttempt?.examId ||
                        "Examination"}

                    </h5>

                    <small className="text-muted">

                      Compare your attempted answers with
                      the released correct answers.

                    </small>

                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={
                      closeAnswerReview
                    }
                  />

                </div>

                {/* ===========================================
                    BODY
                =========================================== */}

                <div className="modal-body">

                  {/* LOADING */}

                  {answersLoading ? (

                    <div className="text-center py-5">

                      <div
                        className="spinner-border text-primary"
                        role="status"
                      />

                      <div className="mt-3">
                        Loading answer review…
                      </div>

                    </div>

                  ) : answerError ? (

                    /* ERROR */

                    <div className="alert alert-warning mb-0">

                      {
                        answerError
                      }

                    </div>

                  ) : (

                    <>
                      {/* =====================================
                          COMPARISON WARNING
                      ===================================== */}

                      {comparisonWarning && (

                        <div className="alert alert-warning">

                          {
                            comparisonWarning
                          }

                        </div>

                      )}

                      {/* =====================================
                          LEGEND
                      ===================================== */}

                      <div className="d-flex gap-2 flex-wrap mb-3">

                        <span className="badge text-bg-success">
                          ✓ Correct
                        </span>

                        <span className="badge text-bg-danger">
                          ✕ Wrong
                        </span>

                        <span className="badge text-bg-secondary">
                          Not Attempted
                        </span>

                      </div>

                      {/* =====================================
                          ANSWER TABLE
                      ===================================== */}

                      <div className="table-responsive">

                        <table className="table align-middle">

                          <thead>

                            <tr>

                              <th
                                style={{
                                  width:
                                    "55px",
                                }}
                              >
                                #
                              </th>

                              <th>
                                Question
                              </th>

                              <th
                                style={{
                                  minWidth:
                                    "180px",
                                }}
                              >
                                Your Answer
                              </th>

                              <th
                                style={{
                                  minWidth:
                                    "200px",
                                }}
                              >
                                Correct Answer
                              </th>

                              <th
                                style={{
                                  minWidth:
                                    "120px",
                                }}
                              >
                                Result
                              </th>

                            </tr>

                          </thead>

                          <tbody>

                            {reviewRows.map(
                              (
                                item
                              ) => (

                                <tr
                                  key={
                                    item.id
                                  }
                                >

                                  {/* NUMBER */}

                                  <td>

                                    {
                                      item.number
                                    }

                                  </td>

                                  {/* QUESTION */}

                                  <td>

                                    <b>
                                      {
                                        item.question
                                      }
                                    </b>

                                    {item.explanation &&
                                      item.explanation !==
                                        "NA" && (

                                      <small className="d-block text-muted mt-1">

                                        {
                                          item.explanation
                                        }

                                      </small>

                                    )}

                                  </td>

                                  {/* =================================
                                      YOUR ANSWER
                                  ================================= */}

                                  <td>

                                    {item.selectedIndex !==
                                    null ? (

                                      <div>

                                        <span
                                          className={`badge me-2 ${
                                            item.isCorrect
                                              ? "text-bg-success"
                                              : "text-bg-danger"
                                          }`}
                                        >
                                          {
                                            item.selectedLetter
                                          }
                                        </span>

                                        <span>
                                          {
                                            item.selectedText
                                          }
                                        </span>

                                      </div>

                                    ) : (

                                      <span className="text-muted">

                                        Not Attempted

                                      </span>

                                    )}

                                  </td>

                                  {/* =================================
                                      CORRECT ANSWER
                                  ================================= */}

                                  <td>

                                    <span className="badge text-bg-success me-2">

                                      {
                                        item.correctLetter
                                      }

                                    </span>

                                    <b className="text-success">

                                      {
                                        item.correctText
                                      }

                                    </b>

                                  </td>

                                  {/* =================================
                                      RESULT
                                  ================================= */}

                                  <td>

                                    {item.selectedIndex ===
                                    null ? (

                                      <span className="badge text-bg-secondary">

                                        Not Attempted

                                      </span>

                                    ) : item.isCorrect ? (

                                      <span className="badge text-bg-success">

                                        ✓ Correct

                                      </span>

                                    ) : (

                                      <span className="badge text-bg-danger">

                                        ✕ Wrong

                                      </span>

                                    )}

                                  </td>

                                </tr>

                              )
                            )}

                          </tbody>

                        </table>

                      </div>

                    </>

                  )}

                </div>

                {/* ===========================================
                    FOOTER
                =========================================== */}

                <div className="modal-footer">

                  <div className="me-auto">

                    <small className="text-muted">

                      Correct answers are available only after
                      the faculty enables Answer Key Visibility.

                    </small>

                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={
                      closeAnswerReview
                    }
                  >
                    Close
                  </button>

                </div>

              </div>

            </div>

          </div>

        </>

      )}

    </>
  );
}