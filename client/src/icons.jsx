const P = {
  store: <><path d="M4 9.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5"/><path d="M3 9.5 4.6 4.7A1 1 0 0 1 5.5 4h13a1 1 0 0 1 .9.7L21 9.5a2.4 2.4 0 0 1-4.5 1.3 2.4 2.4 0 0 1-4.5 0 2.4 2.4 0 0 1-4.5 0A2.4 2.4 0 0 1 3 9.5Z"/></>,
  box: <><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5"/><path d="M12 12v9"/></>,
  receipt: <><path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21 6 19.5V3Z"/><path d="M9 8h6"/><path d="M9 12h5"/></>,
  headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4.2" height="6" rx="2"/><rect x="16.8" y="14" width="4.2" height="6" rx="2"/><path d="M20 19.5v.5a3 3 0 0 1-3 3h-3"/></>,
  shield: <><path d="M12 3 19 6v5c0 4.4-3 7.9-7 9.8-4-1.9-7-5.4-7-9.8V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>,
  clip: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2V4"/><path d="m9 13 2 2 4-4"/></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h6v16H6a2 2 0 0 0-2 2V5Z"/><path d="M20 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 1 2 2V5Z"/></>,
  grad: <><path d="M12 4 2 9l10 5 10-5-10-5Z"/><path d="M6 11v4.5c0 1.5 2.7 2.8 6 2.8s6-1.3 6-2.8V11"/><path d="M22 9v5.5"/></>,
  check: <path d="m5 12.5 4 4 10-10"/>,
  checkc: <><circle cx="12" cy="12" r="9"/><path d="m8.3 12 2.6 2.6 5-5"/></>,
  trend: <><path d="M3 17 9 11l4 4 8-8"/><path d="M15 7h6v6"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/><path d="M18.5 14a6 6 0 0 1 3 5"/></>,
  trophy: <><path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z"/><path d="M8 5.5H5.2A1.8 1.8 0 0 0 5 9h1.4"/><path d="M16 5.5h2.8A1.8 1.8 0 0 1 19 9h-1.4"/><path d="M12 12.5V16"/><path d="m9.5 16h5l.8 4H8.7l.8-4Z"/></>,
  medal: <><circle cx="12" cy="9" r="5"/><path d="m9 13-2 8 5-3 5 3-2-8"/><path d="m10.3 9 1.1 1.1 2.3-2.3"/></>,
  monitor: <><rect x="3" y="4" width="18" height="12" rx="1.6"/><path d="M9 20h6M12 16v4"/></>,
  play: <><rect x="3" y="4" width="18" height="12" rx="1.6"/><path d="m10 8 5 2-5 2V8Z"/><path d="M9 20h6M12 16v4"/></>,
  eye: <><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></>,
  arrowl: <path d="M15 5l-7 7 7 7"/>,
  arrowr: <path d="M9 5l7 7-7 7"/>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 12H3M6 8l-4 4 4 4"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
  alert: <><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4M12 17.5v.5"/></>,
  spark: <><path d="M12 3v3M12 18v3M4.2 7l2.1 2.1M17.7 14.9l2.1 2.1M3 12h3M18 12h3M4.2 17l2.1-2.1M17.7 9.1l2.1-2.1"/></>,
  close: <path d="M6 6l12 12M18 6L6 18"/>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.2"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  edit: <><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 6.5l3 3"/></>,
  trash: <><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M10 11v6M14 11v6"/></>,
  up: <path d="M6 15l6-6 6 6"/>,
  down: <path d="M6 9l6 6 6-6"/>,
  gear: <><circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7.6 7.6 0 0 0-1.7 1l-2.3-1-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7.6 7.6 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5Z"/></>,
};

export function Icon({ name, size = 24, className }) {
  const paths = P[name] || P.book;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}
      fill="none" stroke="currentColor" strokeWidth="1.85"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths}
    </svg>
  );
}

export const CATEGORY_ICON = { store:'store', box:'box', receipt:'receipt', headset:'headset', shield:'shield', clip:'clip' };
