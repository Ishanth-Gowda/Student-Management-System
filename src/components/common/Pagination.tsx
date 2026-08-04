interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <nav aria-label="Student list pagination">
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onPageChange(page - 1)} aria-label="Previous page">
            Previous
          </button>
        </li>
        {pages.map((p, i) => (
          <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
            {i > 0 && p - pages[i - 1] > 1 ? (
              <span className="page-link disabled">…</span>
            ) : (
              <button className="page-link" onClick={() => onPageChange(p)} aria-current={p === page ? "page" : undefined}>
                {p}
              </button>
            )}
          </li>
        ))}
        <li className={`page-item ${page === pageCount ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onPageChange(page + 1)} aria-label="Next page">
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
