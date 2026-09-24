export function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="app-loading app-loading--inline" role="status" aria-live="polite">
      <div className="app-loading__mark" aria-hidden="true">
        <span className="app-loading__seam" />
        <span className="app-loading__seam app-loading__seam--cross" />
      </div>
      <p className="app-loading__title">CricArena</p>
      <p className="app-loading__message">{message}</p>
      <div className="app-loading__track" aria-hidden="true"><span /></div>
    </div>
  );
}
