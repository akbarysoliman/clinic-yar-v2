import React, { useState, useEffect, useCallback } from "react";
import { Search, Pill, Plus, X, ChevronLeft } from "lucide-react";
import { C, Card } from "./theme.jsx";
import { toFa } from "./jalali.js";
import { api } from "./api.js";
import LivePatientSearch from "./components/LivePatientSearch.jsx";
import { ActionButton, PrimaryButton } from "./components/ActionButtons.jsx";

function LoadingBlock({ label }) {
  return <div style={{ fontSize: 13, color: C.inkSoft, padding: "20px 0" }}>{label || "در حال بارگذاری..."}</div>;
}

function ErrorBlock({ message }) {
  return (
    <div style={{ fontSize: 13, color: C.clay, background: C.claySoft, borderRadius: 10, padding: "10px 14px" }}>
      {message}
    </div>
  );
}

const inputStyle = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 10,
  padding: "10px 14px", fontSize: 14, fontFamily: "inherit", color: C.ink, boxSizing: "border-box",
};

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}

/* ---------------------------------------------------------------------- */
/* ویزیت حرفه‌ای — انتخاب بیمار/نوبت + ثبت تشخیص، درمان و نسخه            */
/* ---------------------------------------------------------------------- */
export function DoctorVisit({ doctorId }) {
  const [appointments, setAppointments] = useState([]);
  const [patient, setPatient] = useState(null);
  const [appointmentId, setAppointmentId] = useState(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [rx, setRx] = useState([{ medicine: "", dosage: "", duration: "", notes: "" }]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  const loadAppointments = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const d = await api.listAppointments({ doctor_id: doctorId, date: today });
      setAppointments((d.appointments || []).filter((a) => !["completed", "cancelled", "no_show"].includes(a.status)));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [doctorId, today]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  function choosePatient(p, appt = null) {
    setPatient(p);
    setAppointmentId(appt?.id || null);
    setSaved(null);
    setError(null);
  }

  function updateRx(i, field, value) {
    setRx((list) => list.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function resetForm() {
    setPatient(null); setAppointmentId(null); setDiagnosis(""); setTreatment("");
    setRx([{ medicine: "", dosage: "", duration: "", notes: "" }]);
    setSaved(null); setError(null);
  }

  async function submit() {
    if (!patient || !diagnosis.trim()) return;
    setSaving(true); setError(null); setSaved(null);
    try {
      const prescriptions = rx.filter((r) => r.medicine.trim()).map((r) => ({
        medicine: r.medicine.trim(), dosage: r.dosage.trim(), duration: r.duration.trim(), notes: r.notes.trim(),
      }));
      const d = await api.createVisit({
        appointment_id: appointmentId, patient_id: patient.id, doctor_id: doctorId,
        diagnosis: diagnosis.trim(), treatment_plan: treatment.trim(), prescriptions,
      });
      setSaved(d.visit);
      await loadAppointments();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, .85fr) minmax(0, 1.6fr)", gap: 16 }} className="doctor-visit-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 4 }}>ویزیت امروز</div>
          <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 12 }}>یک نوبت را انتخاب کنید یا بیمار را جستجو کنید.</div>
          {loading ? <LoadingBlock label="در حال دریافت نوبت‌های امروز..." /> : appointments.length === 0 ? (
            <div style={{ padding: 12, borderRadius: 10, background: C.surfaceAlt, color: C.inkSoft, fontSize: 12.5 }}>نوبت فعالی برای امروز باقی نمانده است.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {appointments.map((a) => (
                <button key={a.id} onClick={() => choosePatient({ id: a.patient_id, full_name: a.patient_name, phone: a.patient_phone }, a)}
                  style={{ textAlign: "right", border: `1px solid ${appointmentId === a.id ? C.teal : C.border}`, background: appointmentId === a.id ? C.tealSoft : C.surface, borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <b style={{ color: C.ink, fontSize: 13 }}>{a.patient_name}</b>
                    <span style={{ color: C.tealDark, fontSize: 12 }}>{new Date(a.appointment_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div style={{ color: C.inkFaint, fontSize: 11.5, marginTop: 3 }} dir="ltr">{a.patient_phone || "-"}</div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 750, color: C.ink, marginBottom: 10 }}>جستجوی بیمار</div>
          <LivePatientSearch
            value={patient}
            onChange={(p) => choosePatient(p)}
            label=""
            placeholder="نام، موبایل یا کد ملی"
          />
        </Card>
      </div>

      <Card>
        {!patient ? (
          <div style={{ minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.inkFaint }}>
            <div><div style={{ fontSize: 15, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>بیمار را برای شروع ویزیت انتخاب کنید</div><div style={{ fontSize: 12.5 }}>از نوبت‌های امروز یا جستجوی بیمار استفاده کنید.</div></div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${C.border}` }}>
              <div><div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>{patient.full_name}</div><div style={{ fontSize: 12, color: C.inkFaint, marginTop: 3 }} dir="ltr">{patient.phone || "شماره ثبت نشده"}</div></div>
              <PrimaryButton variant="ghost" onClick={resetForm}>تغییر بیمار</PrimaryButton>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ fontSize: 12.5, color: C.inkSoft }}>تشخیص *<textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={5} style={{ ...inputStyle, display: "block", marginTop: 6, resize: "vertical" }} placeholder="تشخیص، یافته‌های مهم و ارزیابی پزشک" /></label>
              <label style={{ fontSize: 12.5, color: C.inkSoft }}>برنامه درمان<textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} rows={5} style={{ ...inputStyle, display: "block", marginTop: 6, resize: "vertical" }} placeholder="دارو، توصیه‌ها و پیگیری" /></label>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <b style={{ fontSize: 13.5, color: C.ink }}>نسخه</b>
                <button onClick={() => setRx((l) => [...l, { medicine: "", dosage: "", duration: "", notes: "" }])} style={{ border: `1px dashed ${C.teal}`, color: C.tealDark, background: C.tealSoft, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit" }}>+ افزودن دارو</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rx.map((r, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1.4fr auto", gap: 6 }}>
                    <input value={r.medicine} onChange={(e) => updateRx(i, "medicine", e.target.value)} placeholder="دارو" style={inputStyle} />
                    <input value={r.dosage} onChange={(e) => updateRx(i, "dosage", e.target.value)} placeholder="دوز" style={inputStyle} />
                    <input value={r.duration} onChange={(e) => updateRx(i, "duration", e.target.value)} placeholder="مدت" style={inputStyle} />
                    <input value={r.notes} onChange={(e) => updateRx(i, "notes", e.target.value)} placeholder="توضیحات" style={inputStyle} />
                    <ActionButton icon={X} variant="delete" onClick={() => setRx((l) => l.length > 1 ? l.filter((_, idx) => idx !== i) : l)} title="حذف دارو" />
                  </div>
                ))}
              </div>
            </div>

            {error && <div style={{ marginTop: 14 }}><ErrorBlock message={error} /></div>}
            {saved && <div style={{ marginTop: 14, padding: 11, borderRadius: 10, background: C.tealSoft, color: C.tealDark, fontSize: 13 }}>ویزیت با موفقیت ثبت شد و نوبت به وضعیت «تکمیل‌شده» تغییر کرد.</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <PrimaryButton variant="ghost" onClick={resetForm}>پاک کردن فرم</PrimaryButton>
              <PrimaryButton variant="teal" onClick={submit} disabled={saving || !diagnosis.trim()}>
                {saving ? "در حال ثبت..." : "ثبت نهایی ویزیت"}
              </PrimaryButton>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* بیماران من — فهرست بیمارانی که این پزشک تا‌به‌حال ویزیت کرده             */
/* ---------------------------------------------------------------------- */
export function DoctorPatients({ doctorId }) {
  const [patients, setPatients] = useState(null);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!doctorId) return;
    api.listPatientsByDoctor(doctorId).then((d) => setPatients(d.patients)).catch((e) => setError(e.message));
  }, [doctorId]);

  async function toggle(id) {
    if (openId === id) { setOpenId(null); setDetail(null); return; }
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await api.getPatient(id);
      setDetail(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setDetailLoading(false);
    }
  }

  if (error) return <ErrorBlock message={error} />;
  if (!patients) return <LoadingBlock label="در حال دریافت فهرست بیماران..." />;
  if (patients.length === 0) {
    return (
      <Card style={{ textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: 14, color: C.inkSoft }}>هنوز بیماری برای شما ثبت نشده است.</div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {patients.map((p) => (
        <Card key={p.id} style={{ padding: 0, overflow: "hidden" }}>
          <button
            onClick={() => toggle(p.id)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
              border: "none", background: "transparent", cursor: "pointer", textAlign: "right", fontFamily: "inherit",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{p.full_name}</div>
              <div style={{ fontSize: 12, color: C.inkFaint }} dir="ltr">{p.phone}</div>
            </div>
            <ChevronLeft size={16} color={C.inkFaint} style={{ transform: openId === p.id ? "rotate(-90deg)" : "none" }} />
          </button>

          {openId === p.id && (
            <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 18px", background: C.surfaceAlt }}>
              {detailLoading && <LoadingBlock label="در حال دریافت پرونده..." />}
              {detail && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 14 }}>
                  <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 11px" }}>
                    <div style={{ fontSize: 11, color: C.inkFaint }}>کد ملی</div>
                    <div style={{ fontSize: 12.5, color: C.ink, fontWeight: 700, marginTop: 3 }}>{detail.patient.national_code || "ثبت نشده"}</div>
                  </div>
                  <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 11px" }}>
                    <div style={{ fontSize: 11, color: C.inkFaint }}>تاریخ تولد</div>
                    <div style={{ fontSize: 12.5, color: C.ink, fontWeight: 700, marginTop: 3 }}>{detail.patient.birth_date ? fmtDate(detail.patient.birth_date) : "ثبت نشده"}</div>
                  </div>
                  <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 11px" }}>
                    <div style={{ fontSize: 11, color: C.inkFaint }}>جنسیت</div>
                    <div style={{ fontSize: 12.5, color: C.ink, fontWeight: 700, marginTop: 3 }}>{detail.patient.gender || "ثبت نشده"}</div>
                  </div>
                  <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 11px" }}>
                    <div style={{ fontSize: 11, color: C.inkFaint }}>تعداد ویزیت</div>
                    <div style={{ fontSize: 12.5, color: C.tealDark, fontWeight: 800, marginTop: 3 }}>{toFa(detail.visits.length)}</div>
                  </div>
                </div>
              )}
              {detail && detail.patient.address && (
                <div style={{ fontSize: 12.5, color: C.inkSoft, background: C.surfaceAlt, borderRadius: 9, padding: "9px 11px", marginBottom: 14 }}>آدرس: {detail.patient.address}</div>
              )}
              {detail && detail.visits.length === 0 && (
                <div style={{ fontSize: 12.5, color: C.inkFaint }}>سابقه ویزیتی ثبت نشده است.</div>
              )}
              {detail && detail.visits.map((v) => (
                <div key={v.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 4 }}>{fmtDate(v.created_at)} — {v.doctor_name}</div>
                  {v.diagnosis && <div style={{ fontSize: 13, color: C.ink, marginBottom: 4 }}><b>تشخیص:</b> {v.diagnosis}</div>}
                  {v.treatment_plan && <div style={{ fontSize: 13, color: C.ink, marginBottom: 6 }}><b>روند درمان:</b> {v.treatment_plan}</div>}
                  {v.prescriptions.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {v.prescriptions.map((rx) => (
                        <div key={rx.id} style={{ fontSize: 12.5, color: C.inkSoft, display: "flex", alignItems: "center", gap: 6 }}>
                          <Pill size={12} color={C.teal} /> {rx.medicine} {rx.dosage ? `— ${rx.dosage}` : ""} {rx.duration ? `— ${rx.duration}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* نسخه‌نویسی — ثبت ویزیت آزاد (بدون نیاز به نوبت قبلی) برای یک بیمار      */
/* ---------------------------------------------------------------------- */
export function DoctorPrescribe({ doctorId }) {
  const [patient, setPatient] = useState(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [rx, setRx] = useState([{ medicine: "", dosage: "", duration: "", notes: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  function updateRx(i, field, value) {
    setRx((list) => list.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function addRxRow() {
    setRx((list) => [...list, { medicine: "", dosage: "", duration: "", notes: "" }]);
  }
  function removeRxRow(i) {
    setRx((list) => list.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!patient || !diagnosis) return;
    setSubmitting(true);
    setError(null);
    try {
      const prescriptions = rx.filter((r) => r.medicine.trim().length > 0);
      await api.createVisit({
        patient_id: patient.id, doctor_id: doctorId,
        diagnosis, treatment_plan: treatment, prescriptions,
      });
      setDone(true);
      setDiagnosis(""); setTreatment(""); setRx([{ medicine: "", dosage: "", duration: "", notes: "" }]);
      setPatient(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!patient) {
    return (
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 12 }}>جستجوی بیمار</div>
        <LivePatientSearch
          value={patient}
          onChange={setPatient}
          label=""
          placeholder="نام یا شماره تماس بیمار"
          autoFocus
        />
        {error && <div style={{ marginTop: 10 }}><ErrorBlock message={error} /></div>}
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{patient.full_name}</div>
          <div style={{ fontSize: 12, color: C.inkFaint }} dir="ltr">{patient.phone}</div>
        </div>
        <PrimaryButton variant="ghost" onClick={() => setPatient(null)}>تغییر بیمار</PrimaryButton>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>تشخیص</div>
          <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        <div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>روند درمان</div>
          <textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        <div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 8 }}>اقلام نسخه</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rx.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input value={r.medicine} onChange={(e) => updateRx(i, "medicine", e.target.value)} placeholder="نام دارو" style={{ ...inputStyle, flex: 2 }} />
                <input value={r.dosage} onChange={(e) => updateRx(i, "dosage", e.target.value)} placeholder="دوز" style={{ ...inputStyle, flex: 1 }} />
                <input value={r.duration} onChange={(e) => updateRx(i, "duration", e.target.value)} placeholder="مدت" style={{ ...inputStyle, flex: 1 }} />
                <ActionButton icon={X} variant="delete" onClick={() => removeRxRow(i)} title="حذف دارو" />
              </div>
            ))}
          </div>
          <button onClick={addRxRow} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, border: `1px dashed ${C.border}`, borderRadius: 8, padding: "6px 12px", background: "transparent", color: C.teal, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={14} /> افزودن دارو
          </button>
        </div>

        {error && <ErrorBlock message={error} />}
        {done && <div style={{ fontSize: 12.5, color: C.tealDark, background: C.tealSoft, borderRadius: 8, padding: "8px 12px" }}>ویزیت و نسخه با موفقیت ثبت شد.</div>}

        <PrimaryButton variant="teal" onClick={submit} disabled={submitting || !diagnosis}>
          {submitting ? "در حال ثبت..." : "ثبت ویزیت و نسخه"}
        </PrimaryButton>
      </div>
    </Card>
  );
}