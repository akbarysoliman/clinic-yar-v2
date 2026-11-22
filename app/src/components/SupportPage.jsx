import { useState } from "react";
import {
  ArrowRight, Phone, Mail, MessageCircle, Send, Instagram, Youtube,
  BookOpen, Users, Stethoscope, UserRound, User, HelpCircle,
  ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";
import { C, Card, Brand, GlobalStyle } from "../theme.jsx";

const FAQ_ITEMS = [
  {
    category: "عمومی",
    items: [
      {
        q: "چطور وارد نرم‌افزار شوم؟",
        a: "با کد کاربری و رمز عبوری که مدیر کلینیک برای شما تعریف کرده وارد شوید. اگر رمز را فراموش کرده‌اید، با مدیر کلینیک تماس بگیرید.",
      },
      {
        q: "رمز عبورم را چطور تغییر دهم؟",
        a: "پس از ورود، از منوی بالای صفحه روی دکمه «تغییر رمز» کلیک کنید و رمز فعلی و رمز جدید را وارد کنید.",
      },
      {
        q: "آیا نرم‌افزار روی موبایل هم کار می‌کند؟",
        a: "بله، رابط کاربری کاملاً واکنش‌گرا (Responsive) طراحی شده و روی موبایل، تبلت و دسکتاپ به خوبی کار می‌کند.",
      },
    ],
  },
  {
    category: "مدیر کلینیک",
    items: [
      {
        q: "چطور شعبه جدید اضافه کنم؟",
        a: "از منوی «شعبه‌ها» روی «افزودن شعبه» کلیک کنید و اطلاعات شعبه را وارد کنید.",
      },
      {
        q: "چطور پزشک جدید بسازم؟",
        a: "از منوی «پزشکان» روی «افزودن پزشک» کلیک کنید. اطلاعات پزشک، تخصص، شماره نظام و شعبه را وارد کنید. یک رمز عبور اولیه برای پزشک تعیین کنید.",
      },
      {
        q: "چرا نمی‌توانم شعبه‌ای را حذف کنم؟",
        a: "اگر شعبه دارای وابستگی (پزشک، مطب، کاربر یا نوبت) باشد، به جای حذف، غیرفعال می‌شود تا اطلاعات تاریخی حفظ شوند.",
      },
      {
        q: "چطور به منشی مطب اختصاص دهم؟",
        a: "در منوی «منشی‌ها»، هنگام افزودن یا ویرایش منشی، می‌توانید مطب و پزشک مرتبط را انتخاب کنید.",
      },
    ],
  },
  {
    category: "منشی",
    items: [
      {
        q: "چطور برای بیمار نوبت ثبت کنم؟",
        a: "از منوی «نوبت‌دهی»، تاریخ، پزشک و ساعت خالی را انتخاب کنید. سپس بیمار را جستجو یا ثبت کنید و روی «ثبت نوبت» کلیک کنید.",
      },
      {
        q: "چطور بیمار جدید ثبت کنم؟",
        a: "از منوی «بیماران» روی «+ بیمار جدید» کلیک کنید. نام، شماره تماس و کد ملی الزامی است. کد ملی برای جلوگیری از ثبت تکراری بررسی می‌شود.",
      },
      {
        q: "چطور صف امروز را مدیریت کنم؟",
        a: "از منوی «صف امروز»، وضعیت بیماران را با دکمه «مرحله بعد» تغییر دهید (پذیرش → در حال ویزیت → تکمیل).",
      },
      {
        q: "چطور تسویه‌حساب کنم؟",
        a: "از منوی «تسویه‌حساب»، بیمار را جستجو کنید، مبلغ و روش پرداخت را انتخاب و ثبت کنید.",
      },
    ],
  },
  {
    category: "پزشک",
    items: [
      {
        q: "چطور ویزیت بیمار را ثبت کنم؟",
        a: "از منوی «ویزیت و پرونده» بیمار را انتخاب کنید، تشخیص و روند درمان را وارد کرده و داروها را در بخش نسخه اضافه کنید.",
      },
      {
        q: "چطور برنامه کاری خود را تنظیم کنم؟",
        a: "از منوی «برنامه کاری» روزهای هفته و ساعت‌های حضور خود را تعریف کنید. مدیر کلینیک هم می‌تواند این کار را انجام دهد.",
      },
    ],
  },
  {
    category: "بیمار",
    items: [
      {
        q: "چطور وارد پنل بیمار شوم؟",
        a: "در صفحه ورود، روی «ورود بیمار» کلیک کنید و شماره موبایل و کد ملی خود را وارد کنید.",
      },
      {
        q: "چطور نوبت بگیرم؟",
        a: "در پنل بیمار، به بخش «درخواست نوبت» بروید، کلینیک و پزشک را انتخاب و ساعت خالی را رزرو کنید. درخواست شما پس از تأیید منشی، قطعی می‌شود.",
      },
      {
        q: "چطور نسخه‌هایم را ببینم؟",
        a: "در پنل بیمار، به تب «نسخه‌ها» بروید. تمام نسخه‌های ثبت‌شده در پرونده‌های متصل به شما نمایش داده می‌شوند.",
      },
      {
        q: "چطور صورتحساب‌هایم را ببینم؟",
        a: "در پنل بیمار، به تب «صورت‌حساب‌ها» بروید. مجموع فاکتورها، پرداخت‌شده و بدهی باقی‌مانده نمایش داده می‌شود.",
      },
    ],
  },
];

const CONTACT_INFO = {
  name: "سلیمان اکبری",
  phone: "09914578191",
  eitaa: "@Solimanakbary460",
  eitaaLink: "https://eitaa.com/Solimanakbary460",
  telegram: "@soliman_akbary1356",
  telegramLink: "https://t.me/soliman_akbary1356",
  instagram: "excelgenius460",
  instagramLink: "https://instagram.com/excelgenius460",
  youtube: "excelgenius460",
  youtubeLink: "https://youtube.com/@excelgenius460",
};

export default function SupportPage({ onBack }) {
  const [openFaq, setOpenFaq] = useState({});
  const [copied, setCopied] = useState(null);

  function copyText(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function toggleFaq(categoryIdx, itemIdx) {
    const key = `${categoryIdx}-${itemIdx}`;
    setOpenFaq((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div dir="rtl" lang="fa" style={{
      fontFamily: "'Vazirmatn', Tahoma, sans-serif",
      background: C.bg,
      minHeight: "100vh",
      color: C.ink,
      paddingBottom: 40,
    }}>
      <GlobalStyle />

      {/* هدر */}
      <header style={{
        height: 68, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 22px", background: C.surface, borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Brand size={34} />
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: C.navy }}>کلینیک‌یار</div>
            <div style={{ fontSize: 10.5, color: C.inkFaint, marginTop: 1 }}>راهنما و پشتیبانی</div>
          </div>
        </div>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            border: `1px solid ${C.border}`, background: C.surface,
            borderRadius: 10, padding: "8px 14px", color: C.inkSoft,
            fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <ArrowRight size={16} /> بازگشت به ورود
        </button>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>

        {/* عنوان */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, background: C.tealSoft,
            color: C.teal, display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
          }}>
            <BookOpen size={30} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: 0 }}>
            راهنما و پشتیبانی کلینیک‌یار
          </h1>
          <p style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 8, lineHeight: 2 }}>
            هر آنچه برای شروع کار با نرم‌افزار نیاز دارید، اینجاست.
            <br />
            اگر پاسخ خود را پیدا نکردید، از طریق راه‌های ارتباطی زیر با ما در تماس باشید.
          </p>
        </div>

        {/* کارت‌های راهنمای نقش‌ها */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 26 }}>
          {[
            { icon: Users, title: "راهنمای مدیر", desc: "مدیریت شعبه، مطب، پزشک و منشی", color: C.teal },
            { icon: UserRound, title: "راهنمای منشی", desc: "نوبت‌دهی، بیماران، صف و تسویه", color: C.saffronDark },
            { icon: Stethoscope, title: "راهنمای پزشک", desc: "ویزیت، نسخه و برنامه کاری", color: C.blue },
            { icon: User, title: "راهنمای بیمار", desc: "درخواست نوبت، نسخه و صورتحساب", color: C.purple },
          ].map((item) => (
            <Card key={item.title} style={{ padding: 16, textAlign: "center" }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14, background: item.color + "22",
                color: item.color, display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 10px",
              }}>
                <item.icon size={22} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{item.title}</div>
              <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 6, lineHeight: 1.8 }}>{item.desc}</div>
            </Card>
          ))}
        </div>

        {/* راه‌های ارتباطی */}
        <Card style={{ marginBottom: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11, background: C.tealSoft,
              color: C.teal, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MessageCircle size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>راه‌های ارتباطی</div>
              <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 2 }}>
                پشتیبانی: {CONTACT_INFO.name}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>

            {/* تلفن */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: 12,
              border: `1px solid ${C.border}`, borderRadius: 11, background: C.surfaceAlt,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11, background: C.tealSoft,
                color: C.teal, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Phone size={17} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: C.inkFaint }}>تلفن تماس</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, direction: "ltr", textAlign: "right" }} dir="ltr">
                  {CONTACT_INFO.phone}
                </div>
              </div>
              <button
                onClick={() => copyText(CONTACT_INFO.phone, "phone")}
                style={{ border: "none", background: "transparent", color: C.inkFaint, cursor: "pointer", padding: 4 }}
                title="کپی"
              >
                {copied === "phone" ? <Check size={15} color={C.teal} /> : <Copy size={15} />}
              </button>
            </div>

            {/* ایتا */}
            <a
              href={CONTACT_INFO.eitaaLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: 12,
                border: `1px solid ${C.border}`, borderRadius: 11, background: C.surfaceAlt,
                textDecoration: "none", color: "inherit",
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 11, background: C.saffronSoft,
                color: C.saffronDark, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Send size={17} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: C.inkFaint }}>ایتا</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, direction: "ltr", textAlign: "right" }} dir="ltr">
                  {CONTACT_INFO.eitaa}
                </div>
              </div>
            </a>

            {/* تلگرام */}
            <a
              href={CONTACT_INFO.telegramLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: 12,
                border: `1px solid ${C.border}`, borderRadius: 11, background: C.surfaceAlt,
                textDecoration: "none", color: "inherit",
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 11, background: C.blueSoft,
                color: C.blue, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Send size={17} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: C.inkFaint }}>تلگرام</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, direction: "ltr", textAlign: "right" }} dir="ltr">
                  {CONTACT_INFO.telegram}
                </div>
              </div>
            </a>

            {/* اینستاگرام */}
            <a
              href={CONTACT_INFO.instagramLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: 12,
                border: `1px solid ${C.border}`, borderRadius: 11, background: C.surfaceAlt,
                textDecoration: "none", color: "inherit",
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 11, background: C.purpleSoft,
                color: C.purple, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Instagram size={17} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: C.inkFaint }}>اینستاگرام</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, direction: "ltr", textAlign: "right" }} dir="ltr">
                  {CONTACT_INFO.instagram}
                </div>
              </div>
            </a>

            {/* یوتیوب */}
            <a
              href={CONTACT_INFO.youtubeLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: 12,
                border: `1px solid ${C.border}`, borderRadius: 11, background: C.surfaceAlt,
                textDecoration: "none", color: "inherit",
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 11, background: C.claySoft,
                color: C.clay, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Youtube size={17} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: C.inkFaint }}>یوتیوب</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, direction: "ltr", textAlign: "right" }} dir="ltr">
                  {CONTACT_INFO.youtube}
                </div>
              </div>
            </a>

          </div>
        </Card>

        {/* سوالات متداول */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11, background: C.saffronSoft,
              color: C.saffronDark, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <HelpCircle size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>سوالات متداول</div>
              <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 2 }}>
                پاسخ سوالات پرتکرار کاربران
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {FAQ_ITEMS.map((cat, catIdx) => (
              <div key={cat.category}>
                <div style={{
                  fontSize: 13, fontWeight: 800, color: C.tealDark, marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal }} />
                  {cat.category}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cat.items.map((item, itemIdx) => {
                    const key = `${catIdx}-${itemIdx}`;
                    const isOpen = openFaq[key];
                    return (
                      <div
                        key={key}
                        style={{
                          border: `1px solid ${C.border}`,
                          borderRadius: 11,
                          background: C.surfaceAlt,
                          overflow: "hidden",
                        }}
                      >
                        <button
                          onClick={() => toggleFaq(catIdx, itemIdx)}
                          style={{
                            width: "100%", display: "flex", justifyContent: "space-between",
                            alignItems: "center", gap: 10, padding: "12px 14px",
                            border: "none", background: "transparent", cursor: "pointer",
                            fontFamily: "inherit", textAlign: "right", color: C.ink,
                            fontSize: 13, fontWeight: 700,
                          }}
                        >
                          <span style={{ flex: 1 }}>{item.q}</span>
                          {isOpen ? <ChevronUp size={16} color={C.teal} /> : <ChevronDown size={16} color={C.inkFaint} />}
                        </button>
                        {isOpen && (
                          <div style={{
                            padding: "0 14px 14px",
                            fontSize: 12.5, color: C.inkSoft, lineHeight: 2,
                            borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 2,
                          }}>
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* فوتر */}
        <div style={{
          textAlign: "center", marginTop: 30, padding: "20px 0",
          borderTop: `1px solid ${C.border}`,
          fontSize: 11.5, color: C.inkFaint, lineHeight: 1.9,
        }}>
          <div>کلینیک‌یار • نسخه ۱.۰</div>
          <div style={{ marginTop: 4 }}>توسعه‌دهنده و پشتیبان: {CONTACT_INFO.name}</div>
        </div>

      </main>
    </div>
  );
}