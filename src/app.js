const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      message: "TANDAIN Backend API berjalan.",
      docs: "Lihat README.md untuk daftar endpoint.",
    },
  });
});

app.use("/api", routes);

// 404 untuk route yang tidak dikenali, lalu error handler global (harus paling akhir).
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
