const paths = {
  measure: (
    <>
      <path d="M4 19 19 4" />
      <path d="m14 4 5 5M4 14l5 5" />
      <path d="m7 13 2 2m1-5 2 2m1-5 2 2" />
    </>
  ),
  angle: (
    <>
      <path d="M4 19 10 5l10 14H4Z" />
      <path d="M9 16a4 4 0 0 1 4-3" />
    </>
  ),
  point: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
    </>
  ),
  cabinet: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M12 3v18M9 12h.01m6 0h.01" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4m0 0L7 9m5-5 5 5" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </>
  ),
  photo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 15-5-5L5 19" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6" />
      <path d="M10 11v5m4-5v5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </>
  ),
  grid: (
    <>
      <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6M10 7v6M7 10h6" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6M7 10h6" />
    </>
  ),
  fit: (
    <>
      <path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" />
    </>
  ),
  pan: (
    <>
      <path d="M7 11V7a2 2 0 0 1 4 0v3-5a2 2 0 0 1 4 0v5-3a2 2 0 0 1 4 0v7c0 5-3 8-8 8h-1c-3 0-5-2-6-4l-2-4a2 2 0 0 1 3-2l2 2v-3Z" />
    </>
  ),
  align: (
    <>
      <path d="M4 5h6M4 9h10M4 13h16M4 17h10M4 21h6" />
      <circle cx="18" cy="6" r="3" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  warning: (
    <>
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 9v5m0 3h.01" />
    </>
  ),
  dots: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m4 17 5-5 4 4 3-3 5 5" />
    </>
  ),
  cube: (
    <>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 7 9 5 9-5v10l-9 5-9-5V7Z" />
      <path d="M12 12v10" />
    </>
  ),
  plan: (
    <>
      <path d="M4 3h12l4 4v14H4V3Z" />
      <path d="M16 3v5h5M8 13h8M8 17h5" />
    </>
  ),
  side: (
    <>
      <path d="M4 19V5h16v14H4Z" />
      <path d="M8 19V9h8v10" />
    </>
  ),
  floor: (
    <>
      <path d="M3 4h18v16H3V4Z" />
      <path d="M9 4v8H3m12 8v-7h6" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.15 1.15" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.15-1.15" />
    </>
  )
};

export default function AufmasIcon({
  name,
  className = "size-5",
  strokeWidth = 1.7
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] ?? paths.dots}
    </svg>
  );
}
