import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user, role } = useAuth();

  return (
    <>
      <h1 className="h4 fw-semibold mb-3">Settings</h1>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card sms-card h-100">
            <div className="card-header bg-transparent fw-semibold">Appearance</div>
            <div className="card-body">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="darkMode"
                  checked={theme === "dark"}
                  onChange={toggleTheme}
                />
                <label className="form-check-label" htmlFor="darkMode">
                  Dark mode
                </label>
              </div>
              <p className="text-secondary small mt-2 mb-0">Your preference is remembered on this device.</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card sms-card h-100">
            <div className="card-header bg-transparent fw-semibold">Account</div>
            <div className="card-body">
              <dl className="row mb-0 small">
                <dt className="col-4 text-secondary">Email</dt>
                <dd className="col-8 text-break">{user?.email}</dd>
                <dt className="col-4 text-secondary">Role</dt>
                <dd className="col-8 text-capitalize">{role}</dd>
                <dt className="col-4 text-secondary">User since</dt>
                <dd className="col-8">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
