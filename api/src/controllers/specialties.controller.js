import { query } from "../db.js";

export async function listSpecialties(req, res) {
  const { rows } = await query(`SELECT * FROM specialties ORDER BY name`);
  res.json({ specialties: rows });
}

export async function createSpecialty(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "نام تخصص الزامی است" });
  try {
    const { rows } = await query(
      `INSERT INTO specialties (name) VALUES ($1) RETURNING *`,
      [name.trim()]
    );
    res.status(201).json({ specialty: rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "این تخصص قبلاً ثبت شده است" });
    }
    throw err;
  }
}
