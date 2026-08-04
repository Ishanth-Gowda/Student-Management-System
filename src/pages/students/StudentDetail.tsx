import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BsArrowLeft, BsPencil, BsPrinter } from "react-icons/bs";
import { toast } from "sonner";
import { Avatar } from "@/components/common/Avatar";
import { Loader } from "@/components/common/Feedback";
import { getStudent } from "@/services/sms";
import type { Student } from "@/types";

const statusTone: Record<string, string> = {
  Active: "success",
  Inactive: "secondary",
  Graduated: "primary",
  Dropped: "danger",
};

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <>
      <dt className="col-5 col-lg-4 text-secondary small">{label}</dt>
      <dd className="col-7 col-lg-8 small text-break">{value || "—"}</dd>
    </>
  );
}

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudent(id!)
      .then((s) => {
        if (!s) {
          toast.error("Student not found");
          navigate("/students", { replace: true });
          return;
        }
        setStudent(s);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load student"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <Loader label="Loading student..." />;
  if (!student) return null;

  const address = [student.address_line1, student.city, student.state, student.zip_code, student.country]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 sms-no-print">
        <Link to="/students" className="btn btn-outline-secondary btn-sm">
          <BsArrowLeft className="me-2" />
          Back to list
        </Link>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => window.print()}>
            <BsPrinter className="me-2" />
            Print
          </button>
          <Link to={`/students/${student.id}/edit`} className="btn btn-primary btn-sm">
            <BsPencil className="me-2" />
            Edit
          </Link>
        </div>
      </div>

      <div className="card sms-card mb-3">
        <div className="card-body d-flex flex-column flex-sm-row align-items-center gap-3">
          <Avatar path={student.photo_url} name={`${student.first_name} ${student.last_name}`} size={88} />
          <div className="text-center text-sm-start">
            <h1 className="h4 fw-semibold mb-1">
              {student.first_name} {student.last_name}
            </h1>
            <div className="text-secondary small">
              {student.student_id} · {student.departments?.name ?? "No department"}
            </div>
            <span className={`badge mt-2 bg-${statusTone[student.status] ?? "secondary"}-subtle text-${statusTone[student.status] ?? "secondary"}-emphasis`}>
              {student.status}
            </span>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card sms-card h-100">
            <div className="card-header bg-transparent fw-semibold">Personal information</div>
            <div className="card-body">
              <dl className="row mb-0">
                <Row label="Email" value={student.email} />
                <Row label="Phone" value={student.phone} />
                <Row label="Alternate phone" value={student.alternate_phone} />
                <Row label="Gender" value={student.gender} />
                <Row label="Date of birth" value={student.date_of_birth} />
                <Row label="Blood group" value={student.blood_group} />
                <Row label="Address" value={address} />
              </dl>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card sms-card h-100">
            <div className="card-header bg-transparent fw-semibold">Academic information</div>
            <div className="card-body">
              <dl className="row mb-0">
                <Row label="Department" value={student.departments?.name} />
                <Row label="Course" value={student.course} />
                <Row label="Roll number" value={student.roll_number} />
                <Row label="Year" value={student.year} />
                <Row label="Semester" value={student.semester} />
                <Row label="Admission date" value={student.admission_date} />
              </dl>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card sms-card h-100">
            <div className="card-header bg-transparent fw-semibold">Guardian & emergency</div>
            <div className="card-body">
              <dl className="row mb-0">
                <Row label="Parent name" value={student.parent_name} />
                <Row label="Parent phone" value={student.parent_phone} />
                <Row label="Guardian name" value={student.guardian_name} />
                <Row label="Guardian phone" value={student.guardian_phone} />
                <Row label="Emergency contact" value={student.emergency_contact} />
              </dl>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card sms-card h-100">
            <div className="card-header bg-transparent fw-semibold">Notes & record</div>
            <div className="card-body">
              <p className="small mb-3">{student.notes || "No notes recorded."}</p>
              <dl className="row mb-0">
                <Row label="Created" value={new Date(student.created_at).toLocaleString()} />
                <Row label="Last updated" value={new Date(student.updated_at).toLocaleString()} />
              </dl>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
