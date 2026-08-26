import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BsAward, BsPrinter, BsGraphUpArrow, BsJournalText } from "react-icons/bs";
import { useAuth } from "@/contexts/AuthContext";
import { CardSkeleton, EmptyState } from "@/components/common/Feedback";
import { getStudentByUserId } from "@/services/sms";
import { buildResults, listMarksForStudent } from "@/services/marks";
import type { ExamResult, Student } from "@/types";

const GRADE_CLASS: Record<string, string> = {
  O: "bg-success-subtle text-success-emphasis",
  "A+": "bg-success-subtle text-success-emphasis",
  A: "bg-primary-subtle text-primary-emphasis",
  "B+": "bg-info-subtle text-info-emphasis",
  B: "bg-warning-subtle text-warning-emphasis",
  C: "bg-warning-subtle text-warning-emphasis",
  F: "bg-danger-subtle text-danger-emphasis",
};

export default function StudentResults() {
  const { user, profile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [cgpa, setCgpa] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getStudentByUserId(user.id)
      .then(async (record) => {
        if (!active) return;
        setStudent(record);
        if (!record) return;
        const marks = await listMarksForStudent(record.id).catch(() => []);
        if (!active) return;
        const built = buildResults(marks);
        setResults(built.results);
        setCgpa(built.cgpa);
        setSelected(built.results[0]?.exam.id ?? "");
      })
      .catch(() => setStudent(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user]);

  const current = useMemo(() => results.find((r) => r.exam.id === selected) ?? results[0], [results, selected]);

  const trend = useMemo(
    () =>
      [...results]
        .reverse()
        .map((r) => ({ name: r.exam.title.slice(0, 14), gpa: r.gpa, percentage: r.percentage })),
    [results],
  );

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

  if (!student) {
    return (
      <div className="card sms-card">
        <div className="card-body">
          <EmptyState
            title="No student record linked yet"
            message="An administrator hasn't linked an academic record to your account, so results aren't available."
            action={
              <Link to="/student" className="btn btn-primary btn-sm">
                Back to dashboard
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 sms-no-print">
        <div>
          <h1 className="h4 fw-semibold mb-1">My results</h1>
          <p className="text-secondary small mb-0">Published examination results, grades and academic performance</p>
        </div>
        {results.length > 0 && (
          <button className="btn btn-outline-primary btn-sm" onClick={() => window.print()}>
            <BsPrinter className="me-2" />
            Print report card
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="card sms-card">
          <div className="card-body">
            <EmptyState
              title="No published results yet"
              message="Your results will appear here once your institution publishes them."
            />
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4 sms-no-print">
            <div className="col-12 col-md-4">
              <div className="card sms-card h-100">
                <div className="card-body d-flex align-items-center gap-3">
                  <div className="sms-stat-icon bg-primary-subtle text-primary-emphasis">
                    <BsAward />
                  </div>
                  <div>
                    <div className="text-secondary small text-uppercase fw-semibold">CGPA</div>
                    <div className="fs-3 fw-bold lh-1">{cgpa.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card sms-card h-100">
                <div className="card-body d-flex align-items-center gap-3">
                  <div className="sms-stat-icon bg-success-subtle text-success-emphasis">
                    <BsGraphUpArrow />
                  </div>
                  <div>
                    <div className="text-secondary small text-uppercase fw-semibold">Latest GPA</div>
                    <div className="fs-3 fw-bold lh-1">{results[0].gpa.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card sms-card h-100">
                <div className="card-body d-flex align-items-center gap-3">
                  <div className="sms-stat-icon bg-warning-subtle text-warning-emphasis">
                    <BsJournalText />
                  </div>
                  <div>
                    <div className="text-secondary small text-uppercase fw-semibold">Exams published</div>
                    <div className="fs-3 fw-bold lh-1">{results.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4 sms-no-print">
            <div className="col-12 col-lg-6">
              <div className="card sms-card h-100">
                <div className="card-header bg-transparent fw-semibold">GPA trend</div>
                <div className="card-body" style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,.2)" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis domain={[0, 10]} fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="gpa" stroke="#2563eb" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="card sms-card h-100">
                <div className="card-header bg-transparent fw-semibold">Subject-wise performance</div>
                <div className="card-body" style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(current?.subjects ?? []).map((s) => ({ name: s.subject.slice(0, 12), percentage: s.percentage }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,.2)" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="percentage" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="card sms-card mb-3 sms-no-print">
            <div className="card-body d-flex flex-wrap align-items-center gap-2">
              <label className="form-label mb-0 small text-secondary" htmlFor="exam-select">
                Examination
              </label>
              <select
                id="exam-select"
                className="form-select form-select-sm"
                style={{ maxWidth: 320 }}
                value={current?.exam.id ?? ""}
                onChange={(e) => setSelected(e.target.value)}
              >
                {results.map((r) => (
                  <option key={r.exam.id} value={r.exam.id}>
                    {r.exam.title} ({r.exam.exam_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {current && (
            <div className="card sms-card" ref={printRef}>
              <div className="card-body">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                  <div>
                    <h2 className="h5 fw-semibold mb-1">Report card</h2>
                    <div className="small text-secondary">
                      {current.exam.title} · {current.exam.exam_type}
                      {current.exam.academic_year ? ` · ${current.exam.academic_year}` : ""}
                    </div>
                  </div>
                  <dl className="row mb-0 small" style={{ minWidth: 260 }}>
                    <dt className="col-5 text-secondary">Name</dt>
                    <dd className="col-7">{profile?.full_name || `${student.first_name} ${student.last_name}`}</dd>
                    <dt className="col-5 text-secondary">Student ID</dt>
                    <dd className="col-7">{student.student_id}</dd>
                    <dt className="col-5 text-secondary">Department</dt>
                    <dd className="col-7">{student.departments?.name ?? "—"}</dd>
                    <dt className="col-5 text-secondary">Semester</dt>
                    <dd className="col-7">{current.exam.semester ?? student.semester ?? "—"}</dd>
                  </dl>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Subject</th>
                        <th scope="col" className="text-end">Credits</th>
                        <th scope="col" className="text-end">Marks</th>
                        <th scope="col" className="text-end">%</th>
                        <th scope="col" className="text-end">Grade</th>
                        <th scope="col" className="text-end">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.subjects.map((s) => (
                        <tr key={s.subject}>
                          <td>{s.subject}</td>
                          <td className="text-end">{s.credits}</td>
                          <td className="text-end">
                            {s.obtained} / {s.max}
                          </td>
                          <td className="text-end">{s.percentage}%</td>
                          <td className="text-end">
                            <span className={`badge ${GRADE_CLASS[s.grade] ?? "bg-secondary-subtle text-secondary-emphasis"}`}>
                              {s.grade}
                            </span>
                          </td>
                          <td className="text-end">{s.point}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="fw-semibold">
                        <td>Total</td>
                        <td className="text-end">{current.subjects.reduce((a, s) => a + s.credits, 0)}</td>
                        <td className="text-end">
                          {current.totalObtained} / {current.totalMax}
                        </td>
                        <td className="text-end">{current.percentage}%</td>
                        <td className="text-end">GPA</td>
                        <td className="text-end">{current.gpa.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="small text-secondary mb-0">
                  CGPA across all published examinations: <span className="fw-semibold">{cgpa.toFixed(2)}</span>
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
