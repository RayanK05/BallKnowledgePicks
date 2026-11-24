// "Download CSV" / "Download PDF" (btn-ghost btn-sm from the design).
// Plain links: the browser downloads what the backend streams back
// (Content-Disposition: attachment), so the page never reloads.

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
  </svg>
);

export default function ExportButtons({ basePath, params = {}, label = '' }) {
  const href = (format) => `${basePath}?${new URLSearchParams({ ...params, format })}`;
  return (
    <div className="export-buttons">
      <a className="btn btn-ghost btn-sm" href={href('csv')} download aria-label={`Download ${label} as CSV`}>
        <DownloadIcon />Download CSV
      </a>
      <a className="btn btn-ghost btn-sm" href={href('pdf')} download aria-label={`Download ${label} as PDF`}>
        <DownloadIcon />Download PDF
      </a>
    </div>
  );
}
