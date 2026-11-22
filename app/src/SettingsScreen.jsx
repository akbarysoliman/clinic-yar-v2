import React, { useEffect, useMemo, useState } from "react";
import {
  Building2, Users, ShieldCheck, WalletCards, CalendarClock, Bell,
  ClipboardList, DatabaseBackup, Monitor, Info, ChevronLeft, Plus,
  Ban, UserPlus, Search, X, CheckCircle2, KeyRound,Check
} from "lucide-react";
import { C, Card } from "./theme.jsx";
import { api } from "./api.js";
import { ActionButton, PrimaryButton } from "./components/ActionButtons.jsx";
import { useToastContext } from "./contexts/ToastContext.jsx";
const ROLE_LABEL = {
  super_admin: "مدیر کل",
  branch_admin: "مدیر شعبه",
  doctor: "پزشک",
  secretary: "منشی",
  accountant: "حسابدار",
};

const SETTINGS_ITEMS = [
  {
    key: "general",
    title: "تنظیمات عمومی",
    desc: "اطلاعات پایه کلینیک و مشخصات مدیر",
    icon: Building2,
    color: C.blue,
    soft: C.blueSoft,
    items: ["نام کلینیک", "نام مدیر", "شماره تماس", "آدرس", "شناسه کلینیک", "لوگو"],
  },
  {
    key: "users",
    title: "کاربران و دسترسی‌ها",
    desc: "مدیریت حساب‌ها، نقش‌ها و دسترسی کاربران",
    icon: Users,
    color: C.purple,
    soft: C.purpleSoft,
    items: ["لیست کاربران", "ایجاد حساب", "نقش کاربر", "فعال / غیرفعال", "تغییر رمز", "سطح دسترسی"],
  },
  {
    key: "security",
    title: "امنیت",
    desc: "تنظیمات امنیتی و نشست‌های کاربران",
    icon: ShieldCheck,
    color: C.tealDark,
    soft: C.tealSoft,
    items: ["تغییر رمز مدیر", "خروج خودکار", "مدت اعتبار نشست", "نشست‌های فعال", "لاگ امنیتی"],
  },
  {
    key: "finance",
    title: "تنظیمات مالی",
    desc: "روش‌های پرداخت و تنظیمات مالی کلینیک",
    icon: WalletCards,
    color: C.saffronDark,
    soft: C.saffronSoft,
    items: ["روش‌های پرداخت", "کارت‌خوان", "حساب‌های بانکی", "بیمه", "واحد پول"],
  },
  {
    key: "appointments",
    title: "تنظیمات نوبت‌دهی",
    desc: "قوانین و تنظیمات سیستم نوبت‌دهی",
    icon: CalendarClock,
    color: C.blue,
    soft: C.blueSoft,
    items: ["مدت پیش‌فرض نوبت", "فاصله نوبت‌ها", "قوانین لغو", "نوبت‌دهی آنلاین", "ظرفیت نوبت"],
  },
  {
    key: "notifications",
    title: "اعلان‌ها",
    desc: "تنظیم اعلان‌های سیستمی و یادآوری‌ها",
    icon: Bell,
    color: C.clay,
    soft: C.claySoft,
    items: ["نوبت جدید", "لغو نوبت", "تغییر نوبت", "یادآوری", "اعلان داخلی", "SMS"],
  },
  {
    key: "activity",
    title: "گزارش فعالیت‌ها",
    desc: "مشاهده و بررسی فعالیت‌های کاربران",
    icon: ClipboardList,
    color: C.purple,
    soft: C.purpleSoft,
    items: ["کاربر", "نوع عملیات", "تاریخ و ساعت", "IP", "جزئیات عملیات"],
  },
  {
    key: "backup",
    title: "پشتیبان‌گیری",
    desc: "ایجاد، دانلود و بازیابی نسخه‌های پشتیبان",
    icon: DatabaseBackup,
    color: C.tealDark,
    soft: C.tealSoft,
    items: ["ایجاد Backup", "آخرین نسخه", "دانلود", "بازیابی", "پشتیبان خودکار"],
  },
  {
    key: "appearance",
    title: "ظاهر",
    desc: "تنظیمات نمایش و ظاهر سامانه",
    icon: Monitor,
    color: C.blue,
    soft: C.blueSoft,
    items: ["تم روشن / تیره", "اندازه فونت", "زبان", "اعداد فارسی / انگلیسی"],
  },
  {
    key: "system",
    title: "اطلاعات سیستم و لایسنس",
    desc: "مشخصات نسخه و وضعیت اتصال لایسنس",
    icon: Info,
    color: C.inkSoft,
    soft: C.surfaceAlt,
    items: ["نسخه سامانه", "وضعیت لایسنس", "تاریخ انقضا", "Installation ID", "License Server"],
  },
];

