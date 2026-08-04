import { useEffect, useState } from "react";
import { BsPencil, BsPlus, BsTrash } from "react-icons/bs";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, TableSkeleton } from "@/components/common/Feedback";
import { createDepartment, deleteDepartment, listDepartments, updateDepartment } from "@/services/sms";
import type { Department } from "@/types";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  code: z.string().trim().min(2, "Code is required").max(12),
  description: z.string().trim().max(500),
});

export default function Departments() {
  const [rows, setRows] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Department | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<Department | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    listDepartments()
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load departments"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", code: "", description: "" });
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ name: d.name, code: d.code, description: d.description ?? "" });
    setErrors({});
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
        name: parsed.data.name,
        code: parsed.data.code.toUpperCase(),
        description: parsed.data.description,
      };
      if (editing) {
        await updateDepartment(editing.id, payload);
        toast.success("Department updated");
      } else {
        await createDepartment(payload);
        toast.success("Department created");
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
      await deleteDepartment(pendingDelete.id, pendingDelete.name);
      toast.success("Department deleted");
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed — students may still be assigned");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h4 fw-semibold mb-1">Departments</h1>
          <p className="text-secondary small mb-0">Manage academic departments and codes</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <BsPlus className="me-1" />
          Add department
        </button>
      </div>

      {showForm && (
        <div className="card sms-card mb-3">
          <div className="card-header bg-transparent fw-semibold">{editing ? "Edit department" : "New department"}</div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="card-body row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label small" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small" htmlFor="code">
                  Code
                </label>
                <input
                  id="code"
                  className={`form-control text-uppercase ${errors.code ? "is-invalid" : ""}`}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
                {errors.code && <div className="invalid-feedback">{errors.code}</div>}
              </div>
              <div className="col-12">
                <label className="form-label small" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={2}
                  className="form-control"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
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
                <th className="d-none d-md-table-cell">Description</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton rows={5} cols={4} />
            ) : (
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id}>
                    <td className="font-monospace small">{d.code}</td>
                    <td className="fw-medium">{d.name}</td>
                    <td className="d-none d-md-table-cell small text-secondary">{d.description || "—"}</td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(d)} aria-label={`Edit ${d.name}`}>
                        <BsPencil />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setPendingDelete(d)} aria-label={`Delete ${d.name}`}>
                        <BsTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {!loading && rows.length === 0 && <EmptyState title="No departments yet" message="Create your first department." />}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete department"
        message={`Delete "${pendingDelete?.name}"? Students assigned to it will lose their department.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
