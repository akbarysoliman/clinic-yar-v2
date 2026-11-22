import { query, withTransaction } from "../db.js";
import { createNotification } from "../utils/notifications.js";
/**
 * تسویه سریع (سبک صندوق): یک فاکتور می‌سازد و بلافاصله یک پرداخت برای آن ثبت می‌کند.
 * برای اکثر کلینیک‌ها که تسویه نقدی/کارتی فوری دارند، این رایج‌ترین حالت است.
 * body: { patient_id, branch_id, visit_id?, amount, method, insurer_id? }
 */
export async function quickCheckout(req, res) {
  const { patient_id, branch_id, visit_id, amount, method, insurer_id } = req.body;
  const clinicId = req.user?.clinic_id;
  const allowedRoles = ["super_admin", "branch_admin", "secretary", "accountant"];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "اجازه ثبت دریافت وجه ندارید" });
  }
  if (!clinicId) return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  if (!patient_id || !branch_id || amount === undefined || amount === null || Number(amount) <= 0 || !method) {
    return res.status(400).json({ error: "بیمار، شعبه، مبلغ معتبر و روش پرداخت الزامی است" });
  }
  if (req.user.role !== "super_admin" && req.user.branch_id &&
      String(req.user.branch_id) !== String(branch_id)) {
    return res.status(403).json({ error: "به این شعبه دسترسی ندارید" });
  }

  const branchResult = await query(
    `SELECT id FROM branches WHERE id = $1 AND clinic_id = $2 AND is_active = TRUE`,
    [branch_id, clinicId]
  );
  if (!branchResult.rows[0]) return res.status(403).json({ error: "شعبه در این کلینیک مجاز نیست" });

  const patientResult = await query(
    `SELECT id FROM patients WHERE id = $1 AND clinic_id = $2`,
    [patient_id, clinicId]
  );
  if (!patientResult.rows[0]) return res.status(404).json({ error: "بیمار در این کلینیک یافت نشد" });

  if (visit_id) {
    const visitResult = await query(
      `SELECT v.id
       FROM visits v
       JOIN doctors d ON d.id = v.doctor_id
       JOIN users u ON u.id = d.user_id
       WHERE v.id = $1 AND v.patient_id = $2 AND u.clinic_id = $3
         AND (v.appointment_id IS NULL OR EXISTS (
           SELECT 1 FROM appointments a WHERE a.id = v.appointment_id AND a.branch_id = $4
         ))`,
      [visit_id, patient_id, clinicId, branch_id]
    );
    if (!visitResult.rows[0]) return res.status(403).json({ error: "ویزیت انتخاب‌شده با بیمار یا شعبه مطابقت ندارد" });
  }

      const { invoice, payment } = await withTransaction(async (client) => {
      const invoiceResult = await client.query(
        `INSERT INTO invoices (visit_id, patient_id, branch_id, total_amount, insurer_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [visit_id || null, patient_id, branch_id, amount, insurer_id || null]
      );
      const inv = invoiceResult.rows[0];
      const paymentResult = await client.query(
        `INSERT INTO payments (invoice_id, amount, method, received_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [inv.id, amount, method, req.user.id]
      );
      return { invoice: inv, payment: paymentResult.rows[0] };
    });

    // ساخت اعلان برای بیمار (اگه پرونده به حساب بیمار متصل باشه)
    try {
      const linkInfo = await query(
        `SELECT pl.account_id
         FROM patient_links pl
         WHERE pl.patient_id = $1 AND pl.verified = TRUE
         LIMIT 1`,
        [patient_id]
      );

      if (linkInfo.rows[0]?.account_id) {
        const branchInfo = await query(
          `SELECT name FROM branches WHERE id = $1`,
          [branch_id]
        );

        const amountFormatted = Number(amount).toLocaleString("fa-IR");

        await createNotification({
          patientAccountId: linkInfo.rows[0].account_id,
          clinicId,
          type: "invoice_created",
          title: "فاکتور جدید صادر شد",
          message: `فاکتور جدیدی به مبلغ ${amountFormatted} تومان در ${branchInfo.rows[0]?.name || ""} برای شما صادر شد.`,
          link: "/patient/invoices",
          metadata: {
            invoice_id: invoice.id,
            payment_id: payment.id,
            amount: Number(amount),
          },
        });
      }
    } catch (notifErr) {
      console.error("خطا در ساخت اعلان فاکتور:", notifErr.message);
    }

    res.status(201).json({ invoice, payment });
  }

