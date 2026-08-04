import { useEffect, useState } from "react";
import { BsUpload } from "react-icons/bs";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar } from "@/components/common/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadAvatar } from "@/services/sms";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number")
    .or(z.literal("")),
});

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export default function Profile() {
  const { user, profile, role, refreshProfile, updatePassword } = useAuth();
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pw, setPw] = useState({ password: "", confirmPassword: "" });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    setForm({ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" });
  }, [profile]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null })
        .eq("id", user!.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadAvatar(file, user.id);
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (error) throw error;
      setPreview(URL.createObjectURL(file));
      await refreshProfile();
      toast.success("Photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(pw);
    if (!parsed.success) {
      setPwErrors(Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setPwErrors({});
    setPwBusy(true);
    try {
      await updatePassword(parsed.data.password);
      setPw({ password: "", confirmPassword: "" });
      toast.success("Password changed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <>
      <h1 className="h4 fw-semibold mb-3">My profile</h1>

      <div className="row g-3">
        <div className="col-12 col-lg-5">
          <div className="card sms-card h-100">
            <div className="card-body text-center">
              <Avatar path={preview ?? profile?.avatar_url} name={profile?.full_name || user?.email} size={96} />
              <h2 className="h6 fw-semibold mt-3 mb-1">{profile?.full_name || user?.email}</h2>
              <div className="badge bg-secondary-subtle text-secondary-emphasis mb-3">{role}</div>
              <div>
                <label className="btn btn-outline-secondary btn-sm" htmlFor="avatar">
                  {uploading ? <span className="spinner-border spinner-border-sm me-2" /> : <BsUpload className="me-2" />}
                  Change photo
                </label>
                <input id="avatar" type="file" accept="image/*" className="d-none" onChange={handlePhoto} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <div className="card sms-card mb-3">
            <div className="card-header bg-transparent fw-semibold">Personal details</div>
            <form onSubmit={saveProfile} noValidate>
              <div className="card-body row g-3">
                <div className="col-12">
                  <label className="form-label small" htmlFor="full_name">
                    Full name
                  </label>
                  <input
                    id="full_name"
                    className={`form-control ${errors.full_name ? "is-invalid" : ""}`}
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                  {errors.full_name && <div className="invalid-feedback">{errors.full_name}</div>}
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    className={`form-control ${errors.phone ? "is-invalid" : ""}`}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small" htmlFor="email">
                    Email
                  </label>
                  <input id="email" className="form-control" value={user?.email ?? ""} disabled readOnly />
                </div>
              </div>
              <div className="card-footer bg-transparent text-end">
                <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
                  {busy && <span className="spinner-border spinner-border-sm me-2" />}
                  Save changes
                </button>
              </div>
            </form>
          </div>

          <div className="card sms-card">
            <div className="card-header bg-transparent fw-semibold">Change password</div>
            <form onSubmit={changePassword} noValidate>
              <div className="card-body row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small" htmlFor="newPassword">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    className={`form-control ${pwErrors.password ? "is-invalid" : ""}`}
                    value={pw.password}
                    onChange={(e) => setPw({ ...pw, password: e.target.value })}
                  />
                  {pwErrors.password && <div className="invalid-feedback">{pwErrors.password}</div>}
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small" htmlFor="confirmNewPassword">
                    Confirm password
                  </label>
                  <input
                    id="confirmNewPassword"
                    type="password"
                    className={`form-control ${pwErrors.confirmPassword ? "is-invalid" : ""}`}
                    value={pw.confirmPassword}
                    onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })}
                  />
                  {pwErrors.confirmPassword && <div className="invalid-feedback">{pwErrors.confirmPassword}</div>}
                </div>
              </div>
              <div className="card-footer bg-transparent text-end">
                <button className="btn btn-outline-primary btn-sm" type="submit" disabled={pwBusy}>
                  {pwBusy && <span className="spinner-border spinner-border-sm me-2" />}
                  Update password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
