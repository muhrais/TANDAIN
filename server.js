require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[SERVER] TANDAIN Backend berjalan di http://localhost:${PORT}`);
    console.log(`[SERVER] Coba: GET http://localhost:${PORT}/api/health`);
  });
}

start();
