import React, { useState } from "react";
import { LockKeyhole, User, Building2, Stethoscope, HeartPulse, ChevronRight, BookOpen, Phone, CreditCard } from "lucide-react";
import { C, Brand, GlobalStyle } from "./theme.jsx";
import { useAuth } from "./AuthContext.jsx";
import SupportPage from "./components/SupportPage.jsx";
import { api, saveToken } from "./api.js"; // برای لاگین بیمار به api نیاز داریم

export default function LoginScreen({ onPatientLogin }) {
  const { login, error } = useAuth();
  const [showSupport, setShowSupport] = useState(false);
  
  const [activeRole, setActiveRole] = useState("none"); 
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // استیت‌های مخصوص بیمار
  const [patientPhone, setPatientPhone] = useState("");
  const [patientNationalCode, setPatientNationalCode] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientError, setPatientError] = useState(null);

  async function handleStaffAdminSubmit(e) {
    e.preventDefault();
    if (!username || !password) return;
    if (activeRole === "admin" && !companyCode) return;

    setSubmitting(true);
    await login(username, password, activeRole === "admin" ? companyCode : null);
    setSubmitting(false);
  }

  async function handlePatientSubmit(e) {
    e.preventDefault();
    setPatientError(null);
    if (!patientPhone || !patientNationalCode) {
      setPatientError("شماره موبایل و کد ملی الزامی است");
      return;
    }
    setSubmitting(true);
    try {
      // فراخوانی API لاگین بیمار
      const res = await api.patientLogin(patientPhone, patientNationalCode, patientName);
      saveToken(res.token); // ذخیره توکن
      if (onPatientLogin) onPatientLogin(); // رفتن به پنل بیمار
    } catch (err) {
      setPatientError(err.message || "خطا در ورود بیمار");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 14,
    fontFamily: "inherit",
    color: C.ink,
    boxSizing: "border-box",
  };

  const cardStyle = {
    display: "flex", alignItems: "center", gap: 16, padding: "20px",
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 16, cursor: "pointer", transition: "all 0.2s ease",
    textAlign: "right", width: "100%", fontFamily: "inherit"
  };

  if (showSupport) {
    return <SupportPage onBack={() => setShowSupport(false)} />;
  }

  return (
    <div
      dir="rtl"
      lang="fa"
      style={{
        fontFamily: "'Vazirmatn', Tahoma, sans-serif",
        background: C.bg,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <GlobalStyle />

      <div style={{ 
        display: "flex", 
        flexDirection: "row-reverse", 
        maxWidth: 1000, 
        width: "100%", 
        background: C.surface, 
        borderRadius: 24, 
        boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
        overflow: "hidden",
        minHeight: 550,
        flexWrap: "wrap" 
      }}>
        
        {/* ==================== سمت راست: فرم لاگین ==================== */}
        <div style={{ 
          flex: 1, minWidth: 320, padding: "40px 30px", 
          display: "flex", flexDirection: "column", justifyContent: "center",
          background: C.surface, position: "relative"
        }}>
          
          {activeRole !== "none" && (
            <button 
              onClick={() => { setActiveRole("none"); setPatientError(null); }}
              style={{ position: "absolute", top: 20, right: 20, border: "none", background: "transparent", color: C.inkFaint, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontFamily: "inherit" }}
            >
              <ChevronRight size={16} /> بازگشت
            </button>
          )}

          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
              <Brand size={60} />
              <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>کلینیک‌یار</div>
            </div>
            <div style={{ fontSize: 13, color: C.inkSoft }}>
              {activeRole === "none" && "برای شروع، یک گزینه را از سمت چپ انتخاب کنید"}
              {activeRole === "admin" && "ورود به پنل مدیریت کلینیک"}
              {activeRole === "staff" && "ورود به پنل پزشک / منشی"}
              {activeRole === "patient" && "ورود به پنل بیمار"}
            </div>
          </div>

          {activeRole === "none" && (
             <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
                <Building2 size={64} color={C.border} />
             </div>
          )}

          {/* فرم مدیر و پرسنل */}
          {(activeRole === "admin" || activeRole === "staff") && (
            <form onSubmit={handleStaffAdminSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {activeRole === "admin" && (
                <div>
                  <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>کد کلینیک *</div>
                  <input value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} placeholder="مثال: test-clinic" style={inputStyle} dir="ltr" autoComplete="off" />
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>{activeRole === "admin" ? "کد کاربری مدیر *" : "کد کاربری *"}</div>
                <div style={{ position: "relative" }}>
                  <User size={17} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.inkFaint }} />
                  <input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder={activeRole === "admin" ? "مثال: soliman_ak" : "کد کاربری خود را وارد کنید"} style={{ ...inputStyle, paddingLeft: 40 }} dir="ltr" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>رمز عبور *</div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} dir="ltr" />
              </div>
              {error && <div style={{ fontSize: 12.5, color: C.clay, background: C.claySoft, borderRadius: 8, padding: "8px 12px" }}>{error}</div>}
              <button type="submit" disabled={submitting || !username || !password || (activeRole === "admin" && !companyCode)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", borderRadius: 10, border: "none", marginTop: 8, background: (submitting || !username || !password || (activeRole === "admin" && !companyCode)) ? "#D9DFDF" : C.teal, color: "#fff", fontSize: 14, fontWeight: 700, cursor: (submitting || !username || !password || (activeRole === "admin" && !companyCode)) ? "not-allowed" : "pointer" }}>
                <LockKeyhole size={16} /> {submitting ? "در حال ورود..." : "ورود به پنل"}
              </button>
            </form>
          )}

          {/* فرم بیمار */}
          {activeRole === "patient" && (
            <form onSubmit={handlePatientSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>شماره موبایل *</div>
                <div style={{ position: "relative" }}>
                  <Phone size={17} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.inkFaint }} />
                  <input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value.replace(/[^0-9]/g, ''))} placeholder="09123456789" style={{ ...inputStyle, paddingLeft: 40 }} dir="ltr" maxLength={11} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>کد ملی *</div>
                <div style={{ position: "relative" }}>
                  <CreditCard size={17} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.inkFaint }} />
                  <input value={patientNationalCode} onChange={(e) => setPatientNationalCode(e.target.value)} placeholder="کد ملی ۱۰ رقمی" style={{ ...inputStyle, paddingLeft: 40 }} dir="ltr" maxLength={10}/>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>نام و نام خانوادگی (اختیاری برای ثبت‌نام)</div>
                <input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="اگر قبلاً ثبت‌نام نکرده‌اید" style={inputStyle} />
              </div>
              {patientError && <div style={{ fontSize: 12.5, color: C.clay, background: C.claySoft, borderRadius: 8, padding: "8px 12px" }}>{patientError}</div>}
              <button type="submit" disabled={submitting || !patientPhone || !patientNationalCode} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", borderRadius: 10, border: "none", marginTop: 8, background: (submitting || !patientPhone || !patientNationalCode) ? "#D9DFDF" : C.teal, color: "#fff", fontSize: 14, fontWeight: 700, cursor: (submitting || !patientPhone || !patientNationalCode) ? "not-allowed" : "pointer" }}>
                <HeartPulse size={16} /> {submitting ? "در حال ورود..." : "ورود به پنل بیمار"}
              </button>
            </form>
          )}

          {/* لینک پشتیبانی */}
          <div style={{ textAlign: "center", marginTop: "auto", paddingTop: 30 }}>
            <button onClick={() => setShowSupport(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: C.teal, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <BookOpen size={14} /> راهنما و پشتیبانی
            </button>
          </div>
        </div>

        {/* ==================== سمت چپ: باکس‌های انتخاب نقش ==================== */}
        <div style={{ 
          flex: 1, minWidth: 320, background: C.surfaceAlt, padding: "40px 30px", 
          display: "flex", flexDirection: "column", justifyContent: "center", gap: 16,
          borderLeft: `1px solid ${C.border}`
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 10 }}>به سامانه کلینیک یار خوش آمدید</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 20, lineHeight: 2 }}>لطفاً نوع حساب کاربری خود را انتخاب کنید تا فرم ورود مربوطه نمایش داده شود.</div>

          <button onClick={() => setActiveRole("admin")} style={{ ...cardStyle, borderColor: activeRole === "admin" ? C.teal : C.border, background: activeRole === "admin" ? C.tealSoft : C.surface }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", color: C.teal, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>مدیر کلینیک</div>
              <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 4 }}>مدیریت شعب، مطب‌ها، پزشکان و کارکنان</div>
            </div>
          </button>

          <button onClick={() => setActiveRole("staff")} style={{ ...cardStyle, borderColor: activeRole === "staff" ? C.teal : C.border, background: activeRole === "staff" ? C.tealSoft : C.surface }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", color: C.teal, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <Stethoscope size={22} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>پزشک / منشی</div>
              <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 4 }}>دسترسی به پرونده بیماران، نوبت‌دهی و ویزیت</div>
            </div>
          </button>

          <button onClick={() => setActiveRole("patient")} style={{ ...cardStyle, borderColor: activeRole === "patient" ? C.teal : C.border, background: activeRole === "patient" ? C.tealSoft : C.surface }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", color: C.teal, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <HeartPulse size={22} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>بیمار</div>
              <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 4 }}>دریافت نوبت، مشاهده نسخه و سوابق درمانی</div>
            </div>
          </button>

        </div>
      </div>

      {/* 👇 فوتر نسخه و توسعه‌دهنده */}
      <div style={{ marginTop: 24, textAlign: "center", fontSize: 11.5, color: C.inkFaint, lineHeight: 2 }}>
        <div>نسخه نرم‌افزار: <b>ClinicYar v1.0.0</b></div>
        <div>طراحی و توسعه توسط <b>سلیمان اکبری</b></div>
      </div>

    </div>
  );
}