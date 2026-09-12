/**
 * Helper untuk mengirim response sukses dengan format seragam
 * sesuai PRD bagian 6.3.2: { success: true, data: ... }
 */
function sendSuccess(res, statusCode, data) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

module.exports = { sendSuccess };
