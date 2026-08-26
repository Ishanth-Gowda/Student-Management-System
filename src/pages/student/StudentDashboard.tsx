import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BsAward, BsBuilding, BsCalendarCheck, BsMortarboard, BsPersonCircle } from "react-icons/bs";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/common/Avatar";
import { CardSkeleton, EmptyState } from "@/components/common/Feedback";
import { getStudentByUserId, listAttendanceForStudent, summarizeAttendance } from "@/services/sms";
import { buildResults, listMarksForStudent } from "@/services/marks";
import type { Attendance, AttendanceSummary, ExamResult, Student } from "@/types";

const STATUS_CLASS: Record<string, string> = {
  Present: "bg-success-subtle text-success-emphasis",
  Absent: "bg-danger-subtle text-danger-emphasis",
  Late: "bg-warning-subtle text-warning-emphasis",
  Excused: "bg-secondary-subtle text-secondary-emphasis",
};

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [cgpa, setCgpa] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getStudentByUserId(user.id)
      .then(async (record) => {
        if (!active) return;
        setStudent(record);
        if (record) {
          const rows = await listAttendanceForStudent(record.id).catch(() => [] as Attendance[]);
          if (!active) return;
          setAttendance(rows);
          setSummary(summarizeAttendance(rows));
          const marks = await listMarksForStudent(record.id).catch(() => []);
          if (!active) return;
          const built = buildResults(marks);
          setResults(built.results);
          setCgpa(built.cgpa);
        }
      })
      .catch(() => setStudent(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="row g-3">
        {[0, 1, 2].map((i) => (
          <div className="col-12 col-md-4" key={i}>
            <CardSkeleton height={120} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="card sms-card mb-4">
        <div className="card-body d-flex flex-column flex-sm-row align-items-center gap-3">
          <Avatar path={student?.photo_url ?? profile?.avatar_url} name={profile?.full_name || user?.email} size={80} />
          <div className="text-center text-sm-start">
            <h1 className="h4 fw-semibold mb-1">Welcome, {profile?.full_name || user?.email}</h1>
            <p className="text-secondary small mb-0">
              {student ? `${student.student_id} · ${student.departments?.name ?? "No department"}` : "Your student profile"}
            </p>
          </div>
        </div>
      </div>

      {!student ? (
        <div className="card sms-card">
          <div className="card-body">
            <EmptyState
              title="No student record linked yet"
              message="An administrator hasn't linked an academic record to your account. Your personal profile is still available."
              action={
                <Link to="/profile" className="btn btn-primary btn-sm">
                  Open my profile
                </Link>
              }
            />
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <div className="card sms-card h-100">
                <div className="card-body d-flex align-items-center gap-3">
                  <div className="sms-stat-icon bg-primary-subtle text-primary-emphasis">
                    <BsBuilding />
                  </div>
                  <div>
                    <div className="text-secondary small text-uppercase fw-semibold">Department</div>
                    <div className="fw-bold">{student.departments?.code ?? "—"}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card sms-card h-100">
                <div className="card-body d-flex align-items-center gap-3">
                  <div className="sms-stat-icon bg-success-subtle text-success-emphasis">
                    <BsMortarboard />
                  </div>
                  <div>
                    <div className="text-secondary small text-uppercase fw-semibold">Year / semester</div>
                    <div className="fw-bold">
                      {student.year ?? "—"} / {student.semester ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card sms-card h-100">
                <div className="card-body d-flex align-items-center gap-3">
                  <div className="sms-stat-icon bg-warning-subtle text-warning-emphasis">
                    <BsCalendarCheck />
                  </div>
                  <div>
                    <div className="text-secondary small text-uppercase fw-semibold">Status</div>
                    <div className="fw-bold">{student.status}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card sms-card mb-4">
            <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
              <span className="fw-semibold">My attendance</span>
              {summary && summary.total > 0 && (
                <span className="badge bg-primary-subtle text-primary-emphasis">{summary.percentage}% attendance</span>
              )}
            </div>
            <div className="card-body">
              {!summary || summary.total === 0 ? (
                <p className="text-secondary small mb-0">No attendance has been recorded for you yet.</p>
              ) : (
                <>
                  <div className="progress mb-3" role="progressbar" aria-label="Attendance percentage" aria-valuenow={summary.percentage} aria-valuemin={0} aria-valuemax={100} style={{ height: 8 }}>
                    <div className="progress-bar bg-success" style={{ width: `${summary.percentage}%` }} />
                  </div>
                  <div className="d-flex flex-wrap gap-2 mb-3 small">
                    <span className="badge bg-success-subtle text-success-emphasis">Present: {summary.present}</span>
                    <span className="badge bg-warning-subtle text-warning-emphasis">Late: {summary.late}</span>
                    <span className="badge bg-danger-subtle text-danger-emphasis">Absent: {summary.absent}</span>
                    <span className="badge bg-secondary-subtle text-secondary-emphasis">Excused: {summary.excused}</span>
                    <span className="badge bg-light text-secondary-emphasis border">Records: {summary.total}</span>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th scope="col">Date</th>
                          <th scope="col">Status</th>
                          <th scope="col">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.slice(0, 10).map((a) => (
                          <tr key={a.id}>
                            <td className="small">{new Date(a.date).toLocaleDateString()}</td>
                            <td>
                              <span className={`badge ${STATUS_CLASS[a.status] ?? "bg-secondary-subtle text-secondary-emphasis"}`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="small text-secondary">{a.remarks || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card sms-card mb-4">
            <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
              <span className="fw-semibold">Academic performance</span>
              <Link to="/student/results" className="small text-decoration-none">
                View full results
              </Link>
            </div>
            <div className="card-body">
              {results.length === 0 ? (
                <p className="text-secondary small mb-0">No results have been published for you yet.</p>
              ) : (
                <>
                  <div className="row g-3 mb-3">
                    <div className="col-6 col-md-4">
                      <div className="text-secondary small text-uppercase fw-semibold">CGPA</div>
                      <div className="fs-3 fw-bold lh-1">{cgpa.toFixed(2)}</div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-secondary small text-uppercase fw-semibold">Latest GPA</div>
                      <div className="fs-3 fw-bold lh-1">{results[0].gpa.toFixed(2)}</div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="text-secondary small text-uppercase fw-semibold">Latest exam</div>
                      <div className="fw-semibold">{results[0].exam.title}</div>
                      <div className="small text-secondary">{results[0].percentage}% overall</div>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th scope="col">Subject</th>
                          <th scope="col" className="text-end">Marks</th>
                          <th scope="col" className="text-end">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results[0].subjects.slice(0, 5).map((s) => (
                          <tr key={s.subject}>
                            <td className="small">{s.subject}</td>
                            <td className="text-end small">{s.obtained} / {s.max}</td>
                            <td className="text-end">
                              <span className="badge bg-primary-subtle text-primary-emphasis">{s.grade}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className="card sms-card h-100">
                <div className="card-header bg-transparent fw-semibold">My details</div>
                <div className="card-body">
                  <dl className="row mb-0 small">
                    <dt className="col-5 text-secondary">Student ID</dt>
                    <dd className="col-7">{student.student_id}</dd>
                    <dt className="col-5 text-secondary">Roll number</dt>
                    <dd className="col-7">{student.roll_number || "—"}</dd>
                    <dt className="col-5 text-secondary">Course</dt>
                    <dd className="col-7">{student.course || "—"}</dd>
                    <dt className="col-5 text-secondary">Email</dt>
                    <dd className="col-7 text-break">{student.email}</dd>
                    <dt className="col-5 text-secondary">Phone</dt>
                    <dd className="col-7">{student.phone || "—"}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="card sms-card h-100">
                <div className="card-header bg-transparent fw-semibold">Account</div>
                <div className="card-body">
                  <p className="small text-secondary">
                    Keep your contact details current so your institution can reach you.
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <Link to="/profile" className="btn btn-outline-primary btn-sm">
                      <BsPersonCircle className="me-2" />
                      Edit my profile
                    </Link>
                    <Link to="/student/results" className="btn btn-outline-secondary btn-sm">
                      <BsAward className="me-2" />
                      My results
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
