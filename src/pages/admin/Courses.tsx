import { useEffect, useMemo, useState } from "react";
import { BsPencil, BsPlus, BsSearch, BsTrash } from "react-icons/bs";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, TableSkeleton } from "@/components/common/Feedback";
import { createCourse, deleteCourse, listCourses, updateCourse } from "@/services/academics";
import { listDepartments } from "@/services/sms";
import type { Course, Department } from "@/types";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  code: z.string().trim().min(2, "Code is required").max(20),
  department_id: z.string().trim(),
  duration_years: z.coerce.number().int().min(1, "Min 1 year").max(10),
  total_semesters: z.coerce.number().int().min(1, "Min 1 semester").max(20),
  description: z.string().trim().max(500),
});

const EMPTY = { name: "", code: "", department_id: "", duration_years: 4, total_semesters: 8, description: "" };

export default function Courses() {
  const [rows, setRows] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    listCourses()
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load courses"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    listDepartments().then(setDepartments).catch(() => setDepartments([]));
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => [c.name, c.code, c.departments?.name ?? ""].join(" ").toLowerCase().includes(q));
  }, [rows, search]);

  const openNew = () => {
    setEditing(null);
    setErrors({});
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setErrors({});
    setForm({
      name: c.name,
      code: c.code,
      department_id: c.department_id ?? "",
      duration_years: c.duration_years,
      total_semesters: c.total_semesters,
      description: c.description ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setErrors({});
    setBusy(true);
    const d = parsed.data;
    const payload = {
      name: d.name,
      code: d.code.toUpperCase(),
      department_id: d.department_id || null,
      duration_years: d.duration_years,
      total_semesters: d.total_semesters,
      description: d.description || null,
    };
    try {
      if (editing) {
        await updateCourse(editing.id, payload);
        toast.success("Course updated");
      } else {
        await createCourse(payload);
        toast.success("Course created");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await deleteCourse(pendingDelete.id, pendingDelete.name);
      toast.success("Course deleted");
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed — subjects may still be linked");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h4 fw-semibold mb-1">Courses</h1>
          <p className="text-secondary small mb-0">Programmes, durations and semester structure</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <BsPlus className="me-1" />
          Add course
        </button>
      </div>

      <div className="card sms-card mb-3">
        <div className="card-body">
          <label className="form-label small" htmlFor="course-search">
            Search
          </label>
          <div className="input-group input-group-sm" style={{ maxWidth: 420 }}>
            <span className="input-group-text bg-body">
              <BsSearch aria-hidden="true" />
            </span>
            <input
              id="course-search"
              className="form-control"
              placeholder="Course name, code or department"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card sms-card mb-3">
          <div className="card-header bg-transparent fw-semibold">{editing ? "Edit course" : "New course"}</div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="card-body row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label small" htmlFor="c-name">Name</label>
                <input id="c-name" className={`form-control ${errors.name ? "is-invalid" : ""}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small" htmlFor="c-code">Code</label>
                <input id="c-code" className={`form-control text-uppercase ${errors.code ? "is-invalid" : ""}`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                {errors.code && <div className="invalid-feedback">{errors.code}</div>}
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="c-dept">Department</label>
                <select id="c-dept" className="form-select" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label small" htmlFor="c-years">Duration (years)</label>
                <input id="c-years" type="number" min={1} max={10} className={`form-control ${errors.duration_years ? "is-invalid" : ""}`} value={form.duration_years} onChange={(e) => setForm({ ...form, duration_years: Number(e.target.value) })} />
                {errors.duration_years && <div className="invalid-feedback">{errors.duration_years}</div>}
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label small" htmlFor="c-sems">Total semesters</label>
                <input id="c-sems" type="number" min={1} max={20} className={`form-control ${errors.total_semesters ? "is-invalid" : ""}`} value={form.total_semesters} onChange={(e) => setForm({ ...form, total_semesters: Number(e.target.value) })} />
                {errors.total_semesters && <div className="invalid-feedback">{errors.total_semesters}</div>}
              </div>
              <div className="col-12">
                <label className="form-label small" htmlFor="c-desc">Description</label>
                <textarea id="c-desc" rows={2} className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="card-footer bg-transparent d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                {busy && <span className="spinner-border spinner-border-sm me-2" />}
                {editing ? "Save changes" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card sms-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th className="d-none d-md-table-cell">Department</th>
                <th className="d-none d-lg-table-cell">Duration</th>
                <th className="d-none d-lg-table-cell">Semesters</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : (
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="font-monospace small">{c.code}</td>
                    <td className="fw-medium">{c.name}</td>
                    <td className="d-none d-md-table-cell small">{c.departments?.name ?? "—"}</td>
                    <td className="d-none d-lg-table-cell small">{c.duration_years} yrs</td>
                    <td className="d-none d-lg-table-cell small">{c.total_semesters}</td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`}>
                        <BsPencil />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setPendingDelete(c)} aria-label={`Delete ${c.name}`}>
                        <BsTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {!loading && filtered.length === 0 && <EmptyState title="No courses yet" message="Create your first course." />}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete course"
        message={`Delete "${pendingDelete?.name}"? Subjects linked to it will lose their course.`}
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
