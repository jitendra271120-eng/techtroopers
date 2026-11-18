import { useMemo, useState } from "react";
import PageMeta from "../components/PageMeta";
import '../styles/global.css'

const templates = [
  {
    id: "blue",
    name: "Blue Grid",
    layout: "classic",
  },
  {
    id: "navy",
    name: "Navy Executive",
    layout: "executive",
  },
  {
    id: "mono",
    name: "Monochrome",
    layout: "minimal",
  },
  {
    id: "teal",
    name: "Teal Sidebar",
    layout: "leftSidebar",
  },
  {
    id: "amber",
    name: "Amber Sidebar",
    layout: "rightSidebar",
  },
  {
    id: "lav",
    name: "Lavender",
    layout: "classic",
  },
  {
    id: "royal",
    name: "Royal Profile",
    layout: "leftSidebar",
  },
  {
    id: "emerald",
    name: "Emerald Pro",
    layout: "executive",
  },
  {
    id: "crimson",
    name: "Crimson Modern",
    layout: "rightSidebar",
  },
  {
    id: "slate",
    name: "Slate Sidebar",
    layout: "darkSidebar",
  },
  {
    id: "minimal",
    name: "Minimal Clean",
    layout: "minimal",
  },
  {
    id: "corporate",
    name: "Corporate Pro",
    layout: "corporate",
  },
];

const initial = {
  name: "Jitendra Kumar",
  title: "Software Developer / Educator",
  email: "jitendra@example.com",
  phone: "+91 98765 43210",
  location: "Uttar Pradesh, India",
  website: "linkedin.com/in/jitendra",

  summary:
    "Software professional and educator with experience in web development, Java, PHP, React, Firebase and practical student mentoring.",

  skills:
    "Java, Python, PHP, React, JavaScript, MySQL, Firebase, Spring Boot",

  experience:
    "Senior Software Developer / Assistant Professor\nBuilt web applications, APIs, academic platforms and guided student projects.",

  education:
    "Master of Computer Applications (MCA)\nBachelor Degree",

  projects:
    "Online Examination System — React, Firebase\nCollege ERP Suite — React, Firebase, Node",
};

