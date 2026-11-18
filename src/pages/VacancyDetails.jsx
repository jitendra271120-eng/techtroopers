import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  serverTimestamp,
} from "firebase/firestore";

import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import toast from "react-hot-toast";

import PageMeta from "../components/PageMeta";

import {
  getRecord,
  addRecord,
  listCollection,
} from "../services/firestoreService";

import {
  useAuth,
} from "../contexts/AuthContext";

import {
  storage,
} from "../config/firebase";

import {
  normalizeJobPost,
} from "../utils/firestoreAdapters";

/* ============================================================
   CONFIG
============================================================ */

const MAX_RESUME_SIZE =
  5 * 1024 * 1024;

const ALLOWED_RESUME_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
];

const ALLOWED_RESUME_TYPES = [
  "application/pdf",

  "application/msword",

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/* ============================================================
   HELPERS
============================================================ */

const isValidUrl = (
  value
) => {
  if (!value) {
    return false;
  }

  try {
    const url =
      new URL(value);

    return (
      url.protocol ===
        "http:" ||
      url.protocol ===
        "https:"
    );
  } catch {
    return false;
  }
};

const getFileExtension = (
  fileName
) => {
  return String(
    fileName || ""
  )
    .split(".")
    .pop()
    .toLowerCase();
};

/* ============================================================
   COMPONENT
============================================================ */

export default function VacancyDetails() {
  const {
    id,
  } = useParams();

  const {
    user,
  } = useAuth();

  /* ==========================================================
     VACANCY
  ========================================================== */

  const [
    vacancy,
    setVacancy,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* ==========================================================
     APPLICATION FORM
  ========================================================== */

  const [
    mobile,
    setMobile,
  ] = useState("");

  const [
    resumeURL,
    setResumeURL,
  ] = useState("");

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    applying,
    setApplying,
  ] = useState(false);

  const [
    errors,
    setErrors,
  ] = useState({});

  const fileRef =
    useRef();

  /* ==========================================================
     LOAD VACANCY
  ========================================================== */

  useEffect(() => {
    let active =
      true;

    const loadVacancy =
      async () => {
        try {
          setLoading(
            true
          );

          const record =
            await getRecord(
              "jobPosts",
              id
            );

          if (
            record &&
            active
          ) {
            setVacancy(
              normalizeJobPost(
                record
              )
            );
          }
        } catch (
          error
        ) {
          console.error(
            "Vacancy loading error:",
            error
          );

          toast.error(
            error?.message ||
              "Unable to load vacancy."
          );
        } finally {
          if (active) {
            setLoading(
              false
            );
          }
        }
      };

    loadVacancy();

    return () => {
      active =
        false;
    };
  }, [id]);

  /* ==========================================================
     CLEAR ERROR
  ========================================================== */

  const clearError = (
    field
  ) => {
    setErrors(
      (previous) => ({
        ...previous,
        [field]: "",
      })
    );
  };

  /* ==========================================================
     MOBILE CHANGE
  ========================================================== */

  const handleMobileChange =
    (event) => {
      /*
       * Numbers only.
       *
       * Indian mobile number:
       * maximum 10 digits.
       */

      const value =
        event.target.value
          .replace(
            /\D/g,
            ""
          )
          .slice(
            0,
            10
          );

      setMobile(
        value
      );

      clearError(
        "mobile"
      );
    };

  /* ==========================================================
     RESUME URL CHANGE
  ========================================================== */

  const handleResumeUrlChange =
    (event) => {
      setResumeURL(
        event.target.value
      );

      clearError(
        "resume"
      );
    };

  /* ==========================================================
     VALIDATE RESUME FILE
  ========================================================== */

  const validateResumeFile = (
    file
  ) => {
    if (!file) {
      return {
        valid: false,
        message:
          "Please select a resume file.",
      };
    }

    const extension =
      getFileExtension(
        file.name
      );

    if (
      !ALLOWED_RESUME_EXTENSIONS.includes(
        extension
      )
    ) {
      return {
        valid: false,
        message:
          "Resume must be PDF, DOC or DOCX.",
      };
    }

    /*
     * Some browsers may provide an empty MIME type.
     * Therefore extension validation remains the primary check.
     */

    if (
      file.type &&
      !ALLOWED_RESUME_TYPES.includes(
        file.type
      )
    ) {
      return {
        valid: false,
        message:
          "Invalid resume file type.",
      };
    }

    if (
      file.size >
      MAX_RESUME_SIZE
    ) {
      return {
        valid: false,
        message:
          "Resume size must not exceed 5 MB.",
      };
    }

    return {
      valid: true,
      message: "",
    };
  };

  /* ==========================================================
     UPLOAD RESUME
  ========================================================== */

  const uploadResume =
    async (file) => {
      if (!file) {
        return;
      }

      /* ===============================================
         USER MUST LOGIN BEFORE UPLOAD
      =============================================== */

      if (!user) {
        toast.error(
          "Please login before uploading your resume."
        );

        if (
          fileRef.current
        ) {
          fileRef.current.value =
            "";
        }

        return;
      }

      /* ===============================================
         VALIDATE
      =============================================== */

      const validation =
        validateResumeFile(
          file
        );

      if (
        !validation.valid
      ) {
        setErrors(
          (previous) => ({
            ...previous,
            resume:
              validation.message,
          })
        );

        toast.error(
          validation.message
        );

        if (
          fileRef.current
        ) {
          fileRef.current.value =
            "";
        }

        return;
      }

      setUploading(
        true
      );

      clearError(
        "resume"
      );

      try {
        /* =============================================
           SAFE FILENAME
        ============================================= */

        const safeName =
          file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );

        /* =============================================
           FIREBASE STORAGE PATH
        ============================================= */

        const storageRef =
          ref(
            storage,
            `job-resumes/${
              user.uid
            }/${Date.now()}_${safeName}`
          );

        /* =============================================
           UPLOAD
        ============================================= */

        await uploadBytes(
          storageRef,
          file
        );

        const url =
          await getDownloadURL(
            storageRef
          );

        setResumeURL(
          url
        );

        toast.success(
          "Resume uploaded successfully."
        );
      } catch (
        error
      ) {
        console.error(
          "Resume upload error:",
          error
        );

        setErrors(
          (previous) => ({
            ...previous,
            resume:
              error?.message ||
              "Unable to upload resume.",
          })
        );

        toast.error(
          error?.message ||
            "Unable to upload resume."
        );
      } finally {
        setUploading(
          false
        );

        if (
          fileRef.current
        ) {
          fileRef.current.value =
            "";
        }
      }
    };

  /* ==========================================================
     VALIDATE APPLICATION
  ========================================================== */

  const validateApplication =
    () => {
      const nextErrors =
        {};

      /* ===============================================
         LOGIN
      =============================================== */

      if (!user) {
        nextErrors.user =
          "Please login before applying.";
      }

      /* ===============================================
         VACANCY
      =============================================== */

      if (!vacancy) {
        nextErrors.vacancy =
          "Vacancy information is unavailable.";
      }

      /* ===============================================
         VACANCY STATUS
      =============================================== */

      const status =
        String(
          vacancy?.status ||
            ""
        )
          .trim()
          .toLowerCase();

      if (
        status &&
        [
          "closed",
          "inactive",
          "expired",
          "filled",
        ].includes(
          status
        )
      ) {
        nextErrors.vacancy =
          "Applications are closed for this vacancy.";
      }

      /* ===============================================
         NAME
      =============================================== */

      const name =
        String(
          user?.name ||
            user?.displayName ||
            ""
        ).trim();

      if (
        user &&
        !name
      ) {
        nextErrors.user =
          "Your profile name is missing.";
      }

      /* ===============================================
         EMAIL
      =============================================== */

      const email =
        String(
          user?.email ||
            ""
        ).trim();

      if (
        user &&
        !email
      ) {
        nextErrors.user =
          "Your account email is missing.";
      }

      /* ===============================================
         MOBILE
      =============================================== */

      const cleanMobile =
        mobile
          .replace(
            /\D/g,
            ""
          )
          .trim();

      if (
        !cleanMobile
      ) {
        nextErrors.mobile =
          "Mobile number is required.";
      } else if (
        !/^[6-9]\d{9}$/.test(
          cleanMobile
        )
      ) {
        nextErrors.mobile =
          "Enter a valid 10-digit mobile number.";
      }

      /* ===============================================
         RESUME
      =============================================== */

      const cleanResume =
        resumeURL.trim();

      if (
        !cleanResume
      ) {
        nextErrors.resume =
          "Please upload your resume or enter a resume URL.";
      } else if (
        !isValidUrl(
          cleanResume
        )
      ) {
        nextErrors.resume =
          "Please enter a valid resume URL.";
      }

      setErrors(
        nextErrors
      );

      if (
        Object.keys(
          nextErrors
        ).length
      ) {
        const firstError =
          Object.values(
            nextErrors
          )[0];

        toast.error(
          firstError
        );

        return false;
      }

      return true;
    };

  /* ==========================================================
     CHECK DUPLICATE APPLICATION
  ========================================================== */

  const hasExistingApplication =
    async () => {
      if (
        !user?.uid ||
        !id
      ) {
        return false;
      }

      /*
       * Search applications from this user.
       *
       * Then verify jobId locally.
       *
       * This avoids needing a compound Firestore index.
       */

      const records =
        await listCollection(
          "jobApplications",
          {
            filters: [
              [
                "userId",
                "==",
                user.uid,
              ],
            ],
          }
        );

      return records.some(
        (record) =>
          String(
            record.jobId ||
              ""
          ) ===
          String(id)
      );
    };

  /* ==========================================================
     APPLY
  ========================================================== */

  const apply =
    async () => {
      /* ===============================================
         PREVENT DOUBLE CLICK
      =============================================== */

      if (
        applying ||
        uploading
      ) {
        return;
      }

      /* ===============================================
         VALIDATE
      =============================================== */

      if (
        !validateApplication()
      ) {
        return;
      }

      try {
        setApplying(
          true
        );

        /* =============================================
           DUPLICATE APPLICATION
        ============================================= */

        const alreadyApplied =
          await hasExistingApplication();

        if (
          alreadyApplied
        ) {
          setErrors(
            (previous) => ({
              ...previous,
              duplicate:
                "You have already applied for this vacancy.",
            })
          );

          toast.error(
            "You have already applied for this vacancy."
          );

          return;
        }

        /* =============================================
           CLEAN VALUES
        ============================================= */

        const cleanMobile =
          mobile.trim();

        const cleanResume =
          resumeURL.trim();

        const applicantName =
          user?.name ||
          user?.displayName ||
          "";

        /* =============================================
           COMMON DATA
        ============================================= */

        const common = {
          jobId:
            id,

          resumeURL:
            cleanResume,

          status:
            "applied",
        };

        /* =============================================
           JOB APPLICATION
        ============================================= */

        await addRecord(
          "jobApplications",
          {
            ...common,

            userId:
              user.uid,

            email:
              user.email ||
              "",

            rollNumber:
              user.rollNumber ||
              "",

            appliedOn:
              serverTimestamp(),
          }
        );

        /* =============================================
           JOB APPLICANT DETAILS
        ============================================= */

        await addRecord(
          "jobApplicants",
          {
            jobId:
              id,

            jobTitle:
              vacancy.title,

            company:
              vacancy.company ||
              "",

            userId:
              user.uid,

            name:
              applicantName,

            email:
              user.email ||
              "",

            mobile:
              cleanMobile,

            resumeURL:
              cleanResume,

            status:
              "applied",

            createdAt:
              serverTimestamp(),
          }
        );

        /* =============================================
           SUCCESS
        ============================================= */

        toast.success(
          "Application submitted successfully."
        );

        setMobile(
          ""
        );

        setResumeURL(
          ""
        );

        setErrors(
          {}
        );

        if (
          fileRef.current
        ) {
          fileRef.current.value =
            "";
        }
      } catch (
        error
      ) {
        console.error(
          "Application submission error:",
          error
        );

        toast.error(
          error?.message ||
            "Unable to submit application."
        );
      } finally {
        setApplying(
          false
        );
      }
    };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    loading
  ) {
    return (
      <div className="section container-xxl">

        <div className="d-flex align-items-center gap-2">

          <div
            className="spinner-border spinner-border-sm text-primary"
            role="status"
          />

          <span>
            Loading vacancy…
          </span>

        </div>

      </div>
    );
  }

  /* ==========================================================
     NOT FOUND
  ========================================================== */

  if (
    !vacancy
  ) {
    return (
      <div className="section container-xxl">

        <h2>
          Vacancy not found
        </h2>

        <Link
          to="/vacancies"
          className="btn btn-light border mt-3"
        >
          Back to Vacancies
        </Link>

      </div>
    );
  }

  /* ==========================================================
     STATUS
  ========================================================== */

  const vacancyStatus =
    String(
      vacancy.status ||
        "Open"
    );

  const vacancyClosed =
    [
      "closed",
      "inactive",
      "expired",
      "filled",
    ].includes(
      vacancyStatus
        .trim()
        .toLowerCase()
    );

  /* ==========================================================
     PAGE
  ========================================================== */

  return (
    <>
      <PageMeta
        title={
          vacancy.title
        }
      />

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="page-hero">

        <div className="container-xxl">

          <span className="eyebrow">
            {vacancy.jobType ||
              "OPPORTUNITY"}
          </span>

          <h1>
            {vacancy.title}
          </h1>

          <p>
            {vacancy.company ||
              "Company"}
            {" · "}
            {vacancy.location ||
              "Location not specified"}
          </p>

        </div>

      </section>

      {/* =====================================================
          BODY
      ===================================================== */}

      <main className="section">

        <div className="container-xxl exam-welcome-grid">

          {/* =================================================
              JOB DETAILS
          ================================================= */}

          <article className="content-card">

            <h3>
              Role overview
            </h3>

            <p>
              {vacancy.description ||
                "No description available."}
            </p>

            <h5 className="mt-4">
              Details
            </h5>

            <div className="tags">

              {[
                vacancy.category,
                vacancy.experienceLevel,
                ...(Array.isArray(
                  vacancy.skills
                )
                  ? vacancy.skills
                  : []),
              ]
                .filter(
                  Boolean
                )
                .map(
                  (
                    skill,
                    index
                  ) => (
                    <span
                      key={`${skill}-${index}`}
                    >
                      {skill}
                    </span>
                  )
                )}

            </div>

            <div className="row mt-4 g-3">

              <div className="col-sm-4">

                <small className="text-muted">
                  Job Type
                </small>

                <b className="d-block">
                  {vacancy.jobType ||
                    "-"}
                </b>

              </div>

              <div className="col-sm-4">

                <small className="text-muted">
                  Apply Mode
                </small>

                <b className="d-block">
                  {vacancy.applyMode ||
                    "-"}
                </b>

              </div>

              <div className="col-sm-4">

                <small className="text-muted">
                  Status
                </small>

                <b
                  className={`d-block ${
                    vacancyClosed
                      ? "text-danger"
                      : "text-success"
                  }`}
                >
                  {
                    vacancyStatus
                  }
                </b>

              </div>

            </div>

          </article>

          {/* =================================================
              APPLY FORM
          ================================================= */}

          <aside className="content-card">

            <span className="eyebrow">
              APPLICATION
            </span>

            <h3>
              Apply
            </h3>

            <p className="text-muted">
              Complete the details below to submit your
              application.
            </p>

            {/* ===============================================
                LOGIN
            =============================================== */}

            {!user && (

              <div className="alert alert-warning">

                Please login before applying for this vacancy.

              </div>

            )}

            {/* ===============================================
                CLOSED
            =============================================== */}

            {vacancyClosed && (

              <div className="alert alert-danger">

                Applications for this vacancy are currently
                closed.

              </div>

            )}

            {/* ===============================================
                APPLICANT
            =============================================== */}

            {user && (

              <div className="border rounded p-3 mb-3 bg-light">

                <small className="text-muted">
                  Applying as
                </small>

                <div className="fw-semibold">
                  {user.name ||
                    user.displayName ||
                    "Candidate"}
                </div>

                <small className="text-muted">
                  {user.email}
                </small>

              </div>

            )}

            {/* ===============================================
                MOBILE
            =============================================== */}

            <label className="form-label">
              Mobile Number{" "}
              <span className="text-danger">
                *
              </span>
            </label>

            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className={`form-control ${
                errors.mobile
                  ? "is-invalid"
                  : ""
              }`}
              value={
                mobile
              }
              onChange={
                handleMobileChange
              }
              placeholder="Enter 10-digit mobile number"
              disabled={
                applying ||
                vacancyClosed
              }
            />

            {errors.mobile && (

              <div className="invalid-feedback">
                {errors.mobile}
              </div>

            )}

            <div className="d-flex justify-content-between mt-1">

              <small className="text-muted">
                Numbers only
              </small>

              <small
                className={
                  mobile.length ===
                  10
                    ? "text-success"
                    : "text-muted"
                }
              >
                {mobile.length}
                /10
              </small>

            </div>

            {/* ===============================================
                RESUME URL
            =============================================== */}

            <label className="form-label mt-3">
              Resume URL
            </label>

            <input
              type="url"
              className={`form-control ${
                errors.resume
                  ? "is-invalid"
                  : ""
              }`}
              value={
                resumeURL
              }
              onChange={
                handleResumeUrlChange
              }
              placeholder="https://..."
              disabled={
                uploading ||
                applying ||
                vacancyClosed
              }
            />

            {/* ===============================================
                OR
            =============================================== */}

            <div className="text-center text-muted my-2">
              <small>
                — OR —
              </small>
            </div>

            {/* ===============================================
                RESUME UPLOAD
            =============================================== */}

            <label className="form-label">
              Upload Resume{" "}
              <span className="text-danger">
                *
              </span>
            </label>

            <input
              ref={fileRef}
              type="file"
              className={`form-control ${
                errors.resume
                  ? "is-invalid"
                  : ""
              }`}
              accept=".pdf,.doc,.docx"
              disabled={
                uploading ||
                applying ||
                vacancyClosed
              }
              onChange={(
                event
              ) =>
                uploadResume(
                  event.target
                    .files?.[0]
                )
              }
            />

            {errors.resume && (

              <div className="invalid-feedback">
                {errors.resume}
              </div>

            )}

            <small className="text-muted d-block mt-1">
              PDF, DOC or DOCX only. Maximum size 5 MB.
            </small>

            {/* ===============================================
                UPLOAD STATUS
            =============================================== */}

            {uploading && (

              <div className="alert alert-info py-2 mt-3 mb-0">

                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                />

                Uploading resume…

              </div>

            )}

            {/* ===============================================
                RESUME READY
            =============================================== */}

            {!uploading &&
              resumeURL &&
              isValidUrl(
                resumeURL
              ) && (

              <div className="alert alert-success py-2 mt-3 mb-0">

                ✓ Resume is ready for submission.

              </div>

            )}

            {/* ===============================================
                DUPLICATE ERROR
            =============================================== */}

            {errors.duplicate && (

              <div className="alert alert-warning py-2 mt-3">

                {errors.duplicate}

              </div>

            )}

            {/* ===============================================
                APPLY BUTTON
            =============================================== */}

            <button
              type="button"
              className="btn btn-primary w-100 mt-3"
              onClick={
                apply
              }
              disabled={
                uploading ||
                applying ||
                vacancyClosed ||
                !user
              }
            >

              {uploading
                ? "Uploading Resume…"
                : applying
                ? "Submitting Application…"
                : vacancyClosed
                ? "Applications Closed"
                : "Submit Application"}

            </button>

            {/* ===============================================
                BACK
            =============================================== */}

            <Link
              className="btn btn-light border w-100 mt-2"
              to="/vacancies"
            >
              Back to Vacancies
            </Link>

          </aside>

        </div>

      </main>
    </>
  );
}