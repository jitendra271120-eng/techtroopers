import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import PageMeta from "../components/PageMeta";
import { db } from "../config/firebase";

/* ============================================================
   NORMALIZE ROADMAP STEP
============================================================ */

function normalizeStep(step, index) {
  if (typeof step === "string") {
    return {
      id: `step-${index}`,
      title: step,
      description: "",
      duration: "",
    };
  }

  return {
    id:
      step?.id ||
      `step-${index}`,

    title:
      step?.title ||
      step?.name ||
      step?.topic ||
      step?.label ||
      `Step ${index + 1}`,

    description:
      step?.description ||
      step?.desc ||
      step?.details ||
      "",

    duration:
      step?.duration ||
      step?.time ||
      step?.weeks ||
      "",
  };
}

/* ============================================================
   NORMALIZE ROADMAP DOCUMENT

   Supports older + newer field names.
============================================================ */

function normalizeRoadmap(data) {
  const rawSteps =
    data.steps ||
    data.roadmapSteps ||
    data.modules ||
    data.topics ||
    data.path ||
    [];

  return {
    id: data.id,

    title:
      data.title ||
      data.name ||
      data.roadmapName ||
      "Untitled Roadmap",

    description:
      data.description ||
      data.subtitle ||
      "",

    level:
      data.level ||
      data.difficulty ||
      "Beginner → Advanced",

    duration:
      data.duration ||
      data.weeks ||
      data.totalDuration ||
      "",

    category:
      data.category ||
      data.domain ||
      "Technology",

    icon:
      data.icon ||
      "",

    color:
      data.color ||
      "#2370f2",

    steps:
      Array.isArray(rawSteps)
        ? rawSteps.map(normalizeStep)
        : [],

    status:
      data.status ||
      "Published",

    order:
      Number(
        data.order ?? 999
      ),

    createdAt:
      data.createdAt ||
      null,
  };
}

/* ============================================================
   ROADMAP ICON
============================================================ */

function getCategoryIcon(value = "") {
  const name =
    value.toLowerCase();

  if (
    name.includes("java") ||
    name.includes("spring")
  ) {
    return "bi-cup-hot";
  }

  if (
    name.includes("frontend") ||
    name.includes("react") ||
    name.includes("web")
  ) {
    return "bi-window";
  }

  if (
    name.includes("python")
  ) {
    return "bi-filetype-py";
  }

  if (
    name.includes("data")
  ) {
    return "bi-bar-chart";
  }

  if (
    name.includes("ai") ||
    name.includes("machine")
  ) {
    return "bi-cpu";
  }

  if (
    name.includes("cloud")
  ) {
    return "bi-cloud";
  }

  if (
    name.includes("cyber")
  ) {
    return "bi-shield-lock";
  }

  if (
    name.includes("mobile") ||
    name.includes("android")
  ) {
    return "bi-phone";
  }

  if (
    name.includes("devops")
  ) {
    return "bi-infinity";
  }

  return "bi-signpost-split";
}

/* ============================================================
   ROADMAP PAGE
============================================================ */

