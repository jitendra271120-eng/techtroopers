import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

import AdminShell, {
  EmptyRow,
} from "../../components/admin/AdminShell";

import {
  addRecord,
  listCollection,
  removeRecord,
  updateRecord,
} from "../../services/firestoreService";

import {
  normalizeExamDoc,
  normalizeQuestionDoc,
} from "../../utils/firestoreAdapters";

/* ============================================================
   DEFAULT FORM
============================================================ */

const blank = {
  category: "",
  question: "",
  a: "",
  b: "",
  c: "",
  d: "",
  answer: 0,
  getQuesDesc: "",
};

/* ============================================================
   HELPERS
============================================================ */

const clean = (value) => String(value ?? "").trim();

const normalizeKey = (value) =>
  clean(value)
    .toLowerCase()
    .replace(/\s+/g, " ");

const uniqueValues = (values) => {
  const seen = new Set();

  return values.filter((value) => {
    const key = normalizeKey(value);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const parseAnswer = (value) => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const text = String(value).trim().toUpperCase();

  if (["A", "B", "C", "D"].includes(text)) {
    return text.charCodeAt(0) - 65;
  }

  const number = Number(text);

  return Number.isFinite(number)
    ? Math.max(0, Math.min(3, number))
    : 0;
};

const getExamAliases = (exam) =>
  uniqueValues([
    exam?.category,
    exam?.id,
    exam?.title,
    exam?.name,
    exam?.examId,
    exam?.code,
  ]);

const getQuestionAliases = (question) =>
  uniqueValues([
    question?.category,
    question?.examId,
    question?.categoryName,
    question?.examTitle,
    question?.exam,
  ]);

const getExamCategoryCode = (exam) =>
  clean(
    exam?.category ||
      exam?.code ||
      exam?.id ||
      exam?.title ||
      exam?.name
  );

const getExamTitle = (exam) =>
  clean(
    exam?.title ||
      exam?.name ||
      exam?.category ||
      exam?.code ||
      exam?.id
  );

/* ============================================================
   COMPONENT
============================================================ */

export default function AdminQuestionBank() {
  /* ==========================================================
     STATES
  ========================================================== */

  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState("");

  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteAllConfirmed, setDeleteAllConfirmed] =
    useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fileRef = useRef(null);

  /* ==========================================================
     LOAD DATA
  ========================================================== */

  const load = async () => {
    try {
      setLoading(true);

      const [categoryRecords, questionRecords] =
        await Promise.all([
          listCollection("categories"),
          listCollection("questions"),
        ]);

      const exams = categoryRecords.map(normalizeExamDoc);

      const normalizedQuestions =
        questionRecords.map(normalizeQuestionDoc);

      setCategories(exams);
      setQuestions(normalizedQuestions);

      setForm((previous) => {
        if (previous.category) {
          return previous;
        }

        return {
          ...previous,
          category:
            getExamCategoryCode(exams[0]) ||
            clean(normalizedQuestions[0]?.category) ||
            clean(normalizedQuestions[0]?.examId) ||
            "",
        };
      });
    } catch (error) {
      console.error("Question bank loading failed:", error);
      toast.error(
        error?.message || "Unable to load question bank."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ==========================================================
     CATEGORY OPTIONS

     IMPORTANT FIX:
     - Uses the categories collection.
     - Also includes category values already stored in questions.
     - Supports category, examId, title and ID aliases.
  ========================================================== */

  const categoryOptions = useMemo(() => {
    const output = [];
    const coveredAliases = new Set();

    categories.forEach((exam) => {
      const aliases = getExamAliases(exam);

      aliases.forEach((alias) => {
        coveredAliases.add(normalizeKey(alias));
      });

      const value = getExamCategoryCode(exam);

      if (!value) {
        return;
      }

      const title = getExamTitle(exam);
      const code = clean(exam?.category || exam?.code || value);

      output.push({
        key: `exam-${exam.id || value}`,
        value,
        title,
        code,
        aliases,
        source: "exam",
      });
    });

    questions.forEach((question) => {
      getQuestionAliases(question).forEach((alias) => {
        const normalizedAlias = normalizeKey(alias);

        if (
          !normalizedAlias ||
          coveredAliases.has(normalizedAlias)
        ) {
          return;
        }

        coveredAliases.add(normalizedAlias);

        output.push({
          key: `question-${normalizedAlias}`,
          value: alias,
          title: alias,
          code: alias,
          aliases: [alias],
          source: "question",
        });
      });
    });

    const seenValues = new Set();

    return output.filter((option) => {
      const key = normalizeKey(option.value);

      if (!key || seenValues.has(key)) {
        return false;
      }

      seenValues.add(key);
      return true;
    });
  }, [categories, questions]);

  /* ==========================================================
     FIND SELECTED CATEGORY / EXAM
  ========================================================== */

  const selectedCategoryOption = useMemo(() => {
    if (filter === "All") {
      return null;
    }

    const filterKey = normalizeKey(filter);

    return (
      categoryOptions.find((option) =>
        option.aliases.some(
          (alias) => normalizeKey(alias) === filterKey
        )
      ) ||
      categoryOptions.find(
        (option) =>
          normalizeKey(option.value) === filterKey
      ) ||
      null
    );
  }, [categoryOptions, filter]);

  /* ==========================================================
     FILTERED QUESTIONS

     IMPORTANT FIX:
     Compares normalized aliases instead of exact raw strings.
  ========================================================== */

  const filtered = useMemo(() => {
    const keyword = normalizeKey(search);

    return questions.filter((question) => {
      let examMatches = true;

      if (filter !== "All") {
        const questionKeys = getQuestionAliases(question).map(
          normalizeKey
        );

        const selectedAliases =
          selectedCategoryOption?.aliases?.length
            ? selectedCategoryOption.aliases
            : [filter];

        const selectedKeys =
          selectedAliases.map(normalizeKey);

        examMatches = questionKeys.some((questionKey) =>
          selectedKeys.includes(questionKey)
        );

        /*
         * Direct fallback:
         * useful for imported questions where the category exists
         * in questions but not in the categories collection.
         */
        if (!examMatches) {
          const filterKey = normalizeKey(filter);

          examMatches = questionKeys.includes(filterKey);
        }
      }

      const searchText = normalizeKey(
        [
          question.question,
          question.getQuesDesc,
          question.explanation,
          ...getQuestionAliases(question),
          ...(question.options || []),
        ].join(" ")
      );

      const searchMatches =
        !keyword || searchText.includes(keyword);

      return examMatches && searchMatches;
    });
  }, [
    questions,
    filter,
    search,
    selectedCategoryOption,
  ]);

  /* ==========================================================
     CATEGORY LABEL
  ========================================================== */

  const categoryLabel = (value) => {
    const key = normalizeKey(value);

    if (!key) {
      return "-";
    }

    const exam = categories.find((item) =>
      getExamAliases(item).some(
        (alias) => normalizeKey(alias) === key
      )
    );

    if (!exam) {
      return clean(value) || "-";
    }

    const title = getExamTitle(exam);
    const code = clean(exam.category || exam.code);

    if (title && code && normalizeKey(title) !== normalizeKey(code)) {
      return `${title} — ${code}`;
    }

    return title || code || clean(value) || "-";
  };

  /* ==========================================================
     FORM CATEGORY OPTIONS
  ========================================================== */

  const formCategoryOptions = useMemo(() => {
    return categoryOptions.map((option) => ({
      value: option.value,
      label:
        option.title &&
        option.code &&
        normalizeKey(option.title) !== normalizeKey(option.code)
          ? `${option.title} — ${option.code}`
          : option.title || option.code || option.value,
    }));
  }, [categoryOptions]);

  /* ==========================================================
     EDIT
  ========================================================== */

  const edit = (question) => {
    setEditId(question.id);

    const options = question.options || [];

    setForm({
      category:
        clean(question.category) ||
        clean(question.examId) ||
        "",
      question: question.question || "",
      a: options[0] || "",
      b: options[1] || "",
      c: options[2] || "",
      d: options[3] || "",
      answer: Number(question.answer ?? 0),
      getQuesDesc:
        question.getQuesDesc ||
        question.explanation ||
        "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ==========================================================
     RESET FORM
  ========================================================== */

  const reset = () => {
    setEditId("");

    setForm((previous) => ({
      ...blank,
      category:
        previous.category ||
        formCategoryOptions[0]?.value ||
        "",
    }));
  };

  /* ==========================================================
     SAVE QUESTION
  ========================================================== */

  const submit = async (event) => {
    event.preventDefault();

    const category = clean(form.category);
    const questionText = clean(form.question);

    if (!category) {
      toast.error("Please select an exam/category.");
      return;
    }

    if (!questionText) {
      toast.error("Please enter a question.");
      return;
    }

    const options = [
      clean(form.a),
      clean(form.b),
      clean(form.c),
      clean(form.d),
    ];

    if (options.some((option) => !option)) {
      toast.error("Please enter all four options.");
      return;
    }

    const payload = {
      category,
      question: questionText,
      options,
      answer: Number(form.answer),
      getQuesDesc:
        clean(form.getQuesDesc) || "NA",
    };

    try {
      if (editId) {
        await updateRecord(
          "questions",
          editId,
          payload
        );
      } else {
        await addRecord(
          "questions",
          payload
        );
      }

      toast.success(
        editId
          ? "Question updated"
          : "Question added"
      );

      reset();
      await load();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.message || "Unable to save question."
      );
    }
  };

  /* ==========================================================
     DELETE SINGLE QUESTION
  ========================================================== */

  const del = async (id) => {
    const confirmed =
      window.confirm("Delete this question?");

    if (!confirmed) {
      return;
    }

    try {
      await removeRecord("questions", id);

      toast.success("Question deleted");

      setSelectedIds((previous) =>
        previous.filter((item) => item !== id)
      );

      await load();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.message || "Unable to delete question."
      );
    }
  };

  /* ==========================================================
     CHECKBOX - SINGLE
  ========================================================== */

  const toggleQuestion = (id) => {
    setSelectedIds((previous) => {
      if (previous.includes(id)) {
        return previous.filter(
          (item) => item !== id
        );
      }

      return [...previous, id];
    });
  };

  /* ==========================================================
     SELECT ALL FILTERED
  ========================================================== */

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((question) =>
      selectedIds.includes(question.id)
    );

  const toggleSelectAll = () => {
    const filteredIds = filtered.map(
      (question) => question.id
    );

    if (allFilteredSelected) {
      setSelectedIds((previous) =>
        previous.filter(
          (id) => !filteredIds.includes(id)
        )
      );

      return;
    }

    setSelectedIds((previous) => [
      ...new Set([
        ...previous,
        ...filteredIds,
      ]),
    ]);
  };

  /* ==========================================================
     DELETE MULTIPLE HELPER
  ========================================================== */

  const deleteQuestionIds = async (ids) => {
    const batchSize = 20;

    for (
      let index = 0;
      index < ids.length;
      index += batchSize
    ) {
      const group = ids.slice(
        index,
        index + batchSize
      );

      await Promise.all(
        group.map((id) =>
          removeRecord("questions", id)
        )
      );
    }
  };

  /* ==========================================================
     DELETE SELECTED
  ========================================================== */

  const deleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error(
        "Select at least one question."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected question${
        selectedIds.length > 1 ? "s" : ""
      }?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      await deleteQuestionIds(selectedIds);

      toast.success(
        `${selectedIds.length} question${
          selectedIds.length > 1 ? "s" : ""
        } deleted`
      );

      setSelectedIds([]);
      await load();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.message ||
          "Unable to delete selected questions."
      );
    } finally {
      setDeleting(false);
    }
  };

  /* ==========================================================
     DELETE ALL QUESTIONS
  ========================================================== */

  const deleteAllQuestions = async () => {
    if (!deleteAllConfirmed) {
      toast.error(
        "Please tick the confirmation checkbox first."
      );
      return;
    }

    if (questions.length === 0) {
      toast.error(
        "There are no questions to delete."
      );
      return;
    }

    const confirmed = window.confirm(
      `WARNING!\n\nThis will permanently delete ALL ${questions.length} questions from the Question Bank.\n\nContinue?`
    );

    if (!confirmed) {
      return;
    }

    const secondConfirm = window.confirm(
      "Final confirmation: Delete the complete Question Bank?"
    );

    if (!secondConfirm) {
      return;
    }

    try {
      setDeleting(true);

      const allIds = questions.map(
        (question) => question.id
      );

      await deleteQuestionIds(allIds);

      toast.success(
        `All ${allIds.length} questions deleted`
      );

      setSelectedIds([]);
      setDeleteAllConfirmed(false);

      await load();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.message ||
          "Unable to delete all questions."
      );
    } finally {
      setDeleting(false);
    }
  };

  /* ==========================================================
     IMPORT EXCEL
  ========================================================== */

  const getImportFallbackCategory = () => {
    if (filter !== "All") {
      return (
        selectedCategoryOption?.code ||
        selectedCategoryOption?.value ||
        filter
      );
    }

    return (
      form.category ||
      formCategoryOptions[0]?.value ||
      ""
    );
  };

  const importExcel = (file) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(
          event.target.result,
          {
            type: "array",
          }
        );

        const rows =
          XLSX.utils.sheet_to_json(
            workbook.Sheets[
              workbook.SheetNames[0]
            ],
            {
              defval: "",
            }
          );

        let count = 0;
        let skipped = 0;

        const fallbackCategory =
          getImportFallbackCategory();

        for (const row of rows) {
          const category = clean(
            row.category ||
              row.Category ||
              row.exam ||
              row.Exam ||
              fallbackCategory
          );

          const question = clean(
            row.question ||
              row.Question ||
              row.ques
          );

          if (!question || !category) {
            skipped++;
            continue;
          }

          await addRecord("questions", {
            category,
            question,

            options: [
              clean(
                row.optionA ||
                  row.A ||
                  row["Option A"]
              ),
              clean(
                row.optionB ||
                  row.B ||
                  row["Option B"]
              ),
              clean(
                row.optionC ||
                  row.C ||
                  row["Option C"]
              ),
              clean(
                row.optionD ||
                  row.D ||
                  row["Option D"]
              ),
            ],

            answer: parseAnswer(
              row.answer ?? row.Answer
            ),

            getQuesDesc:
              clean(
                row.getQuesDesc ||
                  row.explanation ||
                  row.Explanation
              ) || "NA",
          });

          count++;
        }

        toast.success(
          `${count} questions imported${
            skipped
              ? `, ${skipped} skipped`
              : ""
          }`
        );

        if (fileRef.current) {
          fileRef.current.value = "";
        }

        await load();
      } catch (error) {
        console.error(error);
        toast.error(
          error?.message ||
            "Unable to import Excel file."
        );
      }
    };

    reader.readAsArrayBuffer(file);
  };

  /* ==========================================================
     EXPORT EXCEL
  ========================================================== */

  const exportExcel = () => {
    const output = filtered.map(
      (question) => ({
        id: question.id,
        category:
          question.category ||
          question.examId ||
          "",
        question: question.question,

        optionA:
          question.options?.[0] || "",

        optionB:
          question.options?.[1] || "",

        optionC:
          question.options?.[2] || "",

        optionD:
          question.options?.[3] || "",

        answer:
          Number(question.answer ?? 0),

        answerLetter:
          String.fromCharCode(
            65 + Number(question.answer ?? 0)
          ),

        getQuesDesc:
          question.getQuesDesc ||
          question.explanation ||
          "",
      })
    );

    const worksheet =
      XLSX.utils.json_to_sheet(output);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Questions"
    );

    XLSX.writeFile(
      workbook,
      "Techtroopers_Questions.xlsx"
    );
  };

  /* ==========================================================
     SAMPLE EXCEL
  ========================================================== */

  const sample = () => {
    const sampleCategory =
      formCategoryOptions[0]?.value ||
      "JAVA-UT1";

    const worksheet =
      XLSX.utils.json_to_sheet([
        {
          category: sampleCategory,
          question:
            "Which access is most restricted?",
          optionA: "public",
          optionB: "protected",
          optionC: "default",
          optionD: "private",
          answer: 3,
          getQuesDesc: "NA",
        },
      ]);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Sample"
    );

    XLSX.writeFile(
      workbook,
      "Question_Import_Sample.xlsx"
    );
  };

  /* ==========================================================
     CLEAR FILTERS
  ========================================================== */

  const clearFilters = () => {
    setFilter("All");
    setSearch("");
  };

  /* ==========================================================
     RETURN
  ========================================================== */

  return (
    <AdminShell
      title="Question Bank"
      subtitle="Manage Firestore questions, category filtering, Excel import/export and bulk actions."
      actions={
        <>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={sample}
          >
            Sample Excel
          </button>

          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={exportExcel}
            disabled={!filtered.length}
          >
            Export Excel
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() =>
              fileRef.current?.click()
            }
          >
            Import Excel
          </button>

          <input
            ref={fileRef}
            hidden
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) =>
              importExcel(
                event.target.files?.[0]
              )
            }
          />
        </>
      }
    >
      {/* ======================================================
          ADD / EDIT QUESTION
      ====================================================== */}

      <div className="tt-admin-panel">
        <div className="tt-panel-head">
          <div>
            <h3>
              {editId
                ? "Edit Question"
                : "Add Question"}
            </h3>

            <p>
              Correct answer is stored as index
              0–3: A=0, B=1, C=2, D=3.
            </p>
          </div>

          {editId && (
            <button
              type="button"
              className="btn btn-light border btn-sm"
              onClick={reset}
            >
              Cancel
            </button>
          )}
        </div>

        <form
          className="row g-3"
          onSubmit={submit}
        >
          {/* CATEGORY */}

          <div className="col-md-4">
            <label className="form-label">
              Exam / Category
            </label>

            <select
              required
              className="form-select"
              value={form.category}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  category:
                    event.target.value,
                }))
              }
            >
              <option value="">
                Select exam
              </option>

              {formCategoryOptions.map(
                (option) => (
                  <option
                    value={option.value}
                    key={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </div>

          {/* QUESTION */}

          <div className="col-md-8">
            <label className="form-label">
              Question
            </label>

            <textarea
              required
              className="form-control"
              rows="2"
              value={form.question}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  question:
                    event.target.value,
                }))
              }
            />
          </div>

          {/* OPTIONS */}

          {["a", "b", "c", "d"].map(
            (key, index) => (
              <div
                className="col-md-6"
                key={key}
              >
                <label className="form-label">
                  Option{" "}
                  {String.fromCharCode(
                    65 + index
                  )}
                </label>

                <input
                  required
                  className="form-control"
                  value={form[key]}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      [key]:
                        event.target.value,
                    }))
                  }
                />
              </div>
            )
          )}

          {/* CORRECT ANSWER */}

          <div className="col-md-3">
            <label className="form-label">
              Correct Answer
            </label>

            <select
              className="form-select"
              value={form.answer}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  answer: Number(
                    event.target.value
                  ),
                }))
              }
            >
              {["A", "B", "C", "D"].map(
                (letter, index) => (
                  <option
                    value={index}
                    key={letter}
                  >
                    {letter} — Option{" "}
                    {index + 1}
                  </option>
                )
              )}
            </select>
          </div>

          {/* EXPLANATION */}

          <div className="col-md-9">
            <label className="form-label">
              Answer Description /
              Explanation
            </label>

            <input
              className="form-control"
              value={form.getQuesDesc}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  getQuesDesc:
                    event.target.value,
                }))
              }
            />
          </div>

          {/* SAVE */}

          <div className="col-12">
            <button
              type="submit"
              className="btn btn-primary px-4"
            >
              {editId
                ? "Update Question"
                : "Add Question"}
            </button>
          </div>
        </form>
      </div>

      {/* ======================================================
          QUESTION LIST
      ====================================================== */}

      <div className="tt-admin-panel mt-4">
        <div className="tt-panel-head">
          <div>
            <h3>Questions</h3>

            <p className="mb-0">
              {filtered.length} shown of{" "}
              {questions.length}.
            </p>

            {selectedIds.length > 0 && (
              <small className="text-primary fw-semibold">
                {selectedIds.length}{" "}
                question(s) selected
              </small>
            )}
          </div>

          <div className="d-flex gap-2 flex-wrap align-items-center">
            {/* CATEGORY FILTER */}

            <select
              className="form-select tt-admin-filter"
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value
                )
              }
            >
              <option value="All">
                All Exams
              </option>

              {categoryOptions.map(
                (option) => {
                  const label =
                    option.title &&
                    option.code &&
                    normalizeKey(
                      option.title
                    ) !==
                      normalizeKey(
                        option.code
                      )
                      ? `${option.title} — ${option.code}`
                      : option.title ||
                        option.code ||
                        option.value;

                  return (
                    <option
                      key={option.key}
                      value={option.value}
                    >
                      {label}
                    </option>
                  );
                }
              )}
            </select>

            {/* SEARCH */}

            <input
              className="form-control tt-admin-search"
              placeholder="Search question…"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            {(filter !== "All" ||
              search) && (
              <button
                type="button"
                className="btn btn-light border btn-sm"
                onClick={clearFilters}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* CURRENT FILTER INFORMATION */}

        {filter !== "All" && (
          <div className="alert alert-light border py-2 px-3 mb-3">
            Showing category:{" "}
            <strong>
              {selectedCategoryOption
                ? selectedCategoryOption.title &&
                  selectedCategoryOption.code &&
                  normalizeKey(
                    selectedCategoryOption.title
                  ) !==
                    normalizeKey(
                      selectedCategoryOption.code
                    )
                  ? `${selectedCategoryOption.title} — ${selectedCategoryOption.code}`
                  : selectedCategoryOption.title ||
                    selectedCategoryOption.code ||
                    filter
                : filter}
            </strong>
            {" · "}
            {filtered.length} question(s)
          </div>
        )}

        {/* ====================================================
            BULK DELETE TOOLBAR
        ==================================================== */}

        <div className="border rounded p-3 mb-3 bg-light">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              {/* SELECT ALL */}

              <label className="d-flex align-items-center gap-2 mb-0">
                <input
                  type="checkbox"
                  className="form-check-input mt-0"
                  checked={
                    allFilteredSelected
                  }
                  onChange={
                    toggleSelectAll
                  }
                />

                <span className="fw-semibold">
                  Select All Shown
                </span>
              </label>

              {/* DELETE SELECTED */}

              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                disabled={
                  deleting ||
                  selectedIds.length === 0
                }
                onClick={deleteSelected}
              >
                {deleting
                  ? "Deleting..."
                  : `Delete Selected (${selectedIds.length})`}
              </button>
            </div>

            {/* DELETE ALL */}

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <label className="d-flex align-items-center gap-2 mb-0">
                <input
                  type="checkbox"
                  className="form-check-input mt-0"
                  checked={
                    deleteAllConfirmed
                  }
                  onChange={(event) =>
                    setDeleteAllConfirmed(
                      event.target.checked
                    )
                  }
                />

                <small className="text-danger fw-semibold">
                  Confirm Delete All
                </small>
              </label>

              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={
                  deleting ||
                  !deleteAllConfirmed ||
                  questions.length === 0
                }
                onClick={
                  deleteAllQuestions
                }
              >
                {deleting
                  ? "Deleting..."
                  : `Delete All Questions (${questions.length})`}
              </button>
            </div>
          </div>
        </div>

        {/* ====================================================
            TABLE
        ==================================================== */}

        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th
                  style={{
                    width: "45px",
                  }}
                >
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={
                      allFilteredSelected
                    }
                    onChange={
                      toggleSelectAll
                    }
                    title="Select all visible questions"
                  />
                </th>

                <th>#</th>
                <th>Category</th>
                <th>Question</th>
                <th>Correct</th>
                <th>Explanation</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-4"
                  >
                    <div className="spinner-border spinner-border-sm text-primary me-2" />
                    Loading questions...
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map(
                  (question, index) => {
                    const selected =
                      selectedIds.includes(
                        question.id
                      );

                    return (
                      <tr
                        key={question.id}
                        className={
                          selected
                            ? "table-primary"
                            : ""
                        }
                      >
                        {/* CHECKBOX */}

                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selected}
                            onChange={() =>
                              toggleQuestion(
                                question.id
                              )
                            }
                          />
                        </td>

                        {/* SERIAL */}

                        <td>
                          {index + 1}
                        </td>

                        {/* CATEGORY */}

                        <td>
                          <b>
                            {categoryLabel(
                              question.category ||
                                question.examId
                            )}
                          </b>

                          <small className="d-block text-muted">
                            {question.category ||
                              question.examId ||
                              "-"}
                          </small>
                        </td>

                        {/* QUESTION */}

                        <td>
                          <b>
                            {
                              question.question
                            }
                          </b>

                          <div className="text-muted mt-1">
                            {(
                              question.options ||
                              []
                            )
                              .map(
                                (
                                  option,
                                  optionIndex
                                ) =>
                                  `${String.fromCharCode(
                                    65 +
                                      optionIndex
                                  )}. ${option}`
                              )
                              .join(" · ")}
                          </div>
                        </td>

                        {/* ANSWER */}

                        <td>
                          <span className="badge text-bg-success">
                            {String.fromCharCode(
                              65 +
                                Number(
                                  question.answer ??
                                    0
                                )
                            )}
                          </span>
                        </td>

                        {/* EXPLANATION */}

                        <td>
                          {question.getQuesDesc ||
                            question.explanation ||
                            "-"}
                        </td>

                        {/* ACTIONS */}

                        <td className="text-nowrap">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() =>
                              edit(question)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              del(
                                question.id
                              )
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )
              ) : (
                <EmptyRow colSpan={7} />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}