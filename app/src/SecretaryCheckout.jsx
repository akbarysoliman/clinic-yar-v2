import React, { useState, useEffect, useCallback } from "react";
import { Banknote, CreditCard, ShieldCheck, Check } from "lucide-react";
import { C, Card } from "./theme.jsx";
import { toFa } from "./jalali.js";
import { api } from "./api.js";
import LivePatientSearch from "./components/LivePatientSearch.jsx";
import { PrimaryButton } from "./components/ActionButtons.jsx";
import { useToastContext } from "./contexts/ToastContext.jsx";
const inputStyle = {
  width: "100%",
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 14,
  fontFamily: "inherit",
  color: C.ink,
  boxSizing: "border-box",
  background: C.surface,
};

const METHODS = [
  { key: "cash", label: "نقدی", icon: Banknote },
  { key: "card", label: "کارت‌خوان", icon: CreditCard },
  { key: "insurance", label: "بیمه", icon: ShieldCheck },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SecretaryCheckout({ branchId }) {
const { showSuccess, showError } = useToastContext();
  const [patient, setPatient] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [invoices, setInvoices] = useState(null);

  const loadInvoices = useCallback(() => {
    api.listInvoices({ branch_id: branchId, date: todayStr() })
      .then((d) => setInvoices(d.invoices))
      .catch((e) => setError(e.message));
  }, [branchId]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  async function submit() {
    if (!patient || !amount) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.quickCheckout({
        patient_id: patient.id,
        branch_id: branchId,
        amount: Number(amount),
        method,
      });
showSuccess(`تسویه ${toFa(amount)} تومانی برای ${patient.full_name} ثبت شد`);
      setConfirmed({ name: patient.full_name, amount });
      setPatient(null);
      setAmount("");
      loadInvoices();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
      <Card style={{ width: 320 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 12 }}>
          تسویه جدید
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <LivePatientSearch
            value={patient}
            onChange={setPatient}
            label="بیمار"
            placeholder="نام یا شماره تماس بیمار"
          />

          <div>
            <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>مبلغ (تومان)</div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="مثلاً ۳۵۰۰۰۰"
              style={inputStyle}
              dir="ltr"
            />
          </div>

          <div>
            <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>روش پرداخت</div>
            <div style={{ display: "flex", gap: 6 }}>
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "10px 0",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 11.5,
                    border: `1px solid ${method === m.key ? C.saffron : C.border}`,
                    background: method === m.key ? C.saffronSoft : C.surface,
                    color: method === m.key ? C.saffronDark : C.inkSoft,
                    fontWeight: method === m.key ? 700 : 500,
                  }}
                >
                  <m.icon size={16} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <PrimaryButton variant="saffron" onClick={submit} disabled={submitting || !patient || !amount}>
  {submitting ? "در حال ثبت..." : "ثبت تسویه"}
</PrimaryButton>
        </div>

        {error && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: C.clay, background: C.claySoft, borderRadius: 8, padding: "8px 12px" }}>
            {error}
          </div>
        )}

        {confirmed && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-start", background: C.tealSoft, borderRadius: 10, padding: "10px 12px" }}>
            <Check size={16} color={C.tealDark} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: C.tealDark, lineHeight: 1.9 }}>
              تسویه {toFa(confirmed.amount)} تومانی برای {confirmed.name} ثبت شد.
            </div>
          </div>
        )}
      </Card>

      <Card style={{ flex: 1, minWidth: 280 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 14 }}>
          تسویه‌های امروز
        </div>
        {!invoices && <div style={{ fontSize: 13, color: C.inkSoft }}>در حال بارگذاری...</div>}
        {invoices && invoices.length === 0 && (
          <div style={{ fontSize: 12.5, color: C.inkFaint }}>هنوز تسویه‌ای امروز ثبت نشده است.</div>
        )}
        {invoices && invoices.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {invoices.map((inv, i) => (
              <div
                key={inv.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                }}
              >
                <div style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>{inv.patient_name}</div>
                <div style={{ fontSize: 13, color: C.tealDark, fontWeight: 700 }}>
                  {toFa(Number(inv.paid_amount).toLocaleString())} ت
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}