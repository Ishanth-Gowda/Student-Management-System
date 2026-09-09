import { useEffect, useState } from "react";
import { BsPencil, BsPlus, BsSearch, BsTrash } from "react-icons/bs";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, TableSkeleton } from "@/components/common/Feedback";
import { createSubject, deleteSubject, listCourses, listFaculty, listSubjects, updateSubject } from "@/services/academics";
import { listDepartments } from "@/services/sms";
import type { Course, Department, Faculty, Subject } from "@/types";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  code: z.string().trim().min(2, "Code is required").max(20),
  department_id: z.string().trim(),
  course_id: z.string().trim(),
  faculty_id: z.string().trim(),
  semester: z.string().trim(),
  credits: z.coerce.number().min(0, "Credits must be 0 or more").max(20),
  description: z.string().trim().max(500),
});

const EMPTY = {
  name: "",
  code: "",
  department_id: "",
  course_id: "",
  faculty_id: "",
  semester: "",
  credits: 4,
  description: "",
};

export default function Subjects() {
  const [rows, setRows] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [semFilter, setSemFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    listSubjects({ departmentId: deptFilter, semester: semFilter, search })
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load subjects"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    listDepartments().then(setDepartments).catch(() => setDepartments([]));
    listCourses().then(setCourses).catch(() => setCourses([]));
    listFaculty().then(setFaculty).catch(() => setFaculty([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [deptFilter, semFilter, search]);

  const openNew = () => {
    setEditing(null);
    setErrors({});
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setErrors({});
    setForm({
      name: s.name,
      code: s.code,
      department_id: s.department_id ?? "",
      course_id: s.course_id ?? "",
      faculty_id: s.faculty_id ?? "",
      semester: s.semester ? String(s.semester) : "",
      credits: s.credits,
      description: s.description ?? "",
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
      course_id: d.course_id || null,
      faculty_id: d.faculty_id || null,
      semester: d.semester ? Number(d.semester) : null,
      credits: d.credits,
      description: d.description || null,
    };
    try {
      if (editing) {
        await updateSubject(editing.id, payload);
        toast.success("Subject updated");
      } else {
        await createSubject(payload);
        toast.success("Subject created");
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
      await deleteSubject(pendingDelete.id, pendingDelete.name);
      toast.success("Subject deleted");
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h4 fw-semibold mb-1">Subjects</h1>
          <p className="text-secondary small mb-0">Subject codes, credits and assigned faculty</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <BsPlus className="me-1" />
          Add subject
        </button>
      </div>

      <div className="card sms-card mb-3">
        <div className="card-body row g-2 align-items-end">
          <div className="col-12 col-md-5">
            <label className="form-label small" htmlFor="sub-search">Search</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-body">
                <BsSearch aria-hidden="true" />
              </span>
              <input
                id="sub-search"
                className="form-control"
                placeholder="Subject name or code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-6 col-md-4">
            <label className="form-label small" htmlFor="sub-dept">Department</label>
            <select id="sub-dept" className="form-select form-select-sm" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small" htmlFor="sub-sem">Semester</label>
            <select id="sub-sem" className="form-select form-select-sm" value={semFilter} onChange={(e) => setSemFilter(e.target.value)}>
              <option value="">All</option>
              {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card sms-card mb-3">
          <div className="card-header bg-transparent fw-semibold">{editing ? "Edit subject" : "New subject"}</div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="card-body row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label small" htmlFor="s-name">Name</label>
                <input id="s-name" className={`form-control ${errors.name ? "is-invalid" : ""}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small" htmlFor="s-code">Code</label>
                <input id="s-code" className={`form-control text-uppercase ${errors.code ? "is-invalid" : ""}`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                {errors.code && <div className="invalid-feedback">{errors.code}</div>}
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="s-dept">Department</label>
                <select id="s-dept" className="form-select" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="s-course">Course</label>
                <select id="s-course" className="form-select" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="s-fac">Assigned faculty</label>
                <select id="s-fac" className="form-select" value={form.faculty_id} onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>{f.first_name} {f.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label small" htmlFor="s-sem">Semester</label>
                <select id="s-sem" className="form-select" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                  <option value="">—</option>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label small" htmlFor="s-credits">Credits</label>
                <input id="s-credits" type="number" min={0} max={20} step={0.5} className={`form-control ${errors.credits ? "is-invalid" : ""}`} value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
                {errors.credits && <div className="invalid-feedback">{errors.credits}</div>}
              </div>
              <div className="col-12">
                <label className="form-label small" htmlFor="s-desc">Description / syllabus notes</label>
                <textarea id="s-desc" rows={2} className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
                <th className="d-none d-lg-table-cell">Course</th>
                <th className="d-none d-lg-table-cell">Faculty</th>
                <th>Sem</th>
                <th>Credits</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton rows={5} cols={8} />
            ) : (
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="font-monospace small">{s.code}</td>
                    <td className="fw-medium">{s.name}</td>
                    <td className="d-none d-md-table-cell small">{s.departments?.name ?? "—"}</td>
                    <td className="d-none d-lg-table-cell small">{s.courses?.name ?? "—"}</td>
                    <td className="d-none d-lg-table-cell small">
                      {s.faculty ? `${s.faculty.first_name} ${s.faculty.last_name}` : "—"}
                    </td>
                    <td className="small">{s.semester ?? "—"}</td>
                    <td className="small">{s.credits}</td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}>
                        <BsPencil />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setPendingDelete(s)} aria-label={`Delete ${s.name}`}>
                        <BsTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {!loading && rows.length === 0 && <EmptyState title="No subjects found" message="Add a subject to get started." />}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete subject"
        message={`Delete "${pendingDelete?.name}"?`}
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
