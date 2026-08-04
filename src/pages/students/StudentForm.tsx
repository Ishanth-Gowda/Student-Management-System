import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BsArrowLeft, BsCheck2, BsUpload } from "react-icons/bs";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar } from "@/components/common/Avatar";
import { Loader } from "@/components/common/Feedback";
import {
  createStudent,
  generateStudentId,
  getStudent,
  isEmailTaken,
  listDepartments,
  updateStudent,
  uploadAvatar,
} from "@/services/sms";
import type { Department } from "@/types";

const STATUSES = ["Active", "Inactive", "Graduated", "Dropped"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const schema = z.object({
  student_id: z.string().trim().min(1, "Student ID is required").max(32),
  first_name: z.string().trim().min(2, "First name is required").max(60),
  last_name: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number")
    .or(z.literal("")),
  gender: z.string(),
  date_of_birth: z.string(),
  department_id: z.string().min(1, "Select a department"),
  course: z.string().trim().max(120),
  semester: z.string(),
  year: z.string(),
  roll_number: z.string().trim().max(40),
  admission_date: z.string(),
  blood_group: z.string(),
  status: z.string(),
  address_line1: z.string().trim().max(200),
  city: z.string().trim().max(80),
  state: z.string().trim().max(80),
  country: z.string().trim().max(80),
  zip_code: z.string().trim().max(20),
  parent_name: z.string().trim().max(120),
  parent_phone: z.string().trim().max(20),
  guardian_name: z.string().trim().max(120),
  guardian_phone: z.string().trim().max(20),
  emergency_contact: z.string().trim().max(120),
  notes: z.string().trim().max(2000),
});

type FormState = z.infer<typeof schema>;

const EMPTY: FormState = {
  student_id: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  gender: "",
  date_of_birth: "",
  department_id: "",
  course: "",
  semester: "",
  year: "",
  roll_number: "",
  admission_date: "",
  blood_group: "",
  status: "Active",
  address_line1: "",
  city: "",
  state: "",
  country: "",
  zip_code: "",
  parent_name: "",
  parent_phone: "",
  guardian_name: "",
  guardian_phone: "",
  emergency_contact: "",
  notes: "",
};

const STEPS = ["Personal", "Academic", "Contact", "Review"];

export default function StudentForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    listDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    if (!isEdit) {
      generateStudentId()
        .then((sid) => setForm((f) => (f.student_id ? f : { ...f, student_id: sid })))
        .catch(() => undefined);
      return;
    }
    getStudent(id!)
      .then((s) => {
        if (!s) {
          toast.error("Student not found");
          navigate("/students", { replace: true });
          return;
        }
        setPhotoPath(s.photo_url);
        setForm({
          student_id: s.student_id ?? "",
          first_name: s.first_name ?? "",
          last_name: s.last_name ?? "",
          email: s.email ?? "",
          phone: s.phone ?? "",
          gender: s.gender ?? "",
          date_of_birth: s.date_of_birth ?? "",
          department_id: s.department_id ?? "",
          course: s.course ?? "",
          semester: s.semester ? String(s.semester) : "",
          year: s.year ? String(s.year) : "",
          roll_number: s.roll_number ?? "",
          admission_date: s.admission_date ?? "",
          blood_group: s.blood_group ?? "",
          status: s.status ?? "Active",
          address_line1: s.address_line1 ?? "",
          city: s.city ?? "",
          state: s.state ?? "",
          country: s.country ?? "",
          zip_code: s.zip_code ?? "",
          parent_name: s.parent_name ?? "",
          parent_phone: s.parent_phone ?? "",
          guardian_name: s.guardian_name ?? "",
          guardian_phone: s.guardian_phone ?? "",
          emergency_contact: s.emergency_contact ?? "",
          notes: s.notes ?? "",
        });
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load student"))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const departmentName = useMemo(
    () => departments.find((d) => d.id === form.department_id)?.name ?? "—",
    [departments, form.department_id],
  );

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use a JPG, PNG or WebP image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadAvatar(file, "students");
      setPhotoPath(path);
      setPhotoPreview(URL.createObjectURL(file));
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return null;
    }
    setErrors({});
    return parsed.data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = validate();
    if (!data) {
      toast.error("Please fix the highlighted fields");
      setStep(0);
      return;
    }
    setBusy(true);
    try {
      if (await isEmailTaken(data.email, id)) {
        setErrors({ email: "A student with this email already exists" });
        toast.error("Duplicate email");
        setStep(0);
        return;
      }
      const payload = {
        ...data,
        phone: data.phone || null,
        gender: data.gender || null,
        date_of_birth: data.date_of_birth || null,
        admission_date: data.admission_date || null,
        blood_group: data.blood_group || null,
        semester: data.semester ? Number(data.semester) : null,
        year: data.year ? Number(data.year) : null,
        photo_url: photoPath,
      };
      if (isEdit) {
        await updateStudent(id!, payload);
        toast.success("Student updated");
      } else {
        await createStudent(payload);
        toast.success("Student created");
      }
      navigate("/students");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader label="Loading student..." />;

  const field = (
    name: keyof FormState,
    label: string,
    type = "text",
    options?: { value: string; label: string }[],
    colClass = "col-12 col-md-6",
  ) => (
    <div className={colClass} key={name}>
      <label className="form-label small fw-medium" htmlFor={name}>
        {label}
      </label>
      {options ? (
        <select id={name} className={`form-select ${errors[name] ? "is-invalid" : ""}`} value={form[name]} onChange={set(name)}>
          <option value="">Select...</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea id={name} rows={3} className={`form-control ${errors[name] ? "is-invalid" : ""}`} value={form[name]} onChange={set(name)} />
      ) : (
        <input id={name} type={type} className={`form-control ${errors[name] ? "is-invalid" : ""}`} value={form[name]} onChange={set(name)} />
      )}
      {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
    </div>
  );

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h4 fw-semibold mb-1">{isEdit ? "Edit student" : "Add student"}</h1>
          <p className="text-secondary small mb-0">Complete each step, then review and save.</p>
        </div>
        <Link to="/students" className="btn btn-outline-secondary btn-sm">
          <BsArrowLeft className="me-2" />
          Back to list
        </Link>
      </div>

      <div className="card sms-card">
        <div className="card-header bg-transparent">
          <ul className="nav nav-pills nav-fill flex-column flex-sm-row gap-1">
            {STEPS.map((s, i) => (
              <li className="nav-item" key={s}>
                <button
                  type="button"
                  className={`nav-link w-100 ${i === step ? "active" : ""}`}
                  onClick={() => setStep(i)}
                  aria-current={i === step ? "step" : undefined}
                >
                  {i + 1}. {s}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="card-body">
            {step === 0 && (
              <div className="row g-3">
                <div className="col-12 d-flex align-items-center gap-3">
                  <Avatar path={photoPreview ?? photoPath} name={`${form.first_name} ${form.last_name}`} size={72} />
                  <div>
                    <label className="btn btn-outline-secondary btn-sm mb-1" htmlFor="photo">
                      {uploading ? <span className="spinner-border spinner-border-sm me-2" /> : <BsUpload className="me-2" />}
                      Upload photo
                    </label>
                    <input id="photo" type="file" accept="image/*" className="d-none" onChange={handlePhoto} />
                    <div className="text-secondary" style={{ fontSize: ".75rem" }}>
                      JPG, PNG or WebP · max 2MB
                    </div>
                  </div>
                </div>
                {field("student_id", "Student ID")}
                {field("roll_number", "Roll number")}
                {field("first_name", "First name")}
                {field("last_name", "Last name")}
                {field("email", "Email", "email")}
                {field("phone", "Phone")}
                {field("gender", "Gender", "text", [
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other", label: "Other" },
                ])}
                {field("date_of_birth", "Date of birth", "date")}
                {field("blood_group", "Blood group", "text", BLOOD_GROUPS.map((b) => ({ value: b, label: b })))}
              </div>
            )}

            {step === 1 && (
              <div className="row g-3">
                {field("department_id", "Department", "text", departments.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` })))}
                {field("course", "Course / programme")}
                {field("year", "Year", "text", [1, 2, 3, 4, 5].map((y) => ({ value: String(y), label: `Year ${y}` })))}
                {field("semester", "Semester", "text", [1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({ value: String(s), label: `Semester ${s}` })))}
                {field("admission_date", "Admission date", "date")}
                {field("status", "Status", "text", STATUSES.map((s) => ({ value: s, label: s })))}
                {field("notes", "Notes", "textarea", undefined, "col-12")}
              </div>
            )}

            {step === 2 && (
              <div className="row g-3">
                {field("address_line1", "Address", "text", undefined, "col-12")}
                {field("city", "City")}
                {field("state", "State / region")}
                {field("country", "Country")}
                {field("zip_code", "ZIP / postal code")}
                {field("parent_name", "Parent name")}
                {field("parent_phone", "Parent phone")}
                {field("guardian_name", "Guardian name")}
                {field("guardian_phone", "Guardian phone")}
                {field("emergency_contact", "Emergency contact", "text", undefined, "col-12")}
              </div>
            )}

            {step === 3 && (
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <h6 className="fw-semibold">Personal</h6>
                  <dl className="row small mb-0">
                    <dt className="col-5 text-secondary">Name</dt>
                    <dd className="col-7">{form.first_name} {form.last_name}</dd>
                    <dt className="col-5 text-secondary">Student ID</dt>
                    <dd className="col-7">{form.student_id || "—"}</dd>
                    <dt className="col-5 text-secondary">Email</dt>
                    <dd className="col-7 text-break">{form.email || "—"}</dd>
                    <dt className="col-5 text-secondary">Phone</dt>
                    <dd className="col-7">{form.phone || "—"}</dd>
                  </dl>
                </div>
                <div className="col-12 col-md-6">
                  <h6 className="fw-semibold">Academic</h6>
                  <dl className="row small mb-0">
                    <dt className="col-5 text-secondary">Department</dt>
                    <dd className="col-7">{departmentName}</dd>
                    <dt className="col-5 text-secondary">Course</dt>
                    <dd className="col-7">{form.course || "—"}</dd>
                    <dt className="col-5 text-secondary">Year / semester</dt>
                    <dd className="col-7">{form.year || "—"} / {form.semester || "—"}</dd>
                    <dt className="col-5 text-secondary">Status</dt>
                    <dd className="col-7">{form.status}</dd>
                  </dl>
                </div>
              </div>
            )}
          </div>

          <div className="card-footer bg-transparent d-flex justify-content-between">
            <button type="button" className="btn btn-outline-secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Previous
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>
                Next
              </button>
            ) : (
              <button type="submit" className="btn btn-success" disabled={busy}>
                {busy ? <span className="spinner-border spinner-border-sm me-2" /> : <BsCheck2 className="me-2" />}
                {isEdit ? "Save changes" : "Create student"}
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