export async function listInvoices(req, res) {
  const { branch_id, date } = req.query;
  const clinicId = req.user?.clinic_id;
  const allowedRoles = ["super_admin", "branch_admin", "secretary", "accountant"];
  if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: "اجازه مشاهده فاکتورها ندارید" });
  if (!clinicId) return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  if (!branch_id) return res.status(400).json({ error: "پارامتر branch_id الزامی است" });
  if (req.user.role !== "super_admin" && req.user.branch_id &&
      String(req.user.branch_id) !== String(branch_id)) {
    return res.status(403).json({ error: "به این شعبه دسترسی ندارید" });
  }

  const branchResult = await query(
    `SELECT id FROM branches WHERE id = $1 AND clinic_id = $2`,
    [branch_id, clinicId]
  );
  if (!branchResult.rows[0]) return res.status(403).json({ error: "شعبه در این کلینیک مجاز نیست" });

  const params = [branch_id, clinicId];
  let dateFilter = "";
  if (date) {
    params.push(date);
    dateFilter = `AND i.created_at::date = $${params.length}`;
  }

  const { rows } = await query(
    `SELECT i.id, i.total_amount, i.created_at, p.full_name AS patient_name,
            COALESCE(SUM(pay.amount), 0) AS paid_amount
     FROM invoices i
     JOIN branches b ON b.id = i.branch_id AND b.clinic_id = $2
     JOIN patients p ON p.id = i.patient_id AND p.clinic_id = $2
     LEFT JOIN payments pay ON pay.invoice_id = i.id
     WHERE i.branch_id = $1 ${dateFilter}
     GROUP BY i.id, p.full_name
     ORDER BY i.created_at DESC`,
    params
  );
  res.json({ invoices: rows });
}

export async function getInvoice(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;
  const allowedRoles = ["super_admin", "branch_admin", "secretary", "accountant"];
  if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: "اجازه مشاهده فاکتور ندارید" });
  if (!clinicId) return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });

  const params = [id, clinicId];
  let branchFilter = "";
  if (req.user.role !== "super_admin" && req.user.branch_id) {
    params.push(req.user.branch_id);
    branchFilter = `AND i.branch_id = $${params.length}`;
  }

  const invoiceResult = await query(
    `SELECT i.*, p.full_name AS patient_name
     FROM invoices i
     JOIN branches b ON b.id = i.branch_id AND b.clinic_id = $2
     JOIN patients p ON p.id = i.patient_id AND p.clinic_id = $2
     WHERE i.id = $1 ${branchFilter}`,
    params
  );
  const invoice = invoiceResult.rows[0];
  if (!invoice) return res.status(404).json({ error: "فاکتور در این کلینیک یافت نشد" });

  const paymentsResult = await query(
    `SELECT * FROM payments WHERE invoice_id = $1 ORDER BY paid_at`,
    [id]
  );
  res.json({ invoice, payments: paymentsResult.rows });
}

