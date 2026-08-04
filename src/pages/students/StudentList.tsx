import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BsArrowDown, BsArrowUp, BsEye, BsPencil, BsPersonPlus, BsSearch, BsTrash, BsX } from "react-icons/bs";
import { toast } from "sonner";
import { Avatar } from "@/components/common/Avatar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, TableSkeleton } from "@/components/common/Feedback";
import { Pagination } from "@/components/common/Pagination";
import { bulkSoftDelete, listDepartments, listStudents, softDeleteStudent } from "@/services/sms";
import type { Department, Student } from "@/types";

const STATUSES = ["Active", "Inactive", "Graduated", "Dropped"];
const PAGE_SIZES = [10, 25, 50];

const statusTone: Record<string, string> = {
  Active: "success",
  Inactive: "secondary",
  Graduated: "primary",
  Dropped: "danger",
};

export default function StudentList() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const search = params.get("q") ?? "";
  const departmentId = params.get("dept") ?? "";
  const status = params.get("status") ?? "";
  const gender = params.get("gender") ?? "";
  const sortBy = params.get("sortBy") ?? "created_at";
  const sortDir = (params.get("sortDir") as "asc" | "desc") ?? "desc";
  const page = Number(params.get("page") ?? 1);
  const pageSize = Number(params.get("size") ?? 10);

  const [searchInput, setSearchInput] = useState(search);

  const setParam = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      if (!("page" in patch)) next.set("page", "1");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  useEffect(() => {
    listDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    listStudents({ search, departmentId, status, gender, sortBy, sortDir, page, pageSize })
      .then(({ rows: r, total: t }) => {
        setRows(r);
        setTotal(t);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load students"))
      .finally(() => setLoading(false));
  }, [search, departmentId, status, gender, sortBy, sortDir, page, pageSize]);

  useEffect(load, [load]);

  const activeFilters = useMemo(
    () => [departmentId, status, gender].filter(Boolean).length + (search ? 1 : 0),
    [departmentId, status, gender, search],
  );

  const toggleSort = (column: string) => {
    setParam({ sortBy: column, sortDir: sortBy === column && sortDir === "asc" ? "desc" : "asc" });
  };

  const sortIcon = (column: string) =>
    sortBy !== column ? null : sortDir === "asc" ? <BsArrowUp className="ms-1" /> : <BsArrowDown className="ms-1" />;

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await softDeleteStudent(pendingDelete.id, `${pendingDelete.first_name} ${pendingDelete.last_name}`);
      toast.success("Student deleted");
      setPendingDelete(null);
      setSelected((s) => s.filter((id) => id !== pendingDelete.id));
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmBulk = async () => {
    setBusy(true);
    try {
      await bulkSoftDelete(selected);
      toast.success(`${selected.length} students deleted`);
      setSelected([]);
      setBulkOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setBusy(false);
    }
  };

  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h4 fw-semibold mb-1">Students</h1>
          <p className="text-secondary small mb-0">{total} record{total === 1 ? "" : "s"} found</p>
        </div>
        <div className="d-flex gap-2">
          {selected.length > 0 && (
            <button className="btn btn-outline-danger btn-sm" onClick={() => setBulkOpen(true)}>
              <BsTrash className="me-2" />
              Delete {selected.length}
            </button>
          )}
          <Link to="/students/new" className="btn btn-primary btn-sm">
            <BsPersonPlus className="me-2" />
            Add student
          </Link>
        </div>
      </div>

      <div className="card sms-card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-lg-4">
              <label className="form-label small" htmlFor="q">
                Search
              </label>
              <form
                className="input-group input-group-sm"
                onSubmit={(e) => {
                  e.preventDefault();
                  setParam({ q: searchInput });
                }}
              >
                <span className="input-group-text bg-body">
                  <BsSearch aria-hidden="true" />
                </span>
                <input
                  id="q"
                  className="form-control"
                  placeholder="Name, email, phone, ID"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </form>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label small" htmlFor="dept">
                Department
              </label>
              <select
                id="dept"
                className="form-select form-select-sm"
                value={departmentId}
                onChange={(e) => setParam({ dept: e.target.value })}
              >
                <option value="">All</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label small" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                className="form-select form-select-sm"
                value={status}
                onChange={(e) => setParam({ status: e.target.value })}
              >
                <option value="">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label small" htmlFor="gender">
                Gender
              </label>
              <select
                id="gender"
                className="form-select form-select-sm"
                value={gender}
                onChange={(e) => setParam({ gender: e.target.value })}
              >
                <option value="">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label small" htmlFor="size">
                Per page
              </label>
              <select
                id="size"
                className="form-select form-select-sm"
                value={pageSize}
                onChange={(e) => setParam({ size: e.target.value })}
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {activeFilters > 0 && (
            <button className="btn btn-link btn-sm px-0 mt-2" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              <BsX /> Clear filters ({activeFilters})
            </button>
          )}
        </div>
      </div>

      <div className="card sms-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={allChecked}
                    onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                  />
                </th>
                <th role="button" onClick={() => toggleSort("student_id")}>
                  ID {sortIcon("student_id")}
                </th>
                <th role="button" onClick={() => toggleSort("first_name")}>
                  Name {sortIcon("first_name")}
                </th>
                <th className="d-none d-md-table-cell" role="button" onClick={() => toggleSort("email")}>
                  Email {sortIcon("email")}
                </th>
                <th className="d-none d-lg-table-cell">Department</th>
                <th className="d-none d-lg-table-cell">Course</th>
                <th className="d-none d-xl-table-cell">Year</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} cols={9} />
            ) : (
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        aria-label={`Select ${s.first_name} ${s.last_name}`}
                        checked={selected.includes(s.id)}
                        onChange={(e) =>
                          setSelected((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)))
                        }
                      />
                    </td>
                    <td className="font-monospace small">{s.student_id}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Avatar path={s.photo_url} name={`${s.first_name} ${s.last_name}`} size={32} />
                        <Link to={`/students/${s.id}`} className="text-decoration-none fw-medium">
                          {s.first_name} {s.last_name}
                        </Link>
                      </div>
                    </td>
                    <td className="d-none d-md-table-cell small">{s.email}</td>
                    <td className="d-none d-lg-table-cell small">{s.departments?.code ?? "—"}</td>
                    <td className="d-none d-lg-table-cell small">{s.course ?? "—"}</td>
                    <td className="d-none d-xl-table-cell small">{s.year ?? "—"}</td>
                    <td>
                      <span className={`badge bg-${statusTone[s.status] ?? "secondary"}-subtle text-${statusTone[s.status] ?? "secondary"}-emphasis`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="text-end text-nowrap">
                      <Link to={`/students/${s.id}`} className="btn btn-sm btn-outline-secondary me-1" aria-label="View student">
                        <BsEye />
                      </Link>
                      <Link to={`/students/${s.id}/edit`} className="btn btn-sm btn-outline-primary me-1" aria-label="Edit student">
                        <BsPencil />
                      </Link>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setPendingDelete(s)} aria-label="Delete student">
                        <BsTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {!loading && rows.length === 0 && (
          <EmptyState
            title="No students found"
            message={activeFilters ? "Try adjusting your filters." : "Add your first student to get started."}
            action={
              <Link to="/students/new" className="btn btn-primary btn-sm">
                Add student
              </Link>
            }
          />
        )}

        {total > pageSize && (
          <div className="card-footer bg-transparent">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={(p) => setParam({ page: String(p) })}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete student"
        message={`Delete ${pendingDelete?.first_name} ${pendingDelete?.last_name}? This can be restored by an administrator.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={bulkOpen}
        title="Delete selected students"
        message={`Delete ${selected.length} selected student records?`}
        confirmLabel="Delete all"
        busy={busy}
        onConfirm={confirmBulk}
        onCancel={() => setBulkOpen(false)}
      />
    </>
  );
}
