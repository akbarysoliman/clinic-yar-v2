// بیدار کردن سرور بک‌اند به محض ورود کاربر
fetch('http://localhost:4000/api/health')
  .catch(() => {}); // خطاها را نادیده بگیر تا برنامه خراب نشه
import React from "react";
import ReactDOM from "react-dom/client";
import ClinicApp from "./App.jsx";

// Set the saved theme before the first React render.
// This keeps theme.jsx in sync from the very first paint.
const savedTheme = localStorage.getItem("clinic-theme");
document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClinicApp />
  </React.StrictMode>
);


