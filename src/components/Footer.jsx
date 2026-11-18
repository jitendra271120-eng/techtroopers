import { Link } from "react-router-dom";
import "../styles/global.css";

export default function Footer() {
  return (
    <footer className="tt-footer">
      <div className="container-xxl">

        <div className="tt-footer-grid">

          {/* =========================
              BRAND
          ========================= */}
          <div className="tt-footer-brand-section">

            <Link to="/" className="tt-footer-logo-link">
              <img
                src="/logohead.png"
                alt="Techtroopers"
                className="tt-footer-logo"
                style={{borderRadius:"12px", backgroundColor:"#fff"}}
              />
            </Link>

            <p className="tt-footer-description">
              One platform for learning resources, online exams,
              projects, career preparation and student collaboration.
              Learn, build and grow with Techtroopers.
            </p>

          </div>


          {/* =========================
              LEARN
          ========================= */}
          <div className="tt-footer-column">

            <h5>Learn</h5>

            <Link to="/ebooks">
              E-Books
            </Link>

            <Link to="/exams">
              Online Exams
            </Link>

            <Link to="/roadmaps">
              Road Maps
            </Link>


          </div>


          {/* =========================
              BUILD & GROW
          ========================= */}
          <div className="tt-footer-column">

            <h5>Build & Grow</h5>

            <Link to="/portfolio">
              Projects
            </Link>

            <Link to="/talk">
              TroopersTalk
            </Link>

            <Link to="/vacancies">
              Opportunities
            </Link>

            <Link to="/resume-builder">
              Resume Studio
            </Link>

          </div>


          {/* =========================
              PLATFORM
          ========================= */}
          <div className="tt-footer-column">

            <h5>Platform</h5>

            <Link to="/about">
              About Us
            </Link>

            <Link to="/services">
              Services
            </Link>

            <Link to="/contact">
              Contact
            </Link>

            <Link to="/dashboard">
              Dashboard
            </Link>

          </div>

        </div>

      </div>


      {/* =========================
          BOTTOM FOOTER
      ========================= */}

      <div className="tt-footer-bottom">

        <div className="container-xxl tt-footer-bottom-content">

          <p>
            © {new Date().getFullYear()}{" "}
            <strong>Techtroopers</strong>.
            All rights reserved.
          </p>


          <div className="tt-footer-bottom-links">

            <Link to="/privacy">
              Privacy Policy
            </Link>

            <Link to="/terms">
              Terms
            </Link>

            <Link to="/contact">
              Support
            </Link>

          </div>


          <p className="tt-footer-bottom-tag">
            Learning • Technology • Innovation
          </p>

        </div>

      </div>

    </footer>
  );
}