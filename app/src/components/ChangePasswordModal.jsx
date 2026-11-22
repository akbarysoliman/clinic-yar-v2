import React, { useState } from "react";
import { X, Lock, Check, AlertCircle } from "lucide-react";
import { C } from "../theme.jsx";
import { api } from "../api.js";

export default function ChangePasswordModal({ onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const inputStyle = {
    width: "100%",
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 13.5,
    fontFamily: "inherit",
    color: C.ink,
    boxSizing: "border-box",
    background: C.surface,
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("همه فیلدها الزامی هستند");
      return;
    }

    if (newPassword.length < 8) {
      setError("رمز عبور جدید باید حداقل ۸ کاراکتر باشد");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("رمز عبور جدید و تکرار آن مطابقت ندارند");
      return;
    }

    if (currentPassword === newPassword) {
      setError("رمز عبور جدید باید با رمز فعلی متفاوت باشد");
      return;
    }

    setSubmitting(true);
    try {
      await api.changePassword(currentPassword, newPassword);
          setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      }, 2000);
    } catch (e) {
      setError(e.message || "خطا در تغییر رمز");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,.48)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 100%)",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          boxShadow: "0 24px 70px rgba(0,0,0,.28)",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>
              تغییر رمز عبور
            </div>
            <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>
              برای امنیت حساب، رمز عبور خود را به‌روز کنید
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              border: `1px solid ${C.border}`,
              background: C.surfaceAlt,
              color: C.inkSoft,
              borderRadius: 9,
              padding: "6px 10px",
              cursor: submitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>
              رمز عبور فعلی *
            </div>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              dir="ltr"
              autoFocus
            />
          </div>

          <div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>
              رمز عبور جدید * (حداقل ۸ کاراکتر)
            </div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              dir="ltr"
            />
          </div>

          <div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>
              تکرار رمز عبور جدید *
            </div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              dir="ltr"
            />
          </div>

          {error && (
            <div style={{
              padding: 10,
              borderRadius: 8,
              background: C.claySoft,
              color: C.clay,
              fontSize: 12.5,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: 10,
              borderRadius: 8,
              background: C.tealSoft,
              color: C.tealDark,
              fontSize: 12.5,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              <Check size={14} />
              رمز عبور با موفقیت تغییر کرد
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              type="submit"
              disabled={submitting || success}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 10,
                padding: "11px 0",
                background: submitting || success ? "#D9DFDF" : C.teal,
                color: submitting || success ? C.inkSoft : "#fff",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: submitting || success ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <Lock size={15} />
              {submitting ? "در حال ذخیره..." : "ذخیره رمز جدید"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "0 18px",
                background: C.surface,
                color: C.inkSoft,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
              }}
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}