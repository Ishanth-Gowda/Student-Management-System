import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

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
      await updatePassword(parsed.data.password);
      toast.success("Password updated");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sms-auth-wrap">
      <div className="card sms-card border-0 shadow-lg p-4 p-sm-5 w-100" style={{ maxWidth: 460 }}>
        <h1 className="h4 fw-semibold mb-1">Set a new password</h1>
        <p className="text-secondary small">Choose a strong password you haven&apos;t used before.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              New password
            </label>
            <input
              id="password"
              type="password"
              className={`form-control ${errors.password ? "is-invalid" : ""}`}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          </div>
          <div className="mb-4">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
            {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
          </div>
          <button className="btn btn-primary w-100" type="submit" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
