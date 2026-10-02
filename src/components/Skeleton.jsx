// Placeholder rows shown until the first Firestore snapshot arrives.
export default function SkeletonRows({ count = 5 }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton skeleton-avatar" />
          <div className="skeleton-text">
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
          <div className="skeleton skeleton-amount" />
        </div>
      ))}
    </div>
  );
}
