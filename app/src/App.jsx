import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Building2, Wallet, Settings2, CalendarDays, Users,
 FileText, ClipboardList, Plus, ChevronRight, ChevronLeft, Stethoscope, Menu,
  UserRound, CheckCircle2, XCircle, LogOut, AlertCircle, Loader2, Bell, Search, ChevronDown,
  Edit3, Trash2, DoorOpen, X, Eye, KeyRound, ShieldCheck, UserCog, Lock, Ban, Check,
} from "lucide-react";
import { C, Brand, Card, GlobalStyle, isDarkTheme } from "./theme.jsx";
import {
  toFa, todayJalali, jalaliLabel, jalaliToDate, jalaliWeekdayIndex,
  jalaliToGregorian, gregorianToJalali,
} from "./jalali.js";
import { api } from "./api.js";
import JalaliDatePicker from "./JalaliDatePicker.jsx";
import { AuthProvider, useAuth, mapRole } from "./AuthContext.jsx";
import LoginScreen from "./LoginScreen.jsx";
import { DoctorPatients, DoctorPrescribe, DoctorVisit } from "./DoctorScreens.jsx";
import { SecretaryCheckout } from "./SecretaryCheckout.jsx";
import { AdminFinance } from "./AdminScreens.jsx";
import { SettingsScreen } from "./SettingsScreen.jsx";
import LivePatientSearch from "./components/LivePatientSearch.jsx";
import PatientPortal from "./PatientPortal.jsx";
import ChangePasswordModal from "./components/ChangePasswordModal.jsx";
import { ActionButton, PrimaryButton } from "./components/ActionButtons.jsx";
import NotificationsDropdown from "./components/NotificationsDropdown.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import { useToastContext } from "./contexts/ToastContext.jsx";
/* ---------------------------------------------------------------------- */
/* Small building blocks                                                  */
/* ---------------------------------------------------------------------- */
function EmptyState({ icon: Icon, title, desc }) {
  return (
    <Card style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Icon size={24} color={C.teal} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: C.inkSoft, maxWidth: 320, margin: "0 auto" }}>{desc}</div>
    </Card>
  );
}

function LoadingBlock({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.inkSoft, fontSize: 13.5, padding: "24px 4px" }}>
      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
      {label || "در حال بارگذاری..."}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorBlock({ message, onRetry }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.clay, background: C.claySoft, borderRadius: 10, padding: "12px 16px", fontSize: 13 }}>
      <AlertCircle size={16} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>{message}</div>
      {onRetry && (
        <button onClick={onRetry} style={{ border: "none", background: "transparent", color: C.clay, fontWeight: 700, cursor: "pointer", fontSize: 12.5, fontFamily: "inherit" }}>
          تلاش دوباره
        </button>
      )}
    </div>
  );
}

