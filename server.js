require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

async function start() {
  await connectDB();

  app.listen(PORT, HOST, () => {
    console.log(`[SERVER] TANDAIN Backend berjalan di http://localhost:${PORT}`);
    console.log(`[SERVER] Perangkat LAN dapat mengakses port ${PORT} pada IP laptop.`);
    console.log(`[SERVER] Coba: GET http://localhost:${PORT}/api/health`);
  });
}

start();
