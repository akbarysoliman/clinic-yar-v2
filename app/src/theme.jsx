import React from "react";

/*
 * ClinicYar theme core.
 * All consumers receive CSS-variable references rather than a snapshot of the
 * current palette. This is important for module-level constants in screens:
 * their colors now change immediately when html[data-theme] changes.
 */
const TOKEN_NAMES = {
  bg: "bg",
  surface: "surface",
  surfaceAlt: "surface-alt",
  ink: "ink",
  inkSoft: "ink-soft",
  inkFaint: "ink-faint",
  navy: "navy",
  border: "border",
  borderStrong: "border-strong",
  teal: "teal",
  tealDark: "teal-dark",
  tealSoft: "teal-soft",
  saffron: "saffron",
  saffronDark: "saffron-dark",
  saffronSoft: "saffron-soft",
  clay: "clay",
  claySoft: "clay-soft",
  blue: "blue",
  blueSoft: "blue-soft",
  purple: "purple",
  purpleSoft: "purple-soft",
};

const FALLBACKS = {
  bg: "#F6F8FA",
  surface: "#FFFFFF",
  surfaceAlt: "#F9FBFC",
  ink: "#16262F",
  inkSoft: "#5B6E76",
  inkFaint: "#778990",
  navy: "#132A3A",
  border: "#E4E9ED",
  borderStrong: "#CBD5DC",
  teal: "#0E7C74",
  tealDark: "#0A5C56",
  tealSoft: "#E3F2F0",
  saffron: "#D99A2B",
  saffronDark: "#9C6B14",
  saffronSoft: "#FBF0DC",
  clay: "#B44F3C",
  claySoft: "#F7E5E1",
  blue: "#2563EB",
  blueSoft: "#EAF1FF",
  purple: "#7C3AED",
  purpleSoft: "#F1EAFF",
};

export const isDarkTheme = () =>
  typeof document !== "undefined" && document.documentElement?.dataset?.theme === "dark";

export const C = new Proxy({}, {
  get(_target, prop) {
    if (typeof prop !== "string" || !(prop in TOKEN_NAMES)) return undefined;
    return `var(--clinic-${TOKEN_NAMES[prop]}, ${FALLBACKS[prop]})`;
  },
});

export const radiate = (first, second) =>
  `repeating-conic-gradient(from 0deg, ${first} 0deg 4deg, ${second} 4deg 30deg)`;

