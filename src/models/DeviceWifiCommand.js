const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  _id: String,
  id: { type: String, required: true },
  packet: String,
  result: mongoose.Schema.Types.Mixed,
  expires_at: { type: Date, required: true, expires: 0 },
}, { versionKey: false });

module.exports = mongoose.model("DeviceWifiCommand", schema);
