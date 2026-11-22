import React, { useState, useEffect, useCallback } from "react";
import { Search, Wallet, CheckCircle2, AlertCircle, FileText, Printer, FileSpreadsheet } from "lucide-react";import { C, Card } from "./theme.jsx";
import { toFa, todayJalali, jalaliToGregorian, jalaliLabel } from "./jalali.js";
import { api } from "./api.js";
import { PrimaryButton } from "./components/ActionButtons.jsx";
import JalaliDatePicker from "./JalaliDatePicker.jsx";
import { useToastContext } from "./contexts/ToastContext.jsx";
const inputStyle = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 10,
  padding: "10px 14px", fontSize: 14, fontFamily: "inherit", color: C.ink, boxSizing: "border-box",
};

function toGregorianStr(j) {
  const g = jalaliToGregorian(j.jy, j.jm, j.jd);
  return `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
}

const METHOD_LABEL = {
  cash: "نقدی",
  card: "کارت‌خوان",
  bank_transfer: "کارت‌به‌کارت",
  gateway: "درگاه پرداخت الکترونیک",
  insurance: "بیمه",
  online: "آنلاین",
  other: "سایر",
};

/* ---------------------------------------------------------------------- */
/* انتخاب تاریخ شمسی مشترک                                                 */
/* ---------------------------------------------------------------------- */
function JalaliDateInput({ value, onChange, placeholder = "۱۴۰۵/۰۷/۰۱" }) {
  const [open, setOpen] = useState(false);
  const initial = value ? value.split("/").map(Number) : todayJalali();
  const [view, setView] = useState({ jy: initial[0], jm: initial[1] });

  const daysInMonth = (jy, jm) => jm <= 6 ? 31 : jm <= 11 ? 30 : (((jy + 38) % 33) < 29 ? 30 : 29);
  const monthNames = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
  const pad = (n) => String(n).padStart(2, "0");

  function choose(day) {
    const next = `${view.jy}/${pad(view.jm)}/${pad(day)}`;
    onChange(next);
    setOpen(false);
  }

  const firstGregorian = jalaliToGregorian(view.jy, view.jm, 1);
  const firstDay = new Date(firstGregorian.gy, firstGregorian.gm - 1, firstGregorian.gd).getDay();
  const offset = (firstDay + 1) % 7; // شروع هفته شمسی: شنبه
  const count = daysInMonth(view.jy, view.jm);

  function moveMonth(delta) {
    let jy = view.jy, jm = view.jm + delta;
    if (jm < 1) { jm = 12; jy--; }
    if (jm > 12) { jm = 1; jy++; }
    setView({ jy, jm });
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        style={{ ...selectStyleFallback(), textAlign: "right", direction: "rtl", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
      >
        <span style={{ color: value ? C.ink : C.inkFaint }}>{value || placeholder}</span>
        <span style={{ color: C.teal }}>📅</span>
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 6px)", right: 0, width: 285, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "0 12px 30px rgba(0,0,0,.12)", padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button type="button" onClick={() => moveMonth(1)} style={calNavStyle()}>›</button>
            <b style={{ fontSize: 13, color: C.ink }}>{monthNames[view.jm - 1]} {toFa(view.jy)}</b>
            <button type="button" onClick={() => moveMonth(-1)} style={calNavStyle()}>‹</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, textAlign: "center" }}>
            {["ش","ی","د","س","چ","پ","ج"].map((d) => <div key={d} style={{ fontSize: 10.5, color: C.inkFaint, padding: 5 }}>{d}</div>)}
            {Array.from({length: offset}).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({length: count}, (_, i) => i + 1).map((day) => {
              const selected = value === `${view.jy}/${pad(view.jm)}/${pad(day)}`;
              return <button key={day} type="button" onClick={() => choose(day)} style={{ border: "none", borderRadius: 8, padding: "7px 0", background: selected ? C.teal : "transparent", color: selected ? "#fff" : C.ink, cursor: "pointer", fontFamily: "inherit" }}>{toFa(day)}</button>;
            })}
          </div>
          <button type="button" onClick={() => { const t = todayJalali(); setView({jy:t[0],jm:t[1]}); onChange(`${t[0]}/${pad(t[1])}/${pad(t[2])}`); setOpen(false); }} style={{ width:"100%", marginTop:9, border:`1px solid ${C.border}`, borderRadius:8, background:C.surface, color:C.teal, padding:"7px", fontFamily:"inherit", cursor:"pointer", fontSize:11.5 }}>امروز</button>
        </div>
      )}
    </div>
  );
}

function selectStyleFallback() {
  return { ...inputStyle, width: "100%", minWidth: 0, padding: "9px 12px", background: C.surface };
}
function calNavStyle() {
  return { border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.ink, borderRadius: 7, width: 30, height: 30, cursor: "pointer", fontFamily: "inherit" };
}

/* ---------------------------------------------------------------------- */
/* گزارش مالی — درآمد ۳۰ روز اخیر به تفکیک شعبه و روش پرداخت              */
/* ---------------------------------------------------------------------- */
export function AdminFinance() {
  const { showError } = useToastContext();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
const [fromDate, setFromDate] = useState(null);
const [toDate, setToDate] = useState(null);
  const [branch, setBranch] = useState("all");
  const [office, setOffice] = useState("all");
  const [doctor, setDoctor] = useState("all");
  const [method, setMethod] = useState("all");
  const [tab, setTab] = useState("revenue");

  useEffect(() => {
        api.financeSummary().then(setSummary).catch((e) => showError(e.message));
  }, []);

  if (error) return <Card><div style={{ color: C.clay, fontSize: 13 }}>{error}</div></Card>;
  if (!summary) return <Card><div style={{ color: C.inkSoft, fontSize: 13 }}>در حال بارگذاری گزارش مالی...</div></Card>;

  const branches = summary.branches || [];
  const methods = summary.byMethod || [];
  const totalRevenue = branches.reduce((s, b) => s + Number(b.revenue || 0), 0);
  const maxRevenue = Math.max(1, ...branches.map((b) => Number(b.revenue || 0)));
  const activeMethod = method === "all" ? methods : methods.filter((m) => m.method === method);
  const shownRevenue = activeMethod.reduce((s, m) => s + Number(m.total || 0), 0) || totalRevenue;
  const formatMoney = (n) => `${toFa(Number(n || 0).toLocaleString())} تومان`;
  const selectStyle = { ...inputStyle, width: "auto", minWidth: 135, padding: "9px 12px", background: C.surface };

  function printReport() {
    const title = "گزارش مالی کلینیک‌یار";
    const range = `${fromDate || summary.from || "ابتدا"} تا ${toDate || summary.to || "امروز"}`;
    const rows = branches.map((b, i) => `<tr><td>${i + 1}</td><td>${b.name || ""}</td><td>${formatMoney(b.revenue)}</td></tr>`).join("");
    const methodRows = activeMethod.map((m) => `<tr><td>${METHOD_LABEL[m.method] || m.method}</td><td>${formatMoney(m.total)}</td></tr>`).join("");
    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) { alert("پنجره چاپ توسط مرورگر مسدود شده است."); return; }
    w.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${title}</title><style>
      body{font-family:Tahoma,Arial,sans-serif;padding:28px;color:#222}h1{text-align:center;font-size:22px}h3{margin-top:28px}
      table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ccc;padding:9px;text-align:right}th{background:#f3f5f5}
      .meta{color:#666;margin:10px 0 20px;text-align:center}.total{font-size:18px;font-weight:bold;margin:18px 0}
    </style></head><body><h1>${title}</h1><div class="meta">بازه گزارش: ${range}</div>
    <div class="total">کل درآمد: ${formatMoney(shownRevenue)}</div>
    <h3>درآمد به تفکیک شعبه</h3><table><thead><tr><th>ردیف</th><th>شعبه</th><th>درآمد</th></tr></thead><tbody>${rows || '<tr><td colspan="3">داده‌ای وجود ندارد.</td></tr>'}</tbody></table>
    <h3>تفکیک روش پرداخت</h3><table><thead><tr><th>روش پرداخت</th><th>مبلغ</th></tr></thead><tbody>${methodRows || '<tr><td colspan="2">داده‌ای وجود ندارد.</td></tr>'}</tbody></table>
    <script>window.onload=()=>{window.print();}</script></body></html>`);
    w.document.close();
  }

  function exportExcel() {
    const headers = ["ردیف", "شعبه", "درآمد"];
    const rows = branches.map((b, i) => [i + 1, b.name || "", Number(b.revenue || 0)]);
    const methodRows = activeMethod.map((m) => [METHOD_LABEL[m.method] || m.method, Number(m.total || 0)]);
    const csv = [
      ["گزارش مالی کلینیک‌یار"],
      [`بازه`, fromDate || summary.from || "", toDate || summary.to || ""],
      [],
      headers,
      ...rows,
      [],
      ["روش پرداخت", "مبلغ"],
      ...methodRows
    ].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `گزارش_مالی_${fromDate || "گزارش"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>گزارش مالی</div>
          <div style={{ fontSize: 12.5, color: C.inkFaint, marginTop: 5 }}>
            بررسی درآمد، پرداخت‌ها، مطالبات و فاکتورهای کلینیک
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <PrimaryButton icon={Printer} variant="ghost" onClick={printReport}>
  چاپ گزارش
</PrimaryButton>
          <PrimaryButton icon={FileSpreadsheet} variant="teal" onClick={exportExcel}>
  خروجی Excel
</PrimaryButton>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", color: C.teal }}>
            <Search size={16} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>فیلتر گزارش</div>
          <div style={{ fontSize: 11.5, color: C.inkFaint, marginRight: "auto" }}>بازه فعلی: {summary.from} تا {summary.to}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div style={{ minWidth: 145, flex: 1 }}>
  <JalaliDatePicker
    label="از تاریخ"
    value={fromDate}
    onChange={setFromDate}
    placeholder="انتخاب تاریخ"
  />
</div>

<div style={{ minWidth: 145, flex: 1 }}>
  <JalaliDatePicker
    label="تا تاریخ"
    value={toDate}
    onChange={setToDate}
    placeholder="انتخاب تاریخ"
  />
</div>
          <div><div style={{ fontSize: 11.5, color: C.inkFaint, marginBottom: 5 }}>شعبه</div><select value={branch} onChange={(e) => setBranch(e.target.value)} style={selectStyle}><option value="all">همه شعب</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div><div style={{ fontSize: 11.5, color: C.inkFaint, marginBottom: 5 }}>مطب</div><select value={office} onChange={(e) => setOffice(e.target.value)} style={selectStyle}><option value="all">همه مطب‌ها</option></select></div>
          <div><div style={{ fontSize: 11.5, color: C.inkFaint, marginBottom: 5 }}>پزشک</div><select value={doctor} onChange={(e) => setDoctor(e.target.value)} style={selectStyle}><option value="all">همه پزشکان</option></select></div>
          <div><div style={{ fontSize: 11.5, color: C.inkFaint, marginBottom: 5 }}>روش پرداخت</div><select value={method} onChange={(e) => setMethod(e.target.value)} style={selectStyle}><option value="all">همه روش‌ها</option>{["cash","card","bank_transfer","gateway","insurance","other"].map((key) => (
              <option key={key} value={key}>{METHOD_LABEL[key]}</option>
            ))}</select></div>
        </div>
        <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 10 }}>فیلترهای مطب و پزشک با اتصال گزارش مالی جدید به API فعال می‌شوند؛ در این مرحله فقط ظاهر و ساختار نهایی منو پیاده‌سازی شده است.</div>
      </Card>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        {[
          ["کل درآمد", formatMoney(shownRevenue), Wallet, C.saffronDark, C.saffronSoft],
          ["مبلغ وصول‌شده", "—", CheckCircle2, C.tealDark, C.tealSoft],
          ["مطالبات / بدهی", "—", AlertCircle, C.clay, C.claySoft],
          ["تعداد تراکنش", "—", FileText, C.navy, C.surfaceAlt],
        ].map(([title, value, Icon, color, bg]) => (
          <Card key={title} style={{ padding: 15 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color }}><Icon size={17} /></div>
              <div style={{ fontSize: 11.5, color: C.inkFaint }}>{title}</div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color, marginTop: 12 }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Card style={{ padding: 7 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[['revenue','گزارش درآمد'],['transactions','تراکنش‌ها'],['invoices','فاکتورها']].map(([key,label]) => (
            <button key={key} type="button" onClick={() => setTab(key)} style={{ flex: 1, minWidth: 120, border: "none", borderRadius: 9, padding: "10px 14px", fontFamily: "inherit", fontSize: 13, fontWeight: tab === key ? 800 : 600, cursor: "pointer", background: tab === key ? C.tealSoft : "transparent", color: tab === key ? C.tealDark : C.inkSoft }}>{label}</button>
          ))}
        </div>
      </Card>

      {tab === "revenue" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, .65fr)", gap: 16 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div><div style={{ fontSize: 14.5, fontWeight: 800, color: C.ink }}>درآمد به تفکیک شعبه</div><div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>مقایسه عملکرد مالی شعب در بازه گزارش</div></div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.saffronDark }}>{formatMoney(shownRevenue)}</div>
            </div>
            {branches.length === 0 ? <div style={{ color: C.inkFaint, fontSize: 13, padding: 30, textAlign: "center" }}>داده‌ای برای نمایش وجود ندارد.</div> : <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {branches.map((b) => <div key={b.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12.5 }}><span style={{ color: C.inkSoft, fontWeight: 600 }}>{b.name}</span><span style={{ color: C.ink, fontWeight: 700 }}>{formatMoney(b.revenue)}</span></div>
                <div style={{ height: 9, background: C.border, borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${(Number(b.revenue || 0) / maxRevenue) * 100}%`, height: "100%", background: C.saffron, borderRadius: 99 }} /></div>
              </div>)}
            </div>}
          </Card>

          <Card>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, marginBottom: 4 }}>تفکیک روش پرداخت</div>
            <div style={{ fontSize: 11.5, color: C.inkFaint, marginBottom: 14 }}>سهم هر روش از پرداخت‌های ثبت‌شده</div>
            {activeMethod.length === 0 ? <div style={{ color: C.inkFaint, fontSize: 13 }}>هنوز پرداختی ثبت نشده است.</div> : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{activeMethod.map((m) => <div key={m.method} style={{ padding: "11px 12px", borderRadius: 10, background: C.tealSoft, display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 12.5, color: C.tealDark }}>{METHOD_LABEL[m.method] || m.method}</span><b style={{ fontSize: 12.5, color: C.tealDark }}>{formatMoney(m.total)}</b></div>)}</div>}
          </Card>
        </div>
      )}

      {tab === "transactions" && <Card><div style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, marginBottom: 5 }}>تراکنش‌های مالی</div><div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 18 }}>ساختار جدول نهایی آماده است؛ اطلاعات تراکنش، بیمار، پزشک، مطب، خدمت، مبلغ و روش پرداخت در مرحله API جدید نمایش داده خواهد شد.</div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}><thead><tr style={{ background: C.surfaceAlt }}>{["تاریخ","بیمار","پزشک","مطب","خدمت","مبلغ","روش پرداخت","وضعیت","شماره فاکتور"].map(h => <th key={h} style={{ padding: "10px 9px", textAlign: "right", color: C.inkSoft, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead><tbody><tr><td colSpan="9" style={{ padding: 30, textAlign: "center", color: C.inkFaint }}>هنوز تراکنش قابل نمایش از API دریافت نشده است.</td></tr></tbody></table></div></Card>}

      {tab === "invoices" && <Card><div style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, marginBottom: 5 }}>گزارش فاکتورها و مطالبات</div><div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 18 }}>در این بخش مبلغ فاکتور، مبلغ پرداخت‌شده و مانده بدهی از هم جدا نگه داشته می‌شوند.</div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}><thead><tr style={{ background: C.surfaceAlt }}>{["شماره فاکتور","تاریخ","بیمار","مبلغ فاکتور","پرداخت‌شده","مانده","وضعیت"].map(h => <th key={h} style={{ padding: "10px 9px", textAlign: "right", color: C.inkSoft, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead><tbody><tr><td colSpan="7" style={{ padding: 30, textAlign: "center", color: C.inkFaint }}>هنوز فاکتوری برای نمایش از API دریافت نشده است.</td></tr></tbody></table></div></Card>}
    </div>
  );
}

const WEEKDAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];

/* ---------------------------------------------------------------------- */
/* برنامه کاری پزشکان — قبلاً فقط از طریق seed قابل تنظیم بود              */
/* ---------------------------------------------------------------------- */

/* ---------------------------------------------------------------------- */
/* تنظیمات — مدیریت کاربران (ساخت مدیر شعبه/پزشک/منشی/حسابدار)             */
/* ---------------------------------------------------------------------- */
const ROLE_LABEL = { super_admin: "مدیر کل", branch_admin: "مدیر شعبه", doctor: "پزشک", secretary: "منشی", accountant: "حسابدار" };

