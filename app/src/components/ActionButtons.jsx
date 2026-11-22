import { C } from "../theme.jsx";

/**
 * دکمه‌ی آیکونی استاندارد برای عملیات جدول‌ها
 *
 * @param {Component} icon - آیکون از lucide-react
 * @param {string} variant - نوع: view | edit | delete | activate | deactivate | assign | schedule | custom
 * @param {function} onClick - کلیک
 * @param {string} title - tooltip
 * @param {boolean} disabled - غیرفعال
 */
export function ActionButton({ icon: Icon, variant = "custom", onClick, title, disabled = false }) {
  const variants = {
    view:       { color: C.teal,        bg: C.tealSoft },
    edit:       { color: C.blue,        bg: C.blueSoft },
    delete:     { color: C.clay,        bg: C.claySoft },
    activate:   { color: C.teal,        bg: C.tealSoft },
    deactivate: { color: C.clay,        bg: C.claySoft },
    assign:     { color: C.saffronDark, bg: C.saffronSoft },
    schedule:   { color: C.saffronDark, bg: C.saffronSoft },
    custom:     { color: C.inkSoft,     bg: C.surfaceAlt },
  };

  const v = variants[variant] || variants.custom;

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        border: `1px solid ${v.color}22`,
        background: v.bg,
        color: v.color,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        fontFamily: "inherit",
        transition: "transform .12s ease, background .12s ease",
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
      }}
    >
      <Icon size={15} />
    </button>
  );
}

/**
 * دکمه‌ی اصلی (Primary) برای افزودن، ثبت، ذخیره
 */
export function PrimaryButton({ icon: Icon, children, onClick, variant = "teal", disabled = false, type = "button" }) {
  const variants = {
    teal:    { bg: C.teal,    hover: C.tealDark, color: "#fff" },
    saffron: { bg: C.saffron, hover: C.saffronDark, color: "#fff" },
    clay:    { bg: C.clay,    hover: "#8B3A28", color: "#fff" },
    ghost:   { bg: "transparent", hover: C.surfaceAlt, color: C.inkSoft },
  };

  const v = variants[variant] || variants.teal;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        border: variant === "ghost" ? `1px solid ${C.border}` : "none",
        background: disabled ? C.borderStrong : v.bg,
        color: disabled ? C.inkSoft : v.color,
        borderRadius: 10,
        padding: "9px 15px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        fontSize: 12.5,
        fontWeight: 800,
        transition: "transform .12s ease, background .12s ease",
      }}
      onMouseEnter={(e) => {
        if (!disabled && variant !== "ghost") {
          e.currentTarget.style.background = v.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && variant !== "ghost") {
          e.currentTarget.style.background = v.bg;
        }
      }}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}