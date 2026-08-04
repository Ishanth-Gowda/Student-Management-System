import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/types";

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required").max(100, "Name is too long"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(255),
    role: z.enum(["admin", "student"]),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

function strengthOf(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", role: "student" as AppRole, password: "", confirmPassword: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const strength = strengthOf(form.password);
  const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong"][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { needsConfirmation } = await signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        fullName: parsed.data.fullName,
        role: parsed.data.role,
      });
      if (needsConfirmation) {
        setSent(true);
      } else {
        toast.success("Account created");
        navigate("/", { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create account";
      toast.error(message.includes("already registered") ? "That email is already registered" : message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="sms-auth-wrap">
        <div className="card sms-card border-0 shadow-lg p-4 p-sm-5 text-center w-100" style={{ maxWidth: 460 }}>
          <h1 className="h5 fw-semibold">Check your email</h1>
          <p className="text-secondary small">
            We sent a confirmation link to <strong>{form.email}</strong>. Confirm your address, then sign in.
          </p>
          <Link className="btn btn-primary" to="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sms-auth-wrap">
      <div className="card sms-card border-0 shadow-lg p-4 p-sm-5 w-100" style={{ maxWidth: 480 }}>
        <div className="text-center mb-4">
          <h1 className="h4 fw-semibold mb-1">Create account</h1>
          <p className="text-secondary small mb-0">Join the Student Management System</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="fullName" className="form-label">
              Full name
            </label>
            <input
              id="fullName"
              className={`form-control ${errors.fullName ? "is-invalid" : ""}`}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
            {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className={`form-control ${errors.email ? "is-invalid" : ""}`}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
          </div>

          <div className="mb-3">
            <label htmlFor="role" className="form-label">
              Account type
            </label>
            <select
              id="role"
              className="form-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}
            >
              <option value="student">Student</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-group">
              <input
                id="password"
                type={show ? "text" : "password"}
                className={`form-control ${errors.password ? "is-invalid" : ""}`}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <BsEyeSlash /> : <BsEye />}
              </button>
              {errors.password && <div className="invalid-feedback">{errors.password}</div>}
            </div>
            {form.password && (
              <>
                <div className="progress mt-2" style={{ height: 5 }} role="presentation">
                  <div
                    className={`progress-bar bg-${strength <= 1 ? "danger" : strength === 2 ? "warning" : strength === 3 ? "info" : "success"}`}
                    style={{ width: `${(strength / 4) * 100}%` }}
                  />
                </div>
                <small className="text-secondary">Password strength: {strengthLabel}</small>
              </>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type={show ? "text" : "password"}
              className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
            {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
          </div>

          <button className="btn btn-primary w-100" type="submit" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}
            Create account
          </button>
        </form>

        <p className="text-center small text-secondary mt-4 mb-0">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
