import { useEffect, useMemo, useState } from "react";
import { BsPencil, BsPlus, BsSearch, BsTrash } from "react-icons/bs";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, TableSkeleton } from "@/components/common/Feedback";
import { createFaculty, generateEmployeeId, listFaculty, softDeleteFaculty, updateFaculty } from "@/services/academics";
import { listDepartments } from "@/services/sms";
import type { Department, Faculty as FacultyType } from "@/types";

const DESIGNATIONS = ["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Lab Assistant", "HOD"];
const STATUSES = ["Active", "On Leave", "Inactive"];

const schema = z.object({
  employee_id: z.string().trim().min(2, "Employee ID is required").max(20),
  first_name: z.string().trim().min(1, "First name is required").max(60),
  last_name: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(20),
  designation: z.string().trim().max(60),
  qualification: z.string().trim().max(120),
  specialization: z.string().trim().max(120),
  joining_date: z.string().trim(),
  status: z.string().trim(),
  department_id: z.string().trim(),
  bio: z.string().trim().max(500),
});

const EMPTY = {
  employee_id: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  designation: "Assistant Professor",
  qualification: "",
  specialization: "",
  joining_date: "",
  status: "Active",
  department_id: "",
  bio: "",
};

export default function Faculty() {
  const [rows, setRows] = useState<FacultyType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FacultyType | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<FacultyType | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    listFaculty({ departmentId: deptFilter, status: statusFilter })
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load faculty"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    listDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  useEffect(load, [deptFilter, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((f) =>
      [f.first_name, f.last_name, f.email, f.employee_id, f.designation ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const openNew = async () => {
    setEditing(null);
    setErrors({});
    setForm({ ...EMPTY, employee_id: await generateEmployeeId() });
    setShowForm(true);
  };

  const openEdit = (f: FacultyType) => {
    setEditing(f);
    setErrors({});
    setForm({
      employee_id: f.employee_id,
      first_name: f.first_name,
      last_name: f.last_name,
      email: f.email,
      phone: f.phone ?? "",
      designation: f.designation ?? "",
      qualification: f.qualification ?? "",
      specialization: f.specialization ?? "",
      joining_date: f.joining_date ?? "",
      status: f.status,
      department_id: f.department_id ?? "",
      bio: f.bio ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])),
      );
      return;
    }
    setErrors({});
    setBusy(true);
    const d = parsed.data;
    const payload = {
      employee_id: d.employee_id,
      first_name: d.first_name,
      last_name: d.last_name,
      email: d.email,
      phone: d.phone || null,
      designation: d.designation || null,
      qualification: d.qualification || null,
      specialization: d.specialization || null,
      joining_date: d.joining_date || null,
      status: d.status,
      department_id: d.department_id || null,
      bio: d.bio || null,
    };
    try {
      if (editing) {
        await updateFaculty(editing.id, payload);
        toast.success("Faculty updated");
      } else {
        await createFaculty(payload);
        toast.success("Faculty added");
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
      await softDeleteFaculty(pendingDelete.id, `${pendingDelete.first_name} ${pendingDelete.last_name}`);
      toast.success("Faculty removed");
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
          <h1 className="h4 fw-semibold mb-1">Faculty</h1>
          <p className="text-secondary small mb-0">Manage teaching staff, departments and designations</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <BsPlus className="me-1" />
          Add faculty
        </button>
      </div>

      <div className="card sms-card mb-3">
        <div className="card-body row g-2 align-items-end">
          <div className="col-12 col-md-5">
            <label className="form-label small" htmlFor="fac-search">
              Search
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-body">
                <BsSearch aria-hidden="true" />
              </span>
              <input
                id="fac-search"
                className="form-control"
                placeholder="Name, email or employee ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-6 col-md-4">
            <label className="form-label small" htmlFor="fac-dept">
              Department
            </label>
            <select id="fac-dept" className="form-select form-select-sm" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small" htmlFor="fac-status">
              Status
            </label>
            <select id="fac-status" className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card sms-card mb-3">
          <div className="card-header bg-transparent fw-semibold">{editing ? "Edit faculty" : "New faculty member"}</div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="card-body row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="employee_id">Employee ID</label>
                <input id="employee_id" className={`form-control ${errors.employee_id ? "is-invalid" : ""}`} value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
                {errors.employee_id && <div className="invalid-feedback">{errors.employee_id}</div>}
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="first_name">First name</label>
                <input id="first_name" className={`form-control ${errors.first_name ? "is-invalid" : ""}`} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="last_name">Last name</label>
                <input id="last_name" className={`form-control ${errors.last_name ? "is-invalid" : ""}`} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                {errors.last_name && <div className="invalid-feedback">{errors.last_name}</div>}
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="email">Email</label>
                <input id="email" type="email" className={`form-control ${errors.email ? "is-invalid" : ""}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="phone">Phone</label>
                <input id="phone" className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="department_id">Department</label>
                <select id="department_id" className="form-select" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="designation">Designation</label>
                <select id="designation" className="form-select" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })}>
                  <option value="">—</option>
                  {DESIGNATIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="qualification">Qualification</label>
                <input id="qualification" className="form-control" placeholder="e.g. Ph.D, M.Tech" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="specialization">Specialization</label>
                <input id="specialization" className="form-control" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="joining_date">Joining date</label>
                <input id="joining_date" type="date" className="form-control" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="status">Status</label>
                <select id="status" className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label small" htmlFor="bio">Bio</label>
                <textarea id="bio" rows={2} className="form-control" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
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
                <th>Employee ID</th>
                <th>Name</th>
                <th className="d-none d-md-table-cell">Department</th>
                <th className="d-none d-lg-table-cell">Designation</th>
                <th className="d-none d-lg-table-cell">Email</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton rows={5} cols={7} />
            ) : (
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td className="font-monospace small">{f.employee_id}</td>
                    <td className="fw-medium">
                      {f.first_name} {f.last_name}
                      {f.qualification && <div className="text-secondary small">{f.qualification}</div>}
                    </td>
                    <td className="d-none d-md-table-cell small">{f.departments?.name ?? "—"}</td>
                    <td className="d-none d-lg-table-cell small">{f.designation ?? "—"}</td>
                    <td className="d-none d-lg-table-cell small text-secondary">{f.email}</td>
                    <td>
                      <span
                        className={`badge ${
                          f.status === "Active"
                            ? "text-bg-success"
                            : f.status === "On Leave"
                              ? "text-bg-warning"
                              : "text-bg-secondary"
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(f)} aria-label={`Edit ${f.first_name}`}>
                        <BsPencil />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setPendingDelete(f)} aria-label={`Remove ${f.first_name}`}>
                        <BsTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <EmptyState title="No faculty found" message="Add your first faculty member to get started." />
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove faculty member"
        message={`Remove ${pendingDelete?.first_name ?? ""} ${pendingDelete?.last_name ?? ""}? This can be restored by an administrator.`}
        confirmLabel="Remove"
        busy={busy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
