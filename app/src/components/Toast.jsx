import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { C } from "../theme.jsx";

export function Toast({ message, type = "success", onClose, duration = 4000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const isSuccess = type === "success";
  const bg = isSuccess ? C.tealSoft : C.claySoft;
  const color = isSuccess ? C.tealDark : C.clay;
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: C.surface,
        border: `1px solid ${color}33`,
        borderRight: `4px solid ${color}`,
        borderRadius: 12,
        padding: "12px 16px",
        boxShadow: "0 8px 30px rgba(0,0,0,.15)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: 420,
        minWidth: 280,
        animation: "slideDown .3s ease",
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 9,
          background: bg, color,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={17} />
      </div>
      <div style={{ flex: 1, fontSize: 13, color: C.ink, fontWeight: 600, lineHeight: 1.7 }}>
        {message}
      </div>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onClose?.(), 300);
        }}
        style={{
          border: "none", background: "transparent",
          color: C.inkFaint, cursor: "pointer",
          padding: 4, flexShrink: 0,
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0,
        pointerEvents: "none", zIndex: 9999,
      }}
    >
      {toasts.map((t, idx) => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <Toast
            message={t.message}
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        </div>
      ))}
    </div>
  );
}