#!/usr/bin/env node
import app from '../app.js';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import { connectToMongoDB } from '../db/connectToMongoDB.js';
import { registerChatGateway } from '../ws/chat.gateway.js';

const port = normalizePort(process.env.PORT || '4000');
app.set('port', port);

const server = http.createServer(app);

// Socket.IO cho UC-15 (Chat)
const io = new IOServer(server, { cors: { origin: '*' } });
registerChatGateway(io);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Kết nối DB sau khi start
connectToMongoDB();

function normalizePort(val) {
  const p = parseInt(val, 10);
  if (isNaN(p)) return val;
  if (p >= 0) return p;
  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') throw error;
  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
  switch (error.code) {
    case 'EACCES': console.error(bind + ' requires elevated privileges'); process.exit(1);
    case 'EADDRINUSE': console.error(bind + ' is already in use'); process.exit(1);
    default: throw error;
  }
}

function onListening() {
  const addr = server.address();
  const host = typeof addr === 'string' ? addr : (addr.address === '::' ? 'localhost' : addr.address);
  const prt = typeof addr === 'string' ? '' : addr.port;
  console.log(`Server started on http://${host}:${prt}`);
}
