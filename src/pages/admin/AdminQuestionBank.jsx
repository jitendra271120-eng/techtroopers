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
   PARSE ANSWER
============================================================ */

const parseAnswer = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  const text = String(value)
    .trim()
    .toUpperCase();

  if (
    ["A", "B", "C", "D"].includes(text)
  ) {
    return text.charCodeAt(0) - 65;
  }

  const number = Number(text);

  return Number.isFinite(number)
    ? Math.max(
        0,
        Math.min(3, number)
      )
    : 0;
};

/* ============================================================
   COMPONENT
============================================================ */

export default function AdminQuestionBank() {
  /* ==========================================================
     STATES
  ========================================================== */

  const [
    categories,
    setCategories,
  ] = useState([]);

  const [
    questions,
    setQuestions,
  ] = useState([]);

  const [
    form,
    setForm,
  ] = useState(blank);

  const [
    editId,
    setEditId,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState("All");

  const [
    search,
    setSearch,
  ] = useState("");

  /* ==========================================================
     SELECTION / DELETE
  ========================================================== */

  const [
    selectedIds,
    setSelectedIds,
  ] = useState([]);

  const [
    deleteAllConfirmed,
    setDeleteAllConfirmed,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  /* ==========================================================
     FILE INPUT
  ========================================================== */

  const fileRef = useRef();

  /* ==========================================================
     LOAD DATA
  ========================================================== */

  const load = async () => {
    try {
      const [
        categoryRecords,
        questionRecords,
      ] = await Promise.all([
        listCollection(
          "categories"
        ),
        listCollection(
          "questions"
        ),
      ]);

      const exams =
        categoryRecords.map(
          normalizeExamDoc
        );

      setCategories(exams);

      setQuestions(
        questionRecords.map(
          normalizeQuestionDoc
        )
      );

      if (
        !form.category &&
        exams[0]
      ) {
        setForm((previous) => ({
          ...previous,
          category:
            exams[0].category,
        }));
      }
    } catch (error) {
      toast.error(
        error.message
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ==========================================================
     FILTERED QUESTIONS
  ========================================================== */

  const filtered = useMemo(() => {
    const keyword =
      search
        .trim()
        .toLowerCase();

    return questions.filter(
      (question) => {
        const examMatches =
          filter === "All" ||
          question.category ===
            filter ||
          question.examId ===
            filter;

        const searchText = [
          question.question,
          question.getQuesDesc,
          question.category,
          question.examId,
        ]
          .join(" ")
          .toLowerCase();

        const searchMatches =
          !keyword ||
          searchText.includes(
            keyword
          );

        return (
          examMatches &&
          searchMatches
        );
      }
    );
  }, [
    questions,
    filter,
    search,
  ]);

  /* ==========================================================
     CATEGORY LABEL
  ========================================================== */

  const categoryLabel = (
    value
  ) => {
    return (
      categories.find(
        (category) =>
          category.category ===
            value ||
          category.id === value
      )?.title ||
      value ||
      "-"
    );
  };

  /* ==========================================================
     EDIT
  ========================================================== */

  const edit = (question) => {
    setEditId(
      question.id
    );

    const options =
      question.options || [];

    setForm({
      category:
        question.category ||
        question.examId ||
        "",

      question:
        question.question ||
        "",

      a:
        options[0] ||
        "",

      b:
        options[1] ||
        "",

      c:
        options[2] ||
        "",

      d:
        options[3] ||
        "",

      answer:
        Number(
          question.answer ??
            0
        ),

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
        categories[0]
          ?.category ||
        "",
    }));
  };

  /* ==========================================================
     SAVE QUESTION
  ========================================================== */

  const submit = async (
    event
  ) => {
    event.preventDefault();

    const payload = {
      category:
        form.category,

      question:
        form.question.trim(),

      options: [
        form.a,
        form.b,
        form.c,
        form.d,
      ],

      answer:
        Number(
          form.answer
        ),

      getQuesDesc:
        form.getQuesDesc.trim() ||
        "NA",
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
      toast.error(
        error.message
      );
    }
  };

  /* ==========================================================
     DELETE SINGLE QUESTION
  ========================================================== */

  const del = async (
    id
  ) => {
    const confirmed =
      window.confirm(
        "Delete this question?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await removeRecord(
        "questions",
        id
      );

      toast.success(
        "Question deleted"
      );

      setSelectedIds(
        (previous) =>
          previous.filter(
            (item) =>
              item !== id
          )
      );

      await load();
    } catch (error) {
      toast.error(
        error.message
      );
    }
  };

  /* ============================================================
     CHECKBOX - SINGLE
  ============================================================ */

  const toggleQuestion = (
    id
  ) => {
    setSelectedIds(
      (previous) => {
        if (
          previous.includes(id)
        ) {
          return previous.filter(
            (item) =>
              item !== id
          );
        }

        return [
          ...previous,
          id,
        ];
      }
    );
  };

  /* ============================================================
     CHECK IF ALL FILTERED QUESTIONS ARE SELECTED
  ============================================================ */

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every(
      (question) =>
        selectedIds.includes(
          question.id
        )
    );

  /* ============================================================
     SELECT / UNSELECT ALL FILTERED
  ============================================================ */

  const toggleSelectAll = () => {
    const filteredIds =
      filtered.map(
        (question) =>
          question.id
      );

    if (
      allFilteredSelected
    ) {
      setSelectedIds(
        (previous) =>
          previous.filter(
            (id) =>
              !filteredIds.includes(
                id
              )
          )
      );

      return;
    }

    setSelectedIds(
      (previous) => [
        ...new Set([
          ...previous,
          ...filteredIds,
        ]),
      ]
    );
  };

  /* ============================================================
     DELETE MULTIPLE HELPER

     Delete in small groups to avoid sending too many requests
     at exactly the same time.
  ============================================================ */

  const deleteQuestionIds =
    async (ids) => {
      const batchSize = 20;

      for (
        let index = 0;
        index < ids.length;
        index += batchSize
      ) {
        const group =
          ids.slice(
            index,
            index +
              batchSize
          );

        await Promise.all(
          group.map(
            (id) =>
              removeRecord(
                "questions",
                id
              )
          )
        );
      }
    };

  /* ============================================================
     DELETE SELECTED
  ============================================================ */

  const deleteSelected =
    async () => {
      if (
        selectedIds.length ===
        0
      ) {
        toast.error(
          "Select at least one question."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Delete ${selectedIds.length} selected question${
            selectedIds.length >
            1
              ? "s"
              : ""
          }?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeleting(true);

        await deleteQuestionIds(
          selectedIds
        );

        toast.success(
          `${selectedIds.length} question${
            selectedIds.length >
            1
              ? "s"
              : ""
          } deleted`
        );

        setSelectedIds(
          []
        );

        await load();
      } catch (error) {
        console.error(
          error
        );

        toast.error(
          error.message ||
            "Unable to delete selected questions."
        );
      } finally {
        setDeleting(false);
      }
    };

  /* ============================================================
     DELETE ALL QUESTIONS

     This deletes the entire "questions" collection contents.
  ============================================================ */

  const deleteAllQuestions =
    async () => {
      if (
        !deleteAllConfirmed
      ) {
        toast.error(
          "Please tick the confirmation checkbox first."
        );

        return;
      }

      if (
        questions.length === 0
      ) {
        toast.error(
          "There are no questions to delete."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `WARNING!\n\nThis will permanently delete ALL ${questions.length} questions from the Question Bank.\n\nContinue?`
        );

      if (!confirmed) {
        return;
      }

      const secondConfirm =
        window.confirm(
          "Final confirmation: Delete the complete Question Bank?"
        );

      if (
        !secondConfirm
      ) {
        return;
      }

      try {
        setDeleting(true);

        const allIds =
          questions.map(
            (question) =>
              question.id
          );

        await deleteQuestionIds(
          allIds
        );

        toast.success(
          `All ${allIds.length} questions deleted`
        );

        setSelectedIds(
          []
        );

        setDeleteAllConfirmed(
          false
        );

        await load();
      } catch (error) {
        console.error(
          error
        );

        toast.error(
          error.message ||
            "Unable to delete all questions."
        );
      } finally {
        setDeleting(false);
      }
    };

  /* ============================================================
     IMPORT EXCEL
  ============================================================ */

  const importExcel = (
    file
  ) => {
    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      async (event) => {
        try {
          const workbook =
            XLSX.read(
              event.target
                .result,
              {
                type: "array",
              }
            );

          const rows =
            XLSX.utils.sheet_to_json(
              workbook.Sheets[
                workbook
                  .SheetNames[0]
              ],
              {
                defval: "",
              }
            );

          let count = 0;

          for (
            const row of rows
          ) {
            const category =
              String(
                row.category ||
                  row.Category ||
                  row.exam ||
                  row.Exam ||
                  (
                    filter !==
                    "All"
                      ? filter
                      : ""
                  ) ||
                  categories[0]
                    ?.category ||
                  ""
              ).trim();

            const question =
              String(
                row.question ||
                  row.Question ||
                  row.ques ||
                  ""
              ).trim();

            if (
              !question ||
              !category
            ) {
              continue;
            }

            await addRecord(
              "questions",
              {
                category,

                question,

                options: [
                  row.optionA ||
                    row.A ||
                    row[
                      "Option A"
                    ] ||
                    "",

                  row.optionB ||
                    row.B ||
                    row[
                      "Option B"
                    ] ||
                    "",

                  row.optionC ||
                    row.C ||
                    row[
                      "Option C"
                    ] ||
                    "",

                  row.optionD ||
                    row.D ||
                    row[
                      "Option D"
                    ] ||
                    "",
                ],

                answer:
                  parseAnswer(
                    row.answer ??
                      row.Answer
                  ),

                getQuesDesc:
                  row.getQuesDesc ||
                  row.explanation ||
                  row.Explanation ||
                  "NA",
              }
            );

            count++;
          }

          toast.success(
            `${count} questions imported`
          );

          await load();
        } catch (error) {
          toast.error(
            error.message
          );
        }
      };

    reader.readAsArrayBuffer(
      file
    );
  };

  /* ============================================================
     EXPORT EXCEL
  ============================================================ */

  const exportExcel =
    () => {
      const output =
        filtered.map(
          (question) => ({
            id:
              question.id,

            category:
              question.category,

            question:
              question.question,

            optionA:
              question
                .options?.[0],

            optionB:
              question
                .options?.[1],

            optionC:
              question
                .options?.[2],

            optionD:
              question
                .options?.[3],

            answer:
              question.answer,

            answerLetter:
              String.fromCharCode(
                65 +
                  Number(
                    question.answer ||
                      0
                  )
              ),

            getQuesDesc:
              question.getQuesDesc ||
              "",
          })
        );

      const worksheet =
        XLSX.utils.json_to_sheet(
          output
        );

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

  /* ============================================================
     SAMPLE EXCEL
  ============================================================ */

  const sample = () => {
    const worksheet =
      XLSX.utils.json_to_sheet([
        {
          category:
            categories[0]
              ?.category ||
            "JAVA-UT1",

          question:
            "Which access is most restricted?",

          optionA:
            "public",

          optionB:
            "protected",

          optionC:
            "default",

          optionD:
            "private",

          answer: 3,

          getQuesDesc:
            "NA",
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

  /* ============================================================
     RETURN
  ============================================================ */

  return (
    <AdminShell
      title="Question Bank"
      subtitle="Reads and writes your existing questions collection using category names such as JAVA-UT1."
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
            onClick={
              exportExcel
            }
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
            onChange={(
              event
            ) =>
              importExcel(
                event.target
                  .files?.[0]
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
              Correct answer is stored as index 0–3,
              exactly like your current Firestore data.
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
              value={
                form.category
              }
              onChange={(
                event
              ) =>
                setForm({
                  ...form,

                  category:
                    event.target
                      .value,
                })
              }
            >

              <option value="">
                Select exam
              </option>

              {categories.map(
                (category) => (
                  <option
                    value={
                      category.category
                    }
                    key={
                      category.id
                    }
                  >
                    {category.title}
                    {" — "}
                    {
                      category.category
                    }
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
              value={
                form.question
              }
              onChange={(
                event
              ) =>
                setForm({
                  ...form,

                  question:
                    event.target
                      .value,
                })
              }
            />

          </div>

          {/* OPTIONS */}

          {[
            "a",
            "b",
            "c",
            "d",
          ].map(
            (
              key,
              index
            ) => (

              <div
                className="col-md-6"
                key={key}
              >

                <label className="form-label">
                  Option{" "}
                  {String.fromCharCode(
                    65 +
                      index
                  )}
                </label>

                <input
                  required
                  className="form-control"
                  value={
                    form[key]
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,

                      [key]:
                        event
                          .target
                          .value,
                    })
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
              value={
                form.answer
              }
              onChange={(
                event
              ) =>
                setForm({
                  ...form,

                  answer:
                    Number(
                      event
                        .target
                        .value
                    ),
                })
              }
            >

              {[
                "A",
                "B",
                "C",
                "D",
              ].map(
                (
                  letter,
                  index
                ) => (

                  <option
                    value={
                      index
                    }
                    key={
                      letter
                    }
                  >
                    {letter}
                    {" — "}
                    Option{" "}
                    {index + 1}
                  </option>

                )
              )}

            </select>

          </div>

          {/* EXPLANATION */}

          <div className="col-md-9">

            <label className="form-label">
              Answer Description / Explanation
            </label>

            <input
              className="form-control"
              value={
                form.getQuesDesc
              }
              onChange={(
                event
              ) =>
                setForm({
                  ...form,

                  getQuesDesc:
                    event.target
                      .value,
                })
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

            <h3>
              Questions
            </h3>

            <p className="mb-0">
              {filtered.length} shown of{" "}
              {questions.length}.
            </p>

            {selectedIds.length >
              0 && (

              <small className="text-primary fw-semibold">
                {
                  selectedIds.length
                }{" "}
                question(s) selected
              </small>

            )}

          </div>

          <div className="d-flex gap-2 flex-wrap">

            <select
              className="form-select tt-admin-filter"
              value={filter}
              onChange={(
                event
              ) =>
                setFilter(
                  event.target
                    .value
                )
              }
            >

              <option value="All">
                All Exams
              </option>

              {categories.map(
                (category) => (

                  <option
                    key={
                      category.id
                    }
                    value={
                      category.category
                    }
                  >
                    {category.title}
                    {" — "}
                    {
                      category.category
                    }
                  </option>

                )
              )}

            </select>

            <input
              className="form-control tt-admin-search"
              placeholder="Search question…"
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
            />

          </div>

        </div>

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
                  selectedIds.length ===
                    0
                }
                onClick={
                  deleteSelected
                }
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
                  onChange={(
                    event
                  ) =>
                    setDeleteAllConfirmed(
                      event.target
                        .checked
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
                  questions.length ===
                    0
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

                <th>
                  #
                </th>

                <th>
                  Category
                </th>

                <th>
                  Question
                </th>

                <th>
                  Correct
                </th>

                <th>
                  Explanation
                </th>

                <th />

              </tr>

            </thead>

            <tbody>

              {filtered.length ? (

                filtered.map(
                  (
                    question,
                    index
                  ) => {

                    const selected =
                      selectedIds.includes(
                        question.id
                      );

                    return (

                      <tr
                        key={
                          question.id
                        }
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
                            checked={
                              selected
                            }
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

                            {
                              question.category
                            }

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
                              .join(
                                " · "
                              )}

                          </div>

                        </td>

                        {/* ANSWER */}

                        <td>

                          <span className="badge text-bg-success">

                            {String.fromCharCode(
                              65 +
                                Number(
                                  question.answer ||
                                    0
                                )
                            )}

                          </span>

                        </td>

                        {/* EXPLANATION */}

                        <td>

                          {question.getQuesDesc ||
                            "-"}

                        </td>

                        {/* ACTIONS */}

                        <td className="text-nowrap">

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() =>
                              edit(
                                question
                              )
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

                <EmptyRow
                  colSpan={7}
                />

              )}

            </tbody>

          </table>

        </div>

      </div>

    </AdminShell>
  );
}