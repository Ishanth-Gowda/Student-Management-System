import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "@/components/common/Feedback";
import type { AppRole } from "@/types";

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: AppRole[] }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader label="Checking your session..." />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  // `loading` already guarantees the role has been resolved, so a mismatch here is real.
  if (roles && !roles.includes(role as AppRole)) return <Navigate to="/403" replace />;

  return <>{children}</>;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  if (loading) return <Loader />;
  if (user) return <Navigate to={role === "admin" ? "/admin" : "/student"} replace />;
  return <>{children}</>;
}
