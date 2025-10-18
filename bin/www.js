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

const port = normalizePort(process.env.PORT || "4000");
app.set("port", port);

// HTTPS Options
const httpsOptions = {
  key: fs.readFileSync(`${__dirname}/key.pem`),
  cert: fs.readFileSync(`${__dirname}/cert.pem`),
};

// // Start server
// const server = https.createServer(httpsOptions, app);
// server.listen(port, () => {
//     console.log(✅ HTTPS Server running at https://localhost:${port});
// });
// server.on('error', onError);
// server.on('listening', () => onListening(server));

// Kết nối MongoDB rồi khởi chạy server
connectToMongoDB().then(() => {
  const server = https.createServer(httpsOptions, app);

  server.listen(port, () => {
    console.log(`HTTPS Server is running at https://localhost:${port}`);
  });

  server.on("error", (error) => onError(error, port));
  server.on("listening", () => onListening(server));
});

// Helpers
function normalizePort(val) {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
}

function onError(error) {
  if (error.syscall !== "listen") throw error;
  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
  switch (error.code) {
    case "EACCES":
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening(server) {
  const addr = server.address();
  const bind = typeof addr === "string" ? `pipe ${addr}` : `port ${addr.port}`;
  debug(`Listening on ${bind}`);
}
