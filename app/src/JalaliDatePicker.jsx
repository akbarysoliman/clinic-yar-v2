import React, { useState, useEffect, useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  toFa,
  todayJalali,
  jalaliLabel,
  jalaliToGregorian,
  daysInJalaliMonth,
  J_MONTHS,
  WEEKDAYS_SHORT,
} from "./jalali.js";
import { C, radiate } from "./theme.jsx";

const navBtn = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.surface,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: C.ink,
};

const selectStyle = {
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "5px 8px",
  background: C.surface,
  color: C.ink,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  outline: "none",
};

export default function JalaliDatePicker({
  value = null,
  onChange,
  label,
  placeholder = "انتخاب تاریخ",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const today = todayJalali();

  const [view, setView] = useState({
    jy: value?.jy || today.jy,
    jm: value?.jm || today.jm,
  });

  const ref = useRef(null);

  // بستن تقویم با کلیک بیرون
  useEffect(() => {
    function handleOutsideClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // هماهنگ‌سازی view با value
  useEffect(() => {
    if (value?.jy && value?.jm) {
      setView({ jy: value.jy, jm: value.jm });
    }
  }, [value?.jy, value?.jm]);

  const count = daysInJalaliMonth(view.jy, view.jm);
  const firstG = jalaliToGregorian(view.jy, view.jm, 1);
  const startOffset =
    (new Date(firstG.gy, firstG.gm - 1, firstG.gd).getDay() + 1) % 7;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= count; d++) cells.push(d);

  function go(dir) {
    setView((current) => {
      let jm = current.jm + dir;
      let jy = current.jy;
      if (jm < 1) { jm = 12; jy -= 1; }
      if (jm > 12) { jm = 1; jy += 1; }
      return { jy, jm };
    });
  }

  function toggleCalendar() {
    if (disabled) return;
    const current = value || today;
    setView({ jy: current.jy, jm: current.jm });
    setOpen((v) => !v);
  }

  function selectDate(day) {
    if (!onChange) return;
    onChange({ jy: view.jy, jm: view.jm, jd: day });
    setOpen(false);
  }

  function selectToday() {
    if (!onChange) return;
    onChange(today);
    setView({ jy: today.jy, jm: today.jm });
    setOpen(false);
  }

  // سال‌های قابل انتخاب (۱۰ سال قبل تا ۱۰ سال بعد)
  const years = [];
  for (let y = today.jy - 95; y <= today.jy + 20; y++) years.push(y);

  return (
            <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {label && (
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>
          {label}
        </div>
      )}

      {/* دکمه باز کردن تقویم */}
      <button
        type="button"
        disabled={disabled}
        onClick={toggleCalendar}
        style={{
          width: "100%",
          minHeight: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          background: disabled ? C.surfaceAlt : C.surface,
          border: `1px solid ${open ? C.teal : C.border}`,
          borderRadius: 10,
          padding: "9px 12px",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "right",
          fontSize: 13,
          color: C.ink,
          fontFamily: "inherit",
          opacity: disabled ? 0.65 : 1,
        }}
      >
        <span>
          {value ? (
            jalaliLabel(value, false)
          ) : (
            <span style={{ color: C.inkFaint }}>{placeholder}</span>
          )}
        </span>
        <CalendarDays size={17} color={disabled ? C.inkFaint : C.teal} />
      </button>

      {/* پنل تقویم */}
      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 1000,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 14,
            width: 320,
            maxWidth: "calc(100vw - 32px)",
            boxShadow: "0 10px 30px rgba(22,38,47,0.14)",
          }}
        >
          {/* هدر: کمبوباکس ماه و سال + دکمه‌های ناوبری */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <button type="button" onClick={() => go(-1)} style={navBtn} title="ماه قبل">
              <ChevronRight size={17} />
            </button>

            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <select
                value={view.jm}
                onChange={(e) => setView({ ...view, jm: Number(e.target.value) })}
                style={selectStyle}
              >
                {J_MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>

              <select
                value={view.jy}
                onChange={(e) => setView({ ...view, jy: Number(e.target.value) })}
                style={selectStyle}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{toFa(y)}</option>
                ))}
              </select>
            </div>

            <button type="button" onClick={() => go(1)} style={navBtn} title="ماه بعد">
              <ChevronLeft size={17} />
            </button>
          </div>

          {/* روزهای هفته */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              marginBottom: 4,
            }}
          >
            {WEEKDAYS_SHORT.map((dayName) => (
              <div
                key={dayName}
                style={{
                  textAlign: "center",
                  fontSize: 11.5,
                  color: C.inkFaint,
                  padding: "4px 0",
                }}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* روزهای ماه */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 3,
            }}
          >
            {cells.map((day, index) => {
              if (day === null) return <div key={index} />;

              const isSelected =
                !!value &&
                view.jy === value.jy &&
                view.jm === value.jm &&
                day === value.jd;

              const isToday =
                view.jy === today.jy &&
                view.jm === today.jm &&
                day === today.jd;

              return (
                <button
                  type="button"
                  key={index}
                  onClick={() => selectDate(day)}
                  style={{
                    aspectRatio: "1",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "50%",
                    fontSize: 13,
                    fontFamily: "inherit",
                    background: isSelected
                      ? radiate(C.teal, C.tealDark)
                      : "transparent",
                    color: isSelected
                      ? "#fff"
                      : isToday
                      ? C.teal
                      : C.ink,
                    fontWeight: isSelected || isToday ? 700 : 400,
                    outline:
                      isToday && !isSelected
                        ? `1.5px solid ${C.teal}`
                        : "none",
                    outlineOffset: -1.5,
                  }}
                >
                  {toFa(day)}
                </button>
              );
            })}
          </div>

          {/* دکمه امروز */}
          <button
            type="button"
            onClick={selectToday}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "8px 0",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.tealSoft,
              color: C.tealDark,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            بازگشت به امروز
          </button>
        </div>
      )}
    </div>
  );
}