export default function ResumeBuilder() {
  const [tpl, setTpl] = useState("blue");
  const [f, setF] = useState(initial);

  const selectedTemplate =
    templates.find((item) => item.id === tpl) || templates[0];

  const completion = useMemo(() => {
    const values = Object.values(f);

    const filled = values.filter((value) =>
      String(value).trim()
    ).length;

    return Math.round(
      (filled / values.length) * 100
    );
  }, [f]);

  const update = (key, value) => {
    setF((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getInitials = () => {
    if (!f.name.trim()) return "CV";

    return f.name
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const skills = f.skills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  const experienceLines = f.experience
    .split("\n")
    .filter((line) => line.trim());

  const educationLines = f.education
    .split("\n")
    .filter((line) => line.trim());

  const projectLines = f.projects
    .split("\n")
    .filter((line) => line.trim());

  const Section = ({ title, children, className = "" }) => (
    <section className={`resume-section ${className}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );

  const ContactDetails = ({ vertical = false }) => (
    <div
      className={
        vertical
          ? "resume-contact resume-contact-vertical"
          : "resume-contact"
      }
    >
      {f.email && <span>{f.email}</span>}
      {f.phone && <span>{f.phone}</span>}
      {f.location && <span>{f.location}</span>}
      {f.website && <span>{f.website}</span>}
    </div>
  );

  const Skills = () => (
    <div className="resume-skills">
      {skills.map((skill, index) => (
        <span key={`${skill}-${index}`}>
          {skill}
        </span>
      ))}
    </div>
  );

  const Experience = () => (
    <div className="resume-lines">
      {experienceLines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );

  const Education = () => (
    <div className="resume-lines">
      {educationLines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );

  const Projects = () => (
    <div className="resume-lines">
      {projectLines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );

  /* =====================================================
     CLASSIC
  ===================================================== */

  const ClassicLayout = () => (
    <>
      <header className="classic-header">
        <div className="resume-avatar">
          {getInitials()}
        </div>

        <div>
          <h1>{f.name}</h1>
          <h2>{f.title}</h2>
          <ContactDetails />
        </div>
      </header>

      <div className="classic-body">

        <main>
          <Section title="Profile">
            <p>{f.summary}</p>
          </Section>

          <Section title="Experience">
            <Experience />
          </Section>

          <Section title="Projects">
            <Projects />
          </Section>
        </main>

        <aside>
          <Section title="Skills">
            <Skills />
          </Section>

          <Section title="Education">
            <Education />
          </Section>
        </aside>

      </div>
    </>
  );

  /* =====================================================
     LEFT SIDEBAR
  ===================================================== */

  const LeftSidebarLayout = () => (
    <div className="sidebar-resume">

      <aside className="sidebar-left">

        <div className="sidebar-avatar">
          {getInitials()}
        </div>

        <h1>{f.name}</h1>
        <h2>{f.title}</h2>

        <Section title="Contact">
          <ContactDetails vertical />
        </Section>

        <Section title="Skills">
          <Skills />
        </Section>

        <Section title="Education">
          <Education />
        </Section>

      </aside>

      <main className="sidebar-main">

        <Section title="Profile">
          <p>{f.summary}</p>
        </Section>

        <Section title="Experience">
          <Experience />
        </Section>

        <Section title="Projects">
          <Projects />
        </Section>

      </main>

    </div>
  );

  /* =====================================================
     RIGHT SIDEBAR
  ===================================================== */

  const RightSidebarLayout = () => (
    <>
      <header className="wide-header">

        <div>
          <h1>{f.name}</h1>
          <h2>{f.title}</h2>
        </div>

        <ContactDetails />

      </header>

      <div className="right-sidebar-layout">

        <main>

          <Section title="Professional Profile">
            <p>{f.summary}</p>
          </Section>

          <Section title="Professional Experience">
            <Experience />
          </Section>

          <Section title="Selected Projects">
            <Projects />
          </Section>

        </main>

        <aside>

          <div className="sidebar-avatar small">
            {getInitials()}
          </div>

          <Section title="Core Skills">
            <Skills />
          </Section>

          <Section title="Education">
            <Education />
          </Section>

        </aside>

      </div>
    </>
  );

  /* =====================================================
     DARK SIDEBAR
  ===================================================== */

  const DarkSidebarLayout = () => (
    <div className="dark-sidebar-layout">

      <aside>

        <div className="sidebar-avatar">
          {getInitials()}
        </div>

        <h1>{f.name}</h1>

        <h2>{f.title}</h2>

        <Section title="Contact">
          <ContactDetails vertical />
        </Section>

        <Section title="Skills">
          <Skills />
        </Section>

      </aside>

      <main>

        <Section title="About Me">
          <p>{f.summary}</p>
        </Section>

        <Section title="Professional Experience">
          <Experience />
        </Section>

        <Section title="Education">
          <Education />
        </Section>

        <Section title="Projects">
          <Projects />
        </Section>

      </main>

    </div>
  );

  /* =====================================================
     MINIMAL
  ===================================================== */

  const MinimalLayout = () => (
    <div className="minimal-layout">

      <header>

        <h1>{f.name}</h1>

        <h2>{f.title}</h2>

        <ContactDetails />

      </header>

      <Section title="Profile">
        <p>{f.summary}</p>
      </Section>

      <div className="minimal-columns">

        <main>

          <Section title="Experience">
            <Experience />
          </Section>

          <Section title="Projects">
            <Projects />
          </Section>

        </main>

        <aside>

          <Section title="Skills">
            <Skills />
          </Section>

          <Section title="Education">
            <Education />
          </Section>

        </aside>

      </div>

    </div>
  );

  /* =====================================================
     EXECUTIVE
  ===================================================== */

  const ExecutiveLayout = () => (
    <>

      <header className="executive-header">

        <div className="executive-name">

          <div className="resume-avatar">
            {getInitials()}
          </div>

          <div>
            <h1>{f.name}</h1>
            <h2>{f.title}</h2>
          </div>

        </div>

        <ContactDetails />

      </header>

      <div className="executive-profile">
        {f.summary}
      </div>

      <div className="executive-body">

        <main>

          <Section title="Professional Experience">
            <Experience />
          </Section>

          <Section title="Projects">
            <Projects />
          </Section>

        </main>

        <aside>

          <Section title="Expertise">
            <Skills />
          </Section>

          <Section title="Academic Background">
            <Education />
          </Section>

        </aside>

      </div>

    </>
  );

  /* =====================================================
     CORPORATE
  ===================================================== */

  const CorporateLayout = () => (
    <>
      <header className="corporate-header">

        <div className="corporate-name">

          <div className="resume-avatar">
            {getInitials()}
          </div>

          <div>
            <h1>{f.name}</h1>
            <h2>{f.title}</h2>
          </div>

        </div>

      </header>

      <div className="corporate-contact">
        <ContactDetails />
      </div>

      <div className="corporate-body">

        <main>

          <Section title="Career Profile">
            <p>{f.summary}</p>
          </Section>

          <Section title="Professional Experience">
            <Experience />
          </Section>

          <Section title="Key Projects">
            <Projects />
          </Section>

        </main>

        <aside>

          <Section title="Technical Skills">
            <Skills />
          </Section>

          <Section title="Education">
            <Education />
          </Section>

        </aside>

      </div>
    </>
  );

  const renderResumeLayout = () => {
    switch (selectedTemplate.layout) {
      case "leftSidebar":
        return <LeftSidebarLayout />;

      case "rightSidebar":
        return <RightSidebarLayout />;

      case "darkSidebar":
        return <DarkSidebarLayout />;

      case "minimal":
        return <MinimalLayout />;

      case "executive":
        return <ExecutiveLayout />;

      case "corporate":
        return <CorporateLayout />;

      default:
        return <ClassicLayout />;
    }
  };

  return (
    <>
      <PageMeta title="Resume Studio" />

      <main className="resume-page">

        {/* ==========================
            HERO
        ========================== */}

        <section className="resume-hero">

          <div>

            <span className="resume-eyebrow">
              TECHTROOPERS RESUME STUDIO
            </span>

            <h1>
              Build a resume that{" "}
              <span>stands out.</span>
            </h1>

            <p>
              Create your profile once and instantly switch
              between multiple professional resume layouts.
            </p>

          </div>

          <div className="resume-actions">

            <button
              className="btn btn-light border"
              onClick={() => {
                setF(initial);
                setTpl("blue");
              }}
            >
              Reset
            </button>

            <button
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              Print / Download PDF
            </button>

          </div>

        </section>


        {/* ==========================
            COMPLETION
        ========================== */}

        <section className="completion-card">

          <div className="completion-info">

            <span>Profile Completion</span>

            <b>
              {completion}%
            </b>

          </div>

          <div className="progress">

            <div
              className="progress-bar"
              style={{
                width: `${completion}%`,
              }}
            />

          </div>

        </section>


        {/* ==========================
            TEMPLATES
        ========================== */}

        <section className="template-section">

          <div className="template-title">

            <div>

              <h3>
                Resume Templates
              </h3>

              <p>
                Different colors, sidebar styles and
                professional layouts.
              </p>

            </div>

            <span>
              {templates.length} Templates
            </span>

          </div>

          <div className="template-row">

            {templates.map((template) => (

              <button
                key={template.id}
                className={`template-card ${
                  tpl === template.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setTpl(template.id)
                }
              >

                <div
                  className={`
                    template-thumbnail
                    template-thumb-${template.id}
                    thumb-layout-${template.layout}
                  `}
                >

                  <div className="fake-resume">

                    <div className="fake-sidebar" />

                    <div className="fake-content">

                      <span />
                      <span />
                      <span />
                      <span />

                    </div>

                  </div>

                </div>

                <div className="template-name">

                  <span
                    className={`tpl-dot ${template.id}`}
                  />

                  <div>

                    <b>
                      {template.name}
                    </b>

                    <small>
                      {template.layout
                        .replace(/([A-Z])/g, " $1")}
                    </small>

                  </div>

                </div>

              </button>

            ))}

          </div>

        </section>


        {/* ==========================
            BUILDER
        ========================== */}

        <section className="resume-builder-grid">

          <aside className="resume-form">

            <div className="form-heading">

              <h3>
                Your Details
              </h3>

              <p>
                Resume preview updates automatically.
              </p>

            </div>

            {[
              ["name", "Full Name"],
              ["title", "Professional Title"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["location", "Location"],
              ["website", "Website / LinkedIn"],
            ].map(([key, label]) => (

              <label key={key}>

                <span>{label}</span>

                <input
                  className="form-control"
                  value={f[key]}
                  onChange={(e) =>
                    update(
                      key,
                      e.target.value
                    )
                  }
                />

              </label>

            ))}


            {[
              [
                "summary",
                "Professional Summary",
              ],
              [
                "skills",
                "Skills (comma separated)",
              ],
              [
                "experience",
                "Experience",
              ],
              [
                "education",
                "Education",
              ],
              [
                "projects",
                "Projects",
              ],
            ].map(([key, label]) => (

              <label key={key}>

                <span>{label}</span>

                <textarea
                  className="form-control"
                  rows={
                    key === "summary"
                      ? 4
                      : 5
                  }
                  value={f[key]}
                  onChange={(e) =>
                    update(
                      key,
                      e.target.value
                    )
                  }
                />

              </label>

            ))}

          </aside>


          {/* ==========================
              PREVIEW
          ========================== */}

          <section className="resume-preview">

            <div className="preview-head">

              <div>

                <h3>
                  Live Resume Preview
                </h3>

                <small>
                  Exact A4 print layout
                </small>

              </div>

              <div className="preview-head-right">

                <span>
                  {selectedTemplate.name}
                </span>

                <b>A4</b>

              </div>

            </div>


            <div className="resume-paper-wrapper">

              <article
                id="printableResume"
                className={`
                  resume-sheet
                  tpl-${tpl}
                  layout-${selectedTemplate.layout}
                `}
              >

                {renderResumeLayout()}

              </article>

            </div>

          </section>

        </section>

      </main>
    </>
  );
}