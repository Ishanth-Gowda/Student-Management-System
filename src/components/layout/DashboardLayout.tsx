import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BsAward,
  BsBell,
  BsBook,
  BsBoxArrowRight,
  BsBuilding,
  BsJournalBookmark,
  BsPersonBadge,
  BsCalendarCheck,
  BsCalendar3,
  BsMegaphone,
  BsGear,
  BsGrid1X2,
  BsList,
  BsMoonStars,
  BsPeople,
  BsPersonCircle,
  BsSearch,
  BsSun,
} from "react-icons/bs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar } from "@/components/common/Avatar";
import { listActivity } from "@/services/sms";
import type { ActivityLog } from "@/types";

const LABELS: Record<string, string> = {
  admin: "Dashboard",
  student: "Dashboard",
  students: "Students",
  departments: "Departments",
  attendance: "Attendance",
  faculty: "Faculty",
  courses: "Courses",
  subjects: "Subjects",
  exams: "Exams",
  marks: "Marks entry",
  results: "My results",
  profile: "Profile",
  settings: "Settings",
  new: "Add Student",
  edit: "Edit Student",
};

export function DashboardLayout() {
  const { profile, role, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState<ActivityLog[]>([]);

  const isAdmin = role === "admin";

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    listActivity(5).then(setNotifications).catch(() => setNotifications([]));
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    navigate(`/students?q=${encodeURIComponent(search)}`);
  };

  const crumbs = location.pathname.split("/").filter(Boolean);

  const links = isAdmin
    ? [
        { to: "/admin", label: "Dashboard", icon: BsGrid1X2 },
        { to: "/students", label: "Students", icon: BsPeople },
        { to: "/attendance", label: "Attendance", icon: BsCalendarCheck },
        { to: "/exams", label: "Exams & marks", icon: BsAward },
        { to: "/departments", label: "Departments", icon: BsBuilding },
        { to: "/faculty", label: "Faculty", icon: BsPersonBadge },
        { to: "/courses", label: "Courses", icon: BsJournalBookmark },
        { to: "/subjects", label: "Subjects", icon: BsBook },
        { to: "/profile", label: "Profile", icon: BsPersonCircle },
        { to: "/settings", label: "Settings", icon: BsGear },
      ]
    : [
        { to: "/student", label: "Dashboard", icon: BsGrid1X2 },
        { to: "/student/results", label: "My results", icon: BsAward },
        { to: "/profile", label: "Profile", icon: BsPersonCircle },
        { to: "/settings", label: "Settings", icon: BsGear },
      ];

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <aside
        className={`sms-sidebar p-3 flex-shrink-0 ${open ? "sms-sidebar-open" : "d-none"} d-lg-block`}
      >
        <div className="d-flex align-items-center gap-2 mb-4 px-1">
          <span className="badge bg-primary rounded-3 p-2 fs-6">SMS</span>
          <span className="text-white fw-semibold">Student Manager</span>
        </div>
        <nav className="nav flex-column" aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end className="nav-link d-flex align-items-center gap-2">
              <Icon aria-hidden="true" /> {label}
            </NavLink>
          ))}
          <button className="nav-link d-flex align-items-center gap-2 border-0 bg-transparent text-start" onClick={handleLogout}>
            <BsBoxArrowRight aria-hidden="true" /> Logout
          </button>
        </nav>
      </aside>

      {open && <div className="modal-backdrop fade show d-lg-none" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="sms-content d-flex flex-column min-vh-100">
        <header className="sms-topbar navbar navbar-expand bg-body border-bottom px-3 py-2 sticky-top">
          <button
            className="btn btn-outline-secondary btn-sm d-lg-none me-2"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle navigation"
          >
            <BsList />
          </button>

          {isAdmin && (
            <form className="flex-grow-1 me-3" role="search" onSubmit={submitSearch} style={{ maxWidth: 420 }}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-body">
                  <BsSearch aria-hidden="true" />
                </span>
                <input
                  className="form-control"
                  placeholder="Search students by name, email, phone, ID"
                  aria-label="Search students"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </form>
          )}

          <div className="ms-auto d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <BsSun /> : <BsMoonStars />}
            </button>

            <div className="dropdown">
              <button
                className="btn btn-outline-secondary btn-sm position-relative"
                data-bs-toggle="dropdown"
                aria-label="Notifications"
              >
                <BsBell />
                {notifications.length > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {notifications.length}
                  </span>
                )}
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow" style={{ minWidth: 280 }}>
                <li className="dropdown-header">Recent activity</li>
                {notifications.length === 0 && <li className="dropdown-item-text small text-secondary">No activity yet</li>}
                {notifications.map((n) => (
                  <li key={n.id} className="dropdown-item-text small">
                    <div className="fw-medium">{n.description}</div>
                    <div className="text-secondary">{new Date(n.created_at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="dropdown">
              <button className="btn btn-link p-0 border-0" data-bs-toggle="dropdown" aria-label="Account menu">
                <Avatar path={profile?.avatar_url} name={profile?.full_name || user?.email} size={34} />
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow">
                <li className="dropdown-header text-truncate" style={{ maxWidth: 220 }}>
                  {profile?.full_name || user?.email}
                  <div className="badge bg-secondary-subtle text-secondary-emphasis mt-1">{role}</div>
                </li>
                <li>
                  <Link className="dropdown-item" to="/profile">
                    My profile
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/settings">
                    Settings
                  </Link>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button className="dropdown-item text-danger" onClick={handleLogout}>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </header>

        <main className="p-3 p-lg-4 flex-grow-1">
          {crumbs.length > 0 && (
            <nav aria-label="breadcrumb" className="sms-no-print">
              <ol className="breadcrumb small">
                <li className="breadcrumb-item">
                  <Link to={isAdmin ? "/admin" : "/student"}>Home</Link>
                </li>
                {crumbs.map((c, i) => (
                  <li key={`${c}-${i}`} className="breadcrumb-item active" aria-current="page">
                    {LABELS[c] ?? c.slice(0, 8)}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
