import dotenv from "dotenv";

dotenv.config();

const { pool } = await import("../db.js");

async function main() {
  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_login_otps (
        id BIGSERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        national_code VARCHAR(10) NOT NULL,
        full_name VARCHAR(150),
        otp_hash VARCHAR(128) NOT NULL,
        attempts SMALLINT NOT NULL DEFAULT 0
          CHECK (attempts BETWEEN 0 AND 5),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        consumed_at TIMESTAMPTZ,
        request_ip INET
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS
        idx_patient_login_otps_phone_created
      ON patient_login_otps (phone, created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS
        idx_patient_login_otps_ip_created
      ON patient_login_otps (request_ip, created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS
        idx_patient_login_otps_expiry
      ON patient_login_otps (expires_at);
    `);

    await client.query("COMMIT");
    console.log("OTP table and indexes are ready.");
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("OTP schema creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

main();
