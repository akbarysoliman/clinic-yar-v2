import React, { useState, useEffect, useCallback } from "react";
import { useToastContext } from "./contexts/ToastContext.jsx";
import {
  User, LogOut, Home, FileText, Bell, Settings,
  Phone, CreditCard, Plus, CheckCircle2, XCircle,
  Clock, Building2, ChevronLeft, AlertCircle, UserPlus, Star,
} from "lucide-react";
import { C, Card, Brand, GlobalStyle } from "./theme.jsx";
import { api, saveToken, getToken, clearToken } from "./api.js";
import { toFa, jalaliToGregorian } from "./jalali.js";
import JalaliDatePicker from "./JalaliDatePicker.jsx";
import PatientProfileModal from "./components/PatientProfileModal.jsx";
import { ActionButton, PrimaryButton } from "./components/ActionButtons.jsx";
const METHOD_LABEL = {
  cash: "نقدی",
  card: "کارت",
  bank_transfer: "انتقال بانکی",
  gateway: "درگاه پرداخت",
  insurance: "بیمه",
  other: "سایر",
};

import NotificationsDropdown from "./components/NotificationsDropdown.jsx";
/* ============================================================ */
/* صفحه ورود بیمار                                              */
/* ============================================================ */
function PatientLoginScreen({ onSuccess }) {
  const { showError } = useToastContext();
  const [phone, setPhone] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [needFullName, setNeedFullName] = useState(false);
  const [submitting, setSubmitting] = useState(false);
 
  async function handleSubmit(e) {
    e.preventDefault();
    if (!phone || !nationalCode) return;

    setSubmitting(true);

    try {
      const res = await api.patientLogin(
        phone.trim(),
        nationalCode.trim(),
        needFullName ? fullName.trim() : undefined
      );

      if (res?.token && res?.account) {
        saveToken(res.token);
        onSuccess(res.account);
      }
    } catch (err) {
      // اگه خطای NEED_FULL_NAME بود، فیلد نام کامل رو نشون بده
      if (err.message?.includes("نام کامل")) {
        setNeedFullName(true);
               showError("لطفاً نام کامل خود را وارد کنید");
      } else {
        showError(err.message || "خطا در ورود");
      }
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
    background: C.surface,
  };

  const disabled = submitting || !phone || !nationalCode || (needFullName && !fullName);

  return (
    <div
      dir="rtl"
      lang="fa"
      style={{
        fontFamily: "'Vazirmatn', Tahoma, sans-serif",
        background: C.bg,
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <GlobalStyle />

      <div style={{ width: 380, maxWidth: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <Brand size={34} />
          <div style={{ fontSize: 19, fontWeight: 700, color: C.ink }}>
            کلینیک‌یار
          </div>
        </div>

        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 26,
          }}
        >
          <div style={{ fontSize: 15.5, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
            ورود بیمار
          </div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 20 }}>
            با شماره موبایل و کد ملی وارد شوید
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div>
              <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>
                شماره موبایل
              </div>
              <div style={{ position: "relative" }}>
                <Phone
                  size={17}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: C.inkFaint,
                  }}
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="۰۹۱۲xxxxxxx"
                  style={{ ...inputStyle, paddingRight: 40 }}
                  dir="ltr"
                  maxLength={11}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>
                کد ملی
              </div>
              <div style={{ position: "relative" }}>
                <User
                  size={17}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: C.inkFaint,
                  }}
                />
                <input
                  value={nationalCode}
                  onChange={(e) => setNationalCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="۱۰ رقم"
                  style={{ ...inputStyle, paddingRight: 40 }}
                  dir="ltr"
                  maxLength={10}
                  autoComplete="off"
                />
              </div>
            </div>

            {needFullName && (
              <div>
                <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>
                  نام و نام خانوادگی
                </div>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثلاً مریم کاظمی"
                  style={inputStyle}
                  autoFocus
                />
              </div>
            )}

           

            <button
              type="submit"
              disabled={disabled}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "11px 0",
                borderRadius: 10,
                border: "none",
                marginTop: 4,
                background: disabled ? "#D9DFDF" : C.teal,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              <LogOut size={16} style={{ transform: "rotate(180deg)" }} />
              {submitting ? "در حال ورود..." : "ورود"}
            </button>
          </form>
        </div>

        <div
          style={{
            fontSize: 11.5,
            color: C.inkFaint,
            textAlign: "center",
            marginTop: 16,
            lineHeight: 2,
          }}
        >
          با ورود، پرونده‌های موجود شما در کلینیک‌های مختلف نمایش داده می‌شود.
          <br />
          برای اتصال به هر پرونده، نیاز به تأیید منشی است.
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/* داشبورد بیمار                                                */
/* ============================================================ */
function PatientDashboard({ account, records, loading, loadingRecords, recordsError, onRefresh, tab, setTab }) {
  const { showSuccess, showError } = useToastContext();
  const [message, setMessage] = useState(null);
  // stateهای نوبت‌ها
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
const [prescriptions, setPrescriptions] = useState([]);
const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
const [invoices, setInvoices] = useState([]);
const [invoiceTotals, setInvoiceTotals] = useState({ total: 0, paid: 0, outstanding: 0 });
const [loadingInvoices, setLoadingInvoices] = useState(false);
  // stateهای پزشکان مورد علاقه
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // stateهای درخواست نوبت
  const [doctors, setDoctors] = useState([]);
  const [availableClinics, setAvailableClinics] = useState([]);
  const [availableSpecialties, setAvailableSpecialties] = useState([]);
  const [filterClinic, setFilterClinic] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
const [filterOnlyFavorites, setFilterOnlyFavorites] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorSchedule, setDoctorSchedule] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [requestNotes, setRequestNotes] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState(null);

  // شناسه پزشکان مورد علاقه (برای راحتی)
  const favoriteDoctorIds = new Set(favorites.map((f) => f.doctor_id));

  async function toggleFavorite(doctorId, doctorName) {
    const isFav = favoriteDoctorIds.has(doctorId);
    try {
      if (isFav) {
        await api.removeFavorite(doctorId);
        setFavorites((list) => list.filter((f) => f.doctor_id !== doctorId));
        showSuccess(`«${doctorName}» از علاقه‌مندی‌ها حذف شد`);
      } else {
        await api.addFavorite(doctorId);
        showSuccess(`«${doctorName}» به علاقه‌مندی‌ها اضافه شد`);
        // بعد از اضافه، لیست رو دوباره بارگذاری کن
        const d = await api.listFavorites();
        setFavorites(d.favorites || []);
      }
    } catch (e) {
      showError(e.message || "خطا در به‌روزرسانی علاقه‌مندی");
    }
  }
  

  // ---------- بارگذاری نوبت‌ها ----------
  const loadAppointments = useCallback(() => {
    setLoadingAppointments(true);
    api.getMyAppointments()
      .then((d) => setAppointments(d.appointments || []))
      .catch(() => setAppointments([]))
      .finally(() => setLoadingAppointments(false));
  }, []);
useEffect(() => {
  if (tab === "favorites" && favorites.length === 0) {
    setLoadingFavorites(true);
    api.listFavorites()
      .then((d) => setFavorites(d.favorites || []))
      .catch(() => setFavorites([]))
      .finally(() => setLoadingFavorites(false));
  }
}, [tab, favorites.length]);
  useEffect(() => {
    if (tab === "appointments") {
      loadAppointments();
    }
  }, [tab, loadAppointments]);
useEffect(() => {
  if (tab === "prescriptions" && prescriptions.length === 0) {
    setLoadingPrescriptions(true);
    api.getMyPrescriptions()
      .then((d) => setPrescriptions(d.prescriptions || []))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoadingPrescriptions(false));
  }
}, [tab, prescriptions.length]);

useEffect(() => {
  if (tab === "invoices" && invoices.length === 0) {
    setLoadingInvoices(true);
    api.getMyInvoices()
      .then((d) => {
        setInvoices(d.invoices || []);
        setInvoiceTotals(d.totals || { total: 0, paid: 0, outstanding: 0 });
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoadingInvoices(false));
  }
}, [tab, invoices.length]);

  // ---------- بارگذاری پزشکان ----------
  const loadDoctors = useCallback(() => {
  setLoadingDoctors(true);
  const params = {};
  if (filterClinic) params.clinic_id = filterClinic;
  if (filterSpecialty) params.specialty_id = filterSpecialty;
  if (filterSearch.trim()) params.q = filterSearch.trim();

  api.getPatientDoctors(params)
    .then((d) => {
      let list = d.doctors || [];
      if (filterOnlyFavorites) {
        list = list.filter((doc) => doc.is_favorite);
      }
      setDoctors(list);
      if (d.clinics) setAvailableClinics(d.clinics);
      if (d.specialties) setAvailableSpecialties(d.specialties);
    })
    .catch(() => setDoctors([]))
    .finally(() => setLoadingDoctors(false));
}, [filterClinic, filterSpecialty, filterSearch, filterOnlyFavorites]);

  useEffect(() => {
    if (tab === "new-appointment") {
      loadDoctors();
    }
  }, [tab, loadDoctors]);
  // ---------- بارگذاری ساعت‌های خالی ----------
 const loadSlots = useCallback(async (doctorId, branchId, date) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
      const url = `${API_BASE}/patient-portal/doctor-slots?doctor_id=${doctorId}&branch_id=${branchId}&date=${date}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("clinicyar_token")}`,
        },
      });
      const d = await res.json();
      setSlots(d.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // ---------- ارسال درخواست اتصال ----------
  

  // ---------- ارسال درخواست نوبت ----------
    async function submitAppointmentRequest() {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;
    setSubmittingRequest(true);
   
    try {
      const g = jalaliToGregorian(selectedDate.jy, selectedDate.jm, selectedDate.jd);
      const dateStr = `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
      const appointmentAt = `${dateStr}T${selectedSlot.label}:00+03:30`;

      await api.requestAppointment({
        doctor_id: selectedDoctor.id,
        branch_id: selectedDoctor.branch_id,
        appointment_at: appointmentAt,
        notes: requestNotes.trim() || undefined,
      });

      showSuccess("درخواست نوبت با موفقیت ارسال شد و در انتظار تأیید منشی است.");
      
      // ⭐ این خط رو اضافه کن
      await onRefresh(); 

      setSelectedDoctor(null);
      setSelectedDate(null);
      setSlots([]);
      setSelectedSlot(null);
      setRequestNotes("");
    } catch (e) {
      showError(e.message || "خطا در ارسال درخواست");
    } finally {
      setSubmittingRequest(false);
    }
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>
          سلام، {account.full_name}
        </div>
        <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 4 }}>
          به پنل بیمار کلینیک‌یار خوش آمدید
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11.5, color: C.inkSoft }}>پرونده‌های متصل</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.tealDark, marginTop: 6 }}>
                {toFa(records.length)}
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: C.tealSoft, color: C.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={20} />
            </div>
          </div>
        </Card>

        
      </div>

      {/* تب‌بار */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
       {[
  { key: "my-records", label: "پرونده‌های من" },
  { key: "appointments", label: "نوبت‌های من" },
  { key: "new-appointment", label: "درخواست نوبت" },
  { key: "prescriptions", label: "نسخه‌ها" },
  { key: "invoices", label: "صورت‌حساب‌ها" },
  { key: "favorites", label: "پزشکان مورد علاقه" },
].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              border: `1px solid ${tab === t.key ? C.teal : C.border}`,
              background: tab === t.key ? C.tealSoft : C.surface,
              color: tab === t.key ? C.tealDark : C.inkSoft,
              borderRadius: 9, padding: "9px 16px", fontFamily: "inherit",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: message.type === "success" ? C.tealSoft : C.claySoft,
            color: message.type === "success" ? C.tealDark : C.clay,
            fontSize: 12.5,
            lineHeight: 1.9,
          }}
        >
          {message.text}
        </div>
      )}

      {/* ---------- تب پرونده‌های من ---------- */}
      {tab === "my-records" && (
        <>
          {loadingRecords ? (
  <Card style={{ padding: 40, textAlign: "center" }}>
    در حال دریافت پرونده‌ها...
  </Card>
) : recordsError ? (
  <Card style={{ padding: 24, textAlign: "center" }}>
    <div style={{ color: C.clay, marginBottom: 14 }}>
      {recordsError}
    </div>
    <button
      onClick={onRefresh}
      style={{
        border: "none",
        borderRadius: 9,
        padding: "10px 18px",
        background: C.teal,
        color: "#fff",
        fontFamily: "inherit",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      تلاش مجدد
    </button>
  </Card>
) : records.length === 0 ? (
            <Card style={{ padding: 40, textAlign: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: C.tealSoft, color: C.teal, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <UserPlus size={28} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 6 }}>
                هنوز پرونده‌ای متصل نکرده‌اید
              </div>
              <div style={{ fontSize: 12.5, color: C.inkFaint, marginBottom: 16 }}>
                برای مشاهده پرونده‌های پزشکی، از تب «اتصال به پرونده جدید» استفاده کنید.
              </div>
             
            </Card>
          ) : (
            <Card>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, marginBottom: 4 }}>
                پرونده‌های متصل شما
              </div>
              <div style={{ fontSize: 11.5, color: C.inkFaint, marginBottom: 14 }}>
                کلینیک‌هایی که پرونده شما در آن‌ها تأیید شده است
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {records.map((r) => (
                  <div key={r.link_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: C.tealSoft, color: C.teal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Building2 size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>
                        {r.clinic_name}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>
  {r.verified && r.full_name ? `پرونده: ${r.full_name}` : "در انتظار تأیید پرونده"}
</div>
                    </div>
                   <span
  style={{
    fontSize: 10.5,
    fontWeight: 700,
    padding: "4px 9px",
    borderRadius: 20,
    background: r.verified ? C.tealSoft : C.claySoft,
    color: r.verified ? C.tealDark : C.clay,
  }}
>
  {r.verified ? "تأییدشده" : "در انتظار تأیید"}
</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ---------- تب اتصال به پرونده جدید ---------- */}

      {/* ---------- تب نوبت‌های من ---------- */}
      {tab === "appointments" && (
        <Card>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, marginBottom: 4 }}>
            نوبت‌های من
          </div>
          <div style={{ fontSize: 11.5, color: C.inkFaint, marginBottom: 14 }}>
            نوبت‌های آینده و گذشته شما
          </div>

          {loadingAppointments && (
            <div style={{ padding: 20, textAlign: "center", color: C.inkSoft, fontSize: 13 }}>
              در حال دریافت نوبت‌ها...
            </div>
          )}

          {!loadingAppointments && appointments.length === 0 && (
            <div style={{ padding: 30, textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>
                هنوز نوبتی ندارید
              </div>
              <div style={{ fontSize: 12, color: C.inkFaint }}>
                برای درخواست نوبت، از تب «درخواست نوبت» استفاده کنید.
              </div>
            </div>
          )}

          {!loadingAppointments && appointments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {appointments.map((a) => {
                const statusMap = {
                  pending: { label: "در انتظار تأیید", bg: C.saffronSoft, color: C.saffronDark },
                  booked: { label: "تأییدشده", bg: C.tealSoft, color: C.tealDark },
                  checked_in: { label: "پذیرش‌شده", bg: C.tealSoft, color: C.tealDark },
                  in_visit: { label: "در حال ویزیت", bg: C.tealSoft, color: C.tealDark },
                  completed: { label: "تکمیل‌شده", bg: C.surfaceAlt, color: C.inkSoft },
                  cancelled: { label: "لغو شده", bg: C.claySoft, color: C.clay },
                  rejected: { label: "رد شده", bg: C.claySoft, color: C.clay },
                  no_show: { label: "عدم مراجعه", bg: C.claySoft, color: C.clay },
                };
                const status = statusMap[a.status] || { label: a.status, bg: C.surfaceAlt, color: C.inkSoft };

                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: C.tealSoft, color: C.teal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Clock size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>
                        {a.doctor_name}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>
                        {a.clinic_name} — {new Date(a.appointment_at).toLocaleString("fa-IR")}
                      </div>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 9px", borderRadius: 20, background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ---------- تب درخواست نوبت ---------- */}
          {tab === "new-appointment" && (
        <>
          

          {/* مرحله ۱: کارت‌های پزشکان */}
                   {!selectedDoctor && (
            <Card>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, marginBottom: 4 }}>
                انتخاب پزشک
              </div>
              <div style={{ fontSize: 11.5, color: C.inkFaint, marginBottom: 14 }}>
                پزشکان کلینیک‌هایی که پرونده شما در آن‌ها تأیید شده است
              </div>

              {/* فیلترها */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
                marginBottom: 16,
              }}>
                <div>
                  <div style={{ fontSize: 11.5, color: C.inkSoft, marginBottom: 5 }}>
                    کلینیک
                  </div>
                  <select
                    value={filterClinic}
                    onChange={(e) => setFilterClinic(e.target.value)}
                    style={{
                      width: "100%",
                      border: `1px solid ${C.border}`,
                      borderRadius: 9,
                      padding: "9px 11px",
                      fontFamily: "inherit",
                      fontSize: 12.5,
                      color: C.ink,
                      background: C.surface,
                    }}
                  >
                    <option value="">همه کلینیک‌ها</option>
                    {availableClinics.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: C.inkSoft, marginBottom: 5 }}>
                    تخصص
                  </div>
                  <select
                    value={filterSpecialty}
                    onChange={(e) => setFilterSpecialty(e.target.value)}
                    style={{
                      width: "100%",
                      border: `1px solid ${C.border}`,
                      borderRadius: 9,
                      padding: "9px 11px",
                      fontFamily: "inherit",
                      fontSize: 12.5,
                      color: C.ink,
                      background: C.surface,
                    }}
                  >
                    <option value="">همه تخصص‌ها</option>
                    {availableSpecialties.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: C.inkSoft, marginBottom: 5 }}>
                    جستجو
                  </div>
                  <input
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="نام یا تلفن پزشک"
                    style={{
                      width: "100%",
                      border: `1px solid ${C.border}`,
                      borderRadius: 9,
                      padding: "9px 11px",
                      fontFamily: "inherit",
                      fontSize: 12.5,
                      color: C.ink,
                      background: C.surface,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={filterOnlyFavorites}
                      onChange={(e) => setFilterOnlyFavorites(e.target.checked)}
                      style={{ cursor: "pointer", width: 15, height: 15 }}
                    />
                    فقط علاقه‌مندی‌ها
                  </label>
                </div>
              </div>

              {/* کارت‌های پزشکان */}
              {loadingDoctors && (
                <div style={{ padding: 20, textAlign: "center", color: C.inkSoft, fontSize: 13 }}>
                  در حال دریافت پزشکان...
                </div>
              )}

              {!loadingDoctors && doctors.length === 0 && (
                <div style={{ padding: 30, textAlign: "center", color: C.inkFaint, fontSize: 12.5 }}>
                  پزشکی با این مشخصات پیدا نشد
                </div>
              )}

              {!loadingDoctors && doctors.length > 0 && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 12,
                }}>
                  {doctors.map((d) => {
  const isFav = favoriteDoctorIds.has(d.id);
  return (
    <div
      key={d.id}
      style={{
        position: "relative",
        border: `1px solid ${C.border}`,
        background: C.surface,
        borderRadius: 12,
        padding: 14,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        transition: "all .15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.teal;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.transform = "none";
      }}
    >
      <button
        type="button"
        onClick={() => {
          setSelectedDoctor(d);
          setSelectedDate(null);
          setSlots([]);
          setSelectedSlot(null);
          api.getDoctorDays(d.id, d.branch_id)
            .then((res) => setDoctorSchedule(res.schedule || []))
            .catch(() => setDoctorSchedule([]));
        }}
        style={{
          flex: 1,
          textAlign: "right",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: "inherit",
          padding: 0,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 12, background: C.tealSoft, color: C.teal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <User size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 30 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>{d.full_name}</div>
          {d.specialty && <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 3 }}>{d.specialty}</div>}
          <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <Building2 size={11} /> {d.clinic_name}
          </div>
          {d.branch_name && <div style={{ fontSize: 10.5, color: C.inkFaint, marginTop: 2 }}>شعبه: {d.branch_name}</div>}
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(d.id, d.full_name);
        }}
        title={isFav ? "حذف از علاقه‌مندی" : "افزودن به علاقه‌مندی"}
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          width: 28,
          height: 28,
          borderRadius: 8,
          border: `1px solid ${isFav ? C.saffron : C.border}`,
          background: isFav ? C.saffronSoft : C.surface,
          color: isFav ? C.saffronDark : C.inkFaint,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "inherit",
          padding: 0,
          zIndex: 2,
        }}
      >
        <Star size={14} fill={isFav ? C.saffron : "none"} />
      </button>
    </div>
  );
})}
                </div>
              )}
            </Card>
          )}

          {/* مرحله ۲: اطلاعات پزشک + روزها + ساعت‌ها */}
          {selectedDoctor && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 320px) 1fr", gap: 16 }} className="patient-doctor-grid">
              {/* ستون چپ: اطلاعات پزشک */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft }}>
                      اطلاعات پزشک
                    </div>
                   <PrimaryButton
  variant="ghost"
  onClick={() => {
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setDoctorSchedule([]);
  }}
>
  تغییر پزشک
</PrimaryButton>
                  </div>

                  <div style={{
                    width: 60, height: 60, borderRadius: 18,
                    background: C.tealSoft, color: C.teal,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 12px",
                  }}>
                    <User size={28} />
                  </div>

                  <div style={{ textAlign: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>
                      {selectedDoctor.full_name}
                    </div>
                    <div style={{ fontSize: 12, color: C.tealDark, marginTop: 3 }}>
                      {selectedDoctor.specialty || "بدون تخصص"}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.inkSoft }}>
                      <Phone size={14} color={C.teal} />
                      <span dir="ltr">{selectedDoctor.phone}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: C.inkSoft }}>
                      <Building2 size={14} color={C.teal} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>
                        {selectedDoctor.clinic_name}
                        <br />
                        <span style={{ fontSize: 11, color: C.inkFaint }}>
                          {selectedDoctor.branch_name} — {selectedDoctor.branch_address}
                        </span>
                      </span>
                    </div>
                  </div>
                </Card>

                {/* روزهای کاری */}
                <Card style={{ padding: 16 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft, marginBottom: 10 }}>
                    روزهای کاری
                  </div>
                  {doctorSchedule.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: C.inkFaint, textAlign: "center", padding: "10px 0" }}>
                      برنامه‌ای ثبت نشده است
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[0, 1, 2, 3, 4, 5, 6].map((weekday) => {
                        const s = doctorSchedule.find((x) => Number(x.weekday) === weekday);
                        if (!s) return null;
                        const dayNames = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
                        const start = s.start_time.slice(0, 5);
                        const end = s.end_time.slice(0, 5);
                        return (
                          <div key={weekday} style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: C.surfaceAlt,
                            border: `1px solid ${C.border}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: 11.5,
                          }}>
                            <span style={{ fontWeight: 700, color: C.ink }}>{dayNames[weekday]}</span>
                            <span style={{ color: C.tealDark, fontWeight: 700 }} dir="ltr">
                              {start} - {end}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {/* ستون راست: انتخاب تاریخ و ساعت */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card style={{ padding: 16 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft, marginBottom: 10 }}>
                    انتخاب تاریخ
                  </div>
                  <JalaliDatePicker
                    value={selectedDate}
                    onChange={(v) => {
                      setSelectedDate(v);
                      const g = jalaliToGregorian(v.jy, v.jm, v.jd);
                      const dateStr = `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
                      loadSlots(selectedDoctor.id, selectedDoctor.branch_id, dateStr);
                    }}
                    label=""
                  />
                </Card>

                {selectedDate && (
                  <Card style={{ padding: 16 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft, marginBottom: 10 }}>
                      ساعت‌های خالی
                    </div>

                    {loadingSlots && (
                      <div style={{ padding: 20, textAlign: "center", color: C.inkSoft, fontSize: 13 }}>
                        در حال دریافت ساعت‌ها...
                      </div>
                    )}

                    {!loadingSlots && slots.length === 0 && (
                      <div style={{
                        padding: 16, textAlign: "center",
                        background: C.surfaceAlt, borderRadius: 9,
                        color: C.inkFaint, fontSize: 12.5,
                      }}>
                        پزشک در این روز برنامه حضور ندارد
                      </div>
                    )}

                    {!loadingSlots && slots.length > 0 && (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                        gap: 8,
                      }}>
                        {slots.map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            disabled={!s.available}
                            onClick={() => setSelectedSlot(s)}
                            style={{
                              padding: "10px 0",
                              borderRadius: 8,
                              fontSize: 13,
                              fontFamily: "inherit",
                              border: `1px solid ${selectedSlot?.label === s.label ? C.teal : C.border}`,
                              background: !s.available
                                ? "#F2F2F0"
                                : selectedSlot?.label === s.label
                                ? C.teal
                                : C.surface,
                              color: !s.available
                                ? C.inkFaint
                                : selectedSlot?.label === s.label
                                ? "#fff"
                                : C.ink,
                              fontWeight: selectedSlot?.label === s.label ? 700 : 500,
                              textDecoration: !s.available ? "line-through" : "none",
                              cursor: !s.available ? "not-allowed" : "pointer",
                            }}
                          >
                            {toFa(s.label)}
                          </button>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {selectedSlot && (
                  <Card style={{ padding: 16 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft, marginBottom: 10 }}>
                      تأیید نهایی
                    </div>

                    <div style={{
                      padding: 12,
                      borderRadius: 10,
                      background: C.tealSoft,
                      marginBottom: 12,
                      fontSize: 12.5,
                      color: C.tealDark,
                      lineHeight: 1.9,
                    }}>
                      <b>پزشک:</b> {selectedDoctor.full_name}
                      <br />
                      <b>تاریخ:</b> {selectedDate ? `${toFa(selectedDate.jd)} ${["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"][selectedDate.jm - 1]} ${toFa(selectedDate.jy)}` : ""}
                      <br />
                      <b>ساعت:</b> {toFa(selectedSlot.label)}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 6 }}>
                        توضیحات (اختیاری)
                      </div>
                      <textarea
                        value={requestNotes}
                        onChange={(e) => setRequestNotes(e.target.value)}
                        placeholder="مثلاً: درد شدید دارم"
                        rows={2}
                        style={{
                          width: "100%",
                          border: `1px solid ${C.border}`,
                          borderRadius: 10,
                          padding: "10px 12px",
                          fontSize: 13,
                          fontFamily: "inherit",
                          color: C.ink,
                          background: C.surface,
                          boxSizing: "border-box",
                          resize: "vertical",
                        }}
                      />
                    </div>

                                        <PrimaryButton variant="teal" onClick={submitAppointmentRequest} disabled={submittingRequest}>
                      {submittingRequest ? "در حال ارسال..." : "ارسال درخواست نوبت"}
                    </PrimaryButton>
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------- تب نسخه‌ها ---------- */}
      {tab === "prescriptions" && (
        <Card>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 4 }}>نسخه‌های من</div>
          <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 16 }}>نسخه‌های ثبت‌شده در تمام پرونده‌های متصل به شما</div>

          {loadingPrescriptions && (
            <div style={{ padding: 30, textAlign: "center", color: C.inkSoft, fontSize: 13 }}>در حال بارگذاری...</div>
          )}

          {!loadingPrescriptions && prescriptions.length === 0 && (
            <div style={{ padding: 30, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: C.inkSoft, marginBottom: 4 }}>نسخه‌ای ثبت نشده است</div>
              <div style={{ fontSize: 12, color: C.inkFaint }}>پس از ویزیت پزشک، نسخه‌ها اینجا نمایش داده می‌شوند.</div>
            </div>
          )}

          {!loadingPrescriptions && prescriptions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {prescriptions.map((p) => (
                <div key={p.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, background: C.surfaceAlt }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{p.medicine}</div>
                      <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 3 }}>
                        {p.dosage && <span style={{ marginLeft: 10 }}>دوز: {p.dosage}</span>}
                        {p.duration && <span>مدت: {p.duration}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 11.5, color: C.inkFaint }}>
                      {new Date(p.visit_date).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" })}
                    </div>
                  </div>

                  {p.notes && (
                    <div style={{ fontSize: 12, color: C.inkSoft, background: C.surface, borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                      {p.notes}
                    </div>
                  )}

                  {p.diagnosis && (
                    <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 5 }}>
                      <b>تشخیص:</b> {p.diagnosis}
                    </div>
                  )}

                  <div style={{ fontSize: 11.5, color: C.inkFaint, display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                    <span>پزشک: {p.doctor_name}{p.doctor_specialty ? ` (${p.doctor_specialty})` : ""}</span>
                    <span>کلینیک: {p.clinic_name}</span>
                    <span>شعبه: {p.branch_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ---------- تب صورت‌حساب‌ها ---------- */}
      {tab === "invoices" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }} className="patient-invoice-summary">
            <Card style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: C.inkFaint }}>مجموع فاکتورها</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginTop: 6 }}>{toFa(Number(invoiceTotals.total).toLocaleString())} تومان</div>
            </Card>
            <Card style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: C.inkFaint }}>پرداخت‌شده</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.tealDark, marginTop: 6 }}>{toFa(Number(invoiceTotals.paid).toLocaleString())} تومان</div>
            </Card>
            <Card style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: C.inkFaint }}>بدهی باقی‌مانده</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: invoiceTotals.outstanding > 0 ? C.clay : C.inkSoft, marginTop: 6 }}>{toFa(Number(invoiceTotals.outstanding).toLocaleString())} تومان</div>
            </Card>
          </div>

          <Card>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 4 }}>صورت‌حساب‌های من</div>
            <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 16 }}>فاکتورها و پرداخت‌های ثبت‌شده در تمام پرونده‌های متصل به شما</div>

            {loadingInvoices && (
              <div style={{ padding: 30, textAlign: "center", color: C.inkSoft, fontSize: 13 }}>در حال بارگذاری...</div>
            )}

            {!loadingInvoices && invoices.length === 0 && (
              <div style={{ padding: 30, textAlign: "center" }}>
                <div style={{ fontSize: 14, color: C.inkSoft, marginBottom: 4 }}>فاکتوری ثبت نشده است</div>
                <div style={{ fontSize: 12, color: C.inkFaint }}>پس از تسویه‌حساب، فاکتورها اینجا نمایش داده می‌شوند.</div>
              </div>
            )}

            {!loadingInvoices && invoices.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {invoices.map((inv) => {
                  const outstanding = Number(inv.outstanding_amount);
                  const paid = Number(inv.paid_amount);
                  const total = Number(inv.total_amount);
                  const statusLabel = outstanding <= 0 ? "تسویه‌شده" : paid > 0 ? "پرداخت جزئی" : "پرداخت‌نشده";
                  const statusColor = outstanding <= 0 ? { bg: C.tealSoft, color: C.tealDark } : paid > 0 ? { bg: C.saffronSoft, color: C.saffronDark } : { bg: C.claySoft, color: C.clay };

                  return (
                    <div key={inv.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, background: C.surfaceAlt }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>فاکتور #{toFa(inv.id)}</div>
                          <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>
                            {new Date(inv.created_at).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" })}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: statusColor.bg, color: statusColor.color }}>
                          {statusLabel}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginBottom: 10 }}>
                        <div style={{ background: C.surface, borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ fontSize: 10.5, color: C.inkFaint }}>مبلغ کل</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, marginTop: 3 }}>{toFa(total.toLocaleString())} تومان</div>
                        </div>
                        <div style={{ background: C.surface, borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ fontSize: 10.5, color: C.inkFaint }}>پرداخت‌شده</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: C.tealDark, marginTop: 3 }}>{toFa(paid.toLocaleString())} تومان</div>
                        </div>
                        <div style={{ background: C.surface, borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ fontSize: 10.5, color: C.inkFaint }}>باقی‌مانده</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: outstanding > 0 ? C.clay : C.inkSoft, marginTop: 3 }}>{toFa(outstanding.toLocaleString())} تومان</div>
                        </div>
                      </div>

                      {inv.payments && inv.payments.length > 0 && (
                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 8 }}>
                          <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 6 }}>پرداخت‌ها:</div>
                          {inv.payments.map((pay) => (
                            <div key={pay.id} style={{ fontSize: 11.5, color: C.inkSoft, display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                              <span>{METHOD_LABEL[pay.method] || pay.method}</span>
                              <span>{toFa(Number(pay.amount).toLocaleString())} تومان</span>
                              <span style={{ color: C.inkFaint }}>{new Date(pay.paid_at).toLocaleDateString("fa-IR")}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ fontSize: 11.5, color: C.inkFaint, display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
                        <span>کلینیک: {inv.clinic_name}</span>
                        <span>شعبه: {inv.branch_name}</span>
                        {inv.insurer_name && <span>بیمه: {inv.insurer_name}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
            )}

        {/* ---------- تب پزشکان مورد علاقه ---------- */}
        {tab === "favorites" && (
          <Card>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 4 }}>پزشکان مورد علاقه</div>
            <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 16 }}>پزشکانی که نشان کرده‌اید</div>

            {loadingFavorites && (
              <div style={{ padding: 30, textAlign: "center", color: C.inkSoft, fontSize: 13 }}>در حال بارگذاری...</div>
            )}

            {!loadingFavorites && favorites.length === 0 && (
              <div style={{ padding: 30, textAlign: "center" }}>
                <div style={{ fontSize: 14, color: C.inkSoft, marginBottom: 4 }}>پزشک مورد علاقه‌ای ثبت نشده است</div>
                <div style={{ fontSize: 12, color: C.inkFaint }}>در بخش «درخواست نوبت»، با ستاره کردن پزشکان، آن‌ها را به این لیست اضافه کنید.</div>
              </div>
            )}

            {!loadingFavorites && favorites.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {favorites.map((fav) => (
                  <div key={fav.favorite_id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, background: C.surfaceAlt, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{fav.doctor_name}</div>
                      <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>
                        {fav.specialty || "عمومی"} • {fav.clinic_name} • {fav.branch_name}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => {
                          setTab("new-appointment");
                          setSelectedDoctor({
                            id: fav.doctor_id,
                            full_name: fav.doctor_name,
                            specialty: fav.specialty,
                            clinic_id: fav.clinic_id,
                            branch_id: fav.branch_id,
                          });
                          setSelectedDate(null);
                          setSlots([]);
                          setSelectedSlot(null);
                          api.getDoctorDays(fav.doctor_id, fav.branch_id)
                            .then((res) => setDoctorSchedule(res.schedule || []))
                            .catch(() => setDoctorSchedule([]));
                        }}
                        style={{ border: "none", background: C.teal, color: "#fff", borderRadius: 9, padding: "7px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}
                      >
                        ثبت نوبت
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`آیا «${fav.doctor_name}» از علاقه‌مندی‌ها حذف شود؟`)) return;
                          try {
                            await api.removeFavorite(fav.doctor_id);
                            showSuccess(`«${fav.doctor_name}» از علاقه‌مندی‌ها حذف شد`);
                            setFavorites((list) => list.filter((f) => f.doctor_id !== fav.doctor_id));
                          } catch (e) {
                            showError(e.message || "خطا در حذف از علاقه‌مندی");
                          }
                        }}
                        style={{ border: `1px solid ${C.clay}44`, background: C.claySoft, color: C.clay, borderRadius: 9, padding: "7px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}
                      >
                        حذف از علاقه‌مندی
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }
/* ============================================================ */
/* پنل اصلی بیمار                                              */
/* ============================================================ */
export default function PatientPortal({ onLogout }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
const [recordsError, setRecordsError] = useState("");
const [loadingRecords, setLoadingRecords] = useState(false);
  const [active, setActive] = useState("dashboard");
  const [showProfile, setShowProfile] = useState(false);
const [tab, setTab] = useState("my-records");
const [darkMode, setDarkMode] = useState(() => localStorage.getItem("clinic-theme") === "dark");
  // بررسی توکن ذخیره‌شده
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
     
      // دیکد کردن امن‌تر برای پشتیبانی از UTF-8
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const payload = JSON.parse(jsonPayload);
      if (payload.role === "patient" && payload.account_id) {
        setAccount(payload);
      } else {
        clearToken();
      }
    } catch {
      clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  // بارگذاری اطلاعات
    
  const loadData = useCallback(() => {
    if (!account) return;

    setLoadingRecords(true);
    setRecordsError("");

    api.getMyPatientRecords()
      .then((d) => {
        setRecords(d.records || []);
        setRecordsError("");
      })
     .catch((err) => {
  setRecords([]);
  setRecordsError(
    err?.message || "دریافت پرونده‌ها با خطا مواجه شد."
  );
})
      .finally(() => {
        setLoadingRecords(false);
      });
  }, [account]);

useEffect(() => {
  document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  localStorage.setItem("clinic-theme", darkMode ? "dark" : "light");
}, [darkMode]);

const toggleTheme = () => setDarkMode((current) => !current);
  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    const styleId = "patient-portal-responsive";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media (max-width: 900px) {
        .patient-doctor-grid {
          grid-template-columns: 1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  function handleLogout() {
    // ۱. پاک کردن کامل همه کلیدهای احراز هویت از localStorage
    localStorage.removeItem("clinicyar_token");
    localStorage.removeItem("patient_token");
    localStorage.removeItem("staff_token");
    localStorage.removeItem("sanad_token");
    localStorage.removeItem("sanad_user");
    localStorage.removeItem("sanad_company_code");
    
    // ۲. ریست کردن state های داخلی (اگر روی صفحه فعلی چیزی مونده)
    setAccount(null);
    setRecords([]);
    
    // ۳. اگر تابع onLogout از App.jsx پاس داده شده، اون رو صدا بزن
    if (onLogout) {
      onLogout();
    }
        }
  if (loading) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: "Vazirmatn, Tahoma, sans-serif", color: C.inkSoft }}>
        در حال بررسی ورود...
      </div>
    );
  }

  if (!account) {
    return <PatientLoginScreen onSuccess={setAccount} />;
  }

  return (
    <div dir="rtl" lang="fa" style={{ fontFamily: "'Vazirmatn', Tahoma, sans-serif", background: C.bg, minHeight: "100vh", color: C.ink }}>
      <GlobalStyle />

      {/* هدر */}
      <header style={{ height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Brand size={34} />
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: C.navy }}>کلینیک‌یار</div>
            <div style={{ fontSize: 10.5, color: C.inkFaint, marginTop: 1 }}>پنل بیمار</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
  <button
    onClick={toggleTheme}
    title={darkMode ? "تم روشن" : "تم تاریک"}
    style={{
      width: 38, height: 38, borderRadius: 11,
      border: `1px solid ${C.border}`,
      background: C.surface,
      color: C.inkSoft,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 17,
    }}
  >
    {darkMode ? "☀️" : "🌙"}
  </button>
<NotificationsDropdown
  onNavigate={(link) => {
    if (link.includes("appointments")) setTab("appointments");
    else if (link.includes("new-appointment")) setTab("new-appointment");
    else if (link.includes("my-records")) setTab("my-records");
    else if (link.includes("prescriptions")) setTab("prescriptions");
    else if (link.includes("invoices")) setTab("invoices");
  }}
/>
  <PrimaryButton icon={User} variant="ghost" onClick={() => setShowProfile(true)}>
    {account.full_name}
  </PrimaryButton>
  <PrimaryButton icon={LogOut} variant="ghost" onClick={handleLogout}>
    خروج
  </PrimaryButton>
</div>
      </header>

      <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
                <PatientDashboard
          account={account}
          records={records}
          loading={loading}
          loadingRecords={loadingRecords}
          recordsError={recordsError}
          onRefresh={loadData}
          tab={tab}
          setTab={setTab}
        />
      </main>
      {showProfile && (
        <PatientProfileModal onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}