export default function RoadMaps() {
  const [roadmaps, setRoadmaps] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [selectedRoadmap, setSelectedRoadmap] =
    useState(null);

  /* ========================================================
     FETCH FIRESTORE ROADMAPS

     IMPORTANT:
     No demoData fallback is used.
  ======================================================== */

  useEffect(() => {
    setLoading(true);
    setError("");

    const roadmapsRef =
      collection(
        db,
        "roadmaps"
      );

    const unsubscribe =
      onSnapshot(
        roadmapsRef,

        (snapshot) => {
          const rows =
            snapshot.docs
              .map((item) =>
                normalizeRoadmap({
                  id: item.id,
                  ...item.data(),
                })
              )
              .filter(
                (roadmap) =>
                  roadmap.status !==
                    "Draft" &&
                  roadmap.status !==
                    "Hidden" &&
                  roadmap.status !==
                    "Inactive"
              )
              .sort(
                (a, b) =>
                  a.order -
                  b.order
              );

          setRoadmaps(rows);

          setLoading(false);
        },

        (err) => {
          console.error(
            "Roadmaps error:",
            err
          );

          setError(
            err?.message ||
              "Unable to load roadmaps."
          );

          setRoadmaps([]);

          setLoading(false);
        }
      );

    return () =>
      unsubscribe();
  }, []);

  /* ========================================================
     CATEGORY LIST
  ======================================================== */

  const categories =
    useMemo(() => {
      return [
        "All",

        ...new Set(
          roadmaps
            .map(
              (roadmap) =>
                roadmap.category
            )
            .filter(Boolean)
        ),
      ];
    }, [roadmaps]);

  /* ========================================================
     FILTER ROADMAPS
  ======================================================== */

  const filteredRoadmaps =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return roadmaps.filter(
        (roadmap) => {
          const categoryMatch =
            category === "All" ||
            roadmap.category ===
              category;

          const searchableText =
            [
              roadmap.title,
              roadmap.description,
              roadmap.level,
              roadmap.category,
              roadmap.duration,

              ...roadmap.steps.map(
                (step) =>
                  step.title
              ),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const searchMatch =
            !value ||
            searchableText.includes(
              value
            );

          return (
            categoryMatch &&
            searchMatch
          );
        }
      );
    }, [
      roadmaps,
      search,
      category,
    ]);

  /* ========================================================
     LOCK BODY WHEN ROADMAP POPUP IS OPEN
  ======================================================== */

  useEffect(() => {
    if (!selectedRoadmap) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleEscape = (
      event
    ) => {
      if (
        event.key === "Escape"
      ) {
        setSelectedRoadmap(
          null
        );
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [selectedRoadmap]);

  return (
    <>
      <PageMeta
        title="Learning Roadmaps"
        description="Structured technology learning roadmaps."
      />

      {/* ====================================================
          HERO
      ==================================================== */}

      <section className="rm-hero">
        <div className="container-xxl">

          <div className="rm-hero-grid">

            <div className="rm-hero-copy">

              <span className="rm-kicker">
                LEARNING PATHS
              </span>

              <h1>
                Follow a clear path.
                <span>
                  {" "}
                  Learn step by step.
                </span>
              </h1>

              <p>
                Choose a technology roadmap and
                follow a structured sequence from
                fundamentals to advanced concepts.
              </p>

            </div>

            <div className="rm-stat-card">

              <div>
                <i className="bi bi-signpost-split-fill" />
              </div>

              <strong>
                {roadmaps.length}
              </strong>

              <span>
                Learning Roadmaps
              </span>

            </div>

          </div>

        </div>
      </section>

      {/* ====================================================
          MAIN
      ==================================================== */}

      <main className="rm-main">
        <div className="container-xxl">

          {/* ==================================================
              FILTER TOOLBAR
          ================================================== */}

          <div className="rm-toolbar">

            <div className="rm-search">

              <i className="bi bi-search" />

              <input
                type="text"
                placeholder="Search roadmap, technology or topic..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                >
                  <i className="bi bi-x-lg" />
                </button>
              )}

            </div>

            <select
              className="form-select"
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
            >

              {categories.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}

            </select>

            <div className="rm-count">

              {filteredRoadmaps.length}

              <span>
                Roadmaps
              </span>

            </div>

          </div>

          {/* ==================================================
              FIRESTORE ERROR
          ================================================== */}

          {error && (
            <div className="alert alert-danger mt-3">

              <strong>
                Could not load Roadmaps:
              </strong>{" "}

              {error}

            </div>
          )}

          {/* ==================================================
              LOADING
          ================================================== */}

          {loading && (
            <div className="rm-loading">

              <div className="spinner-border text-primary" />

              <h3>
                Loading roadmaps...
              </h3>

              <p>
                Fetching current roadmap data
                from Firestore.
              </p>

            </div>
          )}

          {/* ==================================================
              EMPTY
          ================================================== */}

          {!loading &&
            !error &&
            !filteredRoadmaps.length && (
              <div className="rm-empty">

                <div className="rm-empty-icon">
                  <i className="bi bi-signpost" />
                </div>

                <h3>
                  No roadmap found
                </h3>

                <p>
                  No matching roadmap is currently
                  available in the{" "}
                  <code>
                    roadmaps
                  </code>{" "}
                  collection.
                </p>

              </div>
            )}

          {/* ==================================================
              3 CARDS PER ROW
          ================================================== */}

          {!loading && (
            <div className="rm-grid">

              {filteredRoadmaps.map(
                (
                  roadmap,
                  roadmapIndex
                ) => (
                  <article
                    className="rm-card"
                    key={roadmap.id}
                  >

                    {/* ========================================
                        CARD TOP
                    ======================================== */}

                    <div className="rm-card-top">

                      <div
                        className="rm-icon"
                        style={{
                          "--rm-color":
                            roadmap.color,
                        }}
                      >

                        <i
                          className={`bi ${
                            roadmap.icon ||
                            getCategoryIcon(
                              `${roadmap.title} ${roadmap.category}`
                            )
                          }`}
                        />

                      </div>

                      <span className="rm-card-number">

                        {String(
                          roadmapIndex +
                            1
                        ).padStart(
                          2,
                          "0"
                        )}

                      </span>

                    </div>

                    {/* ========================================
                        ROADMAP INFORMATION
                    ======================================== */}

                    <span className="rm-category">

                      {roadmap.category}

                    </span>

                    <h2>
                      {roadmap.title}
                    </h2>

                    <p className="rm-level">
                      {roadmap.level}
                    </p>

                    {roadmap.description && (
                      <p className="rm-description">

                        {
                          roadmap.description
                        }

                      </p>
                    )}

                    {/* ========================================
                        META
                    ======================================== */}

                    <div className="rm-meta">

                      {roadmap.duration && (
                        <span>

                          <i className="bi bi-clock" />

                          {
                            roadmap.duration
                          }

                        </span>
                      )}

                      <span>

                        <i className="bi bi-diagram-3" />

                        {
                          roadmap.steps.length
                        }{" "}
                        Steps

                      </span>

                    </div>

                    {/* ========================================
                        FLOW CHART PREVIEW
                    ======================================== */}

                    <div className="rm-mini-flow">

                      {roadmap.steps.length ===
                      0 ? (
                        <div className="rm-no-step">

                          Steps not added yet

                        </div>
                      ) : (
                        <>
                          {roadmap.steps
                            .slice(
                              0,
                              4
                            )
                            .map(
                              (
                                step,
                                stepIndex
                              ) => (
                                <div
                                  className="rm-mini-group"
                                  key={
                                    step.id
                                  }
                                >

                                  <div className="rm-mini-node">

                                    <span>
                                      {String(
                                        stepIndex +
                                          1
                                      ).padStart(
                                        2,
                                        "0"
                                      )}
                                    </span>

                                    <strong>
                                      {
                                        step.title
                                      }
                                    </strong>

                                  </div>

                                  {stepIndex <
                                    Math.min(
                                      roadmap
                                        .steps
                                        .length,
                                      4
                                    ) -
                                      1 && (
                                    <div className="rm-mini-connector">

                                      <span />

                                      <i className="bi bi-chevron-down" />

                                    </div>
                                  )}

                                </div>
                              )
                            )}

                          {roadmap.steps.length >
                            4 && (
                            <div className="rm-more-steps">

                              +
                              {roadmap.steps
                                .length -
                                4}{" "}
                              more steps

                            </div>
                          )}
                        </>
                      )}

                    </div>

                    {/* ========================================
                        BUTTON
                    ======================================== */}

                    <button
                      type="button"
                      className="rm-open-btn"
                      onClick={() =>
                        setSelectedRoadmap(
                          roadmap
                        )
                      }
                    >

                      <span>
                        View Complete Roadmap
                      </span>

                      <i className="bi bi-arrow-right" />

                    </button>

                  </article>
                )
              )}

            </div>
          )}

        </div>
      </main>

      {/* ====================================================
          FLOWCHART POPUP
      ==================================================== */}

      {selectedRoadmap && (
        <div
          className="rm-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedRoadmap(
                null
              );
            }
          }}
        >

          <div className="rm-modal">

            {/* ==============================================
                MODAL HEADER
            ============================================== */}

            <div className="rm-modal-header">

              <div className="rm-modal-title">

                <div
                  className="rm-modal-icon"
                  style={{
                    "--rm-color":
                      selectedRoadmap.color,
                  }}
                >

                  <i
                    className={`bi ${
                      selectedRoadmap.icon ||
                      getCategoryIcon(
                        `${selectedRoadmap.title} ${selectedRoadmap.category}`
                      )
                    }`}
                  />

                </div>

                <div>

                  <span>
                    {
                      selectedRoadmap.category
                    }
                  </span>

                  <h2>
                    {
                      selectedRoadmap.title
                    }
                  </h2>

                  <p>

                    {
                      selectedRoadmap.level
                    }

                    {selectedRoadmap.duration
                      ? ` • ${selectedRoadmap.duration}`
                      : ""}

                  </p>

                </div>

              </div>

              <button
                type="button"
                className="rm-close-btn"
                onClick={() =>
                  setSelectedRoadmap(
                    null
                  )
                }
              >

                <i className="bi bi-x-lg" />

              </button>

            </div>

            {/* ==============================================
                DESCRIPTION
            ============================================== */}

            {selectedRoadmap.description && (
              <div className="rm-modal-description">

                {
                  selectedRoadmap.description
                }

              </div>
            )}

            {/* ==============================================
                FULL ROADMAP FLOWCHART
            ============================================== */}

            <div className="rm-modal-body">

              {!selectedRoadmap.steps
                .length ? (
                <div className="rm-flow-empty">

                  <div>
                    <i className="bi bi-diagram-3" />
                  </div>

                  <h3>
                    Roadmap steps not added
                  </h3>

                  <p>
                    Add steps from the Roadmap
                    Admin page.
                  </p>

                </div>
              ) : (
                <div className="rm-flowchart">

                  {selectedRoadmap.steps.map(
                    (
                      step,
                      index
                    ) => (
                      <div
                        className="rm-flow-group"
                        key={step.id}
                      >

                        {/* ====================================
                            FLOW NODE
                        ==================================== */}

                        <div className="rm-flow-node">

                          <div className="rm-flow-number">

                            {String(
                              index + 1
                            ).padStart(
                              2,
                              "0"
                            )}

                          </div>

                          <div className="rm-flow-content">

                            <span>
                              STEP{" "}
                              {index + 1}
                            </span>

                            <h3>
                              {
                                step.title
                              }
                            </h3>

                            {step.description && (
                              <p>

                                {
                                  step.description
                                }

                              </p>
                            )}

                            {step.duration && (
                              <small>

                                <i className="bi bi-clock" />

                                {
                                  step.duration
                                }

                              </small>
                            )}

                          </div>

                          <div className="rm-flow-check">

                            <i className="bi bi-check2" />

                          </div>

                        </div>

                        {/* ====================================
                            CONNECTOR
                        ==================================== */}

                        {index <
                          selectedRoadmap
                            .steps
                            .length -
                            1 && (
                          <div className="rm-flow-connector">

                            <span />

                            <div>
                              <i className="bi bi-chevron-down" />
                            </div>

                          </div>
                        )}

                      </div>
                    )
                  )}

                  {/* ==========================================
                      COMPLETION NODE
                  ========================================== */}

                  <div className="rm-finish-node">

                    <div className="rm-finish-icon">

                      <i className="bi bi-trophy-fill" />

                    </div>

                    <span>
                      ROADMAP COMPLETE
                    </span>

                    <h3>
                      Ready for the next level
                    </h3>

                    <p>
                      You have completed the
                      recommended learning path.
                    </p>

                  </div>

                </div>
              )}

            </div>

            {/* ==============================================
                MODAL FOOTER
            ============================================== */}

            <div className="rm-modal-footer">

              <span>

                <i className="bi bi-info-circle" />

                Follow each step in order for
                better learning progression.

              </span>

              <button
                className="btn btn-light border"
                onClick={() =>
                  setSelectedRoadmap(
                    null
                  )
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ====================================================
          CSS
      ==================================================== */}

      <style>{`

        :root {

          --rm-primary:
            #2370f2;

          --rm-heading:
            #172033;

          --rm-text:
            #738095;

          --rm-border:
            #e3e8ef;

          --rm-soft:
            #f7f9fc;

        }


        /* =================================================
           HERO
        ================================================= */

        .rm-hero {

          padding:
            35px 0 32px;

          background:

            radial-gradient(
              circle at 92% 12%,
              rgba(35,112,242,.07),
              transparent 27%
            ),

            #fbfcff;

          border-bottom:
            1px solid #edf1f5;

        }


        .rm-hero-grid {

          display:
            flex;

          justify-content:
            space-between;

          align-items:
            center;

          gap:
            35px;

        }


        .rm-hero-copy {

          min-width:
            0;

        }


        .rm-kicker {

          display:
            inline-flex;

          align-items:
            center;

          gap:
            7px;

          color:
            #2370f2;

          font-family:
            Inter,
            "Poppins",
            sans-serif;

          font-size:
            9px;

          font-weight:
            600;

          letter-spacing:
            1.4px;

        }


        .rm-kicker::before {

          content:
            "";

          width:
            20px;

          height:
            2px;

          background:
            #2370f2;

        }


        .rm-hero h1 {

          max-width:
            760px;

          margin:
            8px 0 8px;

          color:
            #172033;

          font-family:
            Inter,
            "Poppins",
            sans-serif;

          font-size:
            clamp(
              29px,
              3vw,
              37px
            );

          line-height:
            1.17;

          font-weight:
            600;

          letter-spacing:
            -1px;

        }


        .rm-hero h1 span {

          color:
            #2370f2;

          font-weight:
            600;

        }


        .rm-hero p {

          max-width:
            650px;

          margin:
            0;

          color:
            #798598;

          font-family:
            "Poppins",
            sans-serif;

          font-size:
            12px;

          font-weight:
            400;

          line-height:
            1.7;

        }


        /* =================================================
           STAT CARD
        ================================================= */

        .rm-stat-card {

          min-width:
            160px;

          padding:
            14px 16px;

          display:
            grid;

          grid-template-columns:
            38px 1fr;

          align-items:
            center;

          gap:
            2px 10px;

          border:
            1px solid #e0e6ee;

          border-radius:
            13px;

          background:
            #fff;

          box-shadow:

            0 9px 25px
            rgba(
              31,
              48,
              77,
              .045
            );

        }


        .rm-stat-card > div {

          grid-row:
            span 2;

          width:
            38px;

          height:
            38px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            10px;

          background:
            #edf4ff;

          color:
            #2370f2;

          font-size:
            16px;

        }


        .rm-stat-card strong {

          color:
            #26344a;

          font-size:
            19px;

          font-weight:
            600;

        }


        .rm-stat-card span {

          color:
            #8490a2;

          font-size:
            9px;

        }


        /* =================================================
           MAIN
        ================================================= */

        .rm-main {

          min-height:
            650px;

          padding:
            28px 0 70px;

          background:
            #f7f9fc;

        }


        /* =================================================
           TOOLBAR
        ================================================= */

        .rm-toolbar {

          display:
            grid;

          grid-template-columns:
            1fr 220px auto;

          gap:
            10px;

          padding:
            12px;

          border:
            1px solid #e3e8ef;

          border-radius:
            13px;

          background:
            #fff;

        }


        .rm-search {

          min-height:
            42px;

          display:
            flex;

          align-items:
            center;

          gap:
            8px;

          padding:
            0 12px;

          border:
            1px solid #dfe5ed;

          border-radius:
            8px;

        }


        .rm-search > i {

          color:
            #8b96a6;

          font-size:
            13px;

        }


        .rm-search input {

          width:
            100%;

          border:
            0;

          outline:
            0;

          background:
            transparent;

          color:
            #253249;

          font-family:
            "Poppins",
            sans-serif;

          font-size:
            11px;

        }


        .rm-search button {

          border:
            0;

          background:
            transparent;

          color:
            #8b96a6;

        }


        .rm-toolbar .form-select {

          min-height:
            42px;

          border-radius:
            8px;

          border-color:
            #dfe5ed;

          font-family:
            "Poppins",
            sans-serif;

          font-size:
            11px;

        }


        .rm-count {

          min-height:
            42px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          gap:
            4px;

          padding:
            0 13px;

          border-radius:
            8px;

          background:
            #edf4ff;

          color:
            #2370f2;

          font-size:
            12px;

          font-weight:
            600;

        }


        .rm-count span {

          color:
            #5f80b5;

          font-size:
            9px;

          font-weight:
            500;

        }


        /* =================================================
           3 CARDS PER ROW
        ================================================= */

        .rm-grid {

          display:
            grid;

          grid-template-columns:
            repeat(
              3,
              minmax(
                0,
                1fr
              )
            );

          gap:
            16px;

          margin-top:
            20px;

        }


        /* =================================================
           ROADMAP CARD
        ================================================= */

        .rm-card {

          position:
            relative;

          overflow:
            hidden;

          padding:
            19px;

          background:
            #fff;

          border:
            1px solid #e2e7ee;

          border-radius:
            14px;

          transition:

            transform
            .18s ease,

            border-color
            .18s ease,

            box-shadow
            .18s ease;

        }


        .rm-card:hover {

          transform:
            translateY(-3px);

          border-color:
            #cad8ee;

          box-shadow:

            0 14px 30px
            rgba(
              31,
              48,
              77,
              .065
            );

        }


        .rm-card-top {

          display:
            flex;

          justify-content:
            space-between;

          align-items:
            center;

        }


        .rm-icon {

          width:
            42px;

          height:
            42px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            10px;

          background:

            color-mix(
              in srgb,
              var(--rm-color)
              11%,
              white
            );

          color:
            var(--rm-color);

          font-size:
            17px;

        }


        .rm-card-number {

          color:
            #e7ebf1;

          font-family:
            Inter,
            "Poppins",
            sans-serif;

          font-size:
            30px;

          line-height:
            1;

          font-weight:
            550;

          letter-spacing:
            -1px;

        }


        .rm-category {

          display:
            block;

          margin-top:
            14px;

          color:
            #2370f2;

          font-family:
            Inter,
            "Poppins",
            sans-serif;

          font-size:
            8px;

          font-weight:
            600;

          letter-spacing:
            .9px;

          text-transform:
            uppercase;

        }


        .rm-card h2 {

          margin:
            5px 0 2px;

          color:
            #1c293d;

          font-family:
            Inter,
            "Poppins",
            sans-serif;

          font-size:
            16px;

          line-height:
            1.4;

          font-weight:
            600;

          letter-spacing:
            -.2px;

        }


        .rm-level {

          margin:
            0;

          color:
            #758195;

          font-size:
            10px;

          line-height:
            1.5;

        }


        .rm-description {

          margin:
            9px 0 0;

          color:
            #7c8899;

          font-size:
            9.5px;

          line-height:
            1.6;

          display:
            -webkit-box;

          -webkit-line-clamp:
            2;

          -webkit-box-orient:
            vertical;

          overflow:
            hidden;

          min-height:
            30px;

        }


        /* =================================================
           META
        ================================================= */

        .rm-meta {

          display:
            flex;

          flex-wrap:
            wrap;

          gap:
            11px;

          margin-top:
            12px;

        }


        .rm-meta span {

          display:
            flex;

          align-items:
            center;

          gap:
            4px;

          color:
            #788497;

          font-size:
            9px;

        }


        .rm-meta i {

          color:
            #2370f2;

        }


        /* =================================================
           MINI FLOW CHART
        ================================================= */

        .rm-mini-flow {

          margin-top:
            14px;

          padding:
            11px;

          background:
            #f8faff;

          border:
            1px solid #e8edf5;

          border-radius:
            10px;

        }


        .rm-mini-node {

          min-height:
            38px;

          display:
            grid;

          grid-template-columns:
            25px 1fr;

          align-items:
            center;

          gap:
            6px;

          padding:
            6px 8px;

          background:
            #fff;

          border:
            1px solid #e4e9f0;

          border-radius:
            7px;

        }


        .rm-mini-node > span {

          color:
            #2370f2;

          font-family:
            Inter,
            sans-serif;

          font-size:
            7.5px;

          font-weight:
            600;

        }


        .rm-mini-node strong {

          color:
            #2a374c;

          font-family:
            Inter,
            "Poppins",
            sans-serif;

          font-size:
            9.5px;

          line-height:
            1.35;

          font-weight:
            550;

        }


        .rm-mini-connector {

          height:
            19px;

          position:
            relative;

          display:
            flex;

          justify-content:
            center;

          align-items:
            center;

        }


        .rm-mini-connector span {

          position:
            absolute;

          width:
            1px;

          height:
            100%;

          background:
            #b7cff6;

        }


        .rm-mini-connector i {

          position:
            absolute;

          bottom:
            -1px;

          color:
            #7da5e7;

          background:
            #f8faff;

          font-size:
            8px;

        }


        .rm-more-steps {

          margin-top:
            8px;

          color:
            #8390a2;

          text-align:
            center;

          font-size:
            8.5px;

        }


        .rm-no-step {

          color:
            #8792a2;

          text-align:
            center;

          padding:
            20px;

          font-size:
            9px;

        }


        /* =================================================
           VIEW BUTTON
        ================================================= */

        .rm-open-btn {

          width:
            100%;

          min-height:
            38px;

          margin-top:
            12px;

          padding:
            0 11px;

          border:
            1px solid #d5e1f5;

          border-radius:
            7px;

          background:
            #edf4ff;

          color:
            #2370f2;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          font-family:
            Inter,
            "Poppins",
            sans-serif;

          font-size:
            9.5px;

          font-weight:
            600;

          transition:
            .18s ease;

        }


        .rm-open-btn:hover {

          background:
            #2370f2;

          border-color:
            #2370f2;

          color:
            #fff;

        }


        /* =================================================
           LOADING
        ================================================= */

        .rm-loading,
        .rm-empty {

          min-height:
            350px;

          display:
            flex;

          flex-direction:
            column;

          align-items:
            center;

          justify-content:
            center;

          text-align:
            center;

          color:
            #7c8899;

        }


        .rm-loading h3,
        .rm-empty h3 {

          margin:
            12px 0 4px;

          color:
            #29364a;

          font-size:
            16px;

          font-weight:
            600;

        }


        .rm-loading p,
        .rm-empty p {

          margin:
            0;

          font-size:
            10px;

        }


        .rm-empty-icon {

          width:
            57px;

          height:
            57px;

          display:
            grid;

          place-items:
            center;

          background:
            #edf4ff;

          color:
            #2370f2;

          border-radius:
            15px;

          font-size:
            23px;

        }


        /* =================================================
           MODAL
        ================================================= */

        .rm-modal-backdrop {

          position:
            fixed;

          inset:
            0;

          z-index:
            99999;

          padding:
            18px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          background:
            rgba(
              13,
              23,
              40,
              .66
            );

          backdrop-filter:
            blur(7px);

        }


        .rm-modal {

          width:
            min(
              900px,
              96vw
            );

          max-height:
            94vh;

          display:
            flex;

          flex-direction:
            column;

          overflow:
            hidden;

          background:
            #f7f9fc;

          border-radius:
            16px;

          box-shadow:

            0 32px 90px
            rgba(
              0,
              0,
              0,
              .28
            );

        }


        /* =================================================
           MODAL HEADER
        ================================================= */

        .rm-modal-header {

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            20px;

          padding:
            17px 20px;

          background:
            #fff;

          border-bottom:
            1px solid #e5eaf1;

        }


        .rm-modal-title {

          display:
            flex;

          align-items:
            center;

          gap:
            12px;

        }


        .rm-modal-icon {

          width:
            46px;

          height:
            46px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            11px;

          background:

            color-mix(
              in srgb,
              var(--rm-color)
              11%,
              white
            );

          color:
            var(--rm-color);

          font-size:
            19px;

        }


        .rm-modal-title span {

          color:
            #2370f2;

          font-size:
            7.5px;

          font-weight:
            600;

          letter-spacing:
            1px;

          text-transform:
            uppercase;

        }


        .rm-modal-title h2 {

          margin:
            2px 0;

          color:
            #223047;

          font-family:
            Inter,
            "Poppins",
            sans-serif;

          font-size:
            18px;

          font-weight:
            600;

        }


        .rm-modal-title p {

          margin:
            0;

          color:
            #7d899a;

          font-size:
            9px;

        }


        .rm-close-btn {

          width:
            35px;

          height:
            35px;

          border:
            0;

          border-radius:
            50%;

          display:
            grid;

          place-items:
            center;

          background:
            #f0f3f7;

          color:
            #657186;

        }


        .rm-close-btn:hover {

          background:
            #e6ebf2;

        }


        .rm-modal-description {

          padding:
            10px 20px;

          background:
            #fff;

          border-bottom:
            1px solid #e8edf2;

          color:
            #6f7c8f;

          font-size:
            10px;

          line-height:
            1.65;

        }


        /* =================================================
           FLOWCHART BODY
        ================================================= */

        .rm-modal-body {

          overflow-y:
            auto;

          padding:
            24px;

        }


        .rm-flowchart {

          max-width:
            620px;

          margin:
            0 auto;

        }


        .rm-flow-node {

          min-height:
            84px;

          display:
            grid;

          grid-template-columns:
            49px 1fr 32px;

          align-items:
            center;

          gap:
            12px;

          padding:
            13px;

          background:
            #fff;

          border:
            1px solid #dfe6ef;

          border-radius:
            12px;

          box-shadow:

            0 7px 17px
            rgba(
              42,
              59,
              88,
              .045
            );

        }


        .rm-flow-number {

          width:
            48px;

          height:
            48px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            11px;

          background:

            linear-gradient(
              135deg,
              #2370f2,
              #5c8ff5
            );

          color:
            #fff;

          font-family:
            Inter,
            sans-serif;

          font-size:
            12px;

          font-weight:
            600;

        }


        .rm-flow-content > span {

          color:
            #2370f2;

          font-size:
            7px;

          font-weight:
            650;

          letter-spacing:
            .9px;

        }


        .rm-flow-content h3 {

          margin:
            3px 0;

          color:
            #29364b;

          font-family:
            Inter,
            "Poppins",
            sans-serif;

          font-size:
            13px;

          font-weight:
            600;

        }


        .rm-flow-content p {

          margin:
            4px 0;

          color:
            #7b8798;

          font-size:
            9px;

          line-height:
            1.55;

        }


        .rm-flow-content small {

          display:
            inline-flex;

          align-items:
            center;

          gap:
            5px;

          margin-top:
            4px;

          color:
            #788598;

          font-size:
            8px;

        }


        .rm-flow-content small i {

          color:
            #2370f2;

        }


        .rm-flow-check {

          width:
            29px;

          height:
            29px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            50%;

          background:
            #e9f8f0;

          color:
            #178258;

          font-size:
            12px;

        }


        /* =================================================
           FLOW CONNECTOR
        ================================================= */

        .rm-flow-connector {

          height:
            45px;

          position:
            relative;

          display:
            flex;

          justify-content:
            center;

          align-items:
            center;

        }


        .rm-flow-connector > span {

          width:
            2px;

          height:
            100%;

          background:

            linear-gradient(
              #a9c7f8,
              #2370f2
            );

        }


        .rm-flow-connector > div {

          position:
            absolute;

          bottom:
            -1px;

          width:
            23px;

          height:
            23px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            50%;

          background:
            #edf4ff;

          color:
            #2370f2;

          font-size:
            8px;

        }


        /* =================================================
           FINISH
        ================================================= */

        .rm-finish-node {

          margin-top:
            27px;

          display:
            flex;

          flex-direction:
            column;

          align-items:
            center;

          text-align:
            center;

        }


        .rm-finish-icon {

          width:
            52px;

          height:
            52px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            50%;

          background:

            linear-gradient(
              135deg,
              #ffc44d,
              #ed971d
            );

          color:
            #fff;

          font-size:
            20px;

        }


        .rm-finish-node > span {

          margin-top:
            8px;

          color:
            #a36e17;

          font-size:
            7.5px;

          font-weight:
            650;

          letter-spacing:
            1px;

        }


        .rm-finish-node h3 {

          margin:
            3px 0;

          color:
            #29364b;

          font-size:
            12px;

          font-weight:
            600;

        }


        .rm-finish-node p {

          margin:
            0;

          color:
            #8490a0;

          font-size:
            8.5px;

        }


        .rm-flow-empty {

          min-height:
            280px;

          display:
            flex;

          flex-direction:
            column;

          align-items:
            center;

          justify-content:
            center;

          color:
            #7e8999;

        }


        .rm-flow-empty > div {

          width:
            55px;

          height:
            55px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            15px;

          background:
            #edf4ff;

          color:
            #2370f2;

          font-size:
            22px;

        }


        .rm-flow-empty h3 {

          margin:
            10px 0 3px;

          color:
            #29364b;

          font-size:
            14px;

          font-weight:
            600;

        }


        .rm-flow-empty p {

          font-size:
            9px;

        }


        /* =================================================
           MODAL FOOTER
        ================================================= */

        .rm-modal-footer {

          min-height:
            56px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            15px;

          padding:
            0 20px;

          background:
            #fff;

          border-top:
            1px solid #e4e9ef;

        }


        .rm-modal-footer > span {

          color:
            #7c8898;

          font-size:
            8.5px;

        }


        .rm-modal-footer > span i {

          color:
            #2370f2;

          margin-right:
            5px;

        }


        .rm-modal-footer .btn {

          font-size:
            9px;

        }


        /* =================================================
           TABLET
        ================================================= */

        @media(
          max-width:
            1100px
        ) {

          .rm-grid {

            grid-template-columns:

              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );

          }

        }


        /* =================================================
           SMALL TABLET
        ================================================= */

        @media(
          max-width:
            850px
        ) {

          .rm-toolbar {

            grid-template-columns:
              1fr 1fr;

          }


          .rm-search {

            grid-column:
              1 / -1;

          }


          .rm-count {

            width:
              100%;

          }

        }


        /* =================================================
           MOBILE
        ================================================= */

        @media(
          max-width:
            700px
        ) {

          .rm-hero {

            padding:
              30px 0 28px;

          }


          .rm-hero-grid {

            display:
              block;

          }


          .rm-hero h1 {

            font-size:
              27px;

            line-height:
              1.2;

            letter-spacing:
              -.6px;

          }


          .rm-hero p {

            font-size:
              11px;

          }


          .rm-stat-card {

            display:
              none;

          }


          .rm-toolbar {

            grid-template-columns:
              1fr;

          }


          .rm-search {

            grid-column:
              auto;

          }


          .rm-grid {

            grid-template-columns:
              1fr;

          }


          .rm-card {

            padding:
              17px;

          }


          .rm-card h2 {

            font-size:
              16px;

          }


          .rm-modal-backdrop {

            padding:
              5px;

          }


          .rm-modal {

            width:
              100%;

            max-height:
              98vh;

            border-radius:
              12px;

          }


          .rm-modal-header {

            padding:
              14px;

          }


          .rm-modal-title {

            gap:
              9px;

          }


          .rm-modal-icon {

            width:
              39px;

            height:
              39px;

          }


          .rm-modal-title h2 {

            font-size:
              14px;

          }


          .rm-modal-description {

            padding:
              9px 14px;

          }


          .rm-modal-body {

            padding:
              14px 10px;

          }


          .rm-flow-node {

            grid-template-columns:
              41px 1fr;

            min-height:
              75px;

            gap:
              9px;

          }


          .rm-flow-number {

            width:
              40px;

            height:
              40px;

            font-size:
              10px;

          }


          .rm-flow-check {

            display:
              none;

          }


          .rm-modal-footer {

            padding:
              10px 13px;

          }


          .rm-modal-footer > span {

            display:
              none;

          }


          .rm-modal-footer .btn {

            width:
              100%;

          }

        }

      `}</style>
    </>
  );
}