export async function financeSummary(req, res) {
  const clinicId = req.user?.clinic_id;
  const allowedRoles = ["super_admin", "branch_admin", "doctor", "secretary", "accountant"];
  if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: "اجازه مشاهده گزارش مالی ندارید" });
  if (!clinicId) return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });

  const defaultFrom = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const defaultTo = new Date().toISOString().slice(0, 10);
  const from = req.query.from || defaultFrom;
  const to = req.query.to || defaultTo;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(from) || !datePattern.test(to) || from > to) {
    return res.status(400).json({ error: "بازه تاریخ معتبر نیست" });
  }

  let doctorId = null;
  if (req.user.role === "doctor") {
    const doctorResult = await query(
      `SELECT d.id FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1 AND u.clinic_id = $2 AND u.is_active = TRUE LIMIT 1`,
      [req.user.id, clinicId]
    );
    doctorId = doctorResult.rows[0]?.id;
    if (!doctorId) return res.status(403).json({ error: "پروفایل پزشک یافت نشد" });
  }

  let branchId = null;
  if (req.user.role === "branch_admin" ||
      ((req.user.role === "secretary" || req.user.role === "accountant") && req.user.branch_id)) {
    branchId = req.user.branch_id || null;
    if (!branchId) return res.status(403).json({ error: "شعبه کاربر مشخص نیست" });
    if (req.query.branch_id && String(req.query.branch_id) !== String(branchId)) {
      return res.status(403).json({ error: "به این شعبه دسترسی ندارید" });
    }
  } else if (req.query.branch_id) {
    branchId = req.query.branch_id;
  }

  if (branchId) {
    const branchResult = await query(
      `SELECT id FROM branches WHERE id = $1 AND clinic_id = $2`,
      [branchId, clinicId]
    );
    if (!branchResult.rows[0]) return res.status(403).json({ error: "شعبه در این کلینیک مجاز نیست" });
    if (doctorId) {
      const assigned = await query(
        `SELECT 1 FROM doctor_branches WHERE doctor_id = $1 AND branch_id = $2`,
        [doctorId, branchId]
      );
      if (!assigned.rows[0]) return res.status(403).json({ error: "به گزارش این شعبه دسترسی ندارید" });
    }
  }

  const params = [from, to, clinicId];
  let branchFilter = "";
  if (branchId) {
    params.push(branchId);
    branchFilter = `AND b.id = $${params.length}`;
  }
  let doctorInvoiceFilter = "";
  let doctorPaymentFilter = "";
  if (doctorId) {
    params.push(doctorId);
    const doctorParam = `$${params.length}`;
    doctorInvoiceFilter = `AND i.visit_id IN (SELECT v.id FROM visits v WHERE v.doctor_id = ${doctorParam})`;
    doctorPaymentFilter = `AND EXISTS (SELECT 1 FROM visits v WHERE v.id = i.visit_id AND v.doctor_id = ${doctorParam})`;
  }

  const byBranch = await query(
    `SELECT b.id, b.name,
            COALESCE(SUM(pay.amount), 0) AS revenue,
            COUNT(DISTINCT CASE WHEN pay.id IS NOT NULL THEN i.id END)::int AS invoice_count
     FROM branches b
     LEFT JOIN invoices i ON i.branch_id = b.id
       AND i.patient_id IN (SELECT p2.id FROM patients p2 WHERE p2.clinic_id = $3)
       ${doctorInvoiceFilter}
     LEFT JOIN payments pay ON pay.invoice_id = i.id AND pay.paid_at::date BETWEEN $1 AND $2
     WHERE b.clinic_id = $3 ${branchFilter}
     GROUP BY b.id, b.name
     ORDER BY b.name`,
    params
  );

  const byMethod = await query(
    `SELECT pay.method, COALESCE(SUM(pay.amount), 0) AS total
     FROM payments pay
     JOIN invoices i ON i.id = pay.invoice_id
     JOIN branches b ON b.id = i.branch_id
     JOIN patients p ON p.id = i.patient_id AND p.clinic_id = $3
     WHERE b.clinic_id = $3
       AND pay.paid_at::date BETWEEN $1 AND $2
       ${branchFilter}
       ${doctorPaymentFilter}
     GROUP BY pay.method`,
    params
  );

  const totals = {
    revenue: byBranch.rows.reduce((sum, item) => sum + Number(item.revenue || 0), 0),
    invoice_count: byBranch.rows.reduce((sum, item) => sum + Number(item.invoice_count || 0), 0),
  };
  res.json({ from, to, totals, branches: byBranch.rows, byMethod: byMethod.rows });
}

