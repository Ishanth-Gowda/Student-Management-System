import { Link } from "react-router-dom";
import { BsShieldLock } from "react-icons/bs";
import { useAuth } from "@/contexts/AuthContext";

export default function Forbidden() {
  const { role } = useAuth();
  return (
    <div className="sms-auth-wrap text-center">
      <div>
        <BsShieldLock size={48} className="text-danger mb-3" aria-hidden="true" />
        <h1 className="h4 fw-semibold">Access denied</h1>
        <p className="text-secondary small">You don&apos;t have permission to view this page.</p>
        <Link className="btn btn-primary btn-sm" to={role === "admin" ? "/admin" : "/student"}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
