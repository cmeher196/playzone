export default function Loading() {
  return (
    <div className="app-loading" role="status" aria-live="polite" aria-label="Loading CricArena">
      <div className="app-loading__mark" aria-hidden="true">
        <span className="app-loading__seam" />
        <span className="app-loading__seam app-loading__seam--cross" />
      </div>
      <p className="app-loading__title">CricArena</p>
      <p className="app-loading__message">Setting up your ground…</p>
      <div className="app-loading__track" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
