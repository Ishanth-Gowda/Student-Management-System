import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BsArrowUpRight, BsAward, BsBuilding, BsJournalBookmark, BsPeople, BsPersonCheck, BsPersonPlus } from "react-icons/bs";
import { getDashboardStats, listActivity, type DashboardStats } from "@/services/sms";
import { listExams } from "@/services/marks";
import { CardSkeleton, EmptyState } from "@/components/common/Feedback";
import type { ActivityLog, Exam } from "@/types";

const PIE_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"];

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card sms-card h-100">
        <div className="card-body d-flex align-items-center gap-3">
          <div className={`sms-stat-icon bg-${tone}-subtle text-${tone}-emphasis`}>{icon}</div>
          <div>
            <div className="text-secondary small text-uppercase fw-semibold">{label}</div>
            <div className="fs-3 fw-bold lh-1">{value}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([getDashboardStats(), listActivity(8), listExams().catch(() => [] as Exam[])])
      .then(([s, a, e]) => {
        if (!alive) return;
        setStats(s);
        setActivity(a);
        setExams(e);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Failed to load dashboard"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="row g-3">
        {[0, 1, 2, 3].map((i) => (
          <div className="col-12 col-sm-6 col-xl-3" key={i}>
            <CardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return <div className="alert alert-danger">{error || "Dashboard unavailable"}</div>;
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h4 fw-semibold mb-1">Admin dashboard</h1>
          <p className="text-secondary small mb-0">Overview of student records and recent activity</p>
        </div>
        <Link to="/students/new" className="btn btn-primary btn-sm">
          <BsPersonPlus className="me-2" />
          Add student
        </Link>
      </div>

      <div className="row g-3 mb-4">
        <StatCard label="Total students" value={stats.total} icon={<BsPeople />} tone="primary" />
        <StatCard label="Active" value={stats.active} icon={<BsPersonCheck />} tone="success" />
        <StatCard label="Departments" value={stats.departments} icon={<BsBuilding />} tone="warning" />
        <StatCard label="Courses" value={stats.courses} icon={<BsJournalBookmark />} tone="info" />
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-8">
          <div className="card sms-card h-100">
            <div className="card-header bg-transparent fw-semibold">Enrollments (last 6 months)</div>
            <div className="card-body" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,.2)" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card sms-card h-100">
            <div className="card-header bg-transparent fw-semibold">Gender distribution</div>
            <div className="card-body" style={{ height: 300 }}>
              {stats.byGender.length === 0 ? (
                <EmptyState title="No data yet" message="Add students to see this chart." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.byGender} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                      {stats.byGender.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="card sms-card h-100">
            <div className="card-header bg-transparent fw-semibold">Students per department</div>
            <div className="card-body" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,.2)" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card sms-card h-100">
            <div className="card-header bg-transparent fw-semibold d-flex justify-content-between align-items-center">
              Recent activity
              <Link to="/students" className="small text-decoration-none">
                All students <BsArrowUpRight />
              </Link>
            </div>
            <ul className="list-group list-group-flush">
              {activity.length === 0 && <li className="list-group-item text-secondary small">No activity recorded yet.</li>}
              {activity.map((a) => (
                <li className="list-group-item" key={a.id}>
                  <div className="small fw-medium">{a.description}</div>
                  <div className="text-secondary" style={{ fontSize: ".75rem" }}>
                    {a.actor_name ?? "System"} · {new Date(a.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
