import { useCallback, useEffect, useMemo, useState } from "react";
import { BsCheck2All, BsSave } from "react-icons/bs";
import { toast } from "sonner";
import { EmptyState, TableSkeleton } from "@/components/common/Feedback";
import {
  ATTENDANCE_STATUSES,
  getAttendanceForDate,
  listDepartments,
  listStudents,
  saveAttendance,
} from "@/services/sms";
import type { AttendanceStatus, Department, Student } from "@/types";

const today = () => new Date().toISOString().slice(0, 10);

export default function Attendance() {
  const [date, setDate] = useState(today());
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ rows }, existing] = await Promise.all([
        listStudents({ departmentId, status: "Active", pageSize: 200, sortBy: "first_name", sortDir: "asc" }),
        getAttendanceForDate(date),
      ]);
      setStudents(rows);
      const nextMarks: Record<string, AttendanceStatus> = {};
      const nextRemarks: Record<string, string> = {};
      for (const s of rows) {
        nextMarks[s.id] = (existing[s.id]?.status as AttendanceStatus) ?? "Present";
        nextRemarks[s.id] = existing[s.id]?.remarks ?? "";
      }
      setMarks(nextMarks);
      setRemarks(nextRemarks);
    } catch {
      toast.error("Could not load attendance");
    } finally {
      setLoading(false);
    }
  }, [date, departmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const values = Object.values(marks);
    return ATTENDANCE_STATUSES.map((s) => ({ status: s, count: values.filter((v) => v === s).length }));
  }, [marks]);

  const markAll = (status: AttendanceStatus) => {
    setMarks(Object.fromEntries(students.map((s) => [s.id, status])) as Record<string, AttendanceStatus>);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAttendance(
        date,
        students.map((s) => ({ student_id: s.id, status: marks[s.id] ?? "Present", remarks: remarks[s.id] || null })),
      );
      toast.success("Attendance saved");
    } catch {
      toast.error("Could not save attendance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h1 className="h4 fw-semibold mb-1">Attendance</h1>
          <p className="text-secondary small mb-0">Mark daily attendance for active students.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || students.length === 0}>
          <BsSave className="me-2" />
          {saving ? "Saving…" : "Save attendance"}
        </button>
      </div>

      <div className="card sms-card mb-3">
        <div className="card-body row g-3 align-items-end">
          <div className="col-12 col-sm-4 col-lg-3">
            <label className="form-label small fw-semibold" htmlFor="att-date">
              Date
            </label>
            <input
              id="att-date"
              type="date"
              className="form-control form-control-sm"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value || today())}
            />
          </div>
          <div className="col-12 col-sm-5 col-lg-4">
            <label className="form-label small fw-semibold" htmlFor="att-dept">
              Department
            </label>
            <select
              id="att-dept"
              className="form-select form-select-sm"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-lg-5 d-flex flex-wrap gap-2">
            {ATTENDANCE_STATUSES.map((s) => (
              <button key={s} className="btn btn-outline-secondary btn-sm" onClick={() => markAll(s)} disabled={!students.length}>
                <BsCheck2All className="me-1" />
                All {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!loading && students.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          {counts.map(({ status, count }) => (
            <span key={status} className="badge bg-secondary-subtle text-secondary-emphasis">
              {status}: {count}
            </span>
          ))}
        </div>
      )}

      <div className="card sms-card">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-3">
              <TableSkeleton rows={6} cols={3} />
            </div>
          ) : students.length === 0 ? (
            <div className="p-3">
              <EmptyState title="No active students" message="Add students or pick another department to mark attendance." />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Department</th>
                    <th scope="col">Status</th>
                    <th scope="col">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="fw-semibold">
                          {s.first_name} {s.last_name}
                        </div>
                        <div className="text-secondary small">{s.student_id}</div>
                      </td>
                      <td className="small">{s.departments?.code ?? "—"}</td>
                      <td style={{ minWidth: 220 }}>
                        <div className="btn-group btn-group-sm" role="group" aria-label={`Attendance for ${s.first_name}`}>
                          {ATTENDANCE_STATUSES.map((status) => (
                            <button
                              key={status}
                              type="button"
                              className={`btn ${marks[s.id] === status ? "btn-primary" : "btn-outline-secondary"}`}
                              onClick={() => setMarks((m) => ({ ...m, [s.id]: status }))}
                            >
                              {status[0]}
                              <span className="visually-hidden">{status}</span>
                            </button>
                          ))}
                        </div>
                      </td>
                      <td style={{ minWidth: 200 }}>
                        <input
                          className="form-control form-control-sm"
                          placeholder="Optional"
                          aria-label={`Remarks for ${s.first_name}`}
                          value={remarks[s.id] ?? ""}
                          onChange={(e) => setRemarks((r) => ({ ...r, [s.id]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
