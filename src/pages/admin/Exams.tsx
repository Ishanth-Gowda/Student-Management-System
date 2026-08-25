import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BsEyeSlash, BsMegaphone, BsPencil, BsPlusLg, BsTrash, BsUiChecksGrid } from "react-icons/bs";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, TableSkeleton } from "@/components/common/Feedback";
import { EXAM_TYPES, createExam, deleteExam, listExams, setExamPublished, updateExam } from "@/services/marks";
import { listDepartments } from "@/services/sms";
import type { Department, Exam } from "@/types";

const blank = {
  title: "",
  exam_type: "Semester",
  department_id: "",
  semester: "",
  academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  exam_date: "",
  max_marks: "100",
};

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...blank });
  const [editing, setEditing] = useState<Exam | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Exam | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [rows, depts] = await Promise.all([listExams(), listDepartments()]);
      setExams(rows);
      setDepartments(depts);
    } catch {
      toast.error("Could not load examinations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank });
    setShowForm(true);
  };

  const openEdit = (exam: Exam) => {
    setEditing(exam);
    setForm({
      title: exam.title,
      exam_type: exam.exam_type,
      department_id: exam.department_id ?? "",
      semester: exam.semester ? String(exam.semester) : "",
      academic_year: exam.academic_year ?? "",
      exam_date: exam.exam_date ?? "",
      max_marks: String(exam.max_marks ?? 100),
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      exam_type: form.exam_type,
      department_id: form.department_id || null,
      semester: form.semester ? Number(form.semester) : null,
      academic_year: form.academic_year || null,
      exam_date: form.exam_date || null,
      max_marks: Number(form.max_marks) || 100,
    };
    try {
      if (editing) {
        await updateExam(editing.id, payload);
        toast.success("Examination updated");
      } else {
        await createExam(payload);
        toast.success("Examination created");
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch {
      toast.error("Could not save the examination");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (exam: Exam) => {
    try {
      await setExamPublished(exam.id, !exam.published);
      toast.success(exam.published ? "Results hidden from students" : "Results published");
      await load();
    } catch {
      toast.error("Could not update publish status");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteExam(toDelete.id, toDelete.title);
      toast.success("Examination deleted");
      setToDelete(null);
      await load();
    } catch {
      toast.error("Could not delete the examination");
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h1 className="h4 fw-semibold mb-1">Examinations</h1>
          <p className="text-secondary small mb-0">Create examinations, enter marks and publish results.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <BsPlusLg className="me-2" />
          New examination
        </button>
      </div>

      {showForm && (
        <div className="card sms-card mb-4">
          <div className="card-body">
            <h2 className="h6 fw-semibold mb-3">{editing ? "Edit examination" : "New examination"}</h2>
            <form className="row g-3" onSubmit={submit}>
              <div className="col-12 col-lg-4">
                <label className="form-label small fw-semibold" htmlFor="ex-title">
                  Title
                </label>
                <input
                  id="ex-title"
                  className="form-control form-control-sm"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Semester 3 Final Examination"
                  required
                />
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label small fw-semibold" htmlFor="ex-type">
                  Type
                </label>
                <select
                  id="ex-type"
                  className="form-select form-select-sm"
                  value={form.exam_type}
                  onChange={(e) => setForm({ ...form, exam_type: e.target.value })}
                >
                  {EXAM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-lg-3">
                <label className="form-label small fw-semibold" htmlFor="ex-dept">
                  Department
                </label>
                <select
                  id="ex-dept"
                  className="form-select form-select-sm"
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                >
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-lg-3">
                <label className="form-label small fw-semibold" htmlFor="ex-sem">
                  Semester
                </label>
                <input
                  id="ex-sem"
                  type="number"
                  min={1}
                  max={12}
                  className="form-control form-control-sm"
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                />
              </div>
              <div className="col-6 col-lg-3">
                <label className="form-label small fw-semibold" htmlFor="ex-year">
                  Academic year
                </label>
                <input
                  id="ex-year"
                  className="form-control form-control-sm"
                  value={form.academic_year}
                  onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                />
              </div>
              <div className="col-6 col-lg-3">
                <label className="form-label small fw-semibold" htmlFor="ex-date">
                  Exam date
                </label>
                <input
                  id="ex-date"
                  type="date"
                  className="form-control form-control-sm"
                  value={form.exam_date}
                  onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                />
              </div>
              <div className="col-6 col-lg-3">
                <label className="form-label small fw-semibold" htmlFor="ex-max">
                  Max marks per subject
                </label>
                <input
                  id="ex-max"
                  type="number"
                  min={1}
                  className="form-control form-control-sm"
                  value={form.max_marks}
                  onChange={(e) => setForm({ ...form, max_marks: e.target.value })}
                />
              </div>
              <div className="col-12 d-flex gap-2">
                <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Create examination"}
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card sms-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Department</th>
                <th>Semester</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton rows={5} cols={7} />
            ) : (
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id}>
                    <td className="fw-semibold">{exam.title}</td>
                    <td>{exam.exam_type}</td>
                    <td>{exam.departments?.code ?? "All"}</td>
                    <td>{exam.semester ?? "—"}</td>
                    <td>{exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : "—"}</td>
                    <td>
                      <span
                        className={`badge rounded-pill ${
                          exam.published ? "bg-success-subtle text-success-emphasis" : "bg-secondary-subtle text-secondary-emphasis"
                        }`}
                      >
                        {exam.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link className="btn btn-outline-primary" to={`/exams/${exam.id}/marks`} title="Enter marks">
                          <BsUiChecksGrid />
                        </Link>
                        <button className="btn btn-outline-secondary" onClick={() => openEdit(exam)} title="Edit">
                          <BsPencil />
                        </button>
                        <button
                          className="btn btn-outline-success"
                          onClick={() => togglePublish(exam)}
                          title={exam.published ? "Hide results" : "Publish results"}
                        >
                          {exam.published ? <BsEyeSlash /> : <BsMegaphone />}
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => setToDelete(exam)} title="Delete">
                          <BsTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {!loading && exams.length === 0 && (
          <div className="card-body">
            <EmptyState title="No examinations yet" message="Create your first examination to start entering marks." />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete examination"
        message={`Delete "${toDelete?.title}"? All marks recorded for it will be removed.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