function Field({ label, value, onChange, placeholder, dir }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, color: C.inkSoft }}>
      {label}
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: `1px solid ${C.border}`,
          background: C.surface,
          color: C.ink,
          borderRadius: 10,
          padding: "10px 12px",
          fontFamily: "inherit",
          fontSize: 12.5,
          outline: "none",
        }}
      />
    </label>
  );
}

function SettingShell({ item, children, onBack }) {
  const Icon = item.icon;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
      <PrimaryButton icon={ChevronLeft} variant="ghost" onClick={onBack}>
  بازگشت به تنظیمات
</PrimaryButton>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "20px 22px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: `1px solid ${C.border}`,
            background: item.soft,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              background: C.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: item.color,
            }}
          >
            <Icon size={21} />
          </div>
          <div>
            <div style={{ fontSize: 17.5, fontWeight: 850, color: C.ink, lineHeight: 1.5 }}>{item.title}</div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: C.inkSoft, marginTop: 5, lineHeight: 1.8 }}>{item.desc}</div>
          </div>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </Card>
    </div>
  );
}

function ComingSoon({ title, description, icon: Icon = Info }) {
  return (
    <div
      style={{
        minHeight: 210,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        border: `1px dashed ${C.border}`,
        borderRadius: 13,
        background: C.surfaceAlt,
        padding: 20,
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 14, background: C.tealSoft, color: C.teal, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Icon size={22} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{title}</div>
      <div style={{ maxWidth: 470, marginTop: 6, fontSize: 11.5, lineHeight: 1.9, color: C.inkFaint }}>
        {description}
      </div>
    </div>
  );
}

function UsersSettings() {
  const { showSuccess, showError } = useToastContext();
  const [users, setUsers] = useState(null);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    password: "",
    role: "secretary",
    branch_id: "",
  });

  async function load() {
    setError("");
    try {
      const [u, b] = await Promise.all([
        api.listUsers(),
        api.listBranches(),
      ]);
      setUsers(u?.users || []);
      setBranches(b?.branches || []);
      if (!form.branch_id && b?.branches?.[0]?.id) {
        setForm((f) => ({ ...f, branch_id: String(b.branches[0].id) }));
      }
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users || []).filter((u) => {
      if (!q) return true;
      return [u.full_name, u.phone, ROLE_LABEL[u.role] || u.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [users, search]);

  async function createUser() {
    if (!form.full_name || !form.phone || !form.password || !form.branch_id) return;
    setLoading(true);
    setError("");
    try {
      await api.createUser({
        full_name: form.full_name,
        phone: form.phone,
        password: form.password,
        role: form.role,
        branch_id: Number(form.branch_id),
      });
      setForm({
        full_name: "",
        phone: "",
        password: "",
        role: "secretary",
        branch_id: branches[0]?.id ? String(branches[0].id) : "",
      });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function activateUser(id) {
    try {
      await api.activateUser(id);
      showSuccess("کاربر فعال شد");
      load();
    } catch (e) {
      showError(e.message || "خطا در فعال‌سازی");
    }
  }
  async function deactivateUser(id) {
    try {
      await api.deactivateUser(id);
      showSuccess("کاربر غیرفعال شد");
      load();
    } catch (e) {
      showError(e.message || "خطا در غیرفعال‌سازی");
    }
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", minWidth: 240, flex: 1 }}>
          <Search size={15} color={C.inkFaint} style={{ position: "absolute", right: 11, top: 11 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی کاربر..."
            style={{
              width: "100%", boxSizing: "border-box", border: `1px solid ${C.border}`,
              background: C.surface, color: C.ink, borderRadius: 10, padding: "9px 34px 9px 11px",
              fontFamily: "inherit", outline: "none",
            }}
          />
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, border: "none",
            background: C.teal, color: "#fff", borderRadius: 10, padding: "9px 14px",
            fontFamily: "inherit", fontWeight: 800, cursor: "pointer",
          }}
        >
          {showForm ? <X size={15} /> : <UserPlus size={15} />}
          {showForm ? "بستن فرم" : "ایجاد حساب"}
        </button>
      </div>

      {showForm && (
        <Card style={{ background: C.surfaceAlt }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>ایجاد حساب کاربری</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }} className="settings-form-grid">
            <Field label="نام و نام خانوادگی" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <Field label="شماره تماس" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} dir="ltr" />
            <Field label="رمز عبور اولیه" value={form.password} onChange={(v) => setForm({ ...form, password: v })} dir="ltr" />
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, color: C.inkSoft }}>
              نقش
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.border}`, background: C.surface, color: C.ink, borderRadius: 10, padding: "10px 12px", fontFamily: "inherit" }}>
                <option value="secretary">منشی</option>
                <option value="doctor">پزشک</option>
                <option value="accountant">حسابدار</option>
                <option value="branch_admin">مدیر شعبه</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, color: C.inkSoft }}>
              شعبه
              <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.border}`, background: C.surface, color: C.ink, borderRadius: 10, padding: "10px 12px", fontFamily: "inherit" }}>
                <option value="">انتخاب شعبه</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          </div>

          {error && <div style={{ marginTop: 10, color: C.clay, fontSize: 12 }}>{error}</div>}

<div style={{ display: "flex", gap: 8, marginTop: 13 }}>
  <PrimaryButton variant="teal" onClick={createUser} disabled={loading}>
    {loading ? "در حال ثبت..." : "ساخت حساب"}
  </PrimaryButton>
  <PrimaryButton variant="ghost" onClick={() => setShowForm(false)}>
    انصراف
  </PrimaryButton>
</div>
        </Card>
      )}

      {error && !showForm && <div style={{ color: C.clay, fontSize: 12 }}>{error}</div>}

      {!users ? (
        <div style={{ padding: 20, textAlign: "center", color: C.inkSoft, fontSize: 12.5 }}>در حال بارگذاری کاربران...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: C.inkFaint, background: C.surfaceAlt, borderRadius: 11 }}>کاربری برای نمایش وجود ندارد.</div>
      ) : (
        <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 11 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650, fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: C.surfaceAlt }}>
                {["نام", "شماره تماس", "نقش", "وضعیت", "عملیات"].map((h) => (
                  <th key={h} style={{ textAlign: "right", padding: "10px 12px", color: C.inkSoft, borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: "11px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.ink }}>{u.full_name}</td>
                  <td style={{ padding: "11px 12px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }} dir="ltr">{u.phone}</td>
                  <td style={{ padding: "11px 12px", borderBottom: `1px solid ${C.border}`, color: C.inkSoft }}>{ROLE_LABEL[u.role] || u.role}</td>
                  <td style={{ padding: "11px 12px", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 20, background: u.is_active ? C.tealSoft : C.claySoft, color: u.is_active ? C.tealDark : C.clay, fontWeight: 800, fontSize: 10.5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: u.is_active ? C.teal : C.clay }} />
                      {u.is_active ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 12px", borderBottom: `1px solid ${C.border}` }}>
                   {u.is_active ? (
  <ActionButton icon={Ban} variant="deactivate" onClick={() => deactivateUser(u.id)} title="غیرفعال‌سازی" />
) : (
  <ActionButton icon={Check} variant="activate" onClick={() => activateUser(u.id)} title="فعال‌سازی" />
)}
                  
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GeneralSettings() {
  const [form, setForm] = useState({
    clinicName: "",
    managerName: "",
    phone: "",
    address: "",
    clinicCode: "",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: 12, borderRadius: 10, background: C.blueSoft, color: C.blue, fontSize: 11.5, lineHeight: 1.9 }}>
        این بخش آماده طراحی و اتصال به تنظیمات واقعی کلینیک است. فعلاً هیچ مقدار ساختگی یا ذخیره‌سازی محلی ایجاد نمی‌شود.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="settings-form-grid">
        <Field label="نام کلینیک" value={form.clinicName} onChange={(v) => setForm({ ...form, clinicName: v })} placeholder="مثلاً کلینیک تخصصی ..." />
        <Field label="نام مدیر کلینیک" value={form.managerName} onChange={(v) => setForm({ ...form, managerName: v })} placeholder="نام مدیر" />
        <Field label="شماره تماس" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="۰۲۱..." dir="ltr" />
        <Field label="شناسه کلینیک" value={form.clinicCode} onChange={(v) => setForm({ ...form, clinicCode: v })} placeholder="شناسه کلینیک" dir="ltr" />
        <label style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, color: C.inkSoft }}>
          آدرس
          <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} placeholder="آدرس کلینیک" style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.border}`, background: C.surface, color: C.ink, borderRadius: 10, padding: "10px 12px", fontFamily: "inherit", resize: "vertical" }} />
        </label>
      </div>
      <button disabled style={{ alignSelf: "flex-start", border: "none", background: C.borderStrong, color: C.inkSoft, borderRadius: 9, padding: "9px 16px", fontFamily: "inherit", fontWeight: 800, cursor: "not-allowed" }}>
        ذخیره تنظیمات — بعد از اتصال API
      </button>
    </div>
  );
}

function SettingsPlaceholder({ type }) {
  const config = {
    security: ["تنظیمات امنیتی", "تنظیمات رمز، نشست‌ها و کنترل‌های امنیتی بعد از آماده شدن API این بخش فعال می‌شود.", ShieldCheck],
    finance: ["تنظیمات مالی", "روش‌های پرداخت، حساب‌های بانکی و تنظیمات بیمه در این بخش مدیریت خواهند شد.", WalletCards],
    appointments: ["تنظیمات نوبت‌دهی", "تنظیمات نوبت‌دهی اینجا قرار می‌گیرد؛ خود برنامه کاری پزشکان همچنان در منوی مستقل «برنامه کاری» باقی می‌ماند.", CalendarClock],
    notifications: ["تنظیمات اعلان‌ها", "ساختار اعلان‌های داخلی آماده شده و اتصال SMS/اعلان‌های واقعی در مرحله بک‌اند انجام می‌شود.", Bell],
    activity: ["گزارش فعالیت‌ها", "Activity Log واقعی بعد از ایجاد جدول و API مربوطه به این بخش متصل می‌شود.", ClipboardList],
    backup: ["پشتیبان‌گیری", "مدیریت Backup و Restore در این بخش قرار می‌گیرد؛ بدون اتصال به بک‌اند هیچ فایل ساختگی ایجاد نمی‌شود.", DatabaseBackup],
    appearance: ["تنظیمات ظاهر", "تم روشن/تیره از هدر سامانه کنترل می‌شود. گزینه‌های تکمیلی ظاهر بعداً به این بخش اضافه می‌شوند.", Monitor],
    system: ["اطلاعات سیستم و لایسنس", "وضعیت لایسنس از سرویس مرکزی می‌آید و این بخش فقط برای نمایش اطلاعات فنی و وضعیت اتصال است.", Info],
  };
  const [title, description, Icon] = config[type];
  return <ComingSoon title={title} description={description} icon={Icon} />;
}
function BackupSettings() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Stateهای مربوط به بازیابی
  const [showRestore, setShowRestore] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState("");
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:4000/api/backup/info", {
      headers: { Authorization: `Bearer ${localStorage.getItem("clinicyar_token")}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("خطا در دریافت اطلاعات"))))
      .then((d) => setInfo(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function downloadBackup() {
    setDownloading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("http://localhost:4000/api/backup/download", {
        headers: { Authorization: `Bearer ${localStorage.getItem("clinicyar_token")}` },
      });
      if (!res.ok) throw new Error("خطا در دانلود بکاپ");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = `clinicyar_backup_${timestamp}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`بکاپ با موفقیت دانلود شد (${(blob.size / 1024).toFixed(2)} KB)`);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  async function handleRestore() {
    if (!restoreFile || restoreConfirm !== "RESTORE") return;
    setRestoring(true);
    setError(null);
    setSuccess(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(",")[1];
        try {
          const res = await fetch("http://localhost:4000/api/backup/restore", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("clinicyar_token")}`,
            },
            body: JSON.stringify({ file_base64: base64 }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "خطا در بازیابی");

          setSuccess("بازیابی با موفقیت انجام شد. صفحه در حال رفرش است...");
          setShowRestore(false);
          setRestoreFile(null);
          setRestoreConfirm("");
          setTimeout(() => window.location.reload(), 2000);
        } catch (e) {
          setError(e.message);
        } finally {
          setRestoring(false);
        }
      };
      reader.readAsDataURL(restoreFile);
    } catch (e) {
      setError(e.message);
      setRestoring(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* پیام اطلاعات */}
      <div style={{ padding: 13, borderRadius: 11, background: C.blueSoft, color: C.blue, fontSize: 12, lineHeight: 1.9 }}>
        ℹ️ این بخش امکان <b>دانلود و بازیابی دیتابیس</b> را فراهم می‌کند.
      </div>

      {loading && <div style={{ padding: 20, textAlign: "center", color: C.inkSoft, fontSize: 13 }}>در حال بررسی وضعیت...</div>}
      {error && <div style={{ padding: 12, borderRadius: 10, background: C.claySoft, color: C.clay, fontSize: 12.5 }}>{error}</div>}
      {success && <div style={{ padding: 12, borderRadius: 10, background: C.tealSoft, color: C.tealDark, fontSize: 12.5 }}>✓ {success}</div>}

      {!loading && info && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
          <div style={{ padding: 13, borderRadius: 11, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10.5, color: C.inkFaint }}>وضعیت pg_dump</div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: info.pg_dump_exists ? C.tealDark : C.clay, marginTop: 5 }}>
              {info.pg_dump_exists ? "✓ نصب شده" : "✗ پیدا نشد"}
            </div>
          </div>
          <div style={{ padding: 13, borderRadius: 11, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10.5, color: C.inkFaint }}>آخرین بررسی</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginTop: 5 }}>
              {new Date(info.server_time).toLocaleString("fa-IR")}
            </div>
          </div>
        </div>
      )}

      {/* کارت دکمه‌ها */}
      <div style={{ padding: 16, borderRadius: 12, background: C.tealSoft, border: `1px solid ${C.teal}22`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.tealDark }}>مدیریت دیتابیس</div>
          <div style={{ fontSize: 11.5, color: C.tealDark, marginTop: 4, opacity: 0.85 }}>
            دانلود نسخه پشتیبان یا بازیابی از فایل.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={downloadBackup}
            disabled={downloading || !info?.pg_dump_exists}
            style={{
              border: "none",
              background: downloading || !info?.pg_dump_exists ? "#9E9E9E" : C.teal,
              color: "#fff", borderRadius: 9, padding: "10px 18px",
              fontFamily: "inherit", fontWeight: 800, fontSize: 13,
              cursor: downloading || !info?.pg_dump_exists ? "not-allowed" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 7,
            }}
          >
            <DatabaseBackup size={16} />
            {downloading ? "در حال ساخت..." : "دانلود بکاپ"}
          </button>
          <button
            onClick={() => setShowRestore(true)}
            style={{
              border: `1px solid ${C.clay}`,
              background: C.claySoft, color: C.clay,
              borderRadius: 9, padding: "10px 18px",
              fontFamily: "inherit", fontWeight: 800, fontSize: 13,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
            }}
          >
            <DatabaseBackup size={16} />
            بازیابی از فایل
          </button>
        </div>
      </div>

      <div style={{ padding: 12, borderRadius: 10, background: C.saffronSoft, color: C.saffronDark, fontSize: 11.5, lineHeight: 1.9 }}>
        ⚠️ <b>توصیه:</b> بکاپ را در جای امن نگهداری کنید. بازیابی، تمام داده‌های فعلی را پاک می‌کند.
      </div>

      {/* ⭐ مودال بازیابی - داخل همین تابع */}
      {showRestore && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.6)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 18
        }}>
          <div style={{
            width: "min(500px, 100%)", background: C.surface, borderRadius: 16,
            padding: 20, border: `1px solid ${C.border}`
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 12 }}>
              بازیابی دیتابیس
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: C.claySoft, color: C.clay, fontSize: 12, lineHeight: 1.9, marginBottom: 16 }}>
              ⚠️ <b>هشدار:</b> با بازیابی، تمام داده‌های فعلی پاک می‌شوند و به حالت فایل بکاپ برمی‌گردند. این عملیات غیرقابل بازگشت است.
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>فایل بکاپ (SQL):</div>
              <input
                type="file"
                accept=".sql"
                onChange={(e) => setRestoreFile(e.target.files[0])}
                style={{ fontSize: 12.5 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>
                برای تایید، کلمه <b>RESTORE</b> را تایپ کنید:
              </div>
              <input
                value={restoreConfirm}
                onChange={(e) => setRestoreConfirm(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box", border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: "10px 12px", fontFamily: "inherit", fontSize: 13
                }}
                dir="ltr"
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={restoring || !restoreFile || restoreConfirm !== "RESTORE"}
                onClick={handleRestore}
                style={{
                  flex: 1, border: "none", 
                  background: restoreConfirm === "RESTORE" && restoreFile ? C.clay : "#ccc",
                  color: "#fff", borderRadius: 9, padding: "10px 16px", fontFamily: "inherit",
                  fontWeight: 800, 
                  cursor: restoring || !restoreFile || restoreConfirm !== "RESTORE" ? "not-allowed" : "pointer"
                }}
              >
                {restoring ? "در حال بازیابی..." : "تایید و بازیابی"}
              </button>
              <button
                onClick={() => { setShowRestore(false); setRestoreFile(null); setRestoreConfirm(""); }}
                style={{
                  border: `1px solid ${C.border}`, background: C.surface, color: C.inkSoft,
                  borderRadius: 9, padding: "10px 16px", fontFamily: "inherit", cursor: "pointer"
                }}
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function SettingsScreen({ licenseStatus }) {
  const [active, setActive] = useState(null);

  const activeItem = SETTINGS_ITEMS.find((x) => x.key === active);

  useEffect(() => {
    const styleId = "clinic-settings-responsive";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media (max-width: 1050px) {
        .settings-grid { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 700px) {
        .settings-form-grid { grid-template-columns: 1fr !important; }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  if (activeItem) {
    return (
      <SettingShell item={activeItem} onBack={() => setActive(null)}>
        {active === "general" && <GeneralSettings />}
        {active === "users" && <UsersSettings />}
                {active !== "general" && active !== "users" && active !== "system" && active !== "backup" && <SettingsPlaceholder type={active} />}
        {active === "backup" && <BackupSettings />}
        {active === "system" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }} className="settings-form-grid">
            {[
              ["نسخه سامانه", "Clinic-Yar 1.0"],
              ["وضعیت لایسنس", licenseStatus?.active === false ? "غیرفعال" : licenseStatus ? "فعال" : "در حال بررسی"],
              ["تاریخ انقضا", licenseStatus?.expiry ? new Date(licenseStatus.expiry).toLocaleDateString("fa-IR") : "دریافت نشده"],
              ["Installation ID", licenseStatus?.installation_id || "دریافت نشده"],
              ["License Server", "SSO / License Server"],
              ["وضعیت اتصال", licenseStatus ? "متصل" : "در حال بررسی"],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: 13, borderRadius: 11, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10.5, color: C.inkFaint }}>{label}</div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: C.ink, marginTop: 5, wordBreak: "break-all" }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </SettingShell>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 17 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 850, color: C.navy }}>تنظیمات</div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 5, lineHeight: 1.8 }}>
            مدیریت تنظیمات کلینیک، کاربران، امنیت و سیستم
          </div>
        </div>
      </div>
      <div className="settings-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
        {SETTINGS_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              style={{
                textAlign: "right",
                border: `1px solid ${C.border}`,
                background: C.surface,
                color: C.ink,
                borderRadius: 15,
                padding: 16,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "var(--clinic-card-shadow, 0 2px 10px rgba(15,23,42,.05))",
                transition: "transform .15s ease, box-shadow .15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "var(--clinic-card-shadow, 0 7px 20px rgba(0,0,0,.16))";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--clinic-card-shadow, 0 2px 10px rgba(15,23,42,.05))";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: item.soft, color: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 850, color: C.ink, lineHeight: 1.6 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 5, lineHeight: 1.8 }}>{item.desc}</div>
                </div>
                <ChevronLeft size={17} color={C.inkFaint} />
              </div>

              <div style={{ marginTop: 13, paddingTop: 11, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {item.items.map((label) => (
                  <span key={label} style={{ fontSize: 11.5, color: C.inkSoft }}>
                    {label}
                    {label !== item.items[item.items.length - 1] && <span style={{ margin: "0 5px", color: C.borderStrong }}>•</span>}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
