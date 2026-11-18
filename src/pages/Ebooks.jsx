import { useEffect, useMemo, useState } from "react";

import PageMeta from "../components/PageMeta";
import { listCollection } from "../services/firestoreService";
import {
  normalizeBookCategory,
  normalizeBookFile,
} from "../utils/firestoreAdapters";

export default function Ebooks() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState("");

  /* =====================================================
     LOAD FIRESTORE DATA
  ===================================================== */

  useEffect(() => {
    let alive = true;

    Promise.all([
      listCollection("BookCategory"),
      listCollection("BookFile"),
    ])
      .then(([cats, files]) => {
        if (!alive) return;

        setCategories(cats.map(normalizeBookCategory));
        setBooks(files.map(normalizeBookFile));
      })
      .catch((e) => {
        if (alive) {
          setError(
            e?.message ||
              "Unable to load E-Book resources."
          );
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  /* =====================================================
     PREPARE CATEGORY LIST
  ===================================================== */

  const categoryList = useMemo(() => {
    const map = new Map();

    categories.forEach((cat) => {
      const name =
        cat.category ||
        cat.categoryName ||
        cat.name ||
        cat.title ||
        "";

      if (!name) return;

      map.set(name.trim(), {
        id: cat.id,
        name: name.trim(),
        description:
          cat.description ||
          `${name.trim()} learning resources`,
      });
    });

    books.forEach((book) => {
      const name = book.categoryName?.trim();

      if (name && !map.has(name)) {
        map.set(name, {
          id: book.categoryId || name,
          name,
          description: `${name} learning resources`,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [categories, books]);

  /* =====================================================
     COUNT BOOKS
  ===================================================== */

  const getBookCount = (category) => {
    if (category?.name === "All") {
      return books.length;
    }

    return books.filter((book) => {
      const byName =
        book.categoryName?.trim().toLowerCase() ===
        category?.name?.trim().toLowerCase();

      const byId =
        book.categoryId &&
        category?.id &&
        book.categoryId === category.id;

      return byName || byId;
    }).length;
  };

  /* =====================================================
     OPEN CATEGORY POPUP
  ===================================================== */

  const openCategory = (category) => {
    setSelectedCategory(category);
    setSearch("");
  };

  const closeCategory = () => {
    setSelectedCategory(null);
    setSearch("");
  };

  /* =====================================================
     PREVENT BODY SCROLL + ESC
  ===================================================== */

  useEffect(() => {
    if (!selectedCategory) return;

    document.body.style.overflow = "hidden";

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeCategory();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [selectedCategory]);

  /* =====================================================
     FILTER BOOKS INSIDE POPUP
  ===================================================== */

  const popupBooks = useMemo(() => {
    if (!selectedCategory) return [];

    let categoryBooks = books;

    if (selectedCategory.name !== "All") {
      categoryBooks = books.filter((book) => {
        const byName =
          book.categoryName
            ?.trim()
            .toLowerCase() ===
          selectedCategory.name
            ?.trim()
            .toLowerCase();

        const byId =
          book.categoryId &&
          selectedCategory.id &&
          book.categoryId ===
            selectedCategory.id;

        return byName || byId;
      });
    }

    const value = search.trim().toLowerCase();

    if (!value) {
      return categoryBooks;
    }

    return categoryBooks.filter((book) =>
      [
        book.title,
        book.subCat,
        book.categoryName,
        book.description,
        book.price,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [books, selectedCategory, search]);

  /* =====================================================
     OPEN BOOK
  ===================================================== */

  const openResource = (book) => {
    if (!book.fileUrl) {
      alert(
        "This E-Book does not have a file URL."
      );
      return;
    }

    window.open(
      book.fileUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* =====================================================
     ICONS
  ===================================================== */

  const getCategoryIcon = (name = "") => {
    const value = name.toLowerCase();

    if (value.includes("program"))
      return "bi-code-slash";

    if (value.includes("data science"))
      return "bi-cpu";

    if (value.includes("analytics"))
      return "bi-bar-chart-line";

    if (value.includes("sql"))
      return "bi-database";

    if (value.includes("seo"))
      return "bi-search";

    if (
      value.includes("interview") ||
      value.includes("cracking")
    )
      return "bi-person-workspace";

    if (value.includes("python"))
      return "bi-filetype-py";

    if (value.includes("java"))
      return "bi-cup-hot";

    return "bi-book";
  };

  return (
    <>
      <PageMeta title="E-Books & Notes" />

      {/* ==================================================
          HERO
      ================================================== */}

      <section className="page-hero">
        <div className="container-xxl">
          <span className="eyebrow">
            DIGITAL LIBRARY
          </span>

          <h1>
            E-Books, Notes & Code Books
          </h1>

          <p>
            Select a category and explore learning
            resources from our digital library.
          </p>
        </div>
      </section>

      <main className="section pt-4">
        <div className="container-xxl">

          {error && (
            <div className="alert alert-danger">
              <strong>
                Unable to load E-Books:
              </strong>{" "}
              {error}
            </div>
          )}

          {/* LOADING */}

          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />

              <h5 className="mt-3">
                Loading Digital Library...
              </h5>
            </div>
          )}

          {/* CATEGORY SECTION */}

          {!loading && !error && (
            <>
              <div className="library-heading">
                <div>
                  <span className="eyebrow">
                    EXPLORE
                  </span>

                  <h2>
                    Browse by Category
                  </h2>

                  <p>
                    Choose a category to view
                    available books and notes.
                  </p>
                </div>

                <div className="library-total">
                  <strong>{books.length}</strong>
                  <span>Total Resources</span>
                </div>
              </div>

              <div className="ebook-category-grid">

                {/* ALL RESOURCES */}

                <button
                  className="ebook-category-card"
                  onClick={() =>
                    openCategory({
                      id: "all",
                      name: "All",
                      description:
                        "Complete digital resource library",
                    })
                  }
                >
                  <div className="category-icon all">
                    <i className="bi bi-grid-fill" />
                  </div>

                  <div className="category-content">
                    <h3>
                      All Resources
                    </h3>

                    <p>
                      Browse the complete digital
                      library.
                    </p>

                    <div className="category-footer">
                      <span>
                        {books.length} Resources
                      </span>

                      <i className="bi bi-arrow-up-right" />
                    </div>
                  </div>
                </button>

                {/* FIRESTORE CATEGORIES */}

                {categoryList.map(
                  (category, index) => (
                    <button
                      key={
                        category.id ||
                        category.name
                      }
                      className="ebook-category-card"
                      onClick={() =>
                        openCategory(category)
                      }
                    >
                      <div
                        className={`category-icon category-${index % 6}`}
                      >
                        <i
                          className={`bi ${getCategoryIcon(
                            category.name
                          )}`}
                        />
                      </div>

                      <div className="category-content">
                        <h3>
                          {category.name}
                        </h3>

                        <p>
                          {category.description}
                        </p>

                        <div className="category-footer">
                          <span>
                            {getBookCount(
                              category
                            )}{" "}
                            Resources
                          </span>

                          <i className="bi bi-arrow-up-right" />
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ==================================================
          BEAUTIFUL POPUP
      ================================================== */}

      {selectedCategory && (
        <div
          className="ebook-modal-backdrop"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              closeCategory();
            }
          }}
        >
          <div className="ebook-modal">

            {/* MODAL HEADER */}

            <div className="ebook-modal-header">
              <div className="modal-title-area">

                <div className="modal-category-icon">
                  <i
                    className={`bi ${
                      selectedCategory.name ===
                      "All"
                        ? "bi-grid-fill"
                        : getCategoryIcon(
                            selectedCategory.name
                          )
                    }`}
                  />
                </div>

                <div>
                  <span className="modal-label">
                    DIGITAL LIBRARY
                  </span>

                  <h2>
                    {selectedCategory.name ===
                    "All"
                      ? "All Resources"
                      : selectedCategory.name}
                  </h2>

                  <p>
                    {
                      popupBooks.length
                    }{" "}
                    resources available
                  </p>
                </div>
              </div>

              <button
                className="modal-close-btn"
                onClick={closeCategory}
                title="Close"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* SEARCH */}

            <div className="ebook-modal-toolbar">
              <div className="modal-search">
                <i className="bi bi-search" />

                <input
                  type="text"
                  placeholder={`Search inside ${
                    selectedCategory.name ===
                    "All"
                      ? "all resources"
                      : selectedCategory.name
                  }...`}
                  value={search}
                  autoFocus
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />
              </div>

              <div className="modal-count">
                <i className="bi bi-book me-2" />

                {popupBooks.length} Resources
              </div>
            </div>

            {/* MODAL BODY */}

            <div className="ebook-modal-body">

              {popupBooks.length === 0 ? (
                <div className="empty-library">
                  <div className="empty-icon">
                    <i className="bi bi-journal-x" />
                  </div>

                  <h3>
                    No resources found
                  </h3>

                  <p>
                    No E-Books match your
                    current search.
                  </p>
                </div>
              ) : (
                <div className="popup-book-grid">

                  {popupBooks.map(
                    (book, index) => (
                      <article
                        className="popup-book-card"
                        key={book.id}
                      >
                        <div
                          className={`book-top category-${index % 6}`}
                        >
                          <div className="book-icon">
                            <i className="bi bi-file-earmark-pdf" />
                          </div>

                          {book.categoryName ||
                              "E-Book"}
                        </div>

                        <div className="book-body">

                          <span className="book-category">
                            {book.categoryName ||
                              "E-Book"}
                          </span>

                          <h3>
                            {book.title ||
                              "Untitled Resource"}
                          </h3>

                          {book.subCat && (
                            <div className="book-subcategory">
                              <i className="bi bi-tag me-1" />
                              {book.subCat}
                            </div>
                          )}

                          <p>
                            {book.description ||
                              `${book.categoryName ||
                                "Learning"} resource for students and learners.`}
                          </p>

                          <button
                            className="read-book-btn"
                            onClick={() =>
                              openResource(
                                book
                              )
                            }
                          >
                            <span>
                              Read / Download
                            </span>

                            <i className="bi bi-arrow-up-right" />
                          </button>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </div>

            {/* FOOTER */}

            <div className="ebook-modal-footer">
              <span>
                Press{" "}
                <kbd>ESC</kbd> to close
              </span>

              <button
                className="btn btn-outline-secondary"
                onClick={closeCategory}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          CSS
      ================================================== */}

      <style>{`

        /* ===========================
           HEADING
        =========================== */

        .library-heading {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:20px;
          margin-bottom:28px;
        }

        .library-heading h2 {
          font-size:22px;
          color:#172033;
          margin:4px 0 7px;
        }

        .library-heading p {
          color:#6d7584;
          margin:0;
          font-size:15px;
        }

        .library-total {
          background:#edf4ff;
          padding:13px 20px;
          border-radius:14px;
          min-width:130px;
          text-align:center;
        }

        .library-total strong {
          display:block;
          font-size:24px;
          color:#2370f2;
        }

        .library-total span {
          font-size:12px;
          color:#697386;
        }


        /* ===========================
           CATEGORY GRID
        =========================== */

        .ebook-category-grid {
          display:grid;
          grid-template-columns:
            repeat(3,minmax(0,1fr));
          gap:20px;
        }

        .ebook-category-card {
          border:1px solid #e4e8ef;
          background:#fff;
          border-radius:20px;
          padding:24px;
          text-align:left;
          display:flex;
          align-items:flex-start;
          gap:18px;
          width:100%;
          cursor:pointer;
          font-family:'Poppins',sans-serif;
          transition:.25s ease;
          box-shadow:
            0 4px 14px rgba(17,24,39,.03);
        }

        .ebook-category-card:hover {
          transform:translateY(-5px);
          border-color:#bad2ff;
          box-shadow:
            0 18px 40px rgba(35,112,242,.12);
        }

        .category-icon {
          width:58px;
          height:58px;
          min-width:58px;
          border-radius:16px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:25px;
        }

        .category-icon.all {
          background:#eaf2ff;
          color:#2370f2;
        }

        .category-0 {
          background:#eaf2ff;
          color:#2370f2;
        }

        .category-1 {
          background:#f2edff;
          color:#7754dd;
        }

        .category-2 {
          background:#e7f8f1;
          color:#149767;
        }

        .category-3 {
          background:#fff4df;
          color:#d48b16;
        }

        .category-4 {
          background:#ffecef;
          color:#db4d64;
        }

        .category-5 {
          background:#e6f8f8;
          color:#159697;
        }

        .category-content {
          flex:1;
        }

        .category-content h3 {
          font-size:17px;
          font-weight:600;
          color:#192234;
          margin:1px 0 7px;
        }

        .category-content p {
          font-size:13px;
          color:#768091;
          line-height:1.6;
          min-height:42px;
          margin-bottom:11px;
        }

        .category-footer {
          display:flex;
          justify-content:space-between;
          align-items:center;
          color:#2370f2;
          font-size:13px;
          font-weight:600;
        }


        /* ===========================
           MODAL BACKDROP
        =========================== */

        .ebook-modal-backdrop {
          position:fixed;
          inset:0;
          z-index:99999;
          background:
            rgba(12,18,28,.68);
          backdrop-filter:blur(8px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:25px;
          animation:fadePopup .2s ease;
        }

        @keyframes fadePopup {
          from {
            opacity:0;
          }

          to {
            opacity:1;
          }
        }


        /* ===========================
           MODAL
        =========================== */

        .ebook-modal {
          width:min(1180px,96vw);
          max-height:92vh;
          background:#f8fafc;
          border-radius:26px;
          overflow:hidden;
          display:flex;
          flex-direction:column;
          box-shadow:
            0 30px 100px rgba(0,0,0,.28);
          animation:modalScale .25s ease;
        }

        @keyframes modalScale {
          from {
            opacity:0;
            transform:
              translateY(20px)
              scale(.97);
          }

          to {
            opacity:1;
            transform:
              translateY(0)
              scale(1);
          }
        }


        /* ===========================
           MODAL HEADER
        =========================== */

        .ebook-modal-header {
          padding:22px 27px;
          background:#fff;
          border-bottom:1px solid #e7ebf1;
          display:flex;
          justify-content:space-between;
          align-items:center;
        }

        .modal-title-area {
          display:flex;
          align-items:center;
          gap:16px;
        }

        .modal-category-icon {
          width:56px;
          height:56px;
          border-radius:17px;
          background:
            linear-gradient(
              135deg,
              #2370f2,
              #5a8ff4
            );
          color:#fff;
          display:flex;
          justify-content:center;
          align-items:center;
          font-size:24px;
          box-shadow:
            0 10px 25px
            rgba(35,112,242,.22);
        }

        .modal-label {
          font-size:10px;
          letter-spacing:1.4px;
          font-weight:700;
          color:#2370f2;
        }

        .ebook-modal-header h2 {
          font-size:22px;
          font-weight:700;
          margin:2px 0;
          color:#192234;
        }

        .ebook-modal-header p {
          font-size:13px;
          color:#818898;
          margin:0;
        }

        .modal-close-btn {
          border:0;
          background:#f1f4f8;
          color:#4f5968;
          width:42px;
          height:42px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:17px;
          cursor:pointer;
          transition:.2s;
        }

        .modal-close-btn:hover {
          background:#ffe8eb;
          color:#db3951;
          transform:rotate(90deg);
        }


        /* ===========================
           MODAL TOOLBAR
        =========================== */

        .ebook-modal-toolbar {
          padding:17px 27px;
          background:#fff;
          display:flex;
          align-items:center;
          gap:15px;
          border-bottom:1px solid #e9edf3;
        }

        .modal-search {
          flex:1;
          display:flex;
          align-items:center;
          gap:11px;
          border:1px solid #dae1eb;
          background:#f9fafc;
          border-radius:13px;
          padding:0 15px;
        }

        .modal-search i {
          color:#8a94a3;
        }

        .modal-search input {
          width:100%;
          min-height:47px;
          background:transparent;
          border:0;
          outline:none;
          font-family:'Poppins',sans-serif;
          font-size:14px;
          color:#202939;
        }

        .modal-count {
          background:#edf4ff;
          color:#2370f2;
          border-radius:11px;
          padding:12px 17px;
          font-size:13px;
          font-weight:600;
          white-space:nowrap;
        }


        /* ===========================
           MODAL BODY
        =========================== */

        .ebook-modal-body {
          padding:25px;
          overflow-y:auto;
          flex:1;
        }

        .popup-book-grid {
          display:grid;
          grid-template-columns:
            repeat(3,minmax(0,1fr));
          gap:18px;
        }


        /* ===========================
           BOOK CARD
        =========================== */

        .popup-book-card {
          background:#fff;
          border:1px solid #e7ebf0;
          border-radius:18px;
          overflow:hidden;
          transition:.2s ease;
        }

        .popup-book-card:hover {
          transform:translateY(-4px);
          box-shadow:
            0 15px 35px
            rgba(18,30,50,.09);
          border-color:#d4e1fa;
        }

        .book-top {
          padding:19px;
          display:flex;
          justify-content:space-between;
          align-items:center;
        }

        .book-icon {
          width:43px;
          height:43px;
          background:rgba(255,255,255,.75);
          border-radius:12px;
          display:flex;
          justify-content:center;
          align-items:center;
          font-size:20px;
        }

        .book-price {
          background:#fff;
          color:#182133;
          padding:6px 11px;
          border-radius:30px;
          font-size:12px;
          font-weight:700;
        }

        .book-body {
          padding:18px;
        }

        .book-category {
          font-size:10px;
          font-weight:700;
          color:#2370f2;
          text-transform:uppercase;
          letter-spacing:.7px;
        }

        .book-body h3 {
          font-size:16px;
          color:#192234;
          font-weight:600;
          margin:7px 0 9px;
          line-height:1.45;
        }

        .book-subcategory {
          font-size:12px;
          color:#747e8c;
          margin-bottom:10px;
        }

        .book-body p {
          font-size:12.5px;
          color:#7b8391;
          line-height:1.6;
          min-height:40px;
        }

        .read-book-btn {
          width:100%;
          border:0;
          background:#edf4ff;
          color:#2370f2;
          border-radius:10px;
          padding:11px 13px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          font-family:'Poppins',sans-serif;
          font-size:12.5px;
          font-weight:600;
          cursor:pointer;
          transition:.2s;
        }

        .read-book-btn:hover {
          background:#2370f2;
          color:white;
        }


        /* ===========================
           EMPTY
        =========================== */

        .empty-library {
          min-height:300px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          text-align:center;
        }

        .empty-icon {
          width:75px;
          height:75px;
          border-radius:20px;
          background:#edf4ff;
          color:#2370f2;
          display:flex;
          justify-content:center;
          align-items:center;
          font-size:30px;
          margin-bottom:16px;
        }

        .empty-library h3 {
          font-size:20px;
        }

        .empty-library p {
          color:#858c99;
        }


        /* ===========================
           FOOTER
        =========================== */

        .ebook-modal-footer {
          background:#fff;
          border-top:1px solid #e7ebf1;
          padding:13px 25px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          font-size:12px;
          color:#7b8491;
        }

        .ebook-modal-footer kbd {
          background:#edf1f5;
          color:#495260;
          border:0;
          font-size:10px;
        }


        /* ===========================
           RESPONSIVE
        =========================== */

        @media(max-width:1000px) {

          .ebook-category-grid,
          .popup-book-grid {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

        }

        @media(max-width:650px) {

          .ebook-category-grid,
          .popup-book-grid {
            grid-template-columns:1fr;
          }

          .ebook-modal-backdrop {
            padding:8px;
          }

          .ebook-modal {
            max-height:97vh;
            border-radius:18px;
          }

          .ebook-modal-header,
          .ebook-modal-toolbar,
          .ebook-modal-body {
            padding:16px;
          }

          .ebook-modal-toolbar {
            flex-direction:column;
            align-items:stretch;
          }

          .library-heading {
            align-items:flex-start;
          }

          .library-total {
            display:none;
          }

          .modal-category-icon {
            width:46px;
            height:46px;
          }

          .ebook-modal-header h2 {
            font-size:18px;
          }

        }

      `}</style>
    </>
  );
}