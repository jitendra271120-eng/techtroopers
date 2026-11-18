import { Link } from "react-router-dom";

import PageMeta from "../components/PageMeta";

import {
  books,
  exams,
  projects,
  roadmaps,
  vacancies,
} from "../data/demoData";

export default function Home({ openAuth }) {
  const availableExams = exams.filter(
    (exam) => exam.status === "Available"
  ).length;

  const featuredBooks = books.slice(0, 4);
  const featuredProjects = projects.slice(0, 3);
  const featuredVacancies = vacancies.slice(0, 3);

  const modules = [
    {
      no: "01",
      title: "E-Books & Notes",
      text: "Read programming notes, code books and interview resources.",
      icon: "bi-journal-bookmark",
      to: "/ebooks",
      accent: "blue",
    },
    {
      no: "02",
      title: "Online Exams",
      text: "Attempt timed exams and check your performance.",
      icon: "bi-ui-checks-grid",
      to: "/exams",
      accent: "violet",
    },
    {
      no: "03",
      title: "Roadmaps",
      text: "Follow a clear sequence from fundamentals to job-ready skills.",
      icon: "bi-signpost-split",
      to: "/roadmaps",
      accent: "orange",
    },
    {
      no: "04",
      title: "TroopersHub",
      text: "Publish repositories, discover builds and find collaborators.",
      icon: "bi-github",
      to: "/portfolio",
      accent: "dark",
    },
    {
      no: "05",
      title: "TroopersTalk",
      text: "Ask questions, share updates and join technical discussions.",
      icon: "bi-chat-square-text",
      to: "/troopers-talk",
      accent: "green",
    },
    {
      no: "06",
      title: "Opportunities",
      text: "Explore internships, jobs and career opportunities.",
      icon: "bi-briefcase",
      to: "/vacancies",
      accent: "rose",
    },
  ];

  const journey = [
    {
      step: "01",
      title: "Learn",
      text: "Study from focused resources and structured roadmaps.",
      icon: "bi-book",
      to: "/ebooks",
    },
    {
      step: "02",
      title: "Test",
      text: "Use online exams to measure what you really understand.",
      icon: "bi-pencil-square",
      to: "/exams",
    },
    {
      step: "03",
      title: "Build",
      text: "Turn concepts into repositories and collaborative projects.",
      icon: "bi-code-square",
      to: "/portfolio",
    },
    {
      step: "04",
      title: "Apply",
      text: "Prepare your profile and explore real opportunities.",
      icon: "bi-briefcase",
      to: "/vacancies",
    },
  ];

  return (
    <>
      <PageMeta
        title="Learning Platform"
        description="Learn, practice, build and move your career forward with Techtroopers."
      />

      <main className="home-new">
        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="home-hero-new">
          <Watermark icon="bi-code-slash" side="right" />

          <div className="container-xxl home-hero-new-grid">
            <div className="home-hero-new-copy">
              <span className="home-overline">
                TECHTROOPERS LEARNING PLATFORM
              </span>

              <h1>
                Study smarter.
                <br />
                Build real work.
                <br />
                <span>Get career-ready.</span>
              </h1>

              <p>
                A practical student platform for learning resources, online
                assessments, project collaboration, technical discussions and
                career opportunities.
              </p>

              <div className="home-hero-new-actions">
                <Link to="/ebooks" className="home-btn home-btn-primary">
                  Start learning
                  <i className="bi bi-arrow-right" />
                </Link>

                <Link to="/roadmaps" className="home-btn home-btn-light">
                  View roadmaps
                </Link>

                <button
                  type="button"
                  className="home-btn home-btn-plain"
                  onClick={() => openAuth?.("register")}
                >
                  Create free account
                </button>
              </div>

              <div className="home-trust-row">
                <span>
                  <i className="bi bi-check2-circle" />
                  Learning resources
                </span>

                <span>
                  <i className="bi bi-check2-circle" />
                  Assessments
                </span>

                <span>
                  <i className="bi bi-check2-circle" />
                  Collaboration
                </span>

                <span>
                  <i className="bi bi-check2-circle" />
                  Career support
                </span>
              </div>
            </div>

            <aside className="home-hero-dashboard">
              <div className="home-dashboard-title">
                <div>
                  <span>PLATFORM OVERVIEW</span>
                  <h2>What can you do today?</h2>
                </div>

                <div className="home-dashboard-status">
                  <i />
                  Live
                </div>
              </div>

              <div className="home-dashboard-list">
                <DashboardRow
                  icon="bi-book"
                  title="Learning resources"
                  value={`${books.length}+`}
                  to="/ebooks"
                />

                <DashboardRow
                  icon="bi-ui-checks-grid"
                  title="Available exams"
                  value={availableExams}
                  to="/exams"
                />

                <DashboardRow
                  icon="bi-signpost-split"
                  title="Learning roadmaps"
                  value={roadmaps.length}
                  to="/roadmaps"
                />

                <DashboardRow
                  icon="bi-github"
                  title="Student projects"
                  value={projects.length}
                  to="/portfolio"
                />

                <DashboardRow
                  icon="bi-briefcase"
                  title="Opportunities"
                  value={vacancies.length}
                  to="/vacancies"
                />
              </div>

              <Link to="/dashboard" className="home-dashboard-open">
                Open learner dashboard
                <i className="bi bi-arrow-right" />
              </Link>
            </aside>
          </div>
        </section>

        {/* =====================================================
            MODULES
        ===================================================== */}

        <section className="home-section-new home-modules">
          <Watermark icon="bi-grid-1x2" side="right" />

          <div className="container-xxl">
            <SectionHeading
              overline="ONE PORTAL. MULTIPLE WORKFLOWS."
              title="Choose where you want to begin."
              text="Every section is designed around a useful student activity, not just a list of pages."
            />

            <div className="home-module-grid">
              {modules.map((item) => (
                <Link
                  to={item.to}
                  className="home-module-card"
                  key={item.title}
                >
                  <div className="home-module-number">{item.no}</div>

                  <div className={`home-module-icon ${item.accent}`}>
                    <i className={`bi ${item.icon}`} />
                  </div>

                  <div className="home-module-content">
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>

                  <i className="bi bi-arrow-up-right home-module-arrow" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            JOURNEY
        ===================================================== */}

        <section className="home-section-new home-journey-section">
          <Watermark icon="bi-signpost-split" side="left" />

          <div className="container-xxl">
            <SectionHeading
              overline="A SIMPLE LEARNING LOOP"
              title="Learn → Test → Build → Apply"
              text="Use Techtroopers as a continuous workflow instead of jumping between disconnected tools."
            />

            <div className="home-journey">
              {journey.map((item, index) => (
                <div className="home-journey-item" key={item.step}>
                  <div className="home-journey-top">
                    <span>{item.step}</span>
                    <i className={`bi ${item.icon}`} />
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.text}</p>

                  <Link to={item.to}>
                    Continue
                    <i className="bi bi-arrow-right" />
                  </Link>

                  {index !== journey.length - 1 && (
                    <div className="home-journey-line" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            LIBRARY
        ===================================================== */}

        <section className="home-section-new home-library-section">
          <Watermark icon="bi-book-half" side="right" />

          <div className="container-xxl">
            <div className="home-section-topline">
              <SectionHeading
                overline="DIGITAL LIBRARY"
                title="Read something useful today."
                text="Quick access to programming, web, database, AI and interview preparation material."
              />

              <Link to="/ebooks" className="home-section-link">
                Browse library
                <i className="bi bi-arrow-right" />
              </Link>
            </div>

            <div className="home-library-layout">
              {featuredBooks[0] ? (
                <article className="home-feature-book">
                  <div className="home-feature-book-mark">
                    <span>FEATURED RESOURCE</span>
                    <i className="bi bi-journal-code" />
                  </div>

                  <div className="home-feature-book-content">
                    <small>
                      {featuredBooks[0].type || "RESOURCE"} ·{" "}
                      {featuredBooks[0].category || "Learning"}
                    </small>

                    <h3>{featuredBooks[0].title}</h3>

                    <p>
                      {featuredBooks[0].description ||
                        "Open this learning resource in the Techtroopers digital library."}
                    </p>

                    <Link to="/ebooks">
                      Open resource
                      <i className="bi bi-arrow-right" />
                    </Link>
                  </div>
                </article>
              ) : (
                <article className="home-feature-book home-empty-preview">
                  <div>
                    <i className="bi bi-book" />
                    <h3>Learning resources</h3>
                    <p>Open the library to browse available material.</p>
                  </div>

                  <Link to="/ebooks">Open library →</Link>
                </article>
              )}

              <div className="home-library-list">
                {featuredBooks.slice(1, 4).map((book, index) => (
                  <article className="home-library-row" key={book.id}>
                    <span className="home-library-row-no">
                      {String(index + 2).padStart(2, "0")}
                    </span>

                    <div>
                      <small>{book.category || book.type || "Resource"}</small>
                      <h3>{book.title}</h3>
                      <p>{book.description}</p>
                    </div>

                    <Link to="/ebooks" aria-label={`Open ${book.title}`}>
                      <i className="bi bi-arrow-up-right" />
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            EXAMS + COMMUNITY
        ===================================================== */}

        <section className="home-section-new home-assessment-community">
          <Watermark icon="bi-ui-checks-grid" side="left" />

          <div className="container-xxl home-split-panel">
            <article className="home-exam-block">
              <span className="home-block-overline">ONLINE EXAMS</span>

              <h2>Measure progress with real attempts.</h2>

              <p>
                Practice in a focused exam environment with timed attempts,
                question navigation and performance results.
              </p>

              <div className="home-exam-facts">
                <div>
                  <strong>{availableExams}</strong>
                  <span>Available exams</span>
                </div>

                <div>
                  <strong>Timed</strong>
                  <span>Attempt format</span>
                </div>

                <div>
                  <strong>Instant</strong>
                  <span>Result feedback</span>
                </div>
              </div>

              <Link to="/exams" className="home-dark-action">
                Enter exam hall
                <i className="bi bi-arrow-right" />
              </Link>
            </article>

            <article className="home-community-block">
              <span className="home-block-overline">TROOPERSTALK</span>

              <h2>Learn with people, not in isolation.</h2>

              <p>
                Ask technical questions, share project progress, post useful
                links, celebrate achievements and help other learners.
              </p>

              <ul>
                <li>
                  <i className="bi bi-chat-square-text" />
                  Questions and discussions
                </li>

                <li>
                  <i className="bi bi-link-45deg" />
                  Useful resources and links
                </li>

                <li>
                  <i className="bi bi-trophy" />
                  Achievements and opportunities
                </li>
              </ul>

              <Link to="/troopers-talk" className="home-blue-action">
                Open TroopersTalk
                <i className="bi bi-arrow-right" />
              </Link>
            </article>
          </div>
        </section>

        {/* =====================================================
            PROJECTS
        ===================================================== */}

        <section className="home-section-new home-project-section">
          <Watermark icon="bi-github" side="right" />

          <div className="container-xxl">
            <div className="home-section-topline">
              <SectionHeading
                overline="TROOPERSHUB"
                title="Build work that others can see."
                text="Share repositories, document your progress and collaborate on student projects."
              />

              <Link to="/portfolio" className="home-section-link">
                Explore TroopersHub
                <i className="bi bi-arrow-right" />
              </Link>
            </div>

            <div className="home-project-grid">
              {featuredProjects.map((project, index) => (
                <article className="home-project-card" key={project.id}>
                  <div className="home-project-card-top">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <i className="bi bi-github" />
                  </div>

                  <h3>{project.title}</h3>

                  <p>
                    {project.description ||
                      "Student project shared with the Techtroopers community."}
                  </p>

                  <div className="home-project-tech">
                    {(Array.isArray(project.tech)
                      ? project.tech
                      : String(project.tech || "")
                          .split(",")
                          .filter(Boolean)
                    )
                      .slice(0, 4)
                      .map((tech) => (
                        <span key={tech}>{tech}</span>
                      ))}
                  </div>

                  <Link to="/portfolio">
                    View repository
                    <i className="bi bi-arrow-up-right" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            CAREER
        ===================================================== */}

        <section className="home-section-new home-career-section">
          <Watermark icon="bi-briefcase" side="left" />

          <div className="container-xxl">
            <div className="home-section-topline">
              <SectionHeading
                overline="CAREER BOARD"
                title="Preparation should lead somewhere."
                text="Explore internships and jobs, then use your learning and project work as proof of skill."
              />

              <Link to="/vacancies" className="home-section-link">
                View opportunities
                <i className="bi bi-arrow-right" />
              </Link>
            </div>

            <div className="home-career-layout">
              <div className="home-job-list">
                {featuredVacancies.map((job) => (
                  <Link
                    to="/vacancies"
                    className="home-job-row"
                    key={job.id}
                  >
                    <div className="home-job-company-icon">
                      <i className="bi bi-building" />
                    </div>

                    <div className="home-job-copy">
                      <small>{job.company || job.organization || "Opportunity"}</small>
                      <h3>{job.title || job.jobTitle || "Career Opportunity"}</h3>

                      <div>
                        {job.location && (
                          <span>
                            <i className="bi bi-geo-alt" />
                            {job.location}
                          </span>
                        )}

                        {(job.type || job.jobType) && (
                          <span>
                            <i className="bi bi-clock" />
                            {job.type || job.jobType}
                          </span>
                        )}
                      </div>
                    </div>

                    <i className="bi bi-arrow-up-right home-job-arrow" />
                  </Link>
                ))}
              </div>

              <aside className="home-resume-box">
                <span>PROFILE PREPARATION</span>

                <h3>Build your resume before you apply.</h3>

                <p>
                  Turn projects, skills and academic work into a structured
                  resume directly from the portal.
                </p>

                <Link to="/resume-builder">
                  Open Resume Studio
                  <i className="bi bi-arrow-right" />
                </Link>
              </aside>
            </div>
          </div>
        </section>

        {/* =====================================================
            FINAL CTA
        ===================================================== */}

        <section className="home-final-new">
          <div className="home-final-watermark" aria-hidden="true">
            <i className="bi bi-lightning-charge" />
          </div>

          <div className="container-xxl home-final-new-inner">
            <div>
              <span>KEEP MOVING</span>
              <h2>One useful action today is enough to create momentum.</h2>
              <p>
                Read a resource, attempt an exam, improve a project or apply
                for an opportunity.
              </p>
            </div>

            <div className="home-final-new-actions">
              <Link to="/dashboard" className="home-final-primary">
                Open dashboard
              </Link>

              <Link to="/vacancies" className="home-final-secondary">
                Explore opportunities
              </Link>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .home-new {
          --home-blue: #2563eb;
          --home-blue-dark: #1d4ed8;
          --home-ink: #182338;
          --home-text: #66758b;
          --home-border: #dfe5ed;
          --home-white: #ffffff;

          min-height: 100vh;
          overflow: hidden;
          color: var(--home-ink);
          background: #ffffff;
          font-family: "Segoe UI", Inter, Arial, sans-serif;
        }

        .home-new *,
        .home-new *::before,
        .home-new *::after {
          box-sizing: border-box;
          border-radius: 0 !important;
        }

        .home-new h1,
        .home-new h2,
        .home-new h3,
        .home-new p {
          font-family: inherit;
        }

        .home-new a {
          transition: color .18s ease, background .18s ease, border-color .18s ease, transform .18s ease;
        }

        /* =====================================================
           WATERMARK
        ===================================================== */

        .home-watermark {
          position: absolute;
          z-index: 0;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(37, 99, 235, .045);
          font-size: clamp(160px, 19vw, 310px);
          line-height: 1;
          pointer-events: none;
          user-select: none;
        }

        .home-watermark.right {
          right: 2%;
        }

        .home-watermark.left {
          left: 2%;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .home-hero-new {
          position: relative;
          isolation: isolate;
          padding: 62px 0 66px;
          overflow: hidden;
          background:
            linear-gradient(110deg, #ffffff 0%, #ffffff 57%, #f2f7ff 57%, #f2f7ff 100%);
          border-bottom: 1px solid #e8edf3;
        }

        .home-hero-new-grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(420px, .75fr);
          gap: 68px;
          align-items: center;
        }

        .home-overline,
        .home-block-overline {
          display: inline-block;
          color: var(--home-blue);
          font-size: 11px;
          font-weight: 650;
          letter-spacing: 1.25px;
        }

        .home-hero-new-copy h1 {
          max-width: 690px;
          margin: 15px 0 18px;
          color: #182338;
          font-size: clamp(40px, 4.5vw, 58px);
          line-height: 1.08;
          font-weight: 600;
          letter-spacing: -1.6px;
        }

        .home-hero-new-copy h1 span {
          color: var(--home-blue);
          font-weight: 600;
        }

        .home-hero-new-copy > p {
          max-width: 690px;
          margin: 0;
          color: #66758b;
          font-size: 16px;
          line-height: 1.75;
          font-weight: 400;
        }

        .home-hero-new-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 28px;
        }

        .home-btn {
          min-height: 46px;
          padding: 0 17px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid transparent;
          background: none;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .home-btn-primary {
          background: var(--home-blue);
          border-color: var(--home-blue);
          color: #fff;
        }

        .home-btn-primary:hover {
          background: var(--home-blue-dark);
          color: #fff;
        }

        .home-btn-light {
          background: #fff;
          border-color: #cfd8e5;
          color: #26354b;
        }

        .home-btn-light:hover {
          background: #f8fafc;
          color: #26354b;
        }

        .home-btn-plain {
          color: #526176;
          border-color: transparent;
        }

        .home-btn-plain:hover {
          background: #eef3f9;
        }

        .home-trust-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px 21px;
          margin-top: 25px;
          color: #738197;
          font-size: 12px;
        }

        .home-trust-row span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .home-trust-row i {
          color: #169466;
        }

        .home-hero-dashboard {
          border: 1px solid #dbe3ed;
          border-left: 5px solid var(--home-blue);
          background: rgba(255,255,255,.96);
          box-shadow: 0 20px 45px rgba(38, 57, 87, .08);
        }

        .home-dashboard-title {
          min-height: 87px;
          padding: 18px 19px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          border-bottom: 1px solid #e7ebf1;
        }

        .home-dashboard-title span {
          color: var(--home-blue);
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .home-dashboard-title h2 {
          margin: 4px 0 0;
          color: #26354a;
          font-size: 20px;
          font-weight: 600;
        }

        .home-dashboard-status {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #177e58;
          font-size: 11px;
          font-weight: 600;
        }

        .home-dashboard-status i {
          width: 8px;
          height: 8px;
          background: #20a46b;
        }

        .home-dashboard-list {
          display: grid;
        }

        .home-dashboard-row {
          min-height: 64px;
          padding: 10px 17px;
          display: grid;
          grid-template-columns: 38px 1fr auto;
          gap: 11px;
          align-items: center;
          color: inherit;
          text-decoration: none;
          border-bottom: 1px solid #edf0f4;
        }

        .home-dashboard-row:hover {
          background: #f7faff;
        }

        .home-dashboard-row-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          background: #edf4ff;
          color: var(--home-blue);
          font-size: 15px;
        }

        .home-dashboard-row strong {
          display: block;
          color: #344258;
          font-size: 13px;
          font-weight: 600;
        }

        .home-dashboard-row small {
          display: block;
          margin-top: 2px;
          color: #8591a2;
          font-size: 10px;
        }

        .home-dashboard-row-value {
          color: #26354a;
          font-size: 19px;
          font-weight: 600;
        }

        .home-dashboard-open {
          min-height: 48px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--home-blue);
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
        }

        /* =====================================================
           COMMON SECTION
        ===================================================== */

        .home-section-new {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          padding: 68px 0;
        }

        .home-section-new > .container-xxl {
          position: relative;
          z-index: 2;
        }

        .home-section-heading {
          max-width: 760px;
          margin-bottom: 30px;
        }

        .home-section-heading > span {
          display: block;
          color: var(--home-blue);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.25px;
        }

        .home-section-heading h2 {
          margin: 8px 0 9px;
          color: #1d293d;
          font-size: 33px;
          line-height: 1.23;
          font-weight: 600;
          letter-spacing: -.55px;
        }

        .home-section-heading p {
          max-width: 720px;
          margin: 0;
          color: #718095;
          font-size: 14px;
          line-height: 1.72;
        }

        .home-section-topline {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 28px;
          margin-bottom: 30px;
        }

        .home-section-topline .home-section-heading {
          margin-bottom: 0;
        }

        .home-section-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--home-blue);
          text-decoration: none;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 600;
        }

        /* =====================================================
           MODULES
        ===================================================== */

        .home-modules {
          background: #f3f7fd;
        }

        .home-module-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border-top: 1px solid #dbe3ed;
          border-left: 1px solid #dbe3ed;
        }

        .home-module-card {
          min-height: 194px;
          position: relative;
          display: grid;
          grid-template-columns: 44px 1fr;
          grid-template-rows: auto 1fr;
          gap: 13px 15px;
          padding: 22px;
          border-right: 1px solid #dbe3ed;
          border-bottom: 1px solid #dbe3ed;
          background: rgba(255,255,255,.92);
          color: inherit;
          text-decoration: none;
        }

        .home-module-card:hover {
          background: #ffffff;
          transform: translateY(-2px);
          z-index: 2;
        }

        .home-module-number {
          grid-column: 1 / -1;
          color: #9aa8bb;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .7px;
        }

        .home-module-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          font-size: 18px;
        }

        .home-module-icon.blue {
          background: #e7f0ff;
          color: #2563eb;
        }

        .home-module-icon.violet {
          background: #efeaff;
          color: #7358d5;
        }

        .home-module-icon.orange {
          background: #fff1dc;
          color: #b96e11;
        }

        .home-module-icon.dark {
          background: #e9ecef;
          color: #24292f;
        }

        .home-module-icon.green {
          background: #e7f7ef;
          color: #16825a;
        }

        .home-module-icon.rose {
          background: #ffedf1;
          color: #c64a68;
        }

        .home-module-content h3 {
          margin: 0;
          color: #26354a;
          font-size: 18px;
          font-weight: 600;
        }

        .home-module-content p {
          margin: 7px 0 0;
          color: #748196;
          font-size: 13px;
          line-height: 1.65;
        }

        .home-module-arrow {
          position: absolute;
          top: 22px;
          right: 22px;
          color: #8290a3;
          font-size: 14px;
        }

        /* =====================================================
           JOURNEY
        ===================================================== */

        .home-journey-section {
          background: #fffaf1;
        }

        .home-journey {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border-top: 1px solid #e6dac6;
          border-left: 1px solid #e6dac6;
        }

        .home-journey-item {
          position: relative;
          min-height: 244px;
          padding: 23px;
          background: rgba(255,255,255,.72);
          border-right: 1px solid #e6dac6;
          border-bottom: 1px solid #e6dac6;
        }

        .home-journey-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .home-journey-top span {
          color: #aa7b38;
          font-size: 11px;
          font-weight: 700;
        }

        .home-journey-top i {
          color: #c18a38;
          font-size: 21px;
        }

        .home-journey-item h3 {
          margin: 30px 0 8px;
          color: #2b3444;
          font-size: 22px;
          font-weight: 600;
        }

        .home-journey-item p {
          min-height: 65px;
          margin: 0;
          color: #766d61;
          font-size: 13px;
          line-height: 1.65;
        }

        .home-journey-item > a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 20px;
          color: #8b621f;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
        }

        .home-journey-line {
          position: absolute;
          right: -13px;
          top: 50%;
          z-index: 4;
          width: 25px;
          height: 1px;
          background: #cfa65f;
        }

        /* =====================================================
           LIBRARY
        ===================================================== */

        .home-library-section {
          background: #f8f5ff;
        }

        .home-library-layout {
          display: grid;
          grid-template-columns: .85fr 1.15fr;
          border-top: 1px solid #ddd7eb;
          border-left: 1px solid #ddd7eb;
        }

        .home-feature-book {
          min-height: 360px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 28px;
          border-right: 1px solid #ddd7eb;
          border-bottom: 1px solid #ddd7eb;
          background: #ffffff;
        }

        .home-feature-book-mark {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #7057b5;
        }

        .home-feature-book-mark span {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .home-feature-book-mark i {
          font-size: 34px;
        }

        .home-feature-book-content small {
          color: #8a7da5;
          font-size: 10px;
          letter-spacing: .45px;
        }

        .home-feature-book-content h3 {
          max-width: 510px;
          margin: 10px 0 10px;
          color: #2d2a39;
          font-size: 27px;
          line-height: 1.25;
          font-weight: 600;
        }

        .home-feature-book-content p {
          max-width: 560px;
          margin: 0 0 20px;
          color: #746e82;
          font-size: 14px;
          line-height: 1.7;
        }

        .home-feature-book-content a,
        .home-empty-preview > a {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #6449a7;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
        }

        .home-library-list {
          display: grid;
        }

        .home-library-row {
          min-height: 120px;
          display: grid;
          grid-template-columns: 38px 1fr 28px;
          gap: 13px;
          align-items: center;
          padding: 18px 20px;
          border-right: 1px solid #ddd7eb;
          border-bottom: 1px solid #ddd7eb;
          background: rgba(255,255,255,.82);
        }

        .home-library-row-no {
          color: #7769a0;
          font-size: 11px;
          font-weight: 700;
        }

        .home-library-row small {
          color: #8a7da5;
          font-size: 10px;
        }

        .home-library-row h3 {
          margin: 3px 0 4px;
          color: #333044;
          font-size: 16px;
          line-height: 1.35;
          font-weight: 600;
        }

        .home-library-row p {
          margin: 0;
          color: #787184;
          font-size: 11.5px;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .home-library-row > a {
          color: #6d56a8;
          font-size: 15px;
        }

        .home-empty-preview {
          justify-content: center;
          gap: 20px;
        }

        .home-empty-preview i {
          color: #7057b5;
          font-size: 34px;
        }

        /* =====================================================
           EXAM + COMMUNITY
        ===================================================== */

        .home-assessment-community {
          background: #f0faf6;
        }

        .home-split-panel {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 1px solid #d8e9e2;
          border-left: 1px solid #d8e9e2;
        }

        .home-exam-block,
        .home-community-block {
          min-height: 390px;
          padding: 32px;
          border-right: 1px solid #d8e9e2;
          border-bottom: 1px solid #d8e9e2;
        }

        .home-exam-block {
          background: #14263e;
          color: #fff;
        }

        .home-exam-block .home-block-overline {
          color: #8eb7ef;
        }

        .home-exam-block h2,
        .home-community-block h2 {
          max-width: 520px;
          margin: 10px 0 11px;
          font-size: 30px;
          line-height: 1.25;
          font-weight: 600;
          letter-spacing: -.4px;
        }

        .home-exam-block h2 {
          color: #fff;
        }

        .home-community-block h2 {
          color: #243449;
        }

        .home-exam-block > p {
          max-width: 540px;
          color: #b8c6d9;
          font-size: 14px;
          line-height: 1.7;
        }

        .home-community-block {
          background: rgba(255,255,255,.9);
        }

        .home-community-block > p {
          max-width: 540px;
          color: #6f7e92;
          font-size: 14px;
          line-height: 1.7;
        }

        .home-exam-facts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          margin: 28px 0 26px;
          background: rgba(255,255,255,.13);
        }

        .home-exam-facts > div {
          padding: 14px;
          background: #1b304d;
        }

        .home-exam-facts strong {
          display: block;
          color: #fff;
          font-size: 17px;
          font-weight: 600;
        }

        .home-exam-facts span {
          display: block;
          margin-top: 3px;
          color: #9fb1c8;
          font-size: 10px;
        }

        .home-dark-action,
        .home-blue-action {
          min-height: 42px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
        }

        .home-dark-action {
          background: #ffffff;
          color: #18314f;
        }

        .home-blue-action {
          margin-top: 21px;
          background: var(--home-blue);
          color: #ffffff;
        }

        .home-community-block ul {
          list-style: none;
          padding: 0;
          margin: 23px 0 0;
          display: grid;
          gap: 13px;
        }

        .home-community-block li {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #516176;
          font-size: 13px;
        }

        .home-community-block li i {
          width: 30px;
          color: #15855b;
          font-size: 17px;
        }

        /* =====================================================
           PROJECTS
        ===================================================== */

        .home-project-section {
          background: #f2f7ff;
        }

        .home-project-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border-top: 1px solid #d7e2f1;
          border-left: 1px solid #d7e2f1;
        }

        .home-project-card {
          min-height: 288px;
          padding: 23px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #d7e2f1;
          border-bottom: 1px solid #d7e2f1;
          background: rgba(255,255,255,.9);
        }

        .home-project-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .home-project-card-top span {
          color: #7e8ca1;
          font-size: 10px;
          font-weight: 700;
        }

        .home-project-card-top i {
          color: #24292f;
          font-size: 24px;
        }

        .home-project-card h3 {
          margin: 28px 0 8px;
          color: #26354a;
          font-size: 19px;
          font-weight: 600;
        }

        .home-project-card > p {
          min-height: 61px;
          margin: 0;
          color: #718096;
          font-size: 13px;
          line-height: 1.65;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .home-project-tech {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 17px 0;
        }

        .home-project-tech span {
          padding: 4px 7px;
          background: #edf3fb;
          color: #52657e;
          font-size: 10px;
        }

        .home-project-card > a {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--home-blue);
          text-decoration: none;
          font-size: 11.5px;
          font-weight: 600;
        }

        /* =====================================================
           CAREER
        ===================================================== */

        .home-career-section {
          background: #fff8ef;
        }

        .home-career-layout {
          display: grid;
          grid-template-columns: 1.35fr .65fr;
          border-top: 1px solid #eadfce;
          border-left: 1px solid #eadfce;
        }

        .home-job-list {
          display: grid;
        }

        .home-job-row {
          min-height: 108px;
          padding: 18px 20px;
          display: grid;
          grid-template-columns: 48px 1fr 18px;
          gap: 13px;
          align-items: center;
          border-right: 1px solid #eadfce;
          border-bottom: 1px solid #eadfce;
          background: rgba(255,255,255,.84);
          color: inherit;
          text-decoration: none;
        }

        .home-job-row:hover {
          background: #ffffff;
        }

        .home-job-company-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          background: #fff0dc;
          color: #b9721b;
          font-size: 18px;
        }

        .home-job-copy small {
          color: #a16d2e;
          font-size: 10px;
          font-weight: 600;
        }

        .home-job-copy h3 {
          margin: 4px 0 7px;
          color: #3b352f;
          font-size: 16px;
          font-weight: 600;
        }

        .home-job-copy > div {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          color: #82776c;
          font-size: 10.5px;
        }

        .home-job-copy i {
          margin-right: 4px;
        }

        .home-job-arrow {
          color: #9d8c79;
          font-size: 13px;
        }

        .home-resume-box {
          min-height: 324px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border-right: 1px solid #eadfce;
          border-bottom: 1px solid #eadfce;
          background: #2c3545;
          color: #fff;
        }

        .home-resume-box > span {
          color: #e5b77a;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .home-resume-box h3 {
          margin: 9px 0;
          color: #fff;
          font-size: 24px;
          line-height: 1.3;
          font-weight: 600;
        }

        .home-resume-box p {
          margin: 0 0 21px;
          color: #c0c8d4;
          font-size: 13px;
          line-height: 1.7;
        }

        .home-resume-box a {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #fff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
        }

        /* =====================================================
           FINAL
        ===================================================== */

        .home-final-new {
          position: relative;
          overflow: hidden;
          padding: 55px 0;
          background: #101b2d;
          color: #fff;
        }

        .home-final-watermark {
          position: absolute;
          right: 4%;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,.035);
          font-size: 240px;
          pointer-events: none;
        }

        .home-final-new-inner {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 35px;
        }

        .home-final-new-inner > div:first-child > span {
          color: #87aff0;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.15px;
        }

        .home-final-new h2 {
          max-width: 760px;
          margin: 7px 0 7px;
          color: #fff;
          font-size: 31px;
          line-height: 1.25;
          font-weight: 600;
          letter-spacing: -.4px;
        }

        .home-final-new p {
          max-width: 680px;
          margin: 0;
          color: #aeb9ca;
          font-size: 13px;
          line-height: 1.7;
        }

        .home-final-new-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .home-final-primary,
        .home-final-secondary {
          min-height: 43px;
          padding: 0 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 11.5px;
          font-weight: 600;
        }

        .home-final-primary {
          background: #ffffff;
          color: #142039;
        }

        .home-final-secondary {
          border: 1px solid #55637a;
          color: #ffffff;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 1100px) {
          .home-hero-new-grid {
            grid-template-columns: 1fr;
            gap: 38px;
          }

          .home-hero-dashboard {
            max-width: 720px;
          }

          .home-module-grid,
          .home-project-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .home-journey {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .home-journey-line {
            display: none;
          }

          .home-library-layout,
          .home-career-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 850px) {
          .home-split-panel {
            grid-template-columns: 1fr;
          }

          .home-section-topline,
          .home-final-new-inner {
            align-items: flex-start;
            flex-direction: column;
          }

          .home-watermark {
            font-size: 170px;
          }
        }

        @media (max-width: 650px) {
          .home-hero-new {
            padding: 42px 0 46px;
            background: #f7faff;
          }

          .home-hero-new-copy h1 {
            font-size: 37px;
            letter-spacing: -.8px;
          }

          .home-hero-new-copy > p {
            font-size: 14px;
          }

          .home-hero-new-actions {
            flex-direction: column;
          }

          .home-btn {
            width: 100%;
          }

          .home-trust-row {
            flex-direction: column;
            gap: 8px;
          }

          .home-section-new {
            padding: 50px 0;
          }

          .home-section-heading h2 {
            font-size: 27px;
          }

          .home-section-heading p {
            font-size: 13px;
          }

          .home-module-grid,
          .home-project-grid,
          .home-journey {
            grid-template-columns: 1fr;
          }

          .home-module-card {
            min-height: 172px;
          }

          .home-journey-item {
            min-height: 205px;
          }

          .home-feature-book {
            min-height: 320px;
          }

          .home-feature-book-content h3 {
            font-size: 23px;
          }

          .home-library-row {
            grid-template-columns: 32px 1fr 18px;
          }

          .home-exam-block,
          .home-community-block {
            min-height: auto;
            padding: 24px;
          }

          .home-exam-block h2,
          .home-community-block h2 {
            font-size: 25px;
          }

          .home-exam-facts {
            grid-template-columns: 1fr;
          }

          .home-final-new-actions {
            width: 100%;
          }

          .home-final-primary,
          .home-final-secondary {
            width: 100%;
          }

          .home-final-new h2 {
            font-size: 25px;
          }
        }
      `}</style>
    </>
  );
}

function SectionHeading({ overline, title, text }) {
  return (
    <div className="home-section-heading">
      <span>{overline}</span>
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
  );
}

function Watermark({ icon, side = "right" }) {
  return (
    <div className={`home-watermark ${side}`} aria-hidden="true">
      <i className={`bi ${icon}`} />
    </div>
  );
}

function DashboardRow({ icon, title, value, to }) {
  return (
    <Link to={to} className="home-dashboard-row">
      <div className="home-dashboard-row-icon">
        <i className={`bi ${icon}`} />
      </div>

      <div>
        <strong>{title}</strong>
        <small>Open module</small>
      </div>

      <div className="home-dashboard-row-value">{value}</div>
    </Link>
  );
}