export function Brand({ size = 30 }) {
  return (
    <img
      src="/favicon.ico"
      alt="ClinicYar Logo"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        flexShrink: 0,
      }}
    />
  );
}
export function Card({ children, style, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        background: C.surface,
        color: C.ink,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "18px 20px",
        boxShadow: "var(--clinic-card-shadow, 0 1px 3px rgba(19,42,58,0.08), 0 4px 14px rgba(19,42,58,0.05))",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
export function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap');

  :root {
  color-scheme: light;
  --clinic-bg: #EDF1F3;
  --clinic-surface: #FFFFFF;
  --clinic-surface-alt: #F5F8F9;
  --clinic-ink: #16262F;
  --clinic-ink-soft: #4A5F68;
  --clinic-ink-faint: #8CA0A8;
  --clinic-navy: #132A3A;
  --clinic-border: #CFD9DE;
  --clinic-border-strong: #B0BFC6;
  --clinic-teal: #0E7C74;
  --clinic-teal-dark: #0A5C56;
  --clinic-teal-soft: #E3F2F0;
  --clinic-saffron: #D99A2B;
  --clinic-saffron-dark: #9C6B14;
  --clinic-saffron-soft: #FBF0DC;
  --clinic-clay: #B44F3C;
  --clinic-clay-soft: #F7E5E1;
  --clinic-blue: #2563EB;
  --clinic-blue-soft: #EAF1FF;
  --clinic-purple: #7C3AED;
  --clinic-purple-soft: #F1EAFF;
  --clinic-card-shadow: 0 1px 3px rgba(19,42,58,0.08), 0 4px 14px rgba(19,42,58,0.05);
  --clinic-focus-ring: rgba(14,124,116,0.18);
}

      :root[data-theme="dark"] {
        color-scheme: dark;
        --clinic-bg: #0E171B;
        --clinic-surface: #172327;
        --clinic-surface-alt: #1D2C31;
        --clinic-ink: #EEF6F7;
        --clinic-ink-soft: #B6C8CD;
        --clinic-ink-faint: #8EA5AC;
        --clinic-navy: #F1F7F8;
        --clinic-border: #2C4147;
        --clinic-border-strong: #3D555C;
        --clinic-teal: #49D3C3;
        --clinic-teal-dark: #83E9DD;
        --clinic-teal-soft: #193B3B;
        --clinic-saffron: #F1BD68;
        --clinic-saffron-dark: #FFD18A;
        --clinic-saffron-soft: #3B3020;
        --clinic-clay: #FF9386;
        --clinic-clay-soft: #442A2A;
        --clinic-blue: #7EB0FF;
        --clinic-blue-soft: #1D304C;
        --clinic-purple: #C6A2FF;
        --clinic-purple-soft: #332747;
        --clinic-card-shadow: 0 4px 18px rgba(0,0,0,0.18);
        --clinic-focus-ring: rgba(73,211,195,0.20);
      }
@keyframes slideDown {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

      * { box-sizing: border-box; }
      html, body, #root { margin: 0; min-height: 100%; }
      html { background: var(--clinic-bg); }
      body {
        background: var(--clinic-bg);
        color: var(--clinic-ink);
        font-family: 'Vazirmatn', Tahoma, sans-serif;
        min-height: 100vh;
      }
      #root { min-height: 100vh; }
      button, input, select, textarea { font-family: inherit; }
      button { color: inherit; }
      button:active { transform: translateY(1px); }
      input, select, textarea {
        background: var(--clinic-surface) !important;
        color: var(--clinic-ink) !important;
        -webkit-text-fill-color: var(--clinic-ink) !important;
        border-color: var(--clinic-border);
        caret-color: var(--clinic-teal);
        outline-color: var(--clinic-teal);
      }
      input:focus, select:focus, textarea:focus {
        border-color: var(--clinic-teal) !important;
        box-shadow: 0 0 0 3px var(--clinic-focus-ring);
      }
      input::placeholder, textarea::placeholder, select:invalid {
        color: var(--clinic-ink-faint) !important;
        -webkit-text-fill-color: var(--clinic-ink-faint) !important;
        opacity: 1;
      }
      input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
        -webkit-text-fill-color: var(--clinic-ink) !important;
        caret-color: var(--clinic-teal);
        transition: background-color 9999s ease-in-out 0s;
      }
      ::selection { background: var(--clinic-teal-soft); color: var(--clinic-ink); }
/* placeholder راست‌چین + value چپ‌چین برای فیلدهای عددی */
.ltr-input-rtl-placeholder::placeholder {
  text-align: right;
  direction: rtl;
}
.ltr-input-rtl-placeholder {
  text-align: left;
  direction: ltr;
}
      /* Keep theme colors instantaneous; only movement/shadow may animate. */
      button { transition: transform .12s ease, box-shadow .12s ease; }

      .doctor-kpi-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .doctor-dashboard-grid { grid-template-columns: minmax(0, 1.7fr) 270px; }
      .quick-access-list { display: flex; flex-direction: column; gap: 8px; }
      .quick-access-item { width: 100%; display: flex; align-items: center; gap: 11px; text-align: right; }
      .secretary-patients-grid { grid-template-columns: minmax(300px,.9fr) minmax(0,1.5fr); }

      @media (max-width: 1100px) {
        .doctor-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .doctor-dashboard-grid { grid-template-columns: 1fr; }
        .secretary-patients-grid { grid-template-columns: 1fr; }
      }
      @media (max-width: 900px) {
  .clinic-menu-toggle { display: inline-flex !important; }
  .clinic-sidebar {
    position: fixed !important;
    top: 68px !important;
    right: 0 !important;
    width: 82px !important;
    padding: 16px 10px !important;
    z-index: 50 !important;
    transition: width .2s ease !important;
    box-shadow: 0 4px 20px rgba(0,0,0,.15);
  }
  .clinic-sidebar.open {
    width: 238px !important;
  }
  .clinic-sidebar .clinic-user-text, .clinic-sidebar .clinic-nav-label { display: none !important; }
  .clinic-sidebar.open .clinic-user-text, .clinic-sidebar.open .clinic-nav-label { display: block !important; }
  .clinic-sidebar .clinic-nav-button { justify-content: center !important; padding: 11px !important; }
  .clinic-sidebar.open .clinic-nav-button { justify-content: flex-start !important; padding: 11px 12px !important; }
  .clinic-sidebar .clinic-nav-button svg { margin: 0 !important; }
  .clinic-sidebar.open .clinic-nav-button svg { margin: 0 !important; }
  .clinic-main { padding: 16px !important; margin-right: 82px !important; }
  .clinic-sidebar.open ~ .clinic-main { margin-right: 238px !important; }
}
      @media (max-width: 640px) {
        .clinic-topbar { padding: 11px 14px !important; }
        .clinic-topbar-date { display: none !important; }
        .clinic-sidebar { width: 68px !important; }
        .clinic-main { padding: 12px !important; }
        .doctor-kpi-grid { grid-template-columns: 1fr 1fr; }
      }
    `}</style>
  );
}
