import React, { useState, useEffect } from "react";
import { X, User, Phone, CreditCard, Mail, Check, AlertCircle } from "lucide-react";
import { C } from "../theme.jsx";
import { api } from "../api.js";

export default function PatientProfileModal({ onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    api.getMyPatientProfile()
      .then((d) => {
        setProfile(d.profile);
        setFullName(d.profile.full_name || "");
        setEmail(d.profile.email || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await api.updateMyPatientProfile({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
      });
      setProfile(res.profile);
      setEditing(false);
      setSaveMessage({ type: "success", text: "پروفایل با موفقیت بروزرسانی شد" });
    } catch (e) {
      setSaveMessage({ type: "error", text: e.message || "خطا در بروزرسانی" });
    } finally {
      setSaving(false);
    }
  }

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

  const infoRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 10,
    background: C.surfaceAlt,
    border: `1px solid ${C.border}`,
    fontSize: 13,
  };

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
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
          width: "min(520px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          boxShadow: "0 24px 70px rgba(0,0,0,.28)",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>
              پروفایل من
            </div>
            <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>
              اطلاعات حساب کاربری شما
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              border: `1px solid ${C.border}`,
              background: C.surfaceAlt,
              color: C.inkSoft,
              borderRadius: 9,
              padding: "6px 10px",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {loading && (
          <div style={{ padding: 20, textAlign: "center", color: C.inkSoft, fontSize: 13 }}>
            در حال دریافت اطلاعات...
          </div>
        )}

        {error && (
          <div style={{
            padding: 12,
            borderRadius: 10,
            background: C.claySoft,
            color: C.clay,
            fontSize: 12.5,
          }}>
            {error}
          </div>
        )}

        {!loading && profile && (
          <>
            {!editing ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  <div style={infoRowStyle}>
                    <User size={16} color={C.teal} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: C.inkFaint }}>نام و نام خانوادگی</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginTop: 3 }}>
                        {profile.full_name}
                      </div>
                    </div>
                  </div>

                  <div style={infoRowStyle}>
                    <Phone size={16} color={C.teal} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: C.inkFaint }}>شماره موبایل</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginTop: 3 }} dir="ltr">
                        {profile.phone}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: C.inkFaint, padding: "3px 7px", borderRadius: 6, background: C.surface }}>
                      غیرقابل تغییر
                    </span>
                  </div>

                  <div style={infoRowStyle}>
                    <CreditCard size={16} color={C.teal} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: C.inkFaint }}>کد ملی</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginTop: 3 }} dir="ltr">
                        {profile.national_code || "—"}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: C.inkFaint, padding: "3px 7px", borderRadius: 6, background: C.surface }}>
                      غیرقابل تغییر
                    </span>
                  </div>

                  <div style={infoRowStyle}>
                    <Mail size={16} color={C.teal} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: C.inkFaint }}>ایمیل</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginTop: 3 }} dir="ltr">
                        {profile.email || "ثبت نشده"}
                      </div>
                    </div>
                  </div>
                </div>

                {saveMessage && (
                  <div style={{
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 12,
                    background: saveMessage.type === "success" ? C.tealSoft : C.claySoft,
                    color: saveMessage.type === "success" ? C.tealDark : C.clay,
                    fontSize: 12.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    {saveMessage.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                    {saveMessage.text}
                  </div>
                )}

                <button
                  onClick={() => { setEditing(true); setSaveMessage(null); }}
                  style={{
                    width: "100%",
                    border: `1px solid ${C.teal}`,
                    background: C.tealSoft,
                    color: C.tealDark,
                    borderRadius: 10,
                    padding: "11px 0",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  ویرایش پروفایل
                </button>
              </>
            ) : (
              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>
                    نام و نام خانوادگی *
                  </div>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={inputStyle}
                    autoFocus
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>
                    ایمیل (اختیاری)
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    style={inputStyle}
                    dir="ltr"
                  />
                </div>

                <div style={{ fontSize: 11.5, color: C.inkFaint, padding: "10px 12px", borderRadius: 8, background: C.surfaceAlt, lineHeight: 1.9 }}>
                  شماره موبایل و کد ملی قابل تغییر نیستند، چون کلید ورود شما هستند.
                </div>

                {saveMessage && (
                  <div style={{
                    padding: 10,
                    borderRadius: 8,
                    background: saveMessage.type === "success" ? C.tealSoft : C.claySoft,
                    color: saveMessage.type === "success" ? C.tealDark : C.clay,
                    fontSize: 12.5,
                  }}>
                    {saveMessage.text}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="submit"
                    disabled={saving || !fullName.trim()}
                    style={{
                      flex: 1,
                      border: "none",
                      borderRadius: 10,
                      padding: "11px 0",
                      background: saving || !fullName.trim() ? "#D9DFDF" : C.teal,
                      color: saving || !fullName.trim() ? C.inkSoft : "#fff",
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: saving || !fullName.trim() ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setFullName(profile.full_name);
                      setEmail(profile.email || "");
                      setSaveMessage(null);
                    }}
                    disabled={saving}
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: "0 18px",
                      background: C.surface,
                      color: C.inkSoft,
                      cursor: saving ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      fontWeight: 700,
                    }}
                  >
                    انصراف
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}