import { BsInbox } from "react-icons/bs";

export function Loader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 text-secondary" role="status">
      <div className="spinner-border text-primary mb-2" />
      <span className="small">{label}</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <div className="sms-skeleton" style={{ height: 14 }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function CardSkeleton({ height = 96 }: { height?: number }) {
  return <div className="sms-skeleton" style={{ height }} />;
}

export function EmptyState({
  title = "Nothing here yet",
  message,
  action,
}: {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-5">
      <BsInbox className="text-secondary mb-3" size={40} aria-hidden="true" />
      <h6 className="fw-semibold">{title}</h6>
      {message && <p className="text-secondary small mb-3">{message}</p>}
      {action}
    </div>
  );
}
