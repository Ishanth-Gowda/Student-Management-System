import { useEffect, useMemo, useState } from "react";
import { BsBellFill, BsCheck2All, BsMegaphone, BsPencil, BsPlus, BsTrash } from "react-icons/bs";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CardSkeleton, EmptyState } from "@/components/common/Feedback";
import { useAuth } from "@/contexts/AuthContext";
import { listDepartments } from "@/services/sms";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  listReadAnnouncementIds,
  markAllAnnouncementsRead,
  markAnnouncementRead,
  updateAnnouncement,
} from "@/services/notices";
import type { Announcement, Department } from "@/types";

const CATEGORIES = ["General", "Academic", "Examination", "Holiday", "Department", "Emergency"];
const AUDIENCES = [
  { value: "all", label: "Everyone" },
  { value: "students", label: "Students" },
  { value: "faculty", label: "Faculty" },
];
const PRIORITIES = ["Normal", "High", "Urgent"];

const schema = z.object({
  title: z.string().trim().min(3, "Title is required").max(160),
  body: z.string().trim().min(3, "Message is required").max(4000),
  category: z.string().min(1),
  audience: z.string().min(1),
  priority: z.string().min(1),
});

const priorityClass = (p: string) =>
  p === "Urgent" ? "bg-danger" : p === "High" ? "bg-warning text-dark" : "bg-secondary";

export default function Notices() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "super_admin";

  const [rows, setRows] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    category: "General",
    audience: "all",
    priority: "Normal",
    department_id: "",
    published: true,
    expires_at: "",
  });

  const load = () => {
    setLoading(true);
    Promise.all([listAnnouncements({ search, category }), listReadAnnouncementIds()])
      .then(([list, reads]) => {
        setRows(list);
        setReadIds(reads);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load notices"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  useEffect(() => {
    if (canManage) listDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, [canManage]);

  const unread = useMemo(() => rows.filter((r) => !readIds.includes(r.id)), [rows, readIds]);

  const openNew = () => {
    setEditing(null);
    setErrors({});
    setForm({
      title: "",
      body: "",
      category: "General",
      audience: "all",
      priority: "Normal",
      department_id: "",
      published: true,
      expires_at: "",
    });
    setShowForm(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setErrors({});
    setForm({
      title: a.title,
      body: a.body,
      category: a.category,
      audience: a.audience,
      priority: a.priority,
      department_id: a.department_id ?? "",
      published: a.published,
      expires_at: a.expires_at ? a.expires_at.slice(0, 10) : "",
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
    try {
      const payload = {
        ...parsed.data,
        department_id: form.department_id || null,
        published: form.published,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };
      if (editing) {
        await updateAnnouncement(editing.id, payload);
        toast.success("Notice updated");
      } else {
        await createAnnouncement(payload);
        toast.success("Notice published");
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
      await deleteAnnouncement(pendingDelete.id, pendingDelete.title);
      toast.success("Notice deleted");
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const readOne = async (a: Announcement) => {
    if (readIds.includes(a.id)) return;
    await markAnnouncementRead(a.id);
    setReadIds((ids) => [...ids, a.id]);
  };

  const readAll = async () => {
    const ids = unread.map((u) => u.id);
    await markAllAnnouncementsRead(ids);
    setReadIds((prev) => [...prev, ...ids]);
    toast.success("All notices marked as read");
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h4 fw-semibold mb-1">Notice board</h1>
          <p className="text-secondary small mb-0">
            {canManage ? "Publish notices, academic updates and alerts" : "Announcements and updates from your institution"}
          </p>
        </div>
        <div className="d-flex gap-2">
          {unread.length > 0 && (
            <button className="btn btn-outline-secondary btn-sm" onClick={readAll}>
              <BsCheck2All className="me-1" /> Mark all read ({unread.length})
            </button>
          )}
          {canManage && (
            <button className="btn btn-primary btn-sm" onClick={openNew}>
              <BsPlus className="me-1" /> New notice
            </button>
          )}
        </div>
      </div>

      <div className="card sms-card mb-3">
        <div className="card-body row g-2">
          <div className="col-12 col-md-8">
            <input
              className="form-control"
              placeholder="Search notices"
              aria-label="Search notices"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4">
            <select className="form-select" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showForm && canManage && (
        <div className="card sms-card mb-3">
          <div className="card-header bg-transparent fw-semibold">{editing ? "Edit notice" : "New notice"}</div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="card-body row g-3">
              <div className="col-12">
                <label className="form-label small" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  className={`form-control ${errors.title ? "is-invalid" : ""}`}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                {errors.title && <div className="invalid-feedback">{errors.title}</div>}
              </div>
              <div className="col-12">
                <label className="form-label small" htmlFor="body">
                  Message
                </label>
                <textarea
                  id="body"
                  rows={4}
                  className={`form-control ${errors.body ? "is-invalid" : ""}`}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
                {errors.body && <div className="invalid-feedback">{errors.body}</div>}
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small" htmlFor="category">
                  Category
                </label>
                <select id="category" className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small" htmlFor="audience">
                  Audience
                </label>
                <select id="audience" className="form-select" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                  {AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small" htmlFor="priority">
                  Priority
                </label>
                <select id="priority" className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small" htmlFor="department">
                  Department (optional)
                </label>
                <select
                  id="department"
                  className="form-select"
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                >
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="expires">
                  Expires on (optional)
                </label>
                <input
                  id="expires"
                  type="date"
                  className="form-control"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-4 d-flex align-items-end">
                <div className="form-check">
                  <input
                    id="published"
                    className="form-check-input"
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />
                  <label className="form-check-label small" htmlFor="published">
                    Publish immediately
                  </label>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                {busy && <span className="spinner-border spinner-border-sm me-2" />}
                {editing ? "Save changes" : "Publish"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="d-flex flex-column gap-2">
          <CardSkeleton height={110} />
          <CardSkeleton height={110} />
          <CardSkeleton height={110} />
        </div>
      ) : rows.length === 0 ? (
        <div className="card sms-card">
          <EmptyState title="No notices" message={canManage ? "Publish your first notice." : "Nothing has been announced yet."} />
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {rows.map((a) => {
            const isUnread = !readIds.includes(a.id);
            return (
              <div key={a.id} className={`card sms-card ${isUnread ? "border-primary" : ""}`} onMouseEnter={() => readOne(a)}>
                <div className="card-body">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <h2 className="h6 fw-semibold mb-0 d-flex align-items-center gap-2">
                      {isUnread ? <BsBellFill className="text-primary" aria-hidden="true" /> : <BsMegaphone className="text-secondary" aria-hidden="true" />}
                      {a.title}
                    </h2>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge ${priorityClass(a.priority)}`}>{a.priority}</span>
                      <span className="badge bg-primary-subtle text-primary-emphasis">{a.category}</span>
                      {canManage && !a.published && <span className="badge bg-secondary-subtle text-secondary-emphasis">Draft</span>}
                    </div>
                  </div>
                  <p className="mb-2 small" style={{ whiteSpace: "pre-wrap" }}>
                    {a.body}
                  </p>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div className="text-secondary small">
                      {new Date(a.publish_at).toLocaleString()}
                      {a.departments ? ` · ${a.departments.name}` : ""}
                      {a.audience !== "all" ? ` · ${AUDIENCES.find((x) => x.value === a.audience)?.label}` : ""}
                    </div>
                    {canManage && (
                      <div className="text-nowrap">
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(a)} aria-label={`Edit ${a.title}`}>
                          <BsPencil />
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setPendingDelete(a)} aria-label={`Delete ${a.title}`}>
                          <BsTrash />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete notice"
        message={`Delete "${pendingDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