const navBtn = {
  width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.border}`,
  background: C.surface, display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", color: C.ink,
};

/* ---------------------------------------------------------------------- */
/* Jalali date field — click to expand a dropdown calendar                */
/* ---------------------------------------------------------------------- */


/* ---------------------------------------------------------------------- */
/* Role menu definitions                                                  */
/* ---------------------------------------------------------------------- */
const MENUS = {
  admin: [
    { key: "dashboard", label: "داشبورد", icon: LayoutDashboard, ready: true },
    { key: "branches", label: "شعبه‌ها", icon: Building2, ready: true },
    { key: "offices", label: "مطب‌ها", icon: DoorOpen, ready: true },
    { key: "doctors", label: "پزشکان", icon: Stethoscope, ready: true },
    { key: "receptionists", label: "منشی‌ها", icon: UserRound, ready: true },
    { key: "schedule", label: "برنامه کاری", icon: CalendarDays, ready: true },
    { key: "finance", label: "گزارش مالی", icon: Wallet, ready: true },
    { key: "settings", label: "تنظیمات", icon: Settings2, ready: true },
  ],
  doctor: [
    { key: "dashboard", label: "داشبورد پزشک", icon: LayoutDashboard, ready: true },
    { key: "calendar", label: "نوبت‌های من", icon: CalendarDays, ready: true },
    { key: "patients", label: "بیماران", icon: Users, ready: true },
    { key: "visit", label: "ویزیت و پرونده", icon: Stethoscope, ready: true },
    { key: "prescriptions", label: "نسخه‌نویسی", icon: FileText, ready: true },
  ],
  secretary: [
 { key: "patients", label: "بیماران", icon: Users, ready: true },
    { key: "booking", label: "نوبت‌دهی", icon: CalendarDays, ready: true },
       { key: "queue", label: "صف امروز", icon: ClipboardList, ready: true },
    { key: "checkout", label: "تسویه‌حساب", icon: Wallet, ready: true },
  ],
};

const ROLE_META = {
  admin: { icon: LayoutDashboard, accent: C.teal, accentSoft: C.tealSoft },
  doctor: { icon: Stethoscope, accent: C.teal, accentSoft: C.tealSoft },
  secretary: { icon: UserRound, accent: C.saffron, accentSoft: C.saffronSoft },
};

const STATUS_LABEL = {
  pending: "در انتظار تأیید",
  booked: "در انتظار",
  checked_in: "پذیرش‌شده",
  in_visit: "در حال ویزیت",
  completed: "تکمیل‌شده",
  cancelled: "لغو شده",
  rejected: "رد شده",
  no_show: "عدم مراجعه",
};
const STATUS_STYLE = {
  pending: { bg: C.saffronSoft, text: C.saffronDark },
  booked: { bg: "#EEF1F1", text: C.inkSoft },
  checked_in: { bg: C.saffronSoft, text: C.saffronDark },
  in_visit: { bg: C.saffronSoft, text: C.saffronDark },
  completed: { bg: C.tealSoft, text: C.tealDark },
  cancelled: { bg: C.claySoft, text: C.clay },
  rejected: { bg: C.claySoft, text: C.clay },
  no_show: { bg: C.claySoft, text: C.clay },
};
const NEXT_STATUS = { booked: "checked_in", checked_in: "in_visit", in_visit: "completed" };

/* ---------------------------------------------------------------------- */
/* Screens                                                                */
/* ---------------------------------------------------------------------- */
function DoctorDashboard({ doctorId }) {
  const [appointments, setAppointments] = useState(null);
  const [error, setError] = useState(null);
  const today = todayJalali();

  const load = useCallback(() => {
    if (!doctorId) return;
    setError(null);
    const g = jalaliToGregorian(today.jy, today.jm, today.jd);
    const dateStr = `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
    api.listAppointments({ doctor_id: doctorId, date: dateStr })
      .then((d) => setAppointments(d.appointments || []))
      .catch((e) => setError(e.message));
  }, [doctorId, today.jy, today.jm, today.jd]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!appointments) return <LoadingBlock label="در حال آماده‌سازی داشبورد پزشک..." />;

  const waiting = appointments.filter((a) => a.status === "booked" || a.status === "checked_in").length;
  const inVisit = appointments.filter((a) => a.status === "in_visit").length;
  const completed = appointments.filter((a) => a.status === "completed").length;
  const active = appointments.filter((a) => !["cancelled", "no_show", "completed"].includes(a.status)).slice(0, 5);

  const kpis = [
    { label: "نوبت‌های امروز", value: appointments.length, icon: CalendarDays, bg: C.blueSoft, color: C.blue },
    { label: "در انتظار / پذیرش", value: waiting, icon: Users, bg: C.saffronSoft, color: C.saffronDark },
    { label: "در حال ویزیت", value: inVisit, icon: Stethoscope, bg: C.purpleSoft, color: C.purple },
    { label: "ویزیت تکمیل‌شده", value: completed, icon: CheckCircle2, bg: C.tealSoft, color: C.tealDark },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }} className="doctor-kpi-grid">
        {kpis.map((k) => (
          <Card key={k.label} style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: C.inkSoft }}>{k.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.navy, marginTop: 7 }}>{toFa(k.value)}</div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <k.icon size={19} color={k.color} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.7fr) minmax(280px,1fr)", gap: 16 }} className="doctor-dashboard-grid">
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>برنامه فعال امروز</div>
              <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>{jalaliLabel(today, true)}</div>
            </div>
            <button onClick={() => window.dispatchEvent(new CustomEvent("clinic-nav", { detail: "calendar" }))} style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.teal, borderRadius: 9, padding: "7px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700 }}>مشاهده همه</button>
          </div>
          {active.length === 0 ? (
            <div style={{ padding: "28px 10px", textAlign: "center", color: C.inkFaint, fontSize: 13 }}>برای ادامه امروز نوبت فعالی وجود ندارد.</div>
          ) : active.map((a, i) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width: 54, color: C.teal, fontWeight: 800, fontSize: 12.5 }}>{new Date(a.appointment_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{a.patient_name}</div>
                <div style={{ fontSize: 11.5, color: C.inkFaint }}>{a.patient_phone || ""}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 9px", borderRadius: 20, background: STATUS_STYLE[a.status]?.bg || C.surfaceAlt, color: STATUS_STYLE[a.status]?.text || C.inkSoft }}>{STATUS_LABEL[a.status] || a.status}</span>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 4 }}>دسترسی سریع</div>
          <div style={{ fontSize: 11.5, color: C.inkFaint, marginBottom: 12 }}>پرکاربردترین بخش‌های پزشک</div>
          <div className="quick-access-list">
            {[
              ["calendar", CalendarDays, "نوبت‌های من", "مشاهده برنامه و نوبت‌های امروز"],
              ["patients", Users, "بیماران من", "پرونده و سوابق بیماران"],
              ["prescriptions", FileText, "نسخه‌نویسی", "ثبت نسخه برای بیمار"],
              ["visit", Stethoscope, "ویزیت و پرونده", "ثبت ویزیت و تشخیص"],
            ].map(([key, Icon, label, desc]) => (
              <button key={key} className="quick-access-item" onClick={() => window.dispatchEvent(new CustomEvent("clinic-nav", { detail: key }))} style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 12, padding: "11px 12px", cursor: "pointer", fontFamily: "inherit", color: C.ink }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={17} color={C.teal} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.2, fontWeight: 800 }}>{label}</div>
                  <div style={{ fontSize: 10.5, color: C.inkFaint, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{desc}</div>
                </div>
                <ChevronLeft size={14} color={C.inkFaint} />
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 10, borderRadius: 11, background: C.tealSoft, color: C.tealDark, fontSize: 11.2, lineHeight: 1.8 }}>دسترسی‌های سریع حالا به‌صورت مرتب و ستونی در این بخش قرار گرفته‌اند.</div>
        </Card>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    setData(null);
    try {
      const d = await api.getDashboardSummary();
      setData(d);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!data) return <LoadingBlock label="در حال آماده‌سازی داشبورد مدیریت..." />;

  const { counts, warnings, inactiveItems } = data;
  // ⭐ تشخیص کلینیک جدید: اگر هیچ شعبه، پزشک یا منشی‌ای وجود نداشته باشد
  const isNewClinic = 
    counts.branches_total === 0 && 
    counts.doctors_total === 0 && 
    counts.secretaries_total === 0 && 
    counts.offices_total === 0;
  const cards = [
    {
      key: "branches",
      label: "تعداد شعب",
      value: counts.branches_active,
      total: counts.branches_total,
      icon: Building2,
      bg: C.tealSoft,
      color: C.tealDark,
      description: "شعبه فعال",
    },
    {
      key: "offices",
      label: "تعداد مطب‌ها",
      value: counts.offices_active,
      total: counts.offices_total,
      icon: DoorOpen,
      bg: C.blueSoft,
      color: C.blue,
      description: "مطب فعال",
    },
    {
      key: "doctors",
      label: "تعداد پزشکان",
      value: counts.doctors_active,
      total: counts.doctors_total,
      icon: Stethoscope,
      bg: C.purpleSoft,
      color: C.purple,
      description: "پزشک فعال",
    },
    {
      key: "receptionists",
      label: "تعداد منشی‌ها",
      value: counts.secretaries_active,
      total: counts.secretaries_total,
      icon: UserRound,
      bg: C.saffronSoft,
      color: C.saffronDark,
      description: "منشی فعال",
    },
  ];

  const quickActions = [
    ["branches", Building2, "افزودن شعبه", "ثبت یک شعبه جدید"],
    ["offices", DoorOpen, "افزودن مطب", "ثبت و مدیریت مطب‌ها"],
    ["doctors", Stethoscope, "افزودن پزشک", "ثبت اطلاعات پزشک"],
    ["receptionists", UserRound, "افزودن منشی", "ثبت اطلاعات منشی"],
    ["schedule", CalendarDays, "مدیریت برنامه کاری", "برنامه هفتگی پزشکان"],
  ];

  // ساخت لیست هشدارها
  const warningsList = [];

  if (warnings.branchesWithoutDoctor.length > 0) {
    warningsList.push({
      key: "empty-branches",
      icon: Building2,
      title: `${toFa(warnings.branchesWithoutDoctor.length)} شعبه بدون پزشک`,
      items: warnings.branchesWithoutDoctor.map((b) => b.name),
      action: "branches",
      tone: "warning",
    });
  }
  if (warnings.officesWithoutBranch.length > 0) {
    warningsList.push({
      key: "orphan-offices",
      icon: DoorOpen,
      title: `${toFa(warnings.officesWithoutBranch.length)} مطب بدون شعبه`,
      items: warnings.officesWithoutBranch.map((o) => o.name),
      action: "offices",
      tone: "warning",
    });
  }
  if (warnings.doctorsWithoutOffice.length > 0) {
    warningsList.push({
      key: "orphan-doctors",
      icon: Stethoscope,
      title: `${toFa(warnings.doctorsWithoutOffice.length)} پزشک بدون مطب`,
      items: warnings.doctorsWithoutOffice.map((d) => d.name),
      action: "doctors",
      tone: "warning",
    });
  }
  if (warnings.secretariesWithoutOffice.length > 0) {
    warningsList.push({
      key: "orphan-secretaries",
      icon: UserRound,
      title: `${toFa(warnings.secretariesWithoutOffice.length)} منشی بدون مطب`,
      items: warnings.secretariesWithoutOffice.map((s) => s.name),
      action: "receptionists",
      tone: "warning",
    });
  }
  if (inactiveItems.length > 0) {
    const byType = {
      branch: "شعبه",
      office: "مطب",
      doctor: "پزشک",
      secretary: "منشی",
    };
    warningsList.push({
      key: "inactive-items",
      icon: AlertCircle,
      title: `${toFa(inactiveItems.length)} آیتم غیرفعال`,
      items: inactiveItems.map((i) => `${byType[i.type] || i.type}: ${i.name}`),
      action: null,
      tone: "danger",
    });
  }
  if (warningsList.length === 0) {
    warningsList.push({
      key: "healthy",
      icon: CheckCircle2,
      title: "هشدار مهمی ثبت نشده است",
      items: [],
      action: null,
      tone: "success",
    });
  }

  const go = (key) => window.dispatchEvent(new CustomEvent("clinic-nav", { detail: key }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <style>{`
        @media (max-width: 1050px) {
          .admin-dashboard-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .admin-dashboard-panels { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 620px) {
          .admin-dashboard-kpis { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .admin-quick-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 430px) {
          .admin-dashboard-kpis { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* ⭐ پیام خوش‌آمدگویی برای کلینیک‌های جدید */}
      {isNewClinic && (
        <Card style={{ 
          background: `linear-gradient(135deg, ${C.tealSoft} 0%, ${C.surface} 100%)`, 
          border: `1px solid ${C.teal}44`,
          padding: 24
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ 
              width: 52, height: 52, borderRadius: 16, background: C.teal, 
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 
            }}>
              <CheckCircle2 size={26} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 4 }}>
                به کلینیک‌یار خوش آمدید! 🎉
              </div>
              <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.9, marginBottom: 14 }}>
                برای شروع کار با نرم‌افزار، لطفاً مراحل زیر را به ترتیب انجام دهید. بعد از تکمیل هر مرحله، این پیام به صورت خودکار حذف می‌شود.
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { step: "۱", label: "ابتدا یک شعبه بسازید", desc: "شعبه، مکان فیزیکی کلینیک است.", action: "branches", icon: Building2 },
                  { step: "۲", label: "یک مطب اضافه کنید", desc: "مطب‌ها داخل شعبه‌ها قرار می‌گیرند.", action: "offices", icon: DoorOpen },
                  { step: "۳", label: "پزشکان را تعریف کنید", desc: "برای هر پزشک، تخصص و برنامه کاری تعیین کنید.", action: "doctors", icon: Stethoscope },
                  { step: "۴", label: "منشی‌ها را اضافه کنید", desc: "منشی‌ها برای پذیرش و نوبت‌دهی به کار می‌روند.", action: "receptionists", icon: UserRound },
                ].map((item) => (
                  <button
                    key={item.step}
                    onClick={() => go(item.action)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                      cursor: "pointer", fontFamily: "inherit", textAlign: "right", width: "100%"
                    }}
                  >
                    <div style={{ 
                      width: 28, height: 28, borderRadius: "50%", background: C.tealSoft, color: C.tealDark,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0
                    }}>
                      {item.step}
                    </div>
                    <item.icon size={18} color={C.teal} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 2 }}>{item.desc}</div>
                    </div>
                    <ChevronLeft size={16} color={C.inkFaint} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
      {/* Welcome */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>خوش آمدید، مدیر کلینیک</div>
          <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 5 }}>نمای کلی وضعیت کلینیک و دسترسی سریع به بخش‌های اصلی</div>
        </div>
        <div style={{ fontSize: 11.5, color: C.inkSoft, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 11px" }}>
          {jalaliLabel(todayJalali(), true)}
        </div>
      </div>

      {/* Four statistic cards */}
      <div className="admin-dashboard-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
        {cards.map((card) => (
          <button
            key={card.key}
            onClick={() => go(card.key)}
            style={{ textAlign: "right", border: `1px solid ${C.border}`, background: C.surface, borderRadius: 15, padding: 16, cursor: "pointer", fontFamily: "inherit", color: C.ink, boxShadow: "0 2px 10px rgba(22,38,47,.035)", transition: "transform .15s ease, box-shadow .15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(22,38,47,.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(22,38,47,.035)"; }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ width: 43, height: 43, borderRadius: 13, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <card.icon size={20} color={card.color} />
              </div>
              <div style={{ textAlign: "right", minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.inkSoft }}>{card.label}</div>
                <div style={{ fontSize: 27, fontWeight: 850, color: C.navy, lineHeight: 1.15, marginTop: 6 }}>{toFa(card.value)}</div>
                {card.total !== card.value && (
                  <div style={{ fontSize: 10.5, color: C.inkFaint, marginTop: 3 }}>از {toFa(card.total)} کل</div>
                )}
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: C.inkFaint, marginTop: 12 }}>{card.description}</div>
          </button>
        ))}
      </div>

      {/* Quick access + warnings */}
      <div className="admin-dashboard-panels" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(320px,.75fr)", gap: 16 }}>
        <Card>
          <div style={{ marginBottom: 13 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>دسترسی سریع</div>
            <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>عملیات پرکاربرد مدیریت کلینیک</div>
          </div>
          <div className="admin-quick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
            {quickActions.map(([key, Icon, title, desc]) => (
              <button key={key} onClick={() => go(key)} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "right", border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 12, padding: "11px 12px", cursor: "pointer", fontFamily: "inherit", color: C.ink }}>
                <div style={{ width: 35, height: 35, borderRadius: 10, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={17} color={C.teal} /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.2, fontWeight: 800 }}>{title}</div>
                  <div style={{ fontSize: 10.3, color: C.inkFaint, marginTop: 2 }}>{desc}</div>
                </div>
                <ChevronLeft size={14} color={C.inkFaint} />
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ marginBottom: 13 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>هشدارهای مهم</div>
            <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>مواردی که نیاز به بررسی مدیر دارند</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {warningsList.map((w) => {
              const tone = w.tone === "danger"
                ? { bg: C.claySoft, color: C.clay }
                : w.tone === "warning"
                  ? { bg: C.saffronSoft, color: C.saffronDark }
                  : { bg: C.tealSoft, color: C.tealDark };
              return (
                <button
                  key={w.key}
                  disabled={!w.action}
                  onClick={() => w.action && go(w.action)}
                  style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 10, textAlign: "right", border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 11, padding: "10px 11px", cursor: w.action ? "pointer" : "default", fontFamily: "inherit", color: C.ink }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: tone.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <w.icon size={17} color={tone.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>{w.title}</div>
                    {w.items.length > 0 && (
                      <div style={{ fontSize: 10.5, color: C.inkFaint, marginTop: 3, lineHeight: 1.7 }}>
                        {w.items.slice(0, 3).join("، ")}
                        {w.items.length > 3 && ` و ${toFa(w.items.length - 3)} مورد دیگر`}
                      </div>
                    )}
                  </div>
                  {w.action && <ChevronLeft size={14} color={C.inkFaint} style={{ marginTop: 9 }} />}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Last activities */}
      <Card>
        <div style={{ marginBottom: 13 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>آخرین فعالیت‌ها</div>
          <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>آخرین عملیات ثبت‌شده در سامانه</div>
        </div>
        <div style={{ minHeight: 82, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 12, background: C.surfaceAlt, padding: 18 }}>
          <div>
            <ClipboardList size={22} color={C.inkFaint} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 700 }}>هنوز فعالیتی برای نمایش ثبت نشده است.</div>
            <div style={{ fontSize: 10.8, color: C.inkFaint, marginTop: 3 }}>پس از فعال شدن Activity Log، رویدادهای واقعی اینجا نمایش داده می‌شوند.</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
function AdminModulePlaceholder({ title, icon: Icon, desc }) {
  return (
    <Card style={{ minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div>
        <div style={{ width: 58, height: 58, borderRadius: 16, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <Icon size={26} color={C.teal} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>{title}</div>
        <div style={{ fontSize: 12.5, color: C.inkFaint, marginTop: 7 }}>{desc || "این بخش در مرحله طراحی و اتصال به ساختار جدید سامانه است."}</div>
      </div>
    </Card>
  );
}

function AssignDoctorModal({ office, onClose, onAssigned }) {
  const [doctors, setDoctors] = useState([]);
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      api.listDoctors(),
      api.getOffice(office.id),
    ])
      .then(([allDoctorsRes, officeRes]) => {
        setDoctors(allDoctorsRes?.doctors || []);
        setAssignedDoctors(officeRes?.office?.doctors || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [office.id]);

  useEffect(() => {
    load();
  }, [load]);

  const assignedIds = new Set(assignedDoctors.map((d) => d.id));

  async function assign(doctorId) {
    setSubmitting(true);
    setError(null);
    try {
      await api.assignDoctorToOffice(office.id, doctorId);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function unassign(doctorId) {
    setSubmitting(true);
    setError(null);
    try {
      await api.removeDoctorFromOffice(office.id, doctorId);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}>
      <Card style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>
              اختصاص پزشک به مطب
            </div>
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4 }}>
              {office.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "transparent", color: C.inkSoft, fontSize: 20, cursor: "pointer", fontFamily: "inherit" }}
          >
            ✕
          </button>
        </div>

        {loading && <div style={{ fontSize: 13, color: C.inkSoft, padding: 20, textAlign: "center" }}>در حال بارگذاری...</div>}

        {error && (
          <div style={{ padding: 13, borderRadius: 11, background: C.claySoft, color: C.clay, fontSize: 12.5, marginBottom: 13 }}>
            {error}
          </div>
        )}

        {!loading && doctors.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: C.inkSoft }}>
            هنوز پزشکی ثبت نشده است. اول از منوی «پزشکان» پزشک بسازید.
          </div>
        )}

        {!loading && doctors.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {doctors.map((d) => {
              const isAssigned = assignedIds.has(d.id);
              return (
                <div
                  key={d.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 10,
                    background: isAssigned ? C.tealSoft : C.surfaceAlt,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{d.full_name}</div>
                    <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>
                      {d.specialty || "بدون تخصص"}
                    </div>
                  </div>
                  <button
                    onClick={() => isAssigned ? unassign(d.id) : assign(d.id)}
                    disabled={submitting}
                    style={{
                      border: "none", borderRadius: 8,
                      background: isAssigned ? C.clay : C.teal,
                      color: "#fff", padding: "6px 14px",
                      fontSize: 12, fontWeight: 700,
                      cursor: submitting ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {isAssigned ? "حذف" : "افزودن"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onAssigned}
          style={{
            marginTop: 16, width: "100%",
            border: "none", background: C.teal, color: "#fff",
            borderRadius: 9, padding: "10px 16px",
            fontFamily: "inherit", fontWeight: 800, cursor: "pointer",
          }}
        >
          بستن
        </button>
      </Card>
    </div>
  );
}
function AdminOffices() {
  const { showSuccess, showError } = useToastContext();
  const [offices, setOffices] = useState(null);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api.listOffices()
      .then((d) => setOffices(d?.offices || []))
      .catch((e) => setError(e.message));
    api.listBranches()
      .then((d) => setBranches(d?.branches || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setForm({ name: "", address: "", phone: "" });
    setModal({ type: "form", office: null });
  }

  function openEdit(office) {
    setForm({
      name: office.name || "",
      address: office.address || "",
      phone: office.phone || "",
    });
    setModal({ type: "form", office });
  }

  function closeModal() {
    setModal(null);
  }

  async function submitForm(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
      };

      if (modal?.office) {
        await api.updateOffice(modal.office.id, payload);
      } else {
        await api.createOffice(payload);
      }

           showSuccess(modal?.office ? "مطب با موفقیت ویرایش شد" : "مطب با موفقیت اضافه شد");
      closeModal();
      load();
    } catch (err) {
      showError(err.message || "خطا در ذخیره مطب");
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(office) {
    setModal({ type: "delete", office });
  }
  function openAssignDoctor(office) {
    setModal({ type: "assign-doctor", office });
  }
   async function deactivateOfficeUI(o) {
    if (!confirm(`آیا از غیرفعال‌سازی «${o.name}» مطمئن هستید؟`)) return;
    try {
      await api.deactivateOffice(o.id);
      showSuccess(`«${o.name}» غیرفعال شد`);
      load();
    } catch (e) {
      showError(e.message || "خطا در غیرفعال‌سازی");
    }
  }

  async function activateOfficeUI(o) {
    try {
      await api.activateOffice(o.id);
      showSuccess(`«${o.name}» فعال شد`);
      load();
    } catch (e) {
      showError(e.message || "خطا در فعال‌سازی");
    }
  }
  const inputStyle = {
    width: "100%", boxSizing: "border-box", border: `1px solid ${C.border}`,
    background: C.surface, color: C.ink, borderRadius: 10, padding: "10px 12px",
    fontFamily: "inherit", fontSize: 13, outline: "none",
  };

  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!offices) return <LoadingBlock label="در حال دریافت اطلاعات مطب‌ها..." />;

  const filtered = offices.filter((o) => {
    const active = o.is_active !== false;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? active : !active);
    const q = search.trim().toLowerCase();
    return matchesStatus && (!q || [o.name, o.address, o.phone].filter(Boolean).join(" ").toLowerCase().includes(q));
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>مدیریت مطب‌ها</div>
          <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 5 }}>ثبت، ویرایش و مدیریت مطب‌های کلینیک</div>
        </div>
        <button
          onClick={openAdd}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            border: "none", background: C.teal, color: "#fff",
            borderRadius: 10, padding: "10px 15px", cursor: "pointer",
            fontFamily: "inherit", fontSize: 12.5, fontWeight: 800,
          }}
        >
          + افزودن مطب
        </button>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 15, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو نام مطب، آدرس یا تلفن..."
            style={{ ...inputStyle, maxWidth: 320 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 }}>
            {[["all", "همه"], ["active", "فعال"], ["inactive", "غیرفعال"]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                style={{
                  border: "none", borderRadius: 7, padding: "7px 11px",
                  background: statusFilter === key ? C.surface : "transparent",
                  color: statusFilter === key ? C.tealDark : C.inkSoft,
                  fontFamily: "inherit", fontSize: 11.5,
                  fontWeight: statusFilter === key ? 800 : 500,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "56px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>مطب ثبت نشده است</div>
            <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 7 }}>
              برای شروع، یک مطب جدید اضافه کنید.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: C.surfaceAlt }}>
                  {["ردیف", "نام مطب", "آدرس", "تلفن", "وضعیت", "عملیات"].map((h) => (
                    <th key={h} style={{ textAlign: "right", padding: "12px 14px", color: C.inkSoft, fontWeight: 700, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr key={o.id}>
                    <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkFaint }}>{toFa(i + 1)}</td>
                    <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.ink, fontWeight: 700 }}>{o.name}</td>
                    <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }}>{o.address || "—"}</td>
                    <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }} dir="ltr">{o.phone || "—"}</td>

<td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}` }}>
  <span style={{
    fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
    background: o.is_active !== false ? C.tealSoft : C.claySoft,
    color: o.is_active !== false ? C.tealDark : C.clay,
  }}>
    {o.is_active !== false ? "فعال" : "غیرفعال"}
  </span>
</td>

<td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}` }}>
  <div style={{ display: "flex", gap: 5 }}>
    <ActionButton icon={Edit3} variant="edit" onClick={() => openEdit(o)} title="ویرایش" />
    <ActionButton icon={Stethoscope} variant="assign" onClick={() => openAssignDoctor(o)} title="اختصاص پزشک" />
    <ActionButton icon={Trash2} variant="delete" onClick={() => confirmDelete(o)} title="حذف" />
    {o.is_active !== false ? (
      <ActionButton icon={Ban} variant="deactivate" onClick={() => deactivateOfficeUI(o)} title="غیرفعال‌سازی" />
    ) : (
      <ActionButton icon={Check} variant="activate" onClick={() => activateOfficeUI(o)} title="فعال‌سازی" />
    )}
  </div>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}>
          <Card style={{ maxWidth: 500, width: "100%" }}>
            {modal.type === "form" && (
              <form onSubmit={submitForm}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 16 }}>
                  {modal.office ? "ویرایش مطب" : "افزودن مطب جدید"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>نام مطب *</div>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} required />
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>آدرس</div>
                    <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>تلفن</div>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, '') })} style={inputStyle} dir="ltr" maxLength={11} />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="submit" disabled={submitting} style={{ flex: 1, border: "none", background: C.teal, color: "#fff", borderRadius: 9, padding: "10px 16px", fontFamily: "inherit", fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer" }}>
                      {submitting ? "در حال ذخیره..." : modal.office ? "ذخیره تغییرات" : "ثبت مطب"}
                    </button>
                    <button type="button" onClick={closeModal} style={{ border: `1px solid ${C.border}`, background: C.surface, color: C.inkSoft, borderRadius: 9, padding: "10px 16px", fontFamily: "inherit", cursor: "pointer" }}>
                      انصراف
                    </button>
                  </div>
                </div>
              </form>
            )}

            {modal.type === "delete" && (
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 12 }}>حذف مطب</div>
                <div style={{ padding: 13, borderRadius: 11, background: C.claySoft, color: C.clay, fontSize: 12.5, lineHeight: 1.9, marginBottom: 13 }}>
                  آیا از حذف مطب <b>{modal.office?.name}</b> مطمئن هستید؟ اگر این مطب سابقه وابسته داشته باشد، حذف فیزیکی انجام نمی‌شود و غیرفعال خواهد شد.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={async () => {
                      try {
                                                const res = await api.deleteOffice(modal.office.id);
                        closeModal();
                        load();
                        if (res?.message) showSuccess(res.message);
                      } catch (err) {
                        showError(err.message || "خطا در حذف مطب");
                      }
                    }}
                    style={{ border: "none", background: C.clay, color: "#fff", borderRadius: 9, padding: "9px 15px", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}
                  >
                    تأیید حذف
                  </button>
                  <button onClick={closeModal} style={{ border: `1px solid ${C.border}`, background: C.surface, color: C.inkSoft, borderRadius: 9, padding: "9px 15px", fontFamily: "inherit", cursor: "pointer" }}>
                    انصراف
                  </button>
                </div>
              </div>
            )}

            {modal.type === "info" && (
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 12 }}>{modal.title}</div>
                <div style={{ padding: 13, borderRadius: 11, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.inkSoft, fontSize: 12.5, lineHeight: 2 }}>{modal.message}</div>
                <button onClick={closeModal} style={{ marginTop: 12, border: "none", background: C.teal, color: "#fff", borderRadius: 9, padding: "9px 18px", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}>متوجه شدم</button>
              </div>
            )}
            {modal.type === "assign-doctor" && (
              <AssignDoctorModal
                office={modal.office}
                onClose={closeModal}
                onAssigned={() => {
                  closeModal();
                  load();
                }}
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
function DoctorScheduleModal({ doctor, branches, onClose }) {
  const WEEKDAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];

  const [branchId, setBranchId] = useState(doctor.branch_id || branches[0]?.id || "");
  const [days, setDays] = useState(() =>
    WEEKDAY_NAMES.map((_, weekday) => ({
      weekday,
      active: false,
      shifts: [{ start: "09:00", end: "13:00", slot: 30 }],
    }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    if (!branchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setSaved(false);
    api.doctorSchedule(doctor.id)
      .then((d) => {
        setDays(WEEKDAY_NAMES.map((_, weekday) => {
          const found = (d.schedule || []).filter(
            (s) => Number(s.weekday) === weekday && String(s.branch_id) === String(branchId)
          );
          if (found.length === 0) {
            return {
              weekday,
              active: false,
              shifts: [{ start: "09:00", end: "13:00", slot: 30 }],
            };
          }
          return {
            weekday,
            active: true,
            shifts: found.map((s) => ({
              start: s.start_time.slice(0, 5),
              end: s.end_time.slice(0, 5),
              slot: s.slot_minutes,
            })),
          };
        }));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [doctor.id, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleDay(weekday, active) {
    setDays((list) =>
      list.map((d) =>
        d.weekday === weekday
          ? { ...d, active, shifts: d.shifts.length ? d.shifts : [{ start: "09:00", end: "13:00", slot: 30 }] }
          : d
      )
    );
  }

  function updateShift(weekday, index, field, value) {
    setDays((list) =>
      list.map((d) => {
        if (d.weekday !== weekday) return d;
        const shifts = d.shifts.map((s, i) => (i === index ? { ...s, [field]: value } : s));
        return { ...d, shifts };
      })
    );
  }

  function addShift(weekday) {
    setDays((list) =>
      list.map((d) =>
        d.weekday === weekday
          ? { ...d, shifts: [...d.shifts, { start: "16:00", end: "21:00", slot: 30 }] }
          : d
      )
    );
  }

  function removeShift(weekday, index) {
    setDays((list) =>
      list.map((d) => {
        if (d.weekday !== weekday) return d;
        const shifts = d.shifts.filter((_, i) => i !== index);
        return { ...d, shifts: shifts.length ? shifts : [{ start: "09:00", end: "13:00", slot: 30 }] };
      })
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);

    // اعتبارسنجی
    for (const d of days) {
      if (!d.active) continue;
      for (const s of d.shifts) {
        if (s.start >= s.end) {
          setError(`در روز ${WEEKDAY_NAMES[d.weekday]}، ساعت شروع باید قبل از پایان باشد.`);
          setSaving(false);
          return;
        }
      }
    }

    try {
      const blocks = [];
      for (const d of days) {
        if (!d.active) continue;
        for (const s of d.shifts) {
          blocks.push({
            weekday: d.weekday,
            start_time: s.start,
            end_time: s.end,
            slot_minutes: Number(s.slot),
          });
        }
      }

      await api.setDoctorSchedule(doctor.id, { branch_id: Number(branchId), blocks });
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    border: `1px solid ${C.border}`,
    background: C.surface,
    color: C.ink,
    borderRadius: 8,
    padding: "6px 10px",
    fontFamily: "inherit",
    fontSize: 12.5,
    outline: "none",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}>
      <Card style={{ maxWidth: 760, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>برنامه کاری پزشک</div>
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4 }}>{doctor.full_name}</div>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "transparent", color: C.inkSoft, fontSize: 20, cursor: "pointer", fontFamily: "inherit" }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>شعبه</div>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            style={{ ...inputStyle, width: "100%", padding: "10px 12px", fontSize: 13 }}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {loading && <div style={{ fontSize: 13, color: C.inkSoft, padding: 20, textAlign: "center" }}>در حال بارگذاری...</div>}

        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {days.map((d) => (
              <div
                key={d.weekday}
                style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: d.active ? C.tealSoft : C.surfaceAlt,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: d.active ? 10 : 0 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: d.active ? C.tealDark : C.inkSoft, cursor: "pointer" }}>
                    <input type="checkbox" checked={d.active} onChange={(e) => toggleDay(d.weekday, e.target.checked)} />
                    {WEEKDAY_NAMES[d.weekday]}
                  </label>
                  {d.active && (
                    <button
                      onClick={() => addShift(d.weekday)}
                      style={{
                        border: `1px solid ${C.teal}55`, background: C.surface, color: C.tealDark,
                        borderRadius: 7, padding: "4px 10px", fontSize: 11.5, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      + افزودن شیفت
                    </button>
                  )}
                </div>

                {d.active && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {d.shifts.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11.5, color: C.inkSoft, minWidth: 50 }}>
                          شیفت {toFa(i + 1)}:
                        </span>
                        <input type="time" value={s.start} onChange={(e) => updateShift(d.weekday, i, "start", e.target.value)} style={{ ...inputStyle, width: 110 }} />
                        <span style={{ fontSize: 12, color: C.inkSoft }}>تا</span>
                        <input type="time" value={s.end} onChange={(e) => updateShift(d.weekday, i, "end", e.target.value)} style={{ ...inputStyle, width: 110 }} />
                        <select value={s.slot} onChange={(e) => updateShift(d.weekday, i, "slot", e.target.value)} style={{ ...inputStyle, width: 110 }}>
                          <option value={15}>۱۵ دقیقه</option>
                          <option value={20}>۲۰ دقیقه</option>
                          <option value={30}>۳۰ دقیقه</option>
                          <option value={45}>۴۵ دقیقه</option>
                          <option value={60}>۶۰ دقیقه</option>
                        </select>
                        {d.shifts.length > 1 && (
                          <button
                            onClick={() => removeShift(d.weekday, i)}
                            style={{
                              border: "none", background: C.claySoft, color: C.clay,
                              borderRadius: 7, padding: "5px 10px", fontSize: 11.5, fontWeight: 700,
                              cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {error && <div style={{ fontSize: 12.5, color: C.clay, marginTop: 6 }}>{error}</div>}
            {saved && <div style={{ fontSize: 12.5, color: C.tealDark, marginTop: 6 }}>برنامه ذخیره شد.</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={save}
                disabled={saving || !branchId}
                style={{
                  flex: 1, border: "none",
                  background: saving || !branchId ? "#9E9E9E" : C.teal,
                  color: "#fff", borderRadius: 9, padding: "10px 16px",
                  fontFamily: "inherit", fontWeight: 800,
                  cursor: saving || !branchId ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "در حال ذخیره..." : "ذخیره برنامه"}
              </button>
              <button
                onClick={onClose}
                style={{
                  border: `1px solid ${C.border}`,
                  background: C.surface, color: C.inkSoft,
                  borderRadius: 9, padding: "10px 16px",
                  fontFamily: "inherit", cursor: "pointer",
                }}
              >
                بستن
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
function AdminDoctors() {
  const { showSuccess, showError } = useToastContext();
  const [doctors, setDoctors] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState(null);
const [form, setForm] = useState({
  full_name: "",
  username: "",  // ← اضافه شد
  phone: "",
  email: "",
  password: "",
  medical_code: "",
  specialty_id: "",
  specialty_name: "",
  branch_id: "",
});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api.listDoctors()
      .then((d) => setDoctors(d?.doctors || []))
      .catch((e) => setError(e.message));
    api.listSpecialties()
      .then((d) => setSpecialties(d?.specialties || []))
      .catch(() => {});
    api.listBranches()
      .then((d) => setBranches(d?.branches || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

    function openAdd() {
    setForm({
      full_name: "",
      username: "",
      phone: "",
      email: "",
      password: "",
      medical_code: "",
      specialty_id: "",
      specialty_name: "",
      branch_id: branches[0]?.id || "",
    });
    setModal({ type: "form", doctor: null });
  }

  function openEdit(doctor) {
  setForm({
    full_name: doctor.full_name || "",
    username: doctor.username || "",  // ← اضافه شد
    phone: doctor.phone || "",
    email: doctor.email || "",
    password: "",  // ← رمز خالی می‌مونه (امنیت)
    medical_code: doctor.medical_code || "",
    specialty_id: doctor.specialty_id || "",
    specialty_name: doctor.specialty || "",
    branch_id: doctor.branch_id || "",
  });
  setModal({ type: "form", doctor });
}

  function closeModal() {
    setModal(null);
  }

  async function submitForm(e) {
    e.preventDefault();
    setSubmitting(true);
      let finalSpecialtyId = form.specialty_id ? Number(form.specialty_id) : undefined;
      
      // اگه specialty_name پر بود ولی specialty_id خالی بود، تخصص جدید بساز
      if (!finalSpecialtyId && form.specialty_name?.trim()) {
        const existing = specialties.find((s) => s.name === form.specialty_name.trim());
        if (existing) {
          finalSpecialtyId = existing.id;
        } else {
          try {
            const res = await api.createSpecialty(form.specialty_name.trim());
            const newSpecialty = res?.specialty || res;
            finalSpecialtyId = newSpecialty.id;
          } catch (err) {
            console.error("خطا در ساخت تخصص:", err);
          }
        }
      }
    try {
          if (modal?.doctor) {
  await api.updateDoctor(modal.doctor.id, {
    full_name: form.full_name.trim(),
    username: form.username.trim(),
    phone: form.phone.trim(),
    email: form.email.trim() || undefined,
    medical_code: form.medical_code.trim() || undefined,
    specialty_id: finalSpecialtyId,
    branch_id: form.branch_id ? Number(form.branch_id) : undefined,
    password: form.password.trim() || undefined,  // ← جدید: فقط اگر پر شده باشد
  });
      } else {
        // ساخت جدید
        if (!form.password || form.password.length < 8) {
          throw new Error("رمز عبور باید حداقل ۸ کاراکتر باشد");
        }
                await api.createUser({
  full_name: form.full_name.trim(),
  username: form.username.trim(),  // ← اضافه شد
  phone: form.phone.trim(),
  password: form.password,
  role: "doctor",
  branch_id: Number(form.branch_id),
  specialty_id: finalSpecialtyId,
  medical_code: form.medical_code?.trim() || undefined,
});
      }

          showSuccess(modal?.doctor ? "پزشک با موفقیت ویرایش شد" : "پزشک با موفقیت اضافه شد");
      closeModal();
      load();
    } catch (err) {
      showError(err.message || "خطا در ذخیره پزشک");
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(doctor) {
    setModal({ type: "delete", doctor });
  }
  function openSchedule(doctor) {
    setModal({ type: "schedule", doctor });
  }
    async function deactivateDoctorUI(d) {
    if (!confirm(`آیا از غیرفعال‌سازی «${d.full_name}» مطمئن هستید؟`)) return;
    try {
      await api.deactivateDoctor(d.id);
      showSuccess(`«${d.full_name}» غیرفعال شد`);
      load();
    } catch (e) {
      showError(e.message || "خطا در غیرفعال‌سازی");
    }
  }

   async function activateDoctorUI(d) {
    try {
      await api.activateDoctor(d.id);
      showSuccess(`«${d.full_name}» فعال شد`);
      load();
    } catch (e) {
      showError(e.message || "خطا در فعال‌سازی");
    }
  }
  const inputStyle = {
    width: "100%", boxSizing: "border-box", border: `1px solid ${C.border}`,
    background: C.surface, color: C.ink, borderRadius: 10, padding: "10px 12px",
    fontFamily: "inherit", fontSize: 13, outline: "none",
  };

  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!doctors) return <LoadingBlock label="در حال دریافت اطلاعات پزشکان..." />;

  const filtered = doctors.filter((d) => {
    const active = d.is_active !== false;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? active : !active);
    const q = search.trim().toLowerCase();
    return matchesStatus && (!q || [d.full_name, d.phone, d.specialty, d.medical_code].filter(Boolean).join(" ").toLowerCase().includes(q));
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>مدیریت پزشکان</div>
          <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 5 }}>ثبت، ویرایش و مدیریت پزشکان کلینیک</div>
        </div>
        <button
          onClick={openAdd}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            border: "none", background: C.teal, color: "#fff",
            borderRadius: 10, padding: "10px 15px", cursor: "pointer",
            fontFamily: "inherit", fontSize: 12.5, fontWeight: 800,
          }}
        >
          + افزودن پزشک
        </button>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 15, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو نام پزشک، تخصص یا شماره نظام..."
            style={{ ...inputStyle, maxWidth: 320 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 }}>
            {[["all", "همه"], ["active", "فعال"], ["inactive", "غیرفعال"]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                style={{
                  border: "none", borderRadius: 7, padding: "7px 11px",
                  background: statusFilter === key ? C.surface : "transparent",
                  color: statusFilter === key ? C.tealDark : C.inkSoft,
                  fontFamily: "inherit", fontSize: 11.5,
                  fontWeight: statusFilter === key ? 800 : 500,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "56px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>پزشک ثبت نشده است</div>
            <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 7 }}>
              برای شروع، یک پزشک جدید اضافه کنید.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: C.surfaceAlt }}>
                  {["ردیف", "نام پزشک", "کد کاربری", "تخصص", "تلفن", "شماره نظام", "وضعیت", "عملیات"].map((h) => (
                    <th key={h} style={{ textAlign: "right", padding: "12px 14px", color: C.inkSoft, fontWeight: 700, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr key={d.id}>
                    <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkFaint }}>{toFa(i + 1)}</td>
                    <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.ink, fontWeight: 700 }}>{d.full_name}</td>
<td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }} dir="ltr">{d.username || "—"}</td>
<td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }}>{d.specialty || "—"}</td>
                    <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }} dir="ltr">{d.phone || "—"}</td>
                    <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }} dir="ltr">{d.medical_code || "—"}</td>
                    <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                        background: d.is_active !== false ? C.tealSoft : C.claySoft,
                        color: d.is_active !== false ? C.tealDark : C.clay,
                      }}>
                        {d.is_active !== false ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                  <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}` }}>
  <div style={{ display: "flex", gap: 5 }}>
    <ActionButton icon={Edit3} variant="edit" onClick={() => openEdit(d)} title="ویرایش" />
    <ActionButton icon={CalendarDays} variant="schedule" onClick={() => openSchedule(d)} title="برنامه کاری" />
    <ActionButton icon={Trash2} variant="delete" onClick={() => confirmDelete(d)} title="حذف" />
    {d.is_active !== false ? (
      <ActionButton icon={Ban} variant="deactivate" onClick={() => deactivateDoctorUI(d)} title="غیرفعال‌سازی" />
    ) : (
      <ActionButton icon={Check} variant="activate" onClick={() => activateDoctorUI(d)} title="فعال‌سازی" />
    )}
  </div>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}>
          <Card style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            {modal.type === "form" && (
              <form onSubmit={submitForm}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 16 }}>
                  {modal.doctor ? "ویرایش پزشک" : "افزودن پزشک جدید"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>نام کامل *</div>
                    <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} style={inputStyle} required />
                  </div>
