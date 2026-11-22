import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTROLLERS_DIR = path.join(__dirname, "..", "src", "controllers");

// جداولی که clinic_id دارن
const CLINIC_SCOPED_TABLES = [
  "users",
  "patients",
  "branches",
  "offices",
  "doctors",
  "appointments",
  "visits",
  "invoices",
  "prescriptions",
  "doctor_schedules",
  "doctor_branches",
  "office_branches",
  "office_doctors",
  "secretary_offices",
  "doctor_secretaries",
  "patient_links",
  "payments",
];

// استثناها: کوئری‌هایی که نیازی به clinic_id ندارن
const EXCEPTIONS = [
  "patient_accounts",  // جدول سراسری
  "clinics",           // خود جدول کلینیک
  "specialties",       // سراسری
  "insurers",          // سراسری
  "service_prices",    // سراسری
  "installation_identity", // سراسری
];

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);

  // پیدا کردن همه‌ی query(...) و client.query(...)
  const queryRegex = /(?:query|client\.query)\s*\(\s*`([\s\S]*?)`/g;
  const issues = [];
  let match;
  let lineNumber = 1;

  while ((match = queryRegex.exec(content)) !== null) {
    const sql = match[1];

    // محاسبه‌ی شماره خط
    const beforeMatch = content.slice(0, match.index);
    lineNumber = beforeMatch.split("\n").length;

    // چک کن آیا جدول کلینیکی داره
    const tablesFound = [];
    for (const table of CLINIC_SCOPED_TABLES) {
      // الگوی FROM یا JOIN یا INSERT INTO یا UPDATE یا DELETE FROM
      const tableRegex = new RegExp(`\\b(FROM|JOIN|INSERT\\s+INTO|UPDATE|DELETE\\s+FROM)\\s+${table}\\b`, "i");
      if (tableRegex.test(sql)) {
        tablesFound.push(table);
      }
    }

    // چک استثناها
    const exceptionFound = EXCEPTIONS.some((exc) => {
      const regex = new RegExp(`\\b(FROM|JOIN|INSERT\\s+INTO|UPDATE|DELETE\\s+FROM)\\s+${exc}\\b`, "i");
      return regex.test(sql);
    });

    if (tablesFound.length > 0 && !exceptionFound) {
      // چک کن clinic_id توی کوئری هست یا نه
      const hasClinicId = /\bclinic_id\b/.test(sql) || /req\.user\??\.clinic_id/.test(content.slice(match.index, match.index + 500));

      if (!hasClinicId) {
        issues.push({
          line: lineNumber,
          tables: tablesFound,
          sqlSnippet: sql.trim().slice(0, 120).replace(/\s+/g, " "),
        });
      }
    }
  }

  return { fileName, issues };
}

function main() {
  const files = fs.readdirSync(CONTROLLERS_DIR).filter((f) => f.endsWith(".js"));
  let totalIssues = 0;

  console.log("🔍 بررسی کوئری‌های بدون clinic_id...\n");

  for (const file of files) {
    const filePath = path.join(CONTROLLERS_DIR, file);
    const { fileName, issues } = analyzeFile(filePath);

    if (issues.length > 0) {
      console.log(`\n📁 ${fileName}`);
      console.log("─".repeat(60));
      for (const issue of issues) {
        totalIssues++;
        console.log(`  ⚠️  خط ${issue.line}`);
        console.log(`     جداول: ${issue.tables.join(", ")}`);
        console.log(`     کوئری: ${issue.sqlSnippet}...`);
        console.log();
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 مجموع: ${totalIssues} کوئری مشکوک\n`);

  if (totalIssues === 0) {
    console.log("✅ همه‌ی کوئری‌ها OK هستن!\n");
  } else {
    console.log("⚠️  این کوئری‌ها رو باید بررسی کنی.\n");
  }
}

main();