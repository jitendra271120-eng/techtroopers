import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

import AdminShell, {
  EmptyRow,
} from "../../components/admin/AdminShell";

import {
  listCollection,
  removeRecord,
  timestampToText,
} from "../../services/firestoreService";

import {
  normalizeExamDoc,
} from "../../utils/firestoreAdapters";

/* ============================================================
   PERCENTAGE
============================================================ */

const pct = (record) => {
  return Number(
    record.percentage ??
      (
        Number(record.total || 0) > 0
          ? (
              Number(record.score || 0) /
              Number(record.total)
            ) * 100
          : 0
      )
  );
};

/* ============================================================
   COMPONENT
============================================================ */

export default function AdminResults() {
  /* ==========================================================
     DATA
  ========================================================== */

  const [
    scores,
    setScores,
  ] = useState([]);

  const [
    categories,
    setCategories,
  ] = useState([]);

  /* ==========================================================
     FILTERS
  ========================================================== */

  const [
    category,
    setCategory,
  ] = useState("All");

  const [
    secretCode,
    setSecretCode,
  ] = useState("All");

  const [
    search,
    setSearch,
  ] = useState("");

  /* ==========================================================
     BULK SELECTION / DELETE
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
     LOAD
  ========================================================== */

  const load = async () => {
    try {
      const [
        scoreRecords,
        categoryRecords,
      ] = await Promise.all([
        listCollection("scores"),
        listCollection("categories"),
      ]);

      setScores(
        scoreRecords
      );

      setCategories(
        categoryRecords.map(
          normalizeExamDoc
        )
      );
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
     SECRET CODES
  ========================================================== */

  const codes = useMemo(() => {
    return [
      ...new Set(
        scores
          .map(
            (score) =>
              score.secretCode
          )
          .filter(Boolean)
      ),
    ];
  }, [scores]);

  /* ==========================================================
     FILTERED RESULTS
  ========================================================== */

  const filtered = useMemo(() => {
    const keyword =
      search
        .trim()
        .toLowerCase();

    return scores.filter(
      (record) => {
        const categoryMatches =
          category === "All" ||
          record.category ===
            category ||
          record.examId ===
            category ||
          record.categoryName ===
            category;

        const secretCodeMatches =
          secretCode === "All" ||
          record.secretCode ===
            secretCode;

        const searchText = [
          record.name,
          record.email,
          record.rollNumber,
          record.category,
          record.categoryName,
          record.secretCode,
        ]
          .join(" ")
          .toLowerCase();

        const searchMatches =
          !keyword ||
          searchText.includes(
            keyword
          );

        return (
          categoryMatches &&
          secretCodeMatches &&
          searchMatches
        );
      }
    );
  }, [
    scores,
    category,
    secretCode,
    search,
  ]);

  /* ==========================================================
     AVERAGE
  ========================================================== */

  const avg =
    filtered.length > 0
      ? Math.round(
          filtered.reduce(
            (
              total,
              record
            ) =>
              total +
              pct(record),
            0
          ) /
            filtered.length
        )
      : 0;

  /* ==========================================================
     EXPORT EXCEL
  ========================================================== */

  const exportExcel = (
    attendance = false
  ) => {
    const rows =
      filtered.map(
        (
          record,
          index
        ) => {
          if (attendance) {
            return {
              "S.No.":
                index + 1,

              "Roll Number":
                record.rollNumber ||
                "",

              Name:
                record.name ||
                "",

              Email:
                record.email ||
                "",

              Exam:
                record.category ||
                record.categoryName ||
                record.examId ||
                "",

              "Secret Code":
                record.secretCode ||
                "",

              Attendance:
                "Present",
            };
          }

          return {
            "S.No.":
              index + 1,

            Name:
              record.name ||
              "",

            Email:
              record.email ||
              "",

            "Roll Number":
              record.rollNumber ||
              "",

            Exam:
              record.category ||
                record.categoryName ||
                record.examId ||
                "",

            "Secret Code":
              record.secretCode ||
              "",

            Score:
              record.score ??
              "",

            Total:
              record.total ??
              "",

            Percentage:
              Math.round(
                pct(record)
              ),

            Attempted:
              record.attempted ??
              "",

            Date:
              timestampToText(
                record.timestamp ||
                  record.date ||
                  record.createdAt
              ),
          };
        }
      );

    const worksheet =
      XLSX.utils.json_to_sheet(
        rows
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      attendance
        ? "Attendance"
        : "Results"
    );

    XLSX.writeFile(
      workbook,
      attendance
        ? "Exam_Attendance.xlsx"
        : "Techtroopers_Results.xlsx"
    );
  };

  /* ==========================================================
     DELETE SINGLE RESULT
  ========================================================== */

  const del = async (
    id
  ) => {
    const confirmed =
      window.confirm(
        "Delete this result permanently?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await removeRecord(
        "scores",
        id
      );

      toast.success(
        "Result deleted"
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

  /* ==========================================================
     SELECT SINGLE RESULT
  ========================================================== */

  const toggleResult = (
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

  /* ==========================================================
     ALL FILTERED SELECTED?
  ========================================================== */

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every(
      (record) =>
        selectedIds.includes(
          record.id
        )
    );

  /* ==========================================================
     SELECT ALL SHOWN
  ========================================================== */

  const toggleSelectAll =
    () => {
      const filteredIds =
        filtered.map(
          (record) =>
            record.id
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

  /* ==========================================================
     DELETE IDS HELPER

     Deletes in smaller groups so hundreds of requests are not
     sent at exactly the same time.
  ========================================================== */

  const deleteResultIds =
    async (ids) => {
      const groupSize = 20;

      for (
        let index = 0;
        index < ids.length;
        index += groupSize
      ) {
        const group =
          ids.slice(
            index,
            index +
              groupSize
          );

        await Promise.all(
          group.map(
            (id) =>
              removeRecord(
                "scores",
                id
              )
          )
        );
      }
    };

  /* ==========================================================
     DELETE SELECTED
  ========================================================== */

  const deleteSelected =
    async () => {
      if (
        selectedIds.length ===
        0
      ) {
        toast.error(
          "Please select at least one result."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Delete ${selectedIds.length} selected result${
            selectedIds.length >
            1
              ? "s"
              : ""
          } permanently?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeleting(true);

        const deletingCount =
          selectedIds.length;

        await deleteResultIds(
          selectedIds
        );

        setSelectedIds(
          []
        );

        toast.success(
          `${deletingCount} result${
            deletingCount > 1
              ? "s"
              : ""
          } deleted`
        );

        await load();
      } catch (error) {
        console.error(
          "Delete selected results:",
          error
        );

        toast.error(
          error.message ||
            "Unable to delete selected results."
        );
      } finally {
        setDeleting(false);
      }
    };

  /* ==========================================================
     DELETE ALL RESULTS

     WARNING:
     This deletes ALL documents in the scores collection,
     regardless of the current filters.
  ========================================================== */

  const deleteAllResults =
    async () => {
      if (
        !deleteAllConfirmed
      ) {
        toast.error(
          "Please tick Confirm Delete All first."
        );

        return;
      }

      if (
        scores.length === 0
      ) {
        toast.error(
          "No results are available to delete."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `WARNING!\n\nThis will permanently delete ALL ${scores.length} exam results.\n\nThis is not limited to the current filter.\n\nContinue?`
        );

      if (!confirmed) {
        return;
      }

      const finalConfirm =
        window.confirm(
          "FINAL CONFIRMATION\n\nDelete the complete exam result history?"
        );

      if (
        !finalConfirm
      ) {
        return;
      }

      try {
        setDeleting(true);

        const ids =
          scores.map(
            (record) =>
              record.id
          );

        await deleteResultIds(
          ids
        );

        setSelectedIds(
          []
        );

        setDeleteAllConfirmed(
          false
        );

        toast.success(
          `All ${ids.length} results deleted`
        );

        await load();
      } catch (error) {
        console.error(
          "Delete all results:",
          error
        );

        toast.error(
          error.message ||
            "Unable to delete all results."
        );
      } finally {
        setDeleting(false);
      }
    };

  /* ==========================================================
     RETURN
  ========================================================== */

  return (
    <AdminShell
      title="Exam Results"
      subtitle="Compatible with your existing scores documents where category stores values such as JAVA-UT1."
      actions={
        <>
          <button
            type="button"
            className="btn btn-outline-success btn-sm"
            onClick={() =>
              exportExcel(true)
            }
          >
            Attendance Excel
          </button>

          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={() =>
              exportExcel(false)
            }
          >
            Results Excel
          </button>
        </>
      }
    >

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="tt-admin-summary-grid">

        <div className="tt-summary-card primary">

          <small>
            Filtered Attempts
          </small>

          <strong>
            {filtered.length}
          </strong>

          <span>
            Matching records
          </span>

        </div>

        <div className="tt-summary-card">

          <small>
            Average Score
          </small>

          <strong>
            {avg}%
          </strong>

          <span>
            Current filter
          </span>

        </div>

        <div className="tt-summary-card">

          <small>
            Passed ≥ 40%
          </small>

          <strong>
            {
              filtered.filter(
                (record) =>
                  pct(record) >=
                  40
              ).length
            }
          </strong>

          <span>
            Candidates
          </span>

        </div>

        <div className="tt-summary-card">

          <small>
            Start Codes
          </small>

          <strong>
            {codes.length}
          </strong>

          <span>
            Used in results
          </span>

        </div>

      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <div className="tt-admin-panel mt-4">

        <div className="row g-2">

          {/* EXAM */}

          <div className="col-md-3">

            <select
              className="form-select"
              value={category}
              onChange={(
                event
              ) =>
                setCategory(
                  event.target
                    .value
                )
              }
            >

              <option value="All">
                All Exams
              </option>

              {categories.map(
                (item) => (

                  <option
                    key={
                      item.id
                    }
                    value={
                      item.category
                    }
                  >
                    {item.title}
                    {" — "}
                    {item.category}
                  </option>

                )
              )}

            </select>

          </div>

          {/* SECRET CODE */}

          <div className="col-md-3">

            <select
              className="form-select"
              value={
                secretCode
              }
              onChange={(
                event
              ) =>
                setSecretCode(
                  event.target
                    .value
                )
              }
            >

              <option value="All">
                All Secret Codes
              </option>

              {codes.map(
                (code) => (

                  <option
                    key={code}
                    value={code}
                  >
                    {code}
                  </option>

                )
              )}

            </select>

          </div>

          {/* SEARCH */}

          <div className="col-md-6">

            <input
              className="form-control"
              placeholder="Search name, email, roll number, exam…"
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

      </div>

      {/* ======================================================
          RESULTS
      ====================================================== */}

      <div className="tt-admin-panel mt-4">

        {/* ====================================================
            BULK ACTIONS
        ==================================================== */}

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 border rounded p-3 mb-3 bg-light">

          {/* LEFT */}

          <div className="d-flex align-items-center gap-3 flex-wrap">

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

            {selectedIds.length >
              0 && (

              <small className="text-primary fw-semibold">
                {
                  selectedIds.length
                }{" "}
                selected
              </small>

            )}

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
                scores.length ===
                  0
              }
              onClick={
                deleteAllResults
              }
            >
              {deleting
                ? "Deleting..."
                : `Delete All Results (${scores.length})`}
            </button>

          </div>

        </div>

        {/* ====================================================
            TABLE
        ==================================================== */}

        <div className="table-responsive">

          <table className="table align-middle">

            <thead>

              <tr>

                {/* SELECT ALL */}

                <th
                  style={{
                    width:
                      "45px",
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
                    title="Select all shown results"
                  />

                </th>

                <th>#</th>

                <th>
                  Candidate
                </th>

                <th>
                  Exam
                </th>

                <th>
                  Code
                </th>

                <th>
                  Score
                </th>

                <th>
                  %
                </th>

                <th>
                  Attempted
                </th>

                <th>
                  Date
                </th>

                <th />

              </tr>

            </thead>

            <tbody>

              {filtered.length ? (

                filtered.map(
                  (
                    record,
                    index
                  ) => {
                    const percentage =
                      pct(record);

                    const selected =
                      selectedIds.includes(
                        record.id
                      );

                    return (

                      <tr
                        key={
                          record.id
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
                              toggleResult(
                                record.id
                              )
                            }
                          />

                        </td>

                        {/* SERIAL */}

                        <td>
                          {index + 1}
                        </td>

                        {/* CANDIDATE */}

                        <td>

                          <b>
                            {record.name ||
                              "Candidate"}
                          </b>

                          <small className="d-block text-muted">

                            {record.rollNumber ||
                              record.email ||
                              "-"}

                          </small>

                        </td>

                        {/* EXAM */}

                        <td>

                          {record.category ||
                            record.categoryName ||
                            record.examId ||
                            "-"}

                        </td>

                        {/* CODE */}

                        <td>

                          {record.secretCode ||
                            "-"}

                        </td>

                        {/* SCORE */}

                        <td>

                          <b>
                            {record.score ??
                              "-"}
                            {" / "}
                            {record.total ??
                              "-"}
                          </b>

                        </td>

                        {/* PERCENTAGE */}

                        <td>

                          <span
                            className={`badge ${
                              percentage >=
                              60
                                ? "text-bg-success"
                                : percentage >=
                                  40
                                ? "text-bg-warning"
                                : "text-bg-danger"
                            }`}
                          >
                            {Math.round(
                              percentage
                            )}
                            %
                          </span>

                        </td>

                        {/* ATTEMPTED */}

                        <td>

                          {record.attempted ??
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

                        {/* ACTION */}

                        <td className="text-nowrap">

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={
                              deleting
                            }
                            onClick={() =>
                              del(
                                record.id
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
                  colSpan={10}
                />

              )}

            </tbody>

          </table>

        </div>

      </div>

    </AdminShell>
  );
}