const { createCipheriv, createHash, randomBytes, randomUUID } = require("node:crypto");
const Tag = require("../models/Tag");
const DeviceWifiCommand = require("../models/DeviceWifiCommand");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const COMMAND_TTL_MS = 90_000;
const HEARTBEAT_WINDOW_MS = 30_000;

function ssidIsValid(value) {
  return typeof value === "string" && !value.includes("\0") &&
    Buffer.byteLength(value) > 0 && Buffer.byteLength(value) <= 32;
}

function makeCommand(tagId, body, challenge) {
  const secret = process.env.DEVICE_API_KEY;
  if (!secret) throw new ApiError(503, "WIFI_SETUP_DISABLED", "Kunci perangkat belum diatur di backend.");
  if (!/^[A-Za-z0-9-]{1,40}$/.test(tagId)) {
    throw new ApiError(400, "INVALID_DEVICE_ID", "ID perangkat tidak valid.");
  }
  const { action, ssid, password } = body;
  if (!["scan", "connect"].includes(action)) {
    throw new ApiError(400, "INVALID_WIFI_ACTION", "Perintah Wi-Fi tidak valid.");
  }
  const payload = { id: randomUUID(), action };
  const expiresAt = new Date(Date.now() + COMMAND_TTL_MS);
  if (challenge) payload.challenge = challenge;
  else payload.expires_at = Math.floor(expiresAt.getTime() / 1000);

  if (action === "connect") {
    const validPassword = typeof password === "string" && !password.includes("\0") &&
      (password === "" || (Buffer.byteLength(password) >= 8 && Buffer.byteLength(password) <= 63) ||
        /^[a-fA-F0-9]{64}$/.test(password));
    if (!ssidIsValid(ssid) || !validPassword) {
      throw new ApiError(400, "INVALID_WIFI_CREDENTIALS", "Periksa nama Wi-Fi dan panjang password.");
    }
    Object.assign(payload, { ssid, password });
  }

  // Amplop yang sama dikirim lewat heartbeat atau diteruskan oleh browser lewat BLE.
  const key = createHash("sha256").update(`tandain-wifi-v1\n${tagId}\n${secret}`).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const packet = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
  return { id: payload.id, packet, expires_at: expiresAt };
}

const queueWifiCommand = asyncHandler(async (req, res) => {
  const tagId = req.params.tagId;
  const tag = await Tag.findOne({ tag_id: tagId }).select("last_seen wifi_configurable").lean();
  if (!tag) throw new ApiError(404, "DEVICE_NOT_FOUND", "Perangkat belum terdaftar.");
  if (!tag.last_seen || Date.now() - tag.last_seen.getTime() > HEARTBEAT_WINDOW_MS) {
    throw new ApiError(409, "DEVICE_OFFLINE", "Perangkat offline. Gunakan pengaturan lewat Bluetooth.");
  }
  if (!tag.wifi_configurable) {
    throw new ApiError(409, "WIFI_FIRMWARE_REQUIRED", "Upload firmware yang mendukung pengaturan Wi-Fi dulu.");
  }
  const command = makeCommand(tagId, req.body ?? {});
  try {
    await DeviceWifiCommand.findOneAndUpdate(
      { _id: tagId, $or: [{ expires_at: { $lte: new Date() } }, { result: { $ne: null } }] },
      { $set: { ...command, result: null } },
      { upsert: true },
    );
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "WIFI_COMMAND_PENDING", "Perangkat masih menjalankan perintah Wi-Fi sebelumnya.");
    }
    throw err;
  }
  return sendSuccess(res, 202, { id: command.id });
});

const readWifiCommand = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const command = await DeviceWifiCommand.findOne({ _id: req.params.tagId, id: req.params.commandId })
    .select("result expires_at").lean();
  if (!command || command.expires_at <= new Date()) {
    throw new ApiError(404, "WIFI_COMMAND_EXPIRED", "Perangkat belum mengonfirmasi sebelum batas waktu.");
  }
  return sendSuccess(res, 200, command.result ?? { status: "pending" });
});

const prepareBluetoothCommand = asyncHandler(async (req, res) => {
  const { challenge } = req.body ?? {};
  if (typeof challenge !== "string" || !/^[a-f0-9]{32}$/.test(challenge)) {
    throw new ApiError(400, "INVALID_BLE_CHALLENGE", "Sambungkan ulang Bluetooth perangkat.");
  }
  const { id, packet } = makeCommand(req.params.tagId, req.body, challenge);
  return sendSuccess(res, 200, { id, packet });
});

async function wifiCommandForHeartbeat(tagId, result) {
  if (!process.env.DEVICE_API_KEY) return {};
  let acknowledgedId;
  if (result && typeof result.id === "string" && ["scanned", "connected", "failed"].includes(result.status)) {
    const outcome = { status: result.status };
    if (outcome.status === "scanned") {
      outcome.networks = (Array.isArray(result.networks) ? result.networks : []).slice(0, 12)
        .filter((network) => network && ssidIsValid(network.ssid))
        .map(({ ssid, secure }) => ({ ssid, secure: secure !== false }));
    }
    await DeviceWifiCommand.updateOne(
      { _id: tagId, id: result.id, result: null, expires_at: { $gt: new Date() } },
      { $set: { result: outcome }, $unset: { packet: 1 } },
    );
    acknowledgedId = result.id;
  }
  const next = await DeviceWifiCommand.findOne({ _id: tagId, result: null, expires_at: { $gt: new Date() } })
    .select("packet").lean();
  return { wifi_command: next?.packet, wifi_result_ack: acknowledgedId };
}

module.exports = { queueWifiCommand, readWifiCommand, prepareBluetoothCommand, wifiCommandForHeartbeat };
