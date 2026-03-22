export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="skeleton h-3 w-24 mb-3" />
      <div className="skeleton h-7 w-16 mb-2" />
      <div className="skeleton h-2.5 w-32" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="skeleton h-4 w-32" />
      </div>
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><div className="skeleton h-3 w-16" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j}><div className="skeleton h-3 w-12" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="skeleton h-4 w-40 mb-4" />
      <div className="skeleton h-48 w-full rounded-lg" />
    </div>
  );
}
