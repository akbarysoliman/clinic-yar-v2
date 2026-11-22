import React, { useState, useEffect } from "react";
import { Search, X, User } from "lucide-react";
import { C } from "../theme.jsx";
import { api } from "../api.js";

/**
 * کامپوننت جستجوی زنده بیمار
 * 
 * Props:
 * - value: بیمار انتخاب‌شده (شیء patient یا null)
 * - onChange: تابع برای تغییر بیمار انتخاب‌شده
 * - label: برچسب فیلد (پیش‌فرض: «بیمار»)
 * - placeholder: متن placeholder
 * - autoFocus: فوکوس خودکار
 */
export default function LivePatientSearch({
  value = null,
  onChange,
  label = "بیمار",
  placeholder = "نام یا شماره تماس بیمار را وارد کنید...",
  autoFocus = false,
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [showList, setShowList] = useState(false);
  const [loading, setLoading] = useState(false);

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

  // جستجوی زنده با تأخیر (debounce)
  useEffect(() => {
    if (!search || search.trim().length < 2) {
      setResults([]);
      setShowList(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      api.searchPatients(search.trim())
        .then((d) => {
          setResults(d?.patients || []);
          setShowList(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  function selectPatient(patient) {
    if (onChange) onChange(patient);
    setSearch(patient.full_name);
    setShowList(false);
  }

  function clear() {
    if (onChange) onChange(null);
    setSearch("");
    setResults([]);
    setShowList(false);
  }

  return (
    <div style={{ position: "relative" }}>
      {label && (
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>
          {label}
          {value && <span style={{ color: C.teal, fontWeight: 700, marginRight: 6 }}>(انتخاب‌شده)</span>}
        </div>
      )}

      {value ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${C.teal}`,
            background: C.tealSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <User size={16} color={C.tealDark} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.tealDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {value.full_name}
              </div>
              <div style={{ fontSize: 11.5, color: C.tealDark, marginTop: 2 }} dir="ltr">
                {value.phone}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            style={{
              border: "none",
              background: "transparent",
              color: C.clay,
              cursor: "pointer",
              fontSize: 16,
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            title="حذف انتخاب"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: "relative" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setShowList(true);
              }}
              placeholder={placeholder}
              style={{ ...inputStyle, paddingRight: 36 }}
              autoFocus={autoFocus}
            />
            <Search
              size={16}
              color={C.inkFaint}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}
            />
          </div>

          {loading && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                left: 0,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 12,
                fontSize: 12,
                color: C.inkSoft,
                zIndex: 50,
              }}
            >
              در حال جستجو...
            </div>
          )}

          {showList && results.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                left: 0,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                maxHeight: 220,
                overflowY: "auto",
                zIndex: 50,
              }}
            >
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPatient(p)}
                  style={{
                    width: "100%",
                    textAlign: "right",
                    border: "none",
                    background: "transparent",
                    padding: "10px 12px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    borderBottom: `1px solid ${C.border}`,
                    display: "block",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{p.full_name}</div>
                  <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 2 }} dir="ltr">
                    {p.phone}
                    {p.national_code ? ` — ${p.national_code}` : ""}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showList && results.length === 0 && !loading && search.trim().length >= 2 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                left: 0,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 12,
                fontSize: 12,
                color: C.inkFaint,
                zIndex: 50,
              }}
            >
              بیماری با این مشخصات پیدا نشد. از منوی «بیماران» بیمار جدید ثبت کنید.
            </div>
          )}
        </>
      )}
    </div>
  );
}