// ✅ NẠP .env SỚM NHẤT (trước mọi import dùng process.env)
import "dotenv/config";

import app from "../app.js";
import https from "https";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import debugLib from "debug";

import { connectToMongoDB } from "../db/connectToMongoDB.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const debug = debugLib("https-facebook:server");

// Lấy PORT từ .env (mặc định 4000)
const port = normalizePort(process.env.PORT || "4000");
app.set("port", port);

// ✅ Đọc key/cert HTTPS (nếu thiếu thì log ra lỗi rõ ràng)
let httpsOptions;
try {
  httpsOptions = {
    key: fs.readFileSync(`${__dirname}/key.pem`),
    cert: fs.readFileSync(`${__dirname}/cert.pem`),
  };
} catch (e) {
  console.error("❌ Không tìm thấy key.pem/cert.pem trong bin/. Vui lòng cấp chứng chỉ hoặc đổi sang HTTP.");
  console.error("   Đang thoát để bạn kiểm tra lại…");
  process.exit(1);
}

// ✅ Kiểm tra cấu hình VNPay khi khởi động (để phát hiện sớm)
console.log("[BOOT VNPay ENV]", {
  TMNCODE: process.env.VNP_TMNCODE,
  HASHSECRET_PREFIX: (process.env.VNP_HASHSECRET || "").slice(0, 6),
  URL: process.env.VNP_URL,
  RETURN: process.env.VNP_RETURNURL,
  IPN: process.env.VNP_IPNURL,
});

// Kết nối MongoDB rồi khởi chạy server HTTPS
connectToMongoDB().then(() => {
  const server = https.createServer(httpsOptions, app);

  server.listen(port, () => {
    console.log(`✅ HTTPS Server running at https://localhost:${port}`);
  });

  server.on("error", (error) => onError(error, port));
  server.on("listening", () => onListening(server));
});

// Helpers
function normalizePort(val) {
  const p = parseInt(val, 10);
  if (isNaN(p)) return val;
  if (p >= 0) return p;
  return false;
}

function onError(error) {
  if (error.syscall !== "listen") throw error;
  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
  switch (error.code) {
    case "EACCES":
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
    case "EADDRINUSE":
      console.error(`${bind} is already in use`);
      process.exit(1);
    default:
      throw error;
  }
}

function onListening(server) {
  const addr = server.address();
  const bind = typeof addr === "string" ? `pipe ${addr}` : `port ${addr.port}`;
  debug(`Listening on ${bind}`);
}
