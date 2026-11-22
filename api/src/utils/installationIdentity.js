import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

const DATA_DIR = path.join(process.cwd(), "data");
const IDENTITY_FILE = path.join(DATA_DIR, "installation-identity.json");

function getMachineId() {
  try {
    if (process.platform === "win32") {
      const output = execSync(
        'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      );

      const match = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);

      if (match?.[1]) {
        return match[1].trim();
      }
    }

    if (process.platform === "linux") {
      const machineIdPath = "/etc/machine-id";

      if (fs.existsSync(machineIdPath)) {
        return fs.readFileSync(machineIdPath, "utf8").trim();
      }
    }
  } catch {
    // Fallback below
  }

  return [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()?.[0]?.model || "",
  ].join("|");
}

function createIdentity() {
  const installationId = crypto.randomUUID();

  const machineId = getMachineId();

  const deviceFingerprint = crypto
    .createHash("sha256")
    .update(
      [
        machineId,
        os.hostname(),
        os.platform(),
        os.arch(),
      ].join("|")
    )
    .digest("hex");

  return {
    installation_id: installationId,
    device_fingerprint: deviceFingerprint,
    created_at: new Date().toISOString(),
  };
}

export function getInstallationIdentity() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(IDENTITY_FILE)) {
    try {
      const identity = JSON.parse(
        fs.readFileSync(IDENTITY_FILE, "utf8")
      );

      if (
        identity?.installation_id &&
        identity?.device_fingerprint
      ) {
        return identity;
      }
    } catch {
      // Recreate corrupted identity file
    }
  }

  const identity = createIdentity();

  fs.writeFileSync(
    IDENTITY_FILE,
    JSON.stringify(identity, null, 2),
    {
      encoding: "utf8",
      mode: 0o600,
    }
  );

  return identity;
}

export function getInstallationId() {
  return getInstallationIdentity().installation_id;
}

export function getDeviceFingerprint() {
  return getInstallationIdentity().device_fingerprint;
}