import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="sms-auth-wrap text-center">
      <div>
        <h1 className="display-4 fw-bold">404</h1>
        <p className="text-secondary">We couldn&apos;t find that page.</p>
        <Link className="btn btn-primary btn-sm" to="/">
          Return home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