<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
  <div style={{ flex: 1, minWidth: 160 }}>
    <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>کد کاربری *</div>
    <input
      value={form.username}
      onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
      style={inputStyle}
      dir="ltr"
      placeholder="مثلاً: dr_hosseini"
      required
    />
  </div>
  
  <div style={{ flex: 1, minWidth: 160 }}>
    <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>
      رمز عبور {modal.doctor ? "(برای تغییر پر کنید)" : "* (حداقل ۸ کاراکتر)"}
    </div>
    <input 
      value={form.password} 
      onChange={(e) => setForm({ ...form, password: e.target.value })} 
      style={inputStyle} 
      dir="ltr" 
      type="password" 
      required={!modal.doctor}
    />
  </div>
</div>                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>تلفن *</div>
                      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} dir="ltr" maxLength={11} required />
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>ایمیل</div>
                      <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} dir="ltr" type="email" />
                    </div>
                  </div>
                  
                    
             
                                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>تخصص</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          list="specialties-list"
                          value={form.specialty_name || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = specialties.find((s) => s.name === val);
                            setForm({
                              ...form,
                              specialty_name: val,
                              specialty_id: found ? found.id : "",
                            });
                          }}
                          placeholder="تایپ یا انتخاب کنید..."
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <datalist id="specialties-list">
                          {specialties.map((s) => <option key={s.id} value={s.name} />)}
                        </datalist>
                        <button
                          type="button"
                          onClick={async () => {
                            const newName = (form.specialty_name || "").trim();
                            if (!newName) {
                              alert("لطفاً نام تخصص را وارد کنید");
                              return;
                            }
                            if (specialties.find((s) => s.name === newName)) {
                              alert("این تخصص قبلاً ثبت شده است");
                              return;
                            }
                            try {
                              const res = await api.createSpecialty(newName);
                              const newSpecialty = res?.specialty || res;
                              setSpecialties((prev) => [...prev, newSpecialty]);
                              setForm({ ...form, specialty_id: newSpecialty.id, specialty_name: newSpecialty.name });
                            } catch (err) {
                              alert("خطا در افزودن تخصص: " + (err.message || "خطای ناشناخته"));
                            }
                          }}
                          style={{
                            border: `1px solid ${C.teal}55`,
                            background: C.tealSoft,
                            color: C.tealDark,
                            borderRadius: 8,
                            padding: "0 14px",
                            fontFamily: "inherit",
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          + افزودن
                        </button>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>شماره نظام پزشکی</div>
                      <input value={form.medical_code} onChange={(e) => setForm({ ...form, medical_code: e.target.value })} style={inputStyle} dir="ltr" />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>شعبه *</div>
                    <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} style={inputStyle} required>
                      <option value="">— انتخاب کنید —</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="submit" disabled={submitting} style={{ flex: 1, border: "none", background: C.teal, color: "#fff", borderRadius: 9, padding: "10px 16px", fontFamily: "inherit", fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer" }}>
                      {submitting ? "در حال ذخیره..." : modal.doctor ? "ذخیره تغییرات" : "ثبت پزشک"}
                    </button>
                    <button type="button" onClick={closeModal} style={{ border: `1px solid ${C.border}`, background: C.surface, color: C.inkSoft, borderRadius: 9, padding: "10px 16px", fontFamily: "inherit", cursor: "pointer" }}>
                      انصراف
                    </button>
                  </div>
                </div>
              </form>
            )}

            {modal.type === "delete" && (
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 12 }}>حذف پزشک</div>
                <div style={{ padding: 13, borderRadius: 11, background: C.claySoft, color: C.clay, fontSize: 12.5, lineHeight: 1.9, marginBottom: 13 }}>
                  آیا از حذف پزشک <b>{modal.doctor?.full_name}</b> مطمئن هستید؟ اگر این پزشک سابقه ویزیت یا نوبت داشته باشد، حذف فیزیکی انجام نمی‌شود و غیرفعال خواهد شد.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={async () => {
                      try {
                                               const res = await api.deleteDoctor(modal.doctor.id);
                        closeModal();
                        load();
                        if (res?.message) showSuccess(res.message);
                      } catch (err) {
                        showError(err.message || "خطا در حذف پزشک");
                      }
                    }}
                    style={{ border: "none", background: C.clay, color: "#fff", borderRadius: 9, padding: "9px 15px", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}
                  >
                    تأیید حذف
                  </button>
                  <button onClick={closeModal} style={{ border: `1px solid ${C.border}`, background: C.surface, color: C.inkSoft, borderRadius: 9, padding: "9px 15px", fontFamily: "inherit", cursor: "pointer" }}>
                    انصراف
                  </button>
                </div>
              </div>
            )}

            {modal.type === "info" && (
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 12 }}>{modal.title}</div>
                <div style={{ padding: 13, borderRadius: 11, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.inkSoft, fontSize: 12.5, lineHeight: 2 }}>{modal.message}</div>
                <button onClick={closeModal} style={{ marginTop: 12, border: "none", background: C.teal, color: "#fff", borderRadius: 9, padding: "9px 18px", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}>متوجه شدم</button>
              </div>
            )}
            {modal.type === "schedule" && (
              <DoctorScheduleModal
                doctor={modal.doctor}
                branches={branches}
                onClose={closeModal}
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
function AssignOfficeModal({ branch, onClose, onAssigned }) {
  const [offices, setOffices] = useState([]);
  const [assignedOffices, setAssignedOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      api.listOffices(),
      api.listOffices({ branch_id: branch.id }),
    ])
      .then(([allRes, assignedRes]) => {
        setOffices(allRes?.offices || []);
        setAssignedOffices(assignedRes?.offices || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [branch.id]);

  useEffect(() => {
    load();
  }, [load]);

  const assignedIds = new Set(assignedOffices.map((o) => o.id));

  async function assign(officeId) {
    setSubmitting(true);
    setError(null);
    try {
      await api.assignOfficeToBranch(officeId, branch.id);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function unassign(officeId) {
    setSubmitting(true);
    setError(null);
    try {
      await api.removeOfficeFromBranch(officeId, branch.id);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}>
      <Card style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>
              اختصاص مطب به شعبه
            </div>
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4 }}>
              {branch.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "transparent", color: C.inkSoft, fontSize: 20, cursor: "pointer", fontFamily: "inherit" }}
          >
            ✕
          </button>
        </div>

        {loading && <div style={{ fontSize: 13, color: C.inkSoft, padding: 20, textAlign: "center" }}>در حال بارگذاری...</div>}

        {error && (
          <div style={{ padding: 13, borderRadius: 11, background: C.claySoft, color: C.clay, fontSize: 12.5, marginBottom: 13 }}>
            {error}
          </div>
        )}

        {!loading && offices.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: C.inkSoft }}>
            هنوز مطبی ثبت نشده است. اول از منوی «مطب‌ها» مطب بسازید.
          </div>
        )}

        {!loading && offices.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {offices.map((o) => {
              const isAssigned = assignedIds.has(o.id);
              return (
                <div
                  key={o.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 10,
                    background: isAssigned ? C.tealSoft : C.surfaceAlt,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>
                      {o.address || "بدون آدرس"}
                    </div>
                  </div>
                  <button
                    onClick={() => isAssigned ? unassign(o.id) : assign(o.id)}
                    disabled={submitting}
                    style={{
                      border: "none", borderRadius: 8,
                      background: isAssigned ? C.clay : C.teal,
                      color: "#fff", padding: "6px 14px",
                      fontSize: 12, fontWeight: 700,
                      cursor: submitting ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {isAssigned ? "حذف" : "افزودن"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onAssigned}
          style={{
            marginTop: 16, width: "100%",
            border: "none", background: C.teal, color: "#fff",
            borderRadius: 9, padding: "10px 16px",
            fontFamily: "inherit", fontWeight: 800, cursor: "pointer",
          }}
        >
          بستن
        </button>
      </Card>
    </div>
  );
}
function AdminBranches() {
const { showSuccess, showError } = useToastContext();
  const [branches, setBranches] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);   // ← جدید

  const load = useCallback(() => {
    setError(null);
    api.listBranches()
      .then((d) => setBranches(d?.branches || []))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredBranches = useMemo(() => {
    if (!branches) return [];
    const q = search.trim().toLowerCase();
    return branches.filter((b) => {
      const active = b.is_active !== false;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? active : !active);
      const haystack = [b.name, b.address, b.phone].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [branches, search, statusFilter]);

  const activeCount = branches?.filter((b) => b.is_active !== false).length || 0;
  const inactiveCount = branches?.filter((b) => b.is_active === false).length || 0;

  function openAdd() {
    setForm({ name: "", address: "", phone: "" });
    setModal({ type: "form", branch: null });
  }

  function openEdit(branch) {
    setForm({ name: branch.name || "", address: branch.address || "", phone: branch.phone || "" });
    setModal({ type: "form", branch });
  }

  function closeModal() {
    setModal(null);
  }

  async function submitForm(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
      };

      if (modal?.branch) {
        await api.updateBranch(modal.branch.id, payload);
      } else {
        await api.createBranch(payload);
      }

          showSuccess(modal?.branch ? "شعبه با موفقیت ویرایش شد" : "شعبه با موفقیت اضافه شد");
      closeModal();
      load();
    } catch (err) {
      showError(err.message || "خطا در ذخیره شعبه");
    } finally {
      setSubmitting(false);
    }
  }
  function confirmDelete(branch) {
    setModal({ type: "delete", branch });
  }
    async function deactivateBranchUI(b) {
    if (!confirm(`آیا از غیرفعال‌سازی «${b.name}» مطمئن هستید؟`)) return;
    try {
      await api.deactivateBranch(b.id);
      showSuccess(`«${b.name}» غیرفعال شد`);
      load();
    } catch (e) {
      showError(e.message || "خطا در غیرفعال‌سازی");
    }
  }

   async function activateBranchUI(b) {
    try {
      await api.activateBranch(b.id);
      showSuccess(`«${b.name}» فعال شد`);
      load();
    } catch (e) {
      showError(e.message || "خطا در فعال‌سازی");
    }
  }

  function assignOffice(branch) {
    setModal({ type: "assign", branch });
  }

  function goToOffices() {
    closeModal();
    window.dispatchEvent(new CustomEvent("clinic-nav", { detail: "offices" }));
  }

  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!branches) return <LoadingBlock label="در حال دریافت اطلاعات شعبه‌ها..." />;

  const inputStyle = {
    width: "100%", boxSizing: "border-box", border: `1px solid ${C.border}`,
    background: C.surface, color: C.ink, borderRadius: 10, padding: "10px 12px",
    fontFamily: "inherit", fontSize: 13, outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        .branch-table-row:hover { background: ${C.surfaceAlt} !important; }
        .branch-action-btn:hover { transform: translateY(-1px); }
        @media (max-width: 900px) {
          .branch-stats { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
          .branch-toolbar { flex-direction: column !important; align-items: stretch !important; }
          .branch-search { min-width: 0 !important; width: 100% !important; }
        }
        @media (max-width: 650px) {
          .branch-stats { grid-template-columns: 1fr !important; }
          .branch-table-wrap { overflow-x: auto; }
          .branch-table { min-width: 820px; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>مدیریت شعب</div>
          <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 5 }}>ثبت، ویرایش و مدیریت شعب کلینیک</div>
        </div>
        <button
          onClick={openAdd}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "none", background: C.teal, color: "#fff", borderRadius: 10, padding: "10px 15px", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, boxShadow: "0 5px 14px rgba(13,148,136,.16)" }}
        >
          <Plus size={17} /> افزودن شعبه
        </button>
      </div>

      <div className="branch-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
        {[
          ["کل شعب", branches.length, Building2, C.blue, C.blueSoft],
          ["شعب فعال", activeCount, CheckCircle2, C.teal, C.tealSoft],
          ["شعب غیرفعال", inactiveCount, XCircle, C.clay, C.claySoft],
        ].map(([label, value, Icon, color, bg]) => (
          <Card key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={19} /></div>
            <div><div style={{ fontSize: 11.5, color: C.inkSoft }}>{label}</div><div style={{ fontSize: 20, fontWeight: 800, color: C.ink, marginTop: 2 }}>{toFa(value)}</div></div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div className="branch-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 15, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ position: "relative", minWidth: 300, flex: 1 }} className="branch-search">
            <Search size={16} color={C.inkFaint} style={{ position: "absolute", right: 11, top: 11 }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی نام شعبه، آدرس یا تلفن..." style={{ ...inputStyle, paddingRight: 36 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 }}>
            {[['all', 'همه'], ['active', 'فعال'], ['inactive', 'غیرفعال']].map(([key, label]) => (
              <button key={key} onClick={() => setStatusFilter(key)} style={{ border: "none", borderRadius: 7, padding: "7px 11px", background: statusFilter === key ? C.surface : "transparent", color: statusFilter === key ? C.tealDark : C.inkSoft, fontFamily: "inherit", fontSize: 11.5, fontWeight: statusFilter === key ? 800 : 500, cursor: "pointer", boxShadow: statusFilter === key ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>{label}</button>
            ))}
          </div>
        </div>

        {filteredBranches.length === 0 ? (
          <EmptyState icon={Building2} title="شعبه‌ای پیدا نشد" desc={search ? "عبارت جستجو یا فیلتر وضعیت را تغییر دهید." : "هنوز شعبه‌ای برای نمایش ثبت نشده است."} />
        ) : (
          <div className="branch-table-wrap">
            <table className="branch-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: C.surfaceAlt }}>
                  {['ردیف', 'نام شعبه', 'آدرس', 'تلفن', 'مطب‌ها', 'پزشکان', 'وضعیت', 'عملیات'].map((h) => (
                    <th key={h} style={{ textAlign: "right", padding: "12px 14px", color: C.inkSoft, fontWeight: 700, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBranches.map((b, index) => {
                  const active = b.is_active !== false;
                  return (
                    <tr key={b.id} className="branch-table-row" style={{ transition: "background .15s" }}>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkFaint }}>{toFa(index + 1)}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.ink, fontWeight: 800, whiteSpace: "nowrap" }}>{b.name || "بدون نام"}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft, maxWidth: 260 }}>{b.address || <span style={{ color: C.inkFaint }}>ثبت نشده</span>}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft, direction: "ltr", textAlign: "right", whiteSpace: "nowrap" }}>{b.phone || <span style={{ direction: "rtl", display: "inline-block", color: C.inkFaint }}>ثبت نشده</span>}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }}>{toFa(b.office_count || 0)}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }}>{toFa(b.doctor_count || 0)}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 20, background: active ? C.tealSoft : C.claySoft, color: active ? C.tealDark : C.clay, fontSize: 10.5, fontWeight: 800 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? C.teal : C.clay }} /> {active ? "فعال" : "غیرفعال"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
  <ActionButton icon={Edit3} variant="edit" onClick={() => openEdit(b)} title="ویرایش" />
  <ActionButton icon={DoorOpen} variant="assign" onClick={() => assignOffice(b)} title="تخصیص مطب" />
  <ActionButton icon={Trash2} variant="delete" onClick={() => confirmDelete(b)} title="حذف" />
  {b.is_active !== false ? (
    <ActionButton icon={Ban} variant="deactivate" onClick={() => deactivateBranchUI(b)} title="غیرفعال‌سازی" />
  ) : (
    <ActionButton icon={Check} variant="activate" onClick={() => activateBranchUI(b)} title="فعال‌سازی" />
  )}
</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 15px", background: C.surfaceAlt, borderTop: `1px solid ${C.border}`, color: C.inkFaint, fontSize: 10.8 }}>
          <span>{toFa(filteredBranches.length)} شعبه نمایش داده می‌شود</span>
          <span>برای حذف شعبه، وجود وابستگی‌های تاریخی در بک‌اند بررسی خواهد شد.</span>
        </div>
      </Card>

      {modal && (
        <div onMouseDown={(e) => e.target === e.currentTarget && closeModal()} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(7,18,24,.48)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
          <Card style={{ width: "min(520px, 100%)", maxHeight: "90vh", overflowY: "auto", padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 17px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: C.ink }}>{modal.type === "form" ? (modal.branch ? "ویرایش شعبه" : "افزودن شعبه") : modal.title || (modal.type === "delete" ? "حذف شعبه" : "تخصیص مطب")}</div>
              <button onClick={closeModal} style={{ width: 30, height: 30, border: `1px solid ${C.border}`, background: C.surface, color: C.inkSoft, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
            </div>

            {modal.type === "form" && (
              <form onSubmit={submitForm} style={{ padding: 17, display: "flex", flexDirection: "column", gap: 13 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={{ fontSize: 11.5, color: C.inkSoft }}>نام شعبه *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً شعبه مرکزی" style={{ ...inputStyle, marginTop: 6 }} /></label>
                  <label style={{ fontSize: 11.5, color: C.inkSoft }}>تلفن<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={11} placeholder="۰۲۱..." style={{ ...inputStyle, marginTop: 6, direction: "ltr", textAlign: "right" }} /></label>
                </div>
                <label style={{ fontSize: 11.5, color: C.inkSoft }}>آدرس<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="آدرس کامل شعبه" style={{ ...inputStyle, marginTop: 6 }} /></label>
                <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, color: C.inkFaint, fontSize: 11, lineHeight: 1.8 }}>اطلاعات پزشکان و مطب‌های شعبه از روابط مستقل مدیریت خواهند شد و در فرم شعبه به‌صورت دستی وارد نمی‌شوند.</div>
                <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, marginTop: 3 }}>
                  <button type="submit" style={{ border: "none", background: C.teal, color: "#fff", borderRadius: 9, padding: "9px 16px", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}>{modal.branch ? "ذخیره تغییرات" : "ثبت شعبه"}</button>
                  <button type="button" onClick={closeModal} style={{ border: `1px solid ${C.border}`, background: C.surface, color: C.inkSoft, borderRadius: 9, padding: "9px 16px", fontFamily: "inherit", cursor: "pointer" }}>انصراف</button>
                </div>
              </form>
            )}

          {modal.type === "delete" && (
  <div style={{ padding: 18 }}>
    <div style={{ display: "flex", gap: 11, padding: 12, borderRadius: 11, background: C.claySoft, color: C.clay, marginBottom: 14 }}>
      <Trash2 size={19} />
      <div style={{ fontSize: 12.5, lineHeight: 1.9 }}>
        آیا از حذف شعبه <b>{modal.branch?.name}</b> مطمئن هستید؟ در نسخه نهایی، اگر این شعبه سابقه وابسته داشته باشد، حذف فیزیکی انجام نمی‌شود و شعبه غیرفعال خواهد شد.
      </div>
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <button
        onClick={async () => {
          try {
                        const res = await api.deleteBranch(modal.branch.id);
            closeModal();
            load();
            if (res?.message) showSuccess(res.message);
          } catch (err) {
            showError(err.message || "خطا در حذف شعبه");
          }
        }}
        style={{
          border: "none",
          background: C.clay,
          color: "#fff",
          borderRadius: 9,
          padding: "9px 15px",
          fontFamily: "inherit",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        تأیید حذف
      </button>
      <button
        onClick={closeModal}
        style={{
          border: `1px solid ${C.border}`,
          background: C.surface,
          color: C.inkSoft,
          borderRadius: 9,
          padding: "9px 15px",
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        انصراف
      </button>
    </div>
  </div>
)}

            {modal.type === "assign" && (
              <div style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><div style={{ width: 38, height: 38, borderRadius: 11, background: C.tealSoft, color: C.teal, display: "flex", alignItems: "center", justifyContent: "center" }}><DoorOpen size={19} /></div><div><div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>{modal.branch?.name}</div><div style={{ fontSize: 10.8, color: C.inkFaint, marginTop: 2 }}>مدیریت ارتباط شعبه با مطب‌ها</div></div></div>
                <div style={{ border: `1px dashed ${C.borderStrong}`, borderRadius: 11, padding: 15, background: C.surfaceAlt, color: C.inkSoft, fontSize: 12, lineHeight: 1.9 }}>ساختار N:M شعبه و مطب در نظر گرفته شده است. تخصیص واقعی مطب‌ها بعد از تکمیل صفحه «مدیریت مطب‌ها» انجام می‌شود تا یک مطب بتواند طبق توافق به‌صورت مستقل مدیریت و در صورت نیاز به چند شعبه متصل شود.</div>
                <button onClick={goToOffices} style={{ marginTop: 12, width: "100%", border: `1px solid ${C.teal}44`, background: C.tealSoft, color: C.tealDark, borderRadius: 9, padding: "9px 12px", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}>رفتن به مدیریت مطب‌ها</button>
              </div>
            )}

            {modal.type === "info" && (
              <div style={{ padding: 18 }}>
                <div style={{ padding: 13, borderRadius: 11, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.inkSoft, fontSize: 12.5, lineHeight: 2 }}>{modal.message}</div>
                <button onClick={closeModal} style={{ marginTop: 12, border: "none", background: C.teal, color: "#fff", borderRadius: 9, padding: "9px 18px", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}>متوجه شدم</button>
              </div>
            )}
            {modal.type === "assign" && (
              <AssignOfficeModal
                branch={modal.branch}
                onClose={closeModal}
                onAssigned={() => {
                  closeModal();
                  load();
                }}
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
function VisitQuickForm({ appt, doctorId, onDone }) {
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [medicine, setMedicine] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const inputStyle = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "9px 12px", fontSize: 13.5, fontFamily: "inherit", color: C.ink, boxSizing: "border-box",
  };

    async function submit() {
    if (!appt || !diagnosis.trim() || !doctorId) return;
    setSubmitting(true);
    setError(null);
    try {
      const prescriptions = medicine.trim()
        ? [{ medicine: medicine.trim(), dosage: "", duration: "", notes: "" }]
        : [];

      await api.createVisit({
        appointment_id: appt.id,
        patient_id: appt.patient_id,
        doctor_id: doctorId,
        diagnosis: diagnosis.trim(),
        treatment_plan: treatment.trim(),
        prescriptions,
      });

      setDiagnosis("");
      setTreatment("");
      setMedicine("");
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginTop: 8, marginBottom: 8, display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="تشخیص" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      <textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="روند درمان (اختیاری)" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      <input value={medicine} onChange={(e) => setMedicine(e.target.value)} placeholder="نام دارو (اختیاری، برای نسخه کامل‌تر به «نسخه‌نویسی» بروید)" style={inputStyle} />
      {error && <div style={{ fontSize: 12, color: C.clay }}>{error}</div>}
      <button
        onClick={submit}
        disabled={submitting || !diagnosis}
        style={{
          padding: "9px 0", borderRadius: 8, border: "none",
          background: submitting || !diagnosis ? C.borderStrong : C.teal, color: submitting || !diagnosis ? C.inkSoft : "#fff",
          fontSize: 13, fontWeight: 700, cursor: submitting || !diagnosis ? "not-allowed" : "pointer", fontFamily: "inherit",
        }}
      >
        {submitting ? "در حال ثبت..." : "ثبت ویزیت و تکمیل نوبت"}
      </button>
    </div>
  );
}

function DoctorCalendar({ doctorId }) {
  const [date, setDate] = useState(todayJalali());
  const [appts, setAppts] = useState(null);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    if (!doctorId) return;
    setAppts(null);
    const g = jalaliToGregorian(date.jy, date.jm, date.jd);
    const dateStr = `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
    api.listAppointments({ doctor_id: doctorId, date: dateStr })
      .then((d) => setAppts(d.appointments))
      .catch((e) => setError(e.message));
  }, [doctorId, date]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ width: 288 }}>
       <JalaliDatePicker value={date} onChange={setDate} label="انتخاب روز" />
      </div>
      <Card style={{ flex: 1, minWidth: 280 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, marginBottom: 4 }}>برنامه {jalaliLabel(date, true)}</div>
        {error && <ErrorBlock message={error} />}
        {!error && !appts && <LoadingBlock />}
        {!error && appts && appts.length === 0 && (
          <div style={{ fontSize: 12.5, color: C.inkFaint, padding: "20px 0" }}>نوبتی برای این روز ثبت نشده است.</div>
        )}
        {!error && appts && appts.length > 0 && (
          <>
            <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>{toFa(appts.length)} ویزیت برنامه‌ریزی‌شده</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {appts.map((a, i) => {
                const canVisit = a.status === "checked_in" || a.status === "in_visit";
                return (
                  <div key={a.id} style={{ borderTop: i > 0 ? `1px solid ${C.border}` : "none", padding: "12px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 52, fontSize: 13, fontWeight: 700, color: C.teal, flexShrink: 0 }}>
                        {new Date(a.appointment_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, color: C.ink, fontWeight: 600 }}>{a.patient_name}</div>
                        <div style={{ fontSize: 12, color: C.inkFaint }}>{a.patient_phone}</div>
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: STATUS_STYLE[a.status]?.bg || C.surfaceAlt, color: STATUS_STYLE[a.status]?.text || C.inkSoft, flexShrink: 0 }}>
  {STATUS_LABEL[a.status] || a.status}
</div>
                      {canVisit && (
                        <button
                          onClick={() => setOpenId(openId === a.id ? null : a.id)}
                          style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: 8, padding: "5px 10px", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", color: C.teal, fontWeight: 700, flexShrink: 0 }}
                        >
                          {openId === a.id ? "بستن" : "ثبت ویزیت"}
                        </button>
                      )}
                    </div>
                    {openId === a.id && (
                      <VisitQuickForm appt={a} doctorId={doctorId} onDone={() => { setOpenId(null); load(); }} />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function SecretaryBooking({ branchId }) {
  const { showSuccess, showError } = useToastContext();
  const [date, setDate] = useState(todayJalali());
  const [doctors, setDoctors] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [dayAppts, setDayAppts] = useState(null);
  const [slot, setSlot] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientList, setShowPatientList] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  // جستجوی زنده بیماران
  useEffect(() => {
    if (!patientSearch || patientSearch.trim().length < 2) {
      setPatientResults([]);
      setShowPatientList(false);
      return;
    }
    const timer = setTimeout(() => {
      setSearchingPatients(true);
      api.searchPatients(patientSearch.trim())
        .then((d) => {
          setPatientResults(d?.patients || []);
          setShowPatientList(true);
        })
        .catch(() => setPatientResults([]))
        .finally(() => setSearchingPatients(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  function selectPatient(patient) {
    setSelectedPatient(patient);
    setName(patient.full_name);
    setPhone(patient.phone);
    setPatientSearch(patient.full_name);
    setShowPatientList(false);
  }

  function clearSelectedPatient() {
    setSelectedPatient(null);
    setName("");
    setPhone("");
    setPatientSearch("");
    setPatientResults([]);
    setShowPatientList(false);
  }
  useEffect(() => {
    api.listDoctors(branchId).then((d) => {
      setDoctors(d.doctors);
      if (d.doctors[0]) setDoctorId(d.doctors[0].id);
    }).catch((e) => setError(e.message));
  }, [branchId]);

  useEffect(() => {
    if (!doctorId) return;
    setSchedule(null);
    setDayAppts(null);
    setSlot(null);
    api.doctorSchedule(doctorId).then((d) => setSchedule(d.schedule)).catch((e) => setError(e.message));
    const g = jalaliToGregorian(date.jy, date.jm, date.jd);
    const dateStr = `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
    api.listAppointments({ doctor_id: doctorId, date: dateStr })
      .then((d) => setDayAppts(d.appointments))
      .catch((e) => setError(e.message));
  }, [doctorId, date]);

  const slots = useMemo(() => {
    if (!schedule || !dayAppts) return null;
    const weekday = jalaliWeekdayIndex(date);
    const todays = schedule.filter((s) => s.weekday === weekday);
    if (todays.length === 0) return [];

    const taken = new Set(
      dayAppts
        .filter((a) => a.status !== "cancelled")
        .map((a) => new Date(a.appointment_at).toTimeString().slice(0, 5))
    );

    const list = [];
    for (const block of todays) {
      let [h, m] = block.start_time.split(":").map(Number);
      const [endH, endM] = block.end_time.split(":").map(Number);
      while (h < endH || (h === endH && m < endM)) {
        const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        list.push({ label, taken: taken.has(label) });
        m += block.slot_minutes;
        while (m >= 60) { m -= 60; h += 1; }
      }
    }
    return list;
  }, [schedule, dayAppts, date]);

  async function submit() {
    if (!name || !phone || !slot || !doctorId) return;
    setSubmitting(true);
    setError(null);
    try {
      let patientId;
      const found = await api.searchPatients(phone);
      const exact = found.patients.find((p) => p.phone === phone);
      if (exact) {
        patientId = exact.id;
      } else {
        const created = await api.createPatient({ full_name: name, phone });
        patientId = created.patient.id;
      }

      const appointmentAt = jalaliToDate(date, slot).toISOString();
      await api.createAppointment({
        patient_id: patientId, doctor_id: doctorId, branch_id: branchId, appointment_at: appointmentAt,
      });
showSuccess(`نوبت ${name} برای ساعت ${toFa(slot)} ${jalaliLabel(date, false)} ثبت شد`);
      setConfirmed({ name, slot, date: { ...date } });
      setName(""); setPhone(""); setSlot(null);
      // به‌روزرسانی فهرست نوبت‌ها تا اسلات تازه رزروشده غیرفعال شود
      const g = jalaliToGregorian(date.jy, date.jm, date.jd);
      const dateStr = `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
      const refreshed = await api.listAppointments({ doctor_id: doctorId, date: dateStr });
      setDayAppts(refreshed.appointments);
        } catch (e) {
      showError(e.message || "خطا در ثبت نوبت");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "10px 14px", fontSize: 14, fontFamily: "inherit", color: C.ink, boxSizing: "border-box",
  };

  if (!doctors) return <LoadingBlock label="در حال دریافت فهرست پزشکان..." />;
  if (doctors.length === 0) {
    return <EmptyState icon={Stethoscope} title="پزشکی برای این شعبه ثبت نشده" desc="از طریق اسکریپت seed یا API، حداقل یک پزشک به شعبه اضافه کنید." />;
  }

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 288 }}>
       <JalaliDatePicker value={date} onChange={setDate} label="تاریخ نوبت" />
        <div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>پزشک</div>
          <select value={doctorId || ""} onChange={(e) => setDoctorId(Number(e.target.value))} style={inputStyle}>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name} — {d.specialty || "بدون تخصص ثبت‌شده"}</option>)}
          </select>
        </div>
             {/* جستجوی بیمار */}
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>
            بیمار {selectedPatient && <span style={{ color: C.teal, fontWeight: 700 }}>(انتخاب‌شده)</span>}
          </div>
          {selectedPatient ? (
            <div style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.teal}`, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.tealDark }}>{selectedPatient.full_name}</div>
                <div style={{ fontSize: 11.5, color: C.tealDark, marginTop: 2 }} dir="ltr">{selectedPatient.phone}</div>
              </div>
              <button
                type="button"
                onClick={clearSelectedPatient}
                style={{ border: "none", background: "transparent", color: C.clay, cursor: "pointer", fontSize: 16, padding: 4 }}
                title="حذف انتخاب"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                onFocus={() => { if (patientResults.length > 0) setShowPatientList(true); }}
                placeholder="نام یا شماره تماس بیمار را وارد کنید..."
                style={inputStyle}
              />
              {searchingPatients && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, left: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, fontSize: 12, color: C.inkSoft, zIndex: 50 }}>
                  در حال جستجو...
                </div>
              )}
              {showPatientList && patientResults.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, left: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)", maxHeight: 220, overflowY: "auto", zIndex: 50 }}>
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPatient(p)}
                      style={{ width: "100%", textAlign: "right", border: "none", background: "transparent", padding: "10px 12px", cursor: "pointer", fontFamily: "inherit", borderBottom: `1px solid ${C.border}` }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{p.full_name}</div>
                      <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 2 }} dir="ltr">{p.phone}</div>
                    </button>
                  ))}
                </div>
              )}
              {showPatientList && patientResults.length === 0 && !searchingPatients && patientSearch.trim().length >= 2 && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, left: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, fontSize: 12, color: C.inkFaint, zIndex: 50 }}>
                  بیماری با این مشخصات پیدا نشد. از منوی «بیماران» بیمار جدید ثبت کنید.
                </div>
              )}
            </>
          )}
        </div>
               <button
          onClick={submit}
          disabled={submitting || !selectedPatient || !slot}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "11px 0", borderRadius: 10, border: "none",
            background: submitting || !selectedPatient || !slot ? C.borderStrong : C.saffron,
            color: submitting || !selectedPatient || !slot ? C.inkSoft : "#fff",
            fontSize: 14, fontWeight: 700,
            cursor: submitting || !selectedPatient || !slot ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}
        >
          <Plus size={16} /> {submitting ? "در حال ثبت..." : "ثبت نوبت"}
        </button>
        {error && <ErrorBlock message={error} />}
        {confirmed && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: C.tealSoft, borderRadius: 10, padding: "10px 12px" }}>
            <CheckCircle2 size={17} color={C.tealDark} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: C.tealDark, lineHeight: 1.9 }}>
              نوبت {confirmed.name} برای ساعت {toFa(confirmed.slot)} {jalaliLabel(confirmed.date, false)} ثبت شد.
            </div>
          </div>
        )}
      </div>

      <Card style={{ flex: 1, minWidth: 280 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, marginBottom: 4 }}>ساعت‌های خالی</div>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>{jalaliLabel(date, true)}</div>
        {slots === null && <LoadingBlock />}
        {slots && slots.length === 0 && (
          <div style={{ fontSize: 12.5, color: C.inkFaint, padding: "20px 0" }}>پزشک انتخاب‌شده در این روز برنامه حضور ندارد.</div>
        )}
        {slots && slots.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 }}>
            {slots.map((s) => {
              const isSel = slot === s.label;
              return (
                <button
                  key={s.label}
                  disabled={s.taken}
                  onClick={() => setSlot(s.label)}
                  style={{
                    padding: "9px 0", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit",
                    border: `1px solid ${isSel ? C.saffron : C.border}`,
                    background: s.taken ? "#F2F2F0" : isSel ? C.saffronSoft : C.surface,
                    color: s.taken ? C.inkFaint : isSel ? C.saffronDark : C.ink,
                    fontWeight: isSel ? 700 : 500,
                    textDecoration: s.taken ? "line-through" : "none",
                    cursor: s.taken ? "not-allowed" : "pointer",
                  }}
                >
                  {toFa(s.label)}
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function SecretaryQueue({ branchId }) {
const [bulkRescheduleForm, setBulkRescheduleForm] = useState({ date: "", dateObj: null, reason: "" });
 const { showSuccess, showError } = useToastContext(); 
  const [appts, setAppts] = useState(null);
  const [filter, setFilter] = useState("active");
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);
const [rescheduleModal, setRescheduleModal] = useState(null);
const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "", reason: "" });
const [rescheduling, setRescheduling] = useState(false);
const [availableSlots, setAvailableSlots] = useState([]);
const [loadingSlots, setLoadingSlots] = useState(false);
const [selectedJalaliDate, setSelectedJalaliDate] = useState(null);
const [bulkRescheduleModal, setBulkRescheduleModal] = useState(false);
const [bulkRescheduling, setBulkRescheduling] = useState(false);
const [bulkResult, setBulkResult] = useState(null);

  const load = useCallback(() => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    api.listAppointments({ branch_id: branchId, date: dateStr })
      .then((d) => setAppts(d.appointments))
      .catch((e) => setError(e.message));
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  async function advance(a) {
    const next = NEXT_STATUS[a.status];
    if (!next) return;
    setUpdating(a.id);
    try {
      await api.updateAppointmentStatus(a.id, next);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  }
async function loadAvailableSlots(doctorId, dateObj) {
  if (!doctorId || !dateObj) return;
  setLoadingSlots(true);
  setAvailableSlots([]);
  try {
    // ۱. گرفتن برنامه کاری پزشک
    const scheduleRes = await api.doctorSchedule(doctorId);
    const schedule = scheduleRes.schedule || [];

    // ۲. تبدیل تاریخ شمسی به میلادی
    const g = jalaliToGregorian(dateObj.jy, dateObj.jm, dateObj.jd);
    const dateStr = `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;

    // ۳. گرفتن نوبت‌های روز جدید
    const apptsRes = await api.listAppointments({ doctor_id: doctorId, date: dateStr });
    const dayAppts = apptsRes.appointments || [];

    // ۴. محاسبه روز هفته شمسی
    const weekday = jalaliWeekdayIndex(dateObj);
    const todaysSchedule = schedule.filter((s) => Number(s.weekday) === weekday);

    if (todaysSchedule.length === 0) {
      setAvailableSlots([]);
      return;
    }

    // ۵. پیدا کردن ساعت‌های رزرو شده
    const taken = new Set(
      dayAppts
        .filter((a) => a.status !== "cancelled")
        .map((a) => new Date(a.appointment_at).toTimeString().slice(0, 5))
    );

    // ۶. ساخت لیست ساعت‌های خالی
    const list = [];
    for (const block of todaysSchedule) {
      let [h, m] = block.start_time.split(":").map(Number);
      const [endH, endM] = block.end_time.split(":").map(Number);
      while (h < endH || (h === endH && m < endM)) {
        const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        list.push({ label, available: !taken.has(label) });
        m += block.slot_minutes;
        while (m >= 60) { m -= 60; h += 1; }
      }
    }
    setAvailableSlots(list);
  } catch (e) {
    console.error(e);
    setAvailableSlots([]);
  } finally {
    setLoadingSlots(false);
  }
}
  async function cancel(a) {
    setUpdating(a.id);
    try {
      await api.updateAppointmentStatus(a.id, "cancelled");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  }

  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!appts) return <LoadingBlock label="در حال دریافت صف امروز..." />;

  const activeAppts = appts.filter((a) => !["completed", "cancelled", "no_show"].includes(a.status));
  const filtered = filter === "active" ? activeAppts : filter === "all" ? appts : appts.filter((a) => a.status === filter);
  const counts = { all: appts.length, active: activeAppts.length, booked: appts.filter((a) => a.status === "booked").length, checked_in: appts.filter((a) => a.status === "checked_in").length, in_visit: appts.filter((a) => a.status === "in_visit").length };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 9 }}>
        {[
          ["active", "صف فعال", counts.active], ["booked", "در انتظار", counts.booked], ["checked_in", "پذیرش‌شده", counts.checked_in], ["in_visit", "در حال ویزیت", counts.in_visit], ["all", "کل امروز", counts.all],
        ].map(([key, label, count]) => (
          <button key={key} onClick={() => setFilter(key)} style={{ textAlign: "right", border: `1px solid ${filter === key ? C.teal : C.border}`, background: filter === key ? C.tealSoft : C.surface, borderRadius: 11, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit" }}>
            <div style={{ fontSize: 11.5, color: C.inkFaint }}>{label}</div><div style={{ fontSize: 20, fontWeight: 800, color: filter === key ? C.tealDark : C.ink, marginTop: 3 }}>{toFa(count)}</div>
          </button>
        ))}
      </div>
{appts.length > 0 && (
  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
    <button
      onClick={() => {
        setBulkRescheduleModal(true);
        setBulkRescheduleForm({ date: "", reason: "" });
        setBulkResult(null);
      }}
      style={{
        border: `1px solid ${C.clay}`, background: C.claySoft, color: C.clay,
        borderRadius: 9, padding: "8px 14px", fontFamily: "inherit", fontWeight: 800,
        fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6
      }}
    >
      <CalendarDays size={16} /> انتقال همه نوبت‌های امروز
    </button>
  </div>
)}
      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title={appts.length === 0 ? "امروز نوبتی ثبت نشده" : "موردی در این فیلتر نیست"} desc={appts.length === 0 ? "از تب «نوبت‌دهی» یک نوبت جدید ثبت کنید تا اینجا نمایش داده شود." : "برای مشاهده سایر وضعیت‌ها، فیلتر دیگری را انتخاب کنید."} />
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {filtered.map((a, i) => (
        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>
          <div style={{ width: 46, fontSize: 13, fontWeight: 700, color: C.ink, flexShrink: 0 }}>
            {new Date(a.appointment_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: C.ink, fontWeight: 600 }}>{a.patient_name}</div>
            <div style={{ fontSize: 12, color: C.inkFaint }}>{a.doctor_name}</div>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: STATUS_STYLE[a.status].bg, color: STATUS_STYLE[a.status].text, flexShrink: 0 }}>
            {STATUS_LABEL[a.status]}
          </div>
          {NEXT_STATUS[a.status] && (
            <button
              onClick={() => advance(a)}
              disabled={updating === a.id}
              style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: 8, padding: "5px 10px", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", color: C.teal, fontWeight: 700 }}
            >
              {updating === a.id ? "..." : "مرحله بعد"}
            </button>
          )}
          {(a.status === "booked" || a.status === "checked_in") && (
            <button
              onClick={() => cancel(a)}
              disabled={updating === a.id}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: C.inkFaint }}
              title="لغو نوبت"
            >
              <XCircle size={17} />
            </button>
          )}
{/* دکمه انتقال نوبت */}
{["booked", "checked_in"].includes(a.status) && (
  <button
    onClick={() => {
      setRescheduleModal(a);
      setRescheduleForm({ date: "", time: "", reason: "" });
    }}
    style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: 8, padding: "5px 10px", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", color: C.blue, fontWeight: 700 }}
  >
    انتقال
  </button>
)}
        </div>
          ))}
        </Card>
      )}
{bulkRescheduleModal && (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}>
    <Card style={{ maxWidth: 500, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>انتقال گروهی نوبت‌ها</div>
        <button onClick={() => setBulkRescheduleModal(false)} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}>✕</button>
      </div>

      <div style={{ padding: 12, borderRadius: 10, background: C.saffronSoft, color: C.saffronDark, fontSize: 12, lineHeight: 1.9, marginBottom: 16 }}>
        ⚠️ این عملیات تمام نوبت‌های امروز را به تاریخ انتخاب‌شده منتقل می‌کند. نوبت‌هایی که ساعتشان در تاریخ جدید رزرو شده باشد، منتقل نمی‌شوند و باید دستی جابه‌جا شوند.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
<div>
  <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>تاریخ جدید *</div>
  <JalaliDatePicker
    value={bulkRescheduleForm.dateObj || null}
    onChange={(v) => {
      const g = jalaliToGregorian(v.jy, v.jm, v.jd);
      const dateStr = `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
      setBulkRescheduleForm({ ...bulkRescheduleForm, date: dateStr, dateObj: v });
    }}
    label=""
  />
</div>
        <div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>علت انتقال (اختیاری)</div>
          <textarea
            value={bulkRescheduleForm.reason}
            onChange={(e) => setBulkRescheduleForm({ ...bulkRescheduleForm, reason: e.target.value })}
            rows={2}
            style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontFamily: "inherit", resize: "vertical" }}
          />
        </div>

        {bulkResult && (
          <div style={{ padding: 12, borderRadius: 10, background: C.surfaceAlt, fontSize: 12.5, lineHeight: 1.9 }}>
            <div style={{ color: C.tealDark, fontWeight: 800, marginBottom: 6 }}>✅ {bulkResult.successList.length} نوبت منتقل شد.</div>
            {bulkResult.failedList.length > 0 && (
              <div style={{ color: C.clay, fontWeight: 800 }}>
                ❌ {bulkResult.failedList.length} نوبت منتقل نشد (ساعت رزرو شده بود).
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            disabled={bulkRescheduling || !bulkRescheduleForm.date}
            onClick={async () => {
              setBulkRescheduling(true);
              setBulkResult(null);
              try {
                const appointmentIds = appts.map(a => a.id);
                const res = await api.bulkRescheduleAppointments({
                  appointment_ids: appointmentIds,
                  new_date: bulkRescheduleForm.date,
                  reason: bulkRescheduleForm.reason,
                });
                setBulkResult(res);
                load();
              } catch (e) {
                showError(e.message || "خطا در انتقال گروهی");
              } finally {
                setBulkRescheduling(false);
              }
            }}
            style={{ flex: 1, border: "none", background: C.clay, color: "#fff", borderRadius: 9, padding: "10px 16px", fontFamily: "inherit", fontWeight: 800, cursor: bulkRescheduling || !bulkRescheduleForm.date ? "not-allowed" : "pointer" }}
          >
            {bulkRescheduling ? "در حال پردازش..." : "تایید و انتقال"}
          </button>
          <button onClick={() => setBulkRescheduleModal(false)} style={{ border: `1px solid ${C.border}`, background: C.surface, color: C.inkSoft, borderRadius: 9, padding: "10px 16px", fontFamily: "inherit", cursor: "pointer" }}>
            انصراف
          </button>
        </div>
      </div>
    </Card>
  </div>
)}
{rescheduleModal && (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}>
    <Card style={{ maxWidth: 500, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>انتقال نوبت</div>
        <button onClick={() => { setRescheduleModal(null); setSelectedJalaliDate(null); setAvailableSlots([]); }} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}>✕</button>
      </div>

      <div style={{ padding: 12, borderRadius: 10, background: C.surfaceAlt, marginBottom: 16, fontSize: 12.5, lineHeight: 1.9 }}>
        <b>بیمار:</b> {rescheduleModal.patient_name}<br/>
        <b>پزشک:</b> {rescheduleModal.doctor_name}<br/>
        <b>تاریخ فعلی:</b> {new Date(rescheduleModal.appointment_at).toLocaleString("fa-IR")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>تاریخ جدید *</div>
          <JalaliDatePicker
            value={selectedJalaliDate}
            onChange={(v) => {
              setSelectedJalaliDate(v);
              setRescheduleForm({ ...rescheduleForm, time: "" });
              if (v) loadAvailableSlots(rescheduleModal.doctor_id, v);
            }}
            label=""
          />
        </div>

        {selectedJalaliDate && (
          <div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>ساعت جدید *</div>
            {loadingSlots && <div style={{ fontSize: 12, color: C.inkSoft }}>در حال دریافت ساعت‌ها...</div>}
            {!loadingSlots && availableSlots.length === 0 && (
              <div style={{ fontSize: 12, color: C.inkFaint, padding: 10, background: C.surfaceAlt, borderRadius: 8 }}>
                پزشک در این روز برنامه حضور ندارد.
              </div>
            )}
            {!loadingSlots && availableSlots.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 8 }}>
                {availableSlots.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setRescheduleForm({ ...rescheduleForm, time: s.label })}
                    style={{
                      padding: "8px 0", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit",
                      border: `1px solid ${rescheduleForm.time === s.label ? C.teal : C.border}`,
                      background: !s.available ? "#F2F2F0" : rescheduleForm.time === s.label ? C.teal : C.surface,
                      color: !s.available ? C.inkFaint : rescheduleForm.time === s.label ? "#fff" : C.ink,
                      fontWeight: rescheduleForm.time === s.label ? 700 : 500,
                      textDecoration: !s.available ? "line-through" : "none",
                      cursor: !s.available ? "not-allowed" : "pointer",
                    }}
                  >
                    {toFa(s.label)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>علت انتقال (اختیاری)</div>
          <textarea
            value={rescheduleForm.reason}
            onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
            rows={2}
            style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontFamily: "inherit", resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            disabled={rescheduling || !selectedJalaliDate || !rescheduleForm.time}
            onClick={async () => {
              setRescheduling(true);
              try {
                const g = jalaliToGregorian(selectedJalaliDate.jy, selectedJalaliDate.jm, selectedJalaliDate.jd);
                const dateStr = `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
                await api.rescheduleAppointment(rescheduleModal.id, {
                  new_date: dateStr,
                  new_time: rescheduleForm.time,
                  reason: rescheduleForm.reason,
                });
                showSuccess("نوبت با موفقیت منتقل شد");
                setRescheduleModal(null);
                setSelectedJalaliDate(null);
                setAvailableSlots([]);
                load();
              } catch (e) {
                showError(e.message || "خطا در انتقال نوبت");
              } finally {
                setRescheduling(false);
              }
            }}
            style={{ flex: 1, border: "none", background: C.teal, color: "#fff", borderRadius: 9, padding: "10px 16px", fontFamily: "inherit", fontWeight: 800, cursor: rescheduling || !selectedJalaliDate || !rescheduleForm.time ? "not-allowed" : "pointer" }}
          >
            {rescheduling ? "در حال انتقال..." : "تایید انتقال"}
          </button>
          <button onClick={() => { setRescheduleModal(null); setSelectedJalaliDate(null); setAvailableSlots([]); }} style={{ border: `1px solid ${C.border}`, background: C.surface, color: C.inkSoft, borderRadius: 9, padding: "10px 16px", fontFamily: "inherit", cursor: "pointer" }}>
            انصراف
          </button>
        </div>
      </div>
    </Card>
  </div>
)}
    </div>
  );
}

function PatientLinkRequests() {
  const { showSuccess, showError } = useToastContext();
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.listPendingLinks()
      .then((d) => setPending(d.pending || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(linkId) {
    if (!confirm("آیا از تأیید این درخواست اتصال مطمئن هستید؟")) return;
    setActionId(linkId);
    try {
      await api.approvePatientLink(linkId);
      showSuccess("درخواست اتصال تأیید شد");
      load();
    } catch (e) {
      showError(e.message || "خطا در تأیید درخواست");
    } finally {
      setActionId(null);
    }
  }
  async function handleReject(linkId) {
    if (!confirm("آیا از رد این درخواست اتصال مطمئن هستید؟")) return;
    setActionId(linkId);
    try {
      await api.rejectPatientLink(linkId);
      showSuccess("درخواست اتصال رد شد");
      load();
    } catch (e) {
      showError(e.message || "خطا در رد درخواست");
    } finally {
      setActionId(null);
    }
  }
  if (loading) return <LoadingBlock label="در حال دریافت درخواست‌ها..." />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>درخواست‌های اتصال بیماران</div>
        <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 4 }}>
          بیمارانی که از پنل خود درخواست اتصال به پرونده‌شان را ارسال کرده‌اند
        </div>
      </div>

      {pending.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>
            هیچ درخواست در انتظاری وجود ندارد
          </div>
          <div style={{ fontSize: 12.5, color: C.inkFaint }}>
            وقتی بیماری از پنل خود درخواست اتصال بفرستد، اینجا نمایش داده می‌شود.
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pending.map((p) => (
            <Card key={p.link_id} style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>
                    {p.account_name}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 6 }}>
                    <b>شماره موبایل:</b> <span dir="ltr">{p.account_phone}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>
                    <b>کد ملی:</b> <span dir="ltr">{p.account_national_code}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>
                    <b>پرونده متصل:</b> {p.patient_name} — {p.clinic_name}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 6 }}>
                    تاریخ درخواست: {new Date(p.created_at).toLocaleString("fa-IR")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => handleApprove(p.link_id)}
                    disabled={actionId === p.link_id}
                    style={{
                      border: "none", background: C.teal, color: "#fff",
                      borderRadius: 9, padding: "9px 16px",
                      fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
                      cursor: actionId === p.link_id ? "not-allowed" : "pointer",
                    }}
                  >
                    {actionId === p.link_id ? "..." : "تأیید"}
                  </button>
                  <button
                    onClick={() => handleReject(p.link_id)}
                    disabled={actionId === p.link_id}
                    style={{
                      border: `1px solid ${C.border}`, background: C.surface, color: C.clay,
                      borderRadius: 9, padding: "9px 16px",
                      fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
                      cursor: actionId === p.link_id ? "not-allowed" : "pointer",
                    }}
                  >
                    رد
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}

function PendingAppointments() {
  const { showSuccess, showError } = useToastContext();
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.listPendingAppointments()
      .then((d) => setPending(d.pending || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id) {
    if (!confirm("آیا از تأیید این درخواست نوبت مطمئن هستید؟")) return;
      setActionId(id);
    try {
      await api.reviewAppointment(id, "approve");
      showSuccess("درخواست نوبت تأیید شد");
      load();
    } catch (e) {
      showError(e.message || "خطا در تأیید");
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id) {
    if (!confirm("آیا از رد این درخواست نوبت مطمئن هستید؟")) return;
      setActionId(id);
    try {
      await api.reviewAppointment(id, "reject");
      showSuccess("درخواست نوبت رد شد");
      load();
    } catch (e) {
      showError(e.message || "خطا در رد");
    } finally {
      setActionId(null);
    }
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    const date = d.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
    const time = d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    return `${date} — ساعت ${time}`;
  }

  if (loading) return <LoadingBlock label="در حال دریافت درخواست‌های نوبت..." />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>درخواست‌های نوبت بیماران</div>
        <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 4 }}>
          درخواست‌هایی که بیماران از پنل خود ارسال کرده‌اند و منتظر تأیید شما هستند
        </div>
      </div>

     

      {pending.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>
            هیچ درخواست نوبتی در انتظار نیست
          </div>
          <div style={{ fontSize: 12.5, color: C.inkFaint }}>
            وقتی بیماری از پنل خود درخواست نوبت بفرستد، اینجا نمایش داده می‌شود.
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pending.map((p) => (
            <Card key={p.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 9px", borderRadius: 20, background: C.saffronSoft, color: C.saffronDark }}>
                      در انتظار تأیید
                    </span>
                    <span style={{ fontSize: 11, color: C.inkFaint }}>
                      {new Date(p.created_at).toLocaleString("fa-IR")}
                    </span>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 6 }}>
                    {p.patient_name}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, fontSize: 12 }}>
                    <div style={{ color: C.inkSoft }}>
                      <b>شماره موبایل:</b> <span dir="ltr">{p.patient_phone}</span>
                    </div>
                    <div style={{ color: C.inkSoft }}>
                      <b>کد ملی:</b> <span dir="ltr">{p.patient_national_code || "—"}</span>
                    </div>
                    <div style={{ color: C.inkSoft }}>
                      <b>پزشک:</b> {p.doctor_name} ({p.doctor_specialty || "بدون تخصص"})
                    </div>
                    <div style={{ color: C.inkSoft }}>
                      <b>شعبه:</b> {p.branch_name}
                    </div>
                    <div style={{ color: C.tealDark, fontWeight: 700 }}>
                      <b>زمان نوبت:</b> {formatDateTime(p.appointment_at)}
                    </div>
                  </div>

                  {p.notes && (
                    <div style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      background: C.surfaceAlt,
                      fontSize: 12,
                      color: C.inkSoft,
                      lineHeight: 1.9,
                    }}>
                      <b>توضیحات بیمار:</b> {p.notes}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => handleApprove(p.id)}
                    disabled={actionId === p.id}
                    style={{
                      border: "none", background: C.teal, color: "#fff",
                      borderRadius: 9, padding: "10px 18px",
                      fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
                      cursor: actionId === p.id ? "not-allowed" : "pointer",
                    }}
                  >
                    {actionId === p.id ? "..." : "تأیید"}
                  </button>
                  <button
                    onClick={() => handleReject(p.id)}
                    disabled={actionId === p.id}
                    style={{
                      border: `1px solid ${C.border}`, background: C.surface, color: C.clay,
                      borderRadius: 9, padding: "10px 18px",
                      fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
                      cursor: actionId === p.id ? "not-allowed" : "pointer",
                    }}
                  >
                    رد
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
/* ---------------------------------------------------------------------- */
/* پرونده بیماران برای منشی — جستجو، ثبت بیمار و مشاهده خلاصه پرونده       */
/* ---------------------------------------------------------------------- */
function SecretaryPatients() {
  const { showSuccess, showError } = useToastContext();
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const emptyPatientForm = () => ({ full_name: "", phone: "", national_code: "", birth_date: null, gender: "", address: "" });
  const [form, setForm] = useState(emptyPatientForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("patients"); // "patients" | "requests" | "appointment-requests"
  const fieldStyle = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", color: C.ink,
    background: C.surface, boxSizing: "border-box",
  };

  async function openPatient(p) {
    setSelected(p); setDetail(null); setLoadingDetail(true); setError(null);
    try {
      const d = await api.getPatient(p.id);
      setDetail(d);
    } catch (e) { setError(e.message); }
    finally { setLoadingDetail(false); }
  }

  function resetCreate() {
    setForm(emptyPatientForm());
    setShowCreate(false); setSaved(false); setError(null);
  }

async function create() {
  if (!form.full_name.trim() || !form.phone.trim() || !form.national_code.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const birthDateGregorian = form.birth_date
        ? (() => {
            const g = jalaliToGregorian(form.birth_date.jy, form.birth_date.jm, form.birth_date.jd);
            return `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
          })()
        : null;

      const d = await api.createPatient({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        national_code: form.national_code.trim(),
        birth_date: birthDateGregorian,
        gender: form.gender || null,
        address: form.address.trim() || null,
      });

            showSuccess(`بیمار «${d.patient.full_name}» با موفقیت ثبت شد`);
      setSelected(d.patient);
      setDetail({ patient: d.patient, visits: [] });
      setShowCreate(false);
      setForm(emptyPatientForm());
    } catch (e) {
      showError(e.message || "خطا در ثبت بیمار");
    } finally {
      setSaving(false);
    }
  }

  function openEditPatient(patient) {
    setEditPatient(patient);

    // تبدیل تاریخ تولد میلادی به شمسی
    let birthDateJalali = null;
    if (patient.birth_date) {
      const d = new Date(patient.birth_date);
      birthDateJalali = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }

    setEditForm({
      full_name: patient.full_name || "",
      phone: patient.phone || "",
      national_code: patient.national_code || "",
      birth_date: birthDateJalali,
      gender: patient.gender || "",
      address: patient.address || "",
    });
    setEditError(null);
  }

  async function submitEditPatient() {
   if (!editForm.full_name.trim() || !editForm.phone.trim() || !editForm.national_code.trim()) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const payload = {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim(),
        national_code: editForm.national_code.trim(),
        birth_date: editForm.birth_date ? (() => {
          const g = jalaliToGregorian(editForm.birth_date.jy, editForm.birth_date.jm, editForm.birth_date.jd);
          return `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
        })() : null,
        gender: editForm.gender || null,
        address: editForm.address.trim() || null,
      };
            await api.updatePatient(editPatient.id, payload);
      showSuccess(`بیمار «${payload.full_name}» با موفقیت ویرایش شد`);
      const patientObj = { ...editPatient, ...payload };
      setEditPatient(null);
      setEditForm(null);
      // بارگذاری مجدد پرونده
      await openPatient(patientObj);
    } catch (e) {
      showError(e.message || "خطا در ویرایش بیمار");
    } finally {
      setEditSaving(false);
    }
  }

    const tabBar = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        onClick={() => setTab("patients")}
        style={{
          border: `1px solid ${tab === "patients" ? C.teal : C.border}`,
          background: tab === "patients" ? C.tealSoft : C.surface,
          color: tab === "patients" ? C.tealDark : C.inkSoft,
          borderRadius: 9, padding: "8px 14px", fontFamily: "inherit",
          fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        }}
      >
        بیماران
      </button>
      <button
        onClick={() => setTab("appointment-requests")}
        style={{
          border: `1px solid ${tab === "appointment-requests" ? C.teal : C.border}`,
          background: tab === "appointment-requests" ? C.tealSoft : C.surface,
          color: tab === "appointment-requests" ? C.tealDark : C.inkSoft,
          borderRadius: 9, padding: "8px 14px", fontFamily: "inherit",
          fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        }}
      >
        درخواست‌های نوبت
      </button>
      <button
        onClick={() => setTab("requests")}
        style={{
          border: `1px solid ${tab === "requests" ? C.teal : C.border}`,
          background: tab === "requests" ? C.tealSoft : C.surface,
          color: tab === "requests" ? C.tealDark : C.inkSoft,
          borderRadius: 9, padding: "8px 14px", fontFamily: "inherit",
          fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        }}
      >
        درخواست‌های اتصال
      </button>
    </div>
  );

    if (tab === "requests") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {tabBar}
        <PatientLinkRequests />
      </div>
    );
  }

  if (tab === "appointment-requests") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {tabBar}
        <PendingAppointments />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {tabBar}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px,.9fr) minmax(0,1.5fr)", gap: 16 }} className="secretary-patients-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 5 }}>جستجوی بیمار</div>
            <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 11 }}>نام یا شماره موبایل را وارد کنید.</div>
            <LivePatientSearch
              value={selected}
              onChange={(p) => {
                setSelected(p);
                if (p) openPatient(p);
                else { setDetail(null); }
              }}
              label=""
              placeholder="نام یا موبایل بیمار..."
              autoFocus
            />
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>ثبت بیمار جدید</div>
                <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>برای بیمارانی که هنوز پرونده ندارند.</div>
              </div>
              <button onClick={() => { setShowCreate(true); setError(null); setSaved(false); }} style={{ border: `1px solid ${C.teal}`, background: showCreate ? C.tealSoft : C.surface, color: C.tealDark, borderRadius: 9, padding: "7px 10px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>+ بیمار جدید</button>
            </div>
            {showCreate && (
              <div
                onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) resetCreate(); }}
                style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
              >
                <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(720px, 95%)", maxHeight: "90vh", overflow: "visible", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 24px 70px rgba(0,0,0,.28)", padding: 18, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 15 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>ثبت بیمار جدید</div>
                      <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>اطلاعات پایه پرونده بیمار را وارد کنید.</div>
                    </div>
                    <button onClick={resetCreate} disabled={saving} style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.inkSoft, borderRadius: 9, padding: "6px 10px", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>بستن</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="نام و نام خانوادگی *" style={fieldStyle} autoFocus />
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="شماره تماس *" className="ltr-input-rtl-placeholder" style={{ ...fieldStyle, textAlign: "left" }} dir="ltr" maxLength={11} />
                    <input value={form.national_code} onChange={(e) => setForm({ ...form, national_code: e.target.value })} placeholder="کد ملی*" className="ltr-input-rtl-placeholder" style={{ ...fieldStyle, textAlign: "left" }} dir="ltr" maxLength={10} />
                    <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} style={fieldStyle}>
                      <option value="">جنسیت</option>
                      <option value="male">مرد</option>
                      <option value="female">زن</option>
                    </select>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <JalaliDatePicker value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} label="تاریخ تولد" />
                    </div>
                    <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="آدرس (اختیاری)" rows={2} style={{ ...fieldStyle, resize: "vertical", gridColumn: "1 / -1" }} />
                    {error && <div style={{ gridColumn: "1 / -1" }}><ErrorBlock message={error} /></div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 3, gridColumn: "1 / -1" }}>
                      <button onClick={create} disabled={saving || !form.full_name.trim() || !form.phone.trim() || !form.national_code.trim()} style={{ flex: 1, border: "none", borderRadius: 10, padding: "11px 0", background: saving || !form.full_name.trim() || !form.phone.trim() || !form.national_code.trim() ? C.borderStrong : C.teal, color: saving || !form.full_name.trim() || !form.phone.trim() || !form.national_code.trim() ? C.inkSoft : "#fff",
cursor: saving || !form.full_name.trim() || !form.phone.trim() || !form.national_code.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 800 }}>
                        {saving ? "در حال ثبت..." : "ثبت بیمار"}
                      </button>
                      <button onClick={resetCreate} disabled={saving} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "0 18px", background: C.surface, color: C.inkSoft, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                        انصراف
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {editPatient && editForm && (
              <div
                onMouseDown={(e) => { if (e.target === e.currentTarget && !editSaving) { setEditPatient(null); setEditForm(null); } }}
                style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
              >
                <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(720px, 95%)", maxHeight: "90vh", overflow: "visible", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 24px 70px rgba(0,0,0,.28)", padding: 18, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 15 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>ویرایش بیمار</div>
                      <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>اطلاعات بیمار را ویرایش کنید.</div>
                    </div>
                    <button onClick={() => { setEditPatient(null); setEditForm(null); }} disabled={editSaving} style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.inkSoft, borderRadius: 9, padding: "6px 10px", cursor: editSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>بستن</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} placeholder="نام و نام خانوادگی *" style={fieldStyle} autoFocus />
                    <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="شماره تماس *" className="ltr-input-rtl-placeholder" style={{ ...fieldStyle, textAlign: "left" }} dir="ltr" maxLength={11} />
                    <input value={editForm.national_code} onChange={(e) => setEditForm({ ...editForm, national_code: e.target.value })} placeholder="کد ملی" className="ltr-input-rtl-placeholder" style={{ ...fieldStyle, textAlign: "left" }} dir="ltr" maxLength={10} />
                    <select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })} style={fieldStyle}>
                      <option value="">جنسیت</option>
                      <option value="male">مرد</option>
                      <option value="female">زن</option>
                    </select>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <JalaliDatePicker value={editForm.birth_date} onChange={(v) => setEditForm({ ...editForm, birth_date: v })} label="تاریخ تولد" />
                    </div>
                    <textarea value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="آدرس (اختیاری)" rows={2} style={{ ...fieldStyle, resize: "vertical", gridColumn: "1 / -1" }} />
                    <div style={{ display: "flex", gap: 8, marginTop: 3, gridColumn: "1 / -1" }}>
                      <button onClick={submitEditPatient} disabled={editSaving || !editForm.full_name.trim() || !editForm.phone.trim()} style={{ flex: 1, border: "none", borderRadius: 10, padding: "11px 0", background: editSaving || !editForm.full_name.trim() || !editForm.phone.trim() ? C.borderStrong : C.teal, color: editSaving || !editForm.full_name.trim() || !editForm.phone.trim() ? C.inkSoft : "#fff", cursor: editSaving || !editForm.full_name.trim() || !editForm.phone.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 800 }}>
                        {editSaving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                      </button>
                      <button onClick={() => { setEditPatient(null); setEditForm(null); }} disabled={editSaving} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "0 18px", background: C.surface, color: C.inkSoft, cursor: editSaving ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                        انصراف
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
           
          </Card>
        </div>

        <Card>
          {!selected ? (
            <div style={{ minHeight: 390, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.inkFaint }}>
              <div>
                <Users size={28} color={C.teal} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: C.inkSoft, marginBottom: 5 }}>یک بیمار را انتخاب کنید</div>
                <div style={{ fontSize: 12.5 }}>خلاصه پرونده و سوابق ویزیت اینجا نمایش داده می‌شود.</div>
              </div>
            </div>
          ) : loadingDetail ? (
            <LoadingBlock label="در حال دریافت پرونده بیمار..." />
          ) : detail ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 13, marginBottom: 13, borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>{detail.patient.full_name}</div>
                  <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 3 }} dir="ltr">{detail.patient.phone || "شماره ثبت نشده"}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", height: "fit-content" }}>
                  <button
                    onClick={() => openEditPatient(detail.patient)}
                    style={{ border: `1px solid ${C.border}`, background: C.surface, color: C.teal, borderRadius: 9, padding: "7px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}
                  >
                    <Edit3 size={14} /> ویرایش
                  </button>
                  <div style={{ fontSize: 12, color: C.tealDark, background: C.tealSoft, borderRadius: 20, padding: "5px 9px" }}>
                    {toFa(detail.visits.length)} ویزیت
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 14 }}>
                {[
                  ['کد ملی', detail.patient.national_code || 'ثبت نشده'],
                  ['تاریخ تولد', detail.patient.birth_date ? new Date(detail.patient.birth_date).toLocaleDateString('fa-IR') : 'ثبت نشده'],
                  ['جنسیت', detail.patient.gender === 'male' ? 'مرد' : detail.patient.gender === 'female' ? 'زن' : 'ثبت نشده']
                ].map(([label, value]) => (
                  <div key={label} style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 9, padding: "9px 10px" }}>
                    <div style={{ fontSize: 10.5, color: C.inkFaint }}>{label}</div>
                    <div style={{ fontSize: 12.5, color: C.ink, fontWeight: 700, marginTop: 3 }}>{value}</div>
                  </div>
                ))}
              </div>
              {detail.patient.address && (
                <div style={{ fontSize: 12.5, color: C.inkSoft, background: C.surfaceAlt, borderRadius: 9, padding: "9px 10px", marginBottom: 14 }}>
                  آدرس: {detail.patient.address}
                </div>
              )}
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 10 }}>سوابق ویزیت</div>
              {detail.visits.length === 0 ? (
                <div style={{ fontSize: 12.5, color: C.inkFaint, padding: "16px 0" }}>هنوز سابقه ویزیتی برای این بیمار ثبت نشده است.</div>
              ) : (
                detail.visits.map((v) => (
                  <div key={v.id} style={{ padding: "11px 0", borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11.5, color: C.inkFaint, marginBottom: 4 }}>
                      {new Date(v.created_at).toLocaleDateString('fa-IR')} — {v.doctor_name}
                    </div>
                    {v.diagnosis && <div style={{ fontSize: 12.5, color: C.ink, marginBottom: 3 }}><b>تشخیص:</b> {v.diagnosis}</div>}
                    {v.treatment_plan && <div style={{ fontSize: 12.5, color: C.ink, marginBottom: 4 }}><b>درمان:</b> {v.treatment_plan}</div>}
                    {v.prescriptions?.length > 0 && (
                      <div style={{ fontSize: 12, color: C.inkSoft }}>
                        نسخه: {v.prescriptions.map((rx) => `${rx.medicine}${rx.dosage ? ` (${rx.dosage})` : ""}`).join("، ")}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* App shell                                                              */
/* ---------------------------------------------------------------------- */
function AdminReceptionistDetail({ receptionist, onBack, onEdit, onAccount }) {
  const offices = receptionist.offices || [];
  const active = receptionist.is_active !== false;
  const accountActive = receptionist.account_active !== false;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={onBack} style={{ width:34,height:34,border:`1px solid ${C.border}`,background:C.surface,color:C.inkSoft,borderRadius:9,cursor:"pointer" }}><ChevronRight size={17}/></button>
        <div><div style={{fontSize:20,fontWeight:800,color:C.ink}}>جزئیات منشی</div><div style={{fontSize:11.5,color:C.inkFaint,marginTop:3}}>اطلاعات پرسنلی، مطب‌های مرتبط و حساب کاربری</div></div>
      </div>
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:18,display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap",background:C.surfaceAlt,borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:54,height:54,borderRadius:16,background:C.tealSoft,color:C.teal,display:"flex",alignItems:"center",justifyContent:"center"}}><UserRound size={27}/></div><div><div style={{fontSize:17,fontWeight:800,color:C.ink}}>{receptionist.name}</div><div style={{fontSize:11.5,color:C.inkFaint,marginTop:4}}>کد کاربری: {receptionist.username || "ایجاد نشده"}</div></div><span style={{padding:"5px 9px",borderRadius:20,background:active?C.tealSoft:C.claySoft,color:active?C.tealDark:C.clay,fontSize:10.5,fontWeight:800}}>{active?"فعال":"غیرفعال"}</span></div>
          <div style={{display:"flex",gap:7}}><button onClick={onEdit} style={{border:`1px solid ${C.border}`,background:C.surface,color:C.blue,borderRadius:9,padding:"8px 11px",fontFamily:"inherit",cursor:"pointer",fontWeight:700}}><Edit3 size={14} style={{verticalAlign:"middle",marginLeft:5}}/>ویرایش</button><button onClick={onAccount} style={{border:"none",background:C.teal,color:"#fff",borderRadius:9,padding:"8px 11px",fontFamily:"inherit",cursor:"pointer",fontWeight:800}}><KeyRound size={14} style={{verticalAlign:"middle",marginLeft:5}}/>حساب کاربری</button></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.2fr) minmax(280px,.8fr)",gap:14,padding:16}} className="receptionist-detail-grid">
          <Card style={{padding:15}}><div style={{fontSize:13.5,fontWeight:800,color:C.ink,marginBottom:12}}>اطلاعات منشی</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["نام و نام خانوادگی",receptionist.name], ["موبایل",receptionist.phone||"ثبت نشده"], ["تاریخ ایجاد",receptionist.created_at?new Date(receptionist.created_at).toLocaleDateString("fa-IR"):"ثبت نشده"], ["وضعیت",active?"فعال":"غیرفعال"]].map(([l,v])=><div key={l} style={{padding:11,borderRadius:10,background:C.surfaceAlt,border:`1px solid ${C.border}`}}><div style={{fontSize:10.5,color:C.inkFaint}}>{l}</div><div style={{fontSize:12.5,fontWeight:700,color:C.ink,marginTop:4}}>{v}</div></div>)}</div></Card>
          <Card style={{padding:15}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{fontSize:13.5,fontWeight:800,color:C.ink}}>مطب‌های مرتبط</div><span style={{fontSize:10.5,color:C.inkFaint}}>{toFa(offices.length)} مطب</span></div>{offices.length?offices.map((o,i)=><div key={o.id||i} style={{display:"flex",alignItems:"center",gap:9,padding:"10px 0",borderTop:i?`1px solid ${C.border}`:"none"}}><div style={{width:34,height:34,borderRadius:10,background:C.tealSoft,color:C.teal,display:"flex",alignItems:"center",justifyContent:"center"}}><Building2 size={16}/></div><div><div style={{fontSize:12,fontWeight:700,color:C.ink}}>{o.name}</div><div style={{fontSize:10.5,color:C.inkFaint,marginTop:2}}>{o.branch_name||"شعبه ثبت نشده"}</div></div></div>):<div style={{color:C.inkFaint,fontSize:11.5,padding:"15px 0"}}>هنوز مطبی برای این منشی تخصیص داده نشده است.</div>}</Card>
        </div>
      </Card>
      <Card style={{padding:15}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><div style={{fontSize:13.5,fontWeight:800,color:C.ink}}>حساب کاربری</div><div style={{fontSize:10.8,color:C.inkFaint,marginTop:3}}>حساب ورود منشی جدا از اطلاعات پرسنلی نگهداری می‌شود.</div></div><span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 9px",borderRadius:20,background:accountActive?C.tealSoft:C.claySoft,color:accountActive?C.tealDark:C.clay,fontSize:10.5,fontWeight:800}}><ShieldCheck size={13}/>{accountActive?"حساب فعال":"حساب غیرفعال"}</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10}} className="receptionist-account-grid"><div style={{padding:11,borderRadius:10,background:C.surfaceAlt}}><div style={{fontSize:10.5,color:C.inkFaint}}>کد کاربری</div><div style={{fontSize:12.5,fontWeight:800,color:C.ink,marginTop:4}}>{receptionist.username||"ایجاد نشده"}</div></div><div style={{padding:11,borderRadius:10,background:C.surfaceAlt}}><div style={{fontSize:10.5,color:C.inkFaint}}>آخرین ورود</div><div style={{fontSize:12.5,fontWeight:700,color:C.ink,marginTop:4}}>{receptionist.last_login?new Date(receptionist.last_login).toLocaleString("fa-IR"):"هنوز وارد نشده"}</div></div><div style={{padding:11,borderRadius:10,background:C.surfaceAlt}}><div style={{fontSize:10.5,color:C.inkFaint}}>رمز عبور</div><div style={{fontSize:12.5,fontWeight:700,color:C.ink,marginTop:4}}>••••••••</div></div></div></Card>
    </div>
  );
}

function AdminReceptionists() {
  const { showSuccess, showError } = useToastContext();
  const [search,setSearch]=useState("");
 const [statusFilter,setStatusFilter]=useState("all");
 const [selected,setSelected]=useState(null); 
const [modal,setModal]=useState(null);
const [form,setForm]=useState({name:"",phone:"",username:"",password:"",office_ids:[],branch_id:"",doctor_id:"",is_active:true,account_active:true});
  const [receptionists, setReceptionists] = useState(null);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);   // ← جدید
  const [branches, setBranches] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.listUsers({ role: "secretary" }),
      api.listOffices(),
      api.listBranches(),
      api.listDoctors(),
    ])
      .then(([usersRes, officesRes, branchesRes, doctorsRes]) => {
        setReceptionists(usersRes?.users || []);
        setOffices(officesRes?.offices || []);
        setBranches(branchesRes?.branches || []);
        setDoctors(doctorsRes?.doctors || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!receptionists) return <LoadingBlock label="در حال دریافت اطلاعات منشی‌ها..." />;

  const filtered = receptionists.filter((r) => {
    const active = r.is_active !== false;
    const q = search.trim().toLowerCase();
    return (statusFilter === "all" || (statusFilter === "active" ? active : !active)) &&
      (!q || [r.full_name, r.name, r.phone, r.username, ...(r.offices || []).map(o => o.name)].filter(Boolean).join(" ").toLowerCase().includes(q));
  });

  const activeCount = receptionists.filter((r) => r.is_active !== false).length;
  const inactiveCount = receptionists.filter((r) => r.is_active === false).length;
function openAdd(){setForm({name:"",phone:"",username:"",password:"",office_ids:[],branch_id:branches[0]?.id||"",doctor_id:"",is_active:true,account_active:true});setModal({type:"form",receptionist:null});}
function openEdit(r){setForm({name:r.full_name||r.name||"",phone:r.phone||"",username:r.username||"",password:"",office_ids:(r.offices||[]).map(o=>String(o.id)),branch_id:r.branch_id||"",doctor_id:r.doctor_id||"",is_active:r.is_active!==false,account_active:r.account_active!==false});setModal({type:"form",receptionist:r});}

  function openAccount(r){setForm({name:r.full_name||r.name||"",phone:r.phone||"",doctor_id:r.doctor_id||"",username:r.username||"",password:"",office_ids:(r.offices||[]).map(o=>String(o.id)),is_active:r.is_active!==false,account_active:r.account_active!==false});setModal({type:"account",receptionist:r});}

   async function activateReceptionist(r) {
    try {
      await api.activateUser(r.id);
      showSuccess(`«${r.full_name || r.name}» فعال شد`);
      load();
    } catch (e) {
      showError(e.message || "خطا در فعال‌سازی");
    }
  }

  async function submitForm(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        full_name: form.name.trim(),
        username: form.username.trim() || undefined,
        phone: form.phone.trim(),
        password: form.password || undefined,
        role: "secretary",
                     branch_id: form.branch_id ? Number(form.branch_id) : (branches[0]?.id || null),
        doctor_id: form.doctor_id ? Number(form.doctor_id) : undefined,
        office_id: form.office_ids?.[0] ? Number(form.office_ids[0]) : undefined,
      };

      if (modal.receptionist) {
        await api.updateUser(modal.receptionist.id, {
          full_name: payload.full_name,
          username: payload.username,
          phone: payload.phone,
          office_id: payload.office_id,
        });
      } else {
        if (!form.password || form.password.length < 8) {
          throw new Error("رمز عبور باید حداقل ۸ کاراکتر باشد");
        }
        await api.createUser(payload);
      }

           showSuccess(modal.receptionist ? "منشی با موفقیت ویرایش شد" : "منشی با موفقیت اضافه شد");
      setModal(null);
      load();
    } catch (err) {
      showError(err.message || "خطا در ذخیره منشی");
    } finally {
      setSubmitting(false);
    }
  }



  function submitAccount(e){e.preventDefault();setModal({type:"info",title:"حساب کاربری آماده اتصال است",message:"ساخت و مدیریت واقعی کد کاربری و رمز عبور پس از اتصال API احراز هویت انجام می‌شود. رمز عبور ذخیره‌شده قابل مشاهده نخواهد بود."});}
  if(selected)return <AdminReceptionistDetail receptionist={selected} onBack={()=>setSelected(null)} onEdit={()=>openEdit(selected)} onAccount={()=>openAccount(selected)}/>;  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <style>{`@media(max-width:850px){.receptionist-kpis{grid-template-columns:1fr 1fr!important}.receptionist-toolbar{flex-direction:column!important;align-items:stretch!important}.receptionist-detail-grid,.receptionist-account-grid,.receptionist-form-grid{grid-template-columns:1fr!important}}@media(max-width:560px){.receptionist-kpis{grid-template-columns:1fr!important}}`}</style>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}><div><div style={{fontSize:20,fontWeight:800,color:C.ink}}>مدیریت منشی‌ها</div><div style={{fontSize:11.5,color:C.inkFaint,marginTop:4}}>اطلاعات منشی‌ها، تخصیص مطب‌ها و مدیریت حساب‌های کاربری</div></div><button onClick={openAdd} style={{display:"inline-flex",alignItems:"center",gap:6,border:"none",background:C.teal,color:"#fff",borderRadius:10,padding:"10px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:800}}><Plus size={16}/> افزودن منشی</button></div>
    <div className="receptionist-kpis" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}>
      <Card style={{padding:14}}><div style={{fontSize:11,color:C.inkFaint}}>کل منشی‌ها</div><div style={{fontSize:24,fontWeight:800,color:C.blue,marginTop:4}}>{toFa(receptionists.length)}</div></Card>
      <Card style={{padding:14}}><div style={{fontSize:11,color:C.inkFaint}}>منشی‌های فعال</div><div style={{fontSize:24,fontWeight:800,color:C.tealDark,marginTop:4}}>{toFa(activeCount)}</div></Card>
      <Card style={{padding:14}}><div style={{fontSize:11,color:C.inkFaint}}>منشی‌های غیرفعال</div><div style={{fontSize:24,fontWeight:800,color:C.clay,marginTop:4}}>{toFa(inactiveCount)}</div></Card>
    </div>
    <Card style={{padding:0,overflow:"hidden"}}>
      <div className="receptionist-toolbar" style={{display:"flex",alignItems:"center",gap:10,padding:14,borderBottom:`1px solid ${C.border}`}}><div style={{position:"relative",flex:1,minWidth:260}}><Search size={16} color={C.inkFaint} style={{position:"absolute",right:11,top:10}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جستجو بر اساس نام، موبایل، کد کاربری یا مطب..." style={{width:"100%",boxSizing:"border-box",border:`1px solid ${C.border}`,background:C.surface,color:C.ink,borderRadius:9,padding:"9px 35px 9px 12px",fontFamily:"inherit",fontSize:12.2}}/></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{border:`1px solid ${C.border}`,background:C.surface,color:C.ink,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",fontSize:12}}><option value="all">همه وضعیت‌ها</option><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></div>
      {filtered.length===0?<EmptyState icon={UserRound} title="هنوز منشی‌ای ثبت نشده است" desc="برای شروع، از دکمه «+ افزودن منشی» استفاده کنید."/>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,minWidth:950}}><thead><tr style={{background:C.surfaceAlt}}>{["ردیف","منشی","موبایل","مطب‌های مرتبط","کد کاربری","وضعیت","تاریخ ایجاد","عملیات"].map(h=><th key={h} style={{textAlign:"right",padding:"11px 13px",color:C.inkSoft,fontWeight:700,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{filtered.map((r,i)=><tr key={r.id}><td style={{padding:"12px 13px",borderBottom:`1px solid ${C.border}`,color:C.inkFaint}}>{toFa(i+1)}</td><td style={{padding:"12px 13px",borderBottom:`1px solid ${C.border}`,fontWeight:800,color:C.ink}}>{r.full_name || r.name || "—"}</td><td style={{padding:"12px 13px",borderBottom:`1px solid ${C.border}`,color:C.inkSoft,direction:"ltr",textAlign:"right"}}>{r.phone||"—"}</td><td style={{padding:"12px 13px",borderBottom:`1px solid ${C.border}`,color:C.inkSoft}}>{(r.offices||[]).map(o=>o.name).join("، ")||"—"}</td><td style={{padding:"12px 13px",borderBottom:`1px solid ${C.border}`,color:C.inkSoft}}>{r.username||"—"}</td><td style={{padding:"12px 13px",borderBottom:`1px solid ${C.border}`}}><span style={{padding:"4px 8px",borderRadius:20,background:r.is_active!==false?C.tealSoft:C.claySoft,color:r.is_active!==false?C.tealDark:C.clay,fontSize:10.5,fontWeight:800}}>{r.is_active!==false?"فعال":"غیرفعال"}</span></td><td style={{padding:"12px 13px",borderBottom:`1px solid ${C.border}`,color:C.inkFaint}}>{r.created_at?new Date(r.created_at).toLocaleDateString("fa-IR"):"—"}</td><td style={{padding:"9px 13px",borderBottom:`1px solid ${C.border}`}}>

<div style={{ display: "flex", gap: 5 }}>
  <ActionButton icon={Eye} variant="view" onClick={() => setSelected(r)} title="جزئیات" />
  <ActionButton icon={Edit3} variant="edit" onClick={() => openEdit(r)} title="ویرایش" />
  <ActionButton icon={KeyRound} variant="assign" onClick={() => openAccount(r)} title="حساب کاربری" />
  <ActionButton icon={Trash2} variant="delete" onClick={() => setModal({ type: "delete", receptionist: r })} title="حذف" />
  {r.is_active !== false ? (
    <ActionButton
      icon={Ban}
      variant="deactivate"
      title="غیرفعال‌سازی"
          onClick={async () => {
        if (!confirm(`آیا از غیرفعال‌سازی «${r.full_name || r.name}» مطمئن هستید؟`)) return;
        try {
          await api.deactivateUser(r.id);
          showSuccess(`«${r.full_name || r.name}» غیرفعال شد`);
          load();
        } catch (e) {
          showError(e.message || "خطا در غیرفعال‌سازی");
        }
      }}
    />
  ) : (
    <ActionButton
      icon={Check}
      variant="activate"
      title="فعال‌سازی"
      onClick={() => activateReceptionist(r)}
    />
  )}
</div>
</td></tr>)}</tbody></table></div>}
      <div style={{padding:"10px 15px",borderTop:`1px solid ${C.border}`,background:C.surfaceAlt,color:C.inkFaint,fontSize:10.8}}>{toFa(filtered.length)} منشی نمایش داده می‌شود · حساب کاربری از اطلاعات پرسنلی جدا نگهداری می‌شود.</div>
    </Card>
    {modal&&<div onMouseDown={e=>e.target===e.currentTarget&&setModal(null)} style={{position:"fixed",inset:0,zIndex:100,background:"rgba(7,18,24,.48)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}><Card style={{width:"min(700px,100%)",maxHeight:"92vh",overflowY:"auto",padding:0}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"15px 17px",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:14.5,fontWeight:800,color:C.ink}}>{modal.type==="form"?(modal.receptionist?"ویرایش منشی":"افزودن منشی"):modal.type==="account"?"حساب کاربری منشی":modal.type==="delete"?"حذف منشی":modal.title}</div><button onClick={()=>setModal(null)} style={{width:30,height:30,border:`1px solid ${C.border}`,background:C.surface,color:C.inkSoft,borderRadius:8,cursor:"pointer"}}><X size={15}/></button></div>
      {(modal.type==="form"||modal.type==="account")&&<form onSubmit={modal.type==="account"?submitAccount:submitForm} style={{padding:17,display:"flex",flexDirection:"column",gap:13}}>
        {modal.type==="form"&&<><div className="receptionist-form-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label style={{fontSize:11.5,color:C.inkSoft}}>نام و نام خانوادگی *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="مثلاً فاطمه رضایی" style={{width:"100%",boxSizing:"border-box",marginTop:6,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",color:C.ink,background:C.surface}}/></label><label style={{fontSize:11.5,color:C.inkSoft}}>شماره موبایل *<input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} maxLength={11} placeholder="09..." style={{width:"100%",boxSizing:"border-box",marginTop:6,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",color:C.ink,background:C.surface,direction:"ltr",textAlign:"right"}}/></label></div>        
  <div className="receptionist-form-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <label style={{fontSize:11.5,color:C.inkSoft}}>کد کاربری
              <input value={form.username||""} onChange={e=>setForm({...form,username:e.target.value.replace(/[^a-zA-Z0-9_]/g, '')})} placeholder="مثلاً mosh011" style={{width:"100%",boxSizing:"border-box",marginTop:6,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",color:C.ink,background:C.surface,direction:"ltr",textAlign:"left"}}/>
            </label>
            <label style={{fontSize:11.5,color:C.inkSoft}}>رمز عبور {modal.receptionist ? "(اختیاری)" : "*"}
              <input type="password" value={form.password||""} onChange={e=>setForm({...form,password:e.target.value})} placeholder="حداقل ۸ کاراکتر" style={{width:"100%",boxSizing:"border-box",marginTop:6,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",color:C.ink,background:C.surface,direction:"ltr",textAlign:"left"}}/>
            </label>
          </div>
          <label style={{fontSize:11.5,color:C.inkSoft}}>مطب مرتبط
            <select value={form.office_ids?.[0]||""} onChange={e=>setForm({...form,office_ids:e.target.value?[e.target.value]:[]})} style={{width:"100%",boxSizing:"border-box",marginTop:6,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",color:C.ink,background:C.surface}}>
              <option value="">— بدون مطب —</option>
              {offices.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <label style={{fontSize:11.5,color:C.inkSoft}}>شعبه *
            <select required value={form.branch_id||""} onChange={e=>setForm({...form,branch_id:e.target.value})} style={{width:"100%",boxSizing:"border-box",marginTop:6,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",color:C.ink,background:C.surface}}>
              <option value="">— انتخاب کنید —</option>
              {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label style={{fontSize:11.5,color:C.inkSoft}}>پزشک مرتبط
            <select value={form.doctor_id||""} onChange={e=>setForm({...form,doctor_id:e.target.value})} style={{width:"100%",boxSizing:"border-box",marginTop:6,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",color:C.ink,background:C.surface}}>
              <option value="">— بدون پزشک —</option>
              {doctors.map(d=><option key={d.id} value={d.id}>{d.full_name}{d.specialty?` — ${d.specialty}`:""}</option>)}
            </select>
          </label>
<div className="receptionist-form-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label style={{fontSize:11.5,color:C.inkSoft}}>وضعیت منشی<select value={form.is_active?"active":"inactive"} onChange={e=>setForm({...form,is_active:e.target.value==="active"})} style={{width:"100%",boxSizing:"border-box",marginTop:6,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",color:C.ink,background:C.surface}}><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></label><label style={{fontSize:11.5,color:C.inkSoft}}>وضعیت حساب کاربری<select value={form.account_active?"active":"inactive"} onChange={e=>setForm({...form,account_active:e.target.value==="active"})} style={{width:"100%",boxSizing:"border-box",marginTop:6,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",color:C.ink,background:C.surface}}><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></label></div></>}
        {modal.type==="account"&&<><div style={{padding:12,borderRadius:10,background:C.surfaceAlt,border:`1px solid ${C.border}`,display:"flex",gap:9,alignItems:"center"}}><div style={{width:36,height:36,borderRadius:10,background:C.tealSoft,color:C.teal,display:"flex",alignItems:"center",justifyContent:"center"}}><UserCog size={18}/></div><div><div style={{fontSize:12.5,fontWeight:800,color:C.ink}}>{form.name}</div><div style={{fontSize:10.5,color:C.inkFaint,marginTop:2}}>مدیریت حساب ورود منشی</div></div></div><div className="receptionist-form-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label style={{fontSize:11.5,color:C.inkSoft}}>کد کاربری *<input required value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="مثلاً mosh011" style={{width:"100%",boxSizing:"border-box",marginTop:6,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",color:C.ink,background:C.surface,direction:"ltr",textAlign:"left"}}/></label><label style={{fontSize:11.5,color:C.inkSoft}}>رمز عبور اولیه {modal.receptionist?"(اختیاری)":"*"}<input required={!modal.receptionist} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="حداقل ۶ کاراکتر" style={{width:"100%",boxSizing:"border-box",marginTop:6,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",color:C.ink,background:C.surface,direction:"ltr",textAlign:"left"}}/></label></div><label style={{fontSize:11.5,color:C.inkSoft}}>وضعیت حساب<select value={form.account_active?"active":"inactive"} onChange={e=>setForm({...form,account_active:e.target.value==="active"})} style={{width:"100%",boxSizing:"border-box",marginTop:6,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontFamily:"inherit",color:C.ink,background:C.surface}}><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></label><div style={{padding:11,borderRadius:10,background:C.tealSoft,color:C.tealDark,fontSize:11.2,lineHeight:1.9}}>رمز عبور فقط برای ایجاد یا تغییر حساب استفاده می‌شود و در نسخه نهایی به‌صورت هش‌شده ذخیره خواهد شد؛ رمز ذخیره‌شده قابل مشاهده نیست.</div></>}
        <div style={{display:"flex",gap:8}}><button type="submit" style={{border:"none",background:C.teal,color:"#fff",borderRadius:9,padding:"9px 16px",fontFamily:"inherit",fontWeight:800,cursor:"pointer"}}>{modal.type==="account"?"ذخیره حساب":modal.receptionist?"ذخیره تغییرات":"ثبت منشی"}</button><button type="button" onClick={()=>setModal(null)} style={{border:`1px solid ${C.border}`,background:C.surface,color:C.inkSoft,borderRadius:9,padding:"9px 16px",fontFamily:"inherit",cursor:"pointer"}}>انصراف</button></div>
      </form>}
           {modal.type==="delete"&&<div style={{padding:18}}>
        <div style={{padding:13,borderRadius:11,background:C.claySoft,color:C.clay,fontSize:12.5,lineHeight:1.9}}>
          آیا از حذف منشی <b>{modal.receptionist?.name}</b> مطمئن هستید؟ اگر منشی سابقه عملیاتی داشته باشد، حذف فیزیکی انجام نمی‌شود و غیرفعال خواهد شد.
        </div>
        <div style={{display:"flex",gap:8,marginTop:13}}>
          <button
            onClick={async()=>{
              try {
                                const res = await api.deleteUser(modal.receptionist.id);
                setModal(null);
                load();
                if (res?.message) showSuccess(res.message);
              } catch (err) {
                showError(err.message || "خطا در حذف منشی");
              }
            }}
            style={{border:"none",background:C.clay,color:"#fff",borderRadius:9,padding:"9px 15px",fontFamily:"inherit",fontWeight:800,cursor:"pointer"}}
          >
            تأیید حذف
          </button>
          <button
            onClick={()=>setModal(null)}
            style={{border:`1px solid ${C.border}`,background:C.surface,color:C.inkSoft,borderRadius:9,padding:"9px 15px",fontFamily:"inherit",cursor:"pointer"}}
          >
            انصراف
          </button>
        </div>
      </div>}
      {modal.type==="info"&&<div style={{padding:18}}><div style={{padding:13,borderRadius:11,background:C.surfaceAlt,border:`1px solid ${C.border}`,color:C.inkSoft,fontSize:12.5,lineHeight:2}}>{modal.message}</div><button onClick={()=>setModal(null)} style={{marginTop:12,border:"none",background:C.teal,color:"#fff",borderRadius:9,padding:"9px 18px",fontFamily:"inherit",fontWeight:800,cursor:"pointer"}}>متوجه شدم</button></div>}
      </Card></div>}
  </div>;
}


function AdminSchedule() {
  const [view, setView] = useState("week");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [officeFilter, setOfficeFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [offices, setOffices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [doctorsRes, officesRes, branchesRes] = await Promise.all([
        api.listDoctors(),
        api.listOffices(),
        api.listBranches(),
      ]);

      const doctorsList = doctorsRes?.doctors || [];
      const officesList = officesRes?.offices || [];
      const branchesList = branchesRes?.branches || [];

      setDoctors(doctorsList);
      setOffices(officesList);
      setBranches(branchesList);

      // گرفتن برنامه کاری همه پزشکان
      const schedulesPromises = doctorsList.map((d) =>
        api.doctorSchedule(d.id).then((res) => ({
          doctor_id: d.id,
          doctor_name: d.full_name,
          specialty: d.specialty,
          branch_id: d.branch_id,
          schedule: res?.schedule || [],
        })).catch(() => ({
          doctor_id: d.id,
          doctor_name: d.full_name,
          specialty: d.specialty,
          branch_id: d.branch_id,
          schedule: [],
        }))
      );

      const schedules = await Promise.all(schedulesPromises);
      setAllSchedules(schedules);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ساخت لیست برنامه‌ها برای نمایش
  const flatSchedules = useMemo(() => {
    const list = [];
    for (const doc of allSchedules) {
      const docBranches = branches.filter((b) => String(b.id) === String(doc.branch_id));
      for (const s of doc.schedule) {
        // پیدا کردن شعبه‌ای که این برنامه توش هست
        const branchId = s.branch_id || doc.branch_id;
        const branch = branches.find((b) => String(b.id) === String(branchId));

        list.push({
          doctor_id: doc.doctor_id,
          doctor: doc.doctor_name,
          specialty: doc.specialty,
          branch_id: branchId,
          branch: branch?.name || "—",
          weekday: s.weekday,
          start: s.start_time?.slice(0, 5) || "",
          end: s.end_time?.slice(0, 5) || "",
          slot_minutes: s.slot_minutes || 30,
          shift: (() => {
            const hour = parseInt(s.start_time?.split(":")[0] || "0", 10);
            if (hour < 12) return "صبح";
            if (hour < 17) return "ظهر";
            if (hour < 20) return "عصر";
            return "شب";
          })(),
          active: true,
        });
      }
    }
    return list;
  }, [allSchedules, branches]);

  const filtered = flatSchedules.filter(
    (x) =>
      (!doctorFilter || String(x.doctor_id) === String(doctorFilter)) &&
      (!officeFilter || String(x.branch_id) === String(officeFilter))
  );

  function openAddForDoctor(doctorId) {
    setModal({ type: "schedule", doctorId });
  }

  const shiftTone = (shift) =>
    shift === "صبح"
      ? { bg: C.tealSoft, color: C.tealDark }
      : shift === "ظهر"
      ? { bg: C.blueSoft, color: C.blue }
      : shift === "عصر"
      ? { bg: C.saffronSoft, color: C.saffronDark }
      : { bg: C.purpleSoft, color: C.purple };

  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (loading) return <LoadingBlock label="در حال بارگذاری برنامه‌های کاری..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.navy }}>مدیریت برنامه کاری</div>
          <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 4 }}>
            برنامه هفتگی پزشکان بر اساس شعبه، روز و چند شیفت در هر روز
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }} className="schedule-kpi-grid">
        {[
          ["کل برنامه‌ها", filtered.length, CalendarDays, C.teal],
          ["برنامه‌های فعال", filtered.length, CheckCircle2, C.teal],
          ["پزشکان دارای برنامه", new Set(filtered.map((x) => x.doctor_id)).size, Stethoscope, C.blue],
          ["روزهای دارای برنامه", new Set(filtered.map((x) => x.weekday)).size, CalendarDays, C.saffronDark],
        ].map(([label, value, Icon, color]) => (
          <Card key={label} style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10.8, color: C.inkFaint }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color, marginTop: 6 }}>{toFa(value)}</div>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} color={color} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 9, alignItems: "center" }} className="schedule-filter-grid">
          <label style={{ fontSize: 11.2, color: C.inkSoft }}>
            پزشک
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 5, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 10px", background: C.surface, color: C.ink, fontFamily: "inherit" }}
            >
              <option value="">همه پزشکان</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} {d.specialty ? `— ${d.specialty}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 11.2, color: C.inkSoft }}>
            شعبه
            <select
              value={officeFilter}
              onChange={(e) => setOfficeFilter(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 5, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 10px", background: C.surface, color: C.ink, fontFamily: "inherit" }}
            >
              <option value="">همه شعبه‌ها</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", gap: 6, alignSelf: "end" }}>
            <button
              onClick={() => setView("week")}
              style={{ border: `1px solid ${view === "week" ? C.teal : C.border}`, background: view === "week" ? C.tealSoft : C.surface, color: view === "week" ? C.tealDark : C.inkSoft, borderRadius: 9, padding: "8px 11px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }}
            >
              هفتگی
            </button>
            <button
              onClick={() => setView("list")}
              style={{ border: `1px solid ${view === "list" ? C.teal : C.border}`, background: view === "list" ? C.tealSoft : C.surface, color: view === "list" ? C.tealDark : C.inkSoft, borderRadius: 9, padding: "8px 11px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }}
            >
              لیستی
            </button>
          </div>
        </div>
      </Card>

      {view === "week" ? (
        <Card style={{ padding: 12, overflowX: "auto" }}>
          <div style={{ minWidth: 900, display: "grid", gridTemplateColumns: "repeat(7,minmax(120px,1fr))", gap: 8 }}>
            {days.map((day, dayIndex) => {
              const items = filtered.filter((x) => Number(x.weekday) === dayIndex);
              return (
                <div key={day} style={{ minHeight: 270, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surfaceAlt, padding: 9 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 12.5, fontWeight: 900, color: C.ink }}>{day}</span>
                    <span style={{ fontSize: 10, color: C.inkFaint }}>{toFa(items.length)} برنامه</span>
                  </div>
                  {items.length === 0 ? (
                    <div style={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.inkFaint, fontSize: 11, lineHeight: 1.9 }}>
                      هنوز برنامه‌ای ثبت نشده است
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingTop: 8 }}>
                      {items.map((item, i) => {
                        const tone = shiftTone(item.shift);
                        return (
                          <div key={i} style={{ padding: 9, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                              <b style={{ fontSize: 11.5, color: C.ink }}>{item.doctor}</b>
                              <span style={{ fontSize: 9.5, background: tone.bg, color: tone.color, borderRadius: 7, padding: "3px 6px" }}>{item.shift}</span>
                            </div>
                            <div style={{ fontSize: 10.5, color: C.inkSoft, marginTop: 6 }}>{item.branch}</div>
                            <div style={{ fontSize: 10.5, color: C.tealDark, fontWeight: 800, marginTop: 4 }} dir="ltr">
                              {item.start} - {item.end}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <EmptyState icon={CalendarDays} title="هنوز برنامه کاری ثبت نشده است" desc="بعد از تعریف پزشک، از منوی «پزشکان» برای هر پزشک برنامه هفتگی تعریف کنید." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: C.surfaceAlt }}>
                    {["ردیف", "پزشک", "تخصص", "شعبه", "روز", "شیفت", "ساعت شروع", "ساعت پایان", "مدت نوبت"].map((h) => (
                      <th key={h} style={{ textAlign: "right", padding: "12px 14px", color: C.inkSoft, fontWeight: 700, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkFaint }}>{toFa(i + 1)}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.ink, fontWeight: 700 }}>{item.doctor}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }}>{item.specialty || "—"}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }}>{item.branch}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }}>{days[Number(item.weekday)]}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }}>{item.shift}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }} dir="ltr">{item.start}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }} dir="ltr">{item.end}</td>
                      <td style={{ padding: "13px 14px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }}>{toFa(item.slot_minutes)} دقیقه</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card style={{ background: C.surfaceAlt }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertCircle size={18} color={C.teal} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: C.ink }}>ساختار برنامه کاری</div>
            <div style={{ fontSize: 11.2, color: C.inkFaint, lineHeight: 2, marginTop: 3 }}>
              هر پزشک می‌تواند در چند شعبه فعالیت کند و برای هر شعبه، در هر روز هفته چند شیفت جداگانه داشته باشد. برای تعریف یا ویرایش برنامه، از منوی «پزشکان» و دکمه «برنامه کاری» استفاده کنید.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
function ClinicShell() {
  const { user, logout } = useAuth();
  const role = mapRole(user.role);
  const [active, setActive] = useState(MENUS[role][0].key);
  const [doctorId, setDoctorId] = useState(null);
  const [branches, setBranches] = useState(null);
  const menu = MENUS[role];
  const meta = ROLE_META[role];
  const today = todayJalali();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("clinic-theme") === "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("clinic-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((current) => {
      const next = !current;
      document.documentElement.dataset.theme = next ? "dark" : "light";
      localStorage.setItem("clinic-theme", next ? "dark" : "light");
      return next;
    });
  };

  useEffect(() => {
    const handler = (e) => setActive(e.detail);
    window.addEventListener("clinic-nav", handler);
    return () => window.removeEventListener("clinic-nav", handler);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("clinicyar_token");
    if (!token) return;
    fetch("http://localhost:4000/api/license/status", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.ok ? res.json() : null)
      .then((d) => setLicenseStatus(d?.license || null))
      .catch(() => setLicenseStatus(null));
  }, []);

  useEffect(() => {
    if (role === "doctor") {
      api.myDoctorProfile().then((d) => setDoctorId(d.doctor.id)).catch(() => {});
    }
    if (role === "admin") {
      api.listBranches().then((d) => setBranches(d.branches)).catch(() => {});
    }
  }, [role]);

  const roleTitle = { admin: "مدیر کلینیک", doctor: "پزشک", secretary: "منشی", accountant: "حسابدار" }[role] || "کاربر";
  const activeLabel = menu.find((m) => m.key === active)?.label || ({
    offices: "مدیریت مطب‌ها", doctors: "مدیریت پزشکان", receptionists: "مدیریت منشی‌ها", schedule: "مدیریت برنامه کاری",
  }[active] || "داشبورد");

  const screen = useMemo(() => {
    if (role === "admin") {
      if (active === "dashboard") return <AdminDashboard />;
      if (active === "branches") return <AdminBranches />;
      if (active === "offices") return <AdminOffices />;
      if (active === "doctors") return <AdminDoctors />;
      if (active === "receptionists") return <AdminReceptionists />;
      if (active === "schedule") return <AdminSchedule />;
      if (active === "finance") return <AdminFinance />;
      if (active === "settings") return <SettingsScreen licenseStatus={licenseStatus} />;
    }
    if (role === "doctor") {
      if (!doctorId) return <LoadingBlock label="در حال بارگذاری پروفایل پزشک..." />;
      if (active === "dashboard") return <DoctorDashboard doctorId={doctorId} />;
      if (active === "calendar") return <DoctorCalendar doctorId={doctorId} />;
      if (active === "patients") return <DoctorPatients doctorId={doctorId} />;
      if (active === "visit") return <DoctorVisit doctorId={doctorId} />;
      if (active === "prescriptions") return <DoctorPrescribe doctorId={doctorId} />;
    }
    if (role === "secretary") {
      if (active === "booking") return <SecretaryBooking branchId={user.branch_id} />;
      if (active === "patients") return <SecretaryPatients />;
      if (active === "queue") return <SecretaryQueue branchId={user.branch_id} />;
      if (active === "checkout") return <SecretaryCheckout branchId={user.branch_id} />;
    }
    return null;
  }, [role, active, user.branch_id, doctorId, branches, darkMode]);

  return (
    <div dir="rtl" lang="fa" style={{ fontFamily: "'Vazirmatn', Tahoma, sans-serif", background: C.bg, minHeight: "100vh", width: "100%", color: C.ink }}>
      <GlobalStyle />
      {/* ⭐ استایل‌های اسکرول‌بار و ریسپانسیو */}
      <style>{`
      ::-webkit-scrollbar {
    width: 4px;
    height: 4px;
}

::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
}

::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: #49D3C4;
}


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

      <header className="clinic-topbar" style={{ height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="clinic-menu-toggle"
            title={sidebarOpen ? "بستن منو" : "باز کردن منو"}
            style={{
              display: "none",
              width: 38, height: 38, borderRadius: 11,
              border: `1px solid ${C.border}`,
              background: C.surface,
              color: C.inkSoft,
              cursor: "pointer",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Brand size={50} />
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: C.navy }}>کلینیک‌یار</div>
            <div style={{ fontSize: 10.5, color: C.inkFaint, marginTop: 1 }}>سامانه مدیریت کلینیک</div>
          </div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 11px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 11, color: C.inkSoft }}>
            <span>وضعیت لایسنس</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 20, background: licenseStatus?.active === false ? C.claySoft : C.tealSoft, color: licenseStatus?.active === false ? C.clay : C.tealDark, fontWeight: 800 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: licenseStatus?.active === false ? C.clay : C.teal }} />
              {licenseStatus?.active === false ? "غیرفعال" : licenseStatus ? "فعال" : "در حال بررسی"}
            </span>
            {licenseStatus?.expiry && (() => {
              const expiryDate = new Date(licenseStatus.expiry);
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              expiryDate.setHours(0, 0, 0, 0);
              const remainingDays = Math.max(0, Math.ceil((expiryDate - todayStart) / 86400000));
              return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: remainingDays <= 30 ? C.clay : C.inkSoft, fontWeight: 800 }}><CalendarDays size={14} color={remainingDays <= 30 ? C.clay : C.teal} /> {remainingDays.toLocaleString("fa-IR")} روز تا انقضاء</span>;
            })()}
          </div>
          <div className="clinic-topbar-date" style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 11px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 11.5, color: C.inkSoft }}>
            <CalendarDays size={15} color={C.teal} /> {jalaliLabel(today, true)}
          </div>
          <button onClick={toggleTheme} title={darkMode ? "فعال‌کردن تم روشن" : "فعال‌کردن تم دارک"} style={{ width: 38, height: 38, borderRadius: 11, border: `1px solid ${C.border}`, background: C.surface, color: C.inkSoft, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
            {darkMode ? "☀️" : "🌙"}
          </button>
          <NotificationsDropdown onNavigate={(link) => {
            if (link.includes("secretary/patients")) setActive("patients");
            else if (link.includes("appointment-requests")) setActive("patients");
            else if (link.includes("doctor/calendar")) setActive("calendar");
            else if (link.includes("secretary/queue")) setActive("queue");
            else if (link.includes("secretary/checkout")) setActive("checkout");
            else if (link.includes("doctor/visit")) setActive("visit");
          }} />
          <button
            onClick={() => setShowChangePassword(true)}
            title="تغییر رمز عبور"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              border: `1px solid ${C.border}`,
              background: C.surface,
              borderRadius: 10,
              padding: "8px 11px",
              color: C.inkSoft,
              fontSize: 11.5,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Lock size={15} /> تغییر رمز
          </button>
          <div style={{ width: 1, height: 28, background: C.border, margin: "0 2px" }} />
          <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 7, border: `1px solid ${C.border}`, background: C.surface, borderRadius: 10, padding: "8px 11px", color: C.inkSoft, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
            <LogOut size={15} /> خروج
          </button>
        </div>
      </header>

      <div style={{ 
        display: "flex", 
        height: "calc(100vh - 68px)",
        overflow: "hidden"
      }}>
        <aside className={`clinic-sidebar${sidebarOpen ? " open" : ""}`} style={{ 
          width: 238, 
          flexShrink: 0, 
          background: C.surface, 
          borderLeft: `1px solid ${C.border}`, 
          padding: "20px 14px", 
          display: "flex", 
          flexDirection: "column", 
          gap: 18,
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 9px", background: meta.accentSoft, borderRadius: 14, border: `1px solid ${meta.accent}22` }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
              <meta.icon size={18} color={meta.accent} />
            </div>
            <div className="clinic-user-text" style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: C.ink }}>{roleTitle}</div>
              <div style={{ fontSize: 10.5, color: C.inkSoft, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.full_name}</div>
            </div>
          </div>

          <div style={{ fontSize: 10.5, color: C.inkFaint, fontWeight: 700, padding: "0 9px" }}>منوی اصلی</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {menu.map((item) => {
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  className="clinic-nav-button"
                  onClick={() => {
                    setActive(item.key);
                    setSidebarOpen(false);
                  }}
                  title={item.label}
                  style={{
                    display: "flex", alignItems: "center", gap: 11, padding: "11px 12px",
                    borderRadius: 11, border: isActive ? `1px solid ${meta.accent}22` : "1px solid transparent", cursor: "pointer", textAlign: "right",
                    background: isActive ? meta.accentSoft : "transparent",
                    color: isActive ? meta.accent : C.inkSoft,
                    fontSize: 12.8, fontWeight: isActive ? 800 : 500,
                  }}
                >
                  <item.icon size={17} />
                  <span className="clinic-nav-label" style={{ flex: 1 }}>{item.label}</span>
                  {isActive && <ChevronLeft className="clinic-nav-label" size={14} />}
                </button>
              );
            })}
          </nav>

          <div style={{ marginTop: "auto", padding: "12px 11px", borderRadius: 13, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10.5, color: C.inkFaint }}>نسخه سامانه</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, marginTop: 3 }}>ClinicYar · 1.0</div>
          </div>
        </aside>

        <main className="clinic-main" style={{ 
          flex: 1, 
          padding: 26, 
          minWidth: 0, 
          maxWidth: 1600, 
          margin: "0 auto", 
          width: "100%",
          height: "100%",
          overflowY: "auto"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{activeLabel}</div>
              <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 4 }}>{role === "admin" ? "مدیریت و نظارت کلینیک" : role === "doctor" ? "مدیریت امور پزشکی و بیماران" : "مدیریت پذیرش و امور روزانه"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 10, background: meta.accentSoft, color: meta.accent, fontSize: 11, fontWeight: 800 }}>
              <meta.icon size={14} /> {roleTitle}
            </div>
          </div>
          {screen}
        </main>
      </div>
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
            setTimeout(() => {
              alert("رمز عبور با موفقیت تغییر کرد. لطفاً با رمز جدید وارد شوید.");
              logout();
            }, 100);
          }}
        />
      )}
    </div>
  );
}
function AppGate() {
  const { user, loading } = useAuth();
  const [patientMode, setPatientMode] = useState(false);

  // 🌟 وقتی توکن بیمار ست/حذف شد، patientMode رو آپدیت کن
  useEffect(() => {
    const token = localStorage.getItem("clinicyar_token");
    if (!token) {
      setPatientMode(false);
      return;
    }
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const payload = JSON.parse(jsonPayload);
      setPatientMode(payload.role === "patient");
    } catch {
      setPatientMode(false);
    }
  }, []);

  const handlePatientLogout = () => {
    // پاک کردن کامل همه کلیدهای احراز هویت
  localStorage.removeItem("clinicyar_token");
    localStorage.removeItem("patient_token");
    localStorage.removeItem("staff_token");
    localStorage.removeItem("sanad_token");
    localStorage.removeItem("sanad_user");
    localStorage.removeItem("sanad_company_code");
    
    setPatientMode(false);
 window.location.href = "/";
    };
  if (patientMode) {
    return <PatientPortal onLogout={handlePatientLogout} />;
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <LoadingBlock label="در حال بررسی ورود..." />
      </div>
    );
  }

  return user ? <ClinicShell /> : <LoginScreen onPatientLogin={() => setPatientMode(true)} />;
}
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </ToastProvider>
  );
}