import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BsBuilding, BsCalendarCheck, BsMortarboard, BsPersonCircle } from "react-icons/bs";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/common/Avatar";
import { CardSkeleton, EmptyState } from "@/components/common/Feedback";
import { getStudentByUserId } from "@/services/sms";
import type { Student } from "@/types";

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getStudentByUserId(user.id)
      .then(setStudent)
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
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
                  <Link to="/profile" className="btn btn-outline-primary btn-sm">
                    <BsPersonCircle className="me-2" />
                    Edit my profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
