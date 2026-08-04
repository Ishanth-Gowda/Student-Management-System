import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";

const schema = z.string().trim().min(1, "Email is required").email("Enter a valid email address");

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await forgotPassword(parsed.data);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to send reset email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sms-auth-wrap">
      <div className="card sms-card border-0 shadow-lg p-4 p-sm-5 w-100" style={{ maxWidth: 460 }}>
        <h1 className="h4 fw-semibold mb-1">Reset password</h1>
        <p className="text-secondary small">We&apos;ll email you a secure link to set a new password.</p>

        {sent ? (
          <div className="alert alert-success" role="status">
            If an account exists for <strong>{email}</strong>, a reset link is on its way.
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className={`form-control ${error ? "is-invalid" : ""}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <div className="invalid-feedback">{error}</div>}
            </div>
            <button className="btn btn-primary w-100" type="submit" disabled={busy}>
              {busy && <span className="spinner-border spinner-border-sm me-2" />}
              Send reset link
            </button>
          </form>
        )}

        <p className="text-center small text-secondary mt-4 mb-0">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
