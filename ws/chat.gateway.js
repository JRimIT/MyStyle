export function registerChatGateway(io) {
  io.on('connection', (socket) => {
    socket.join('public');
    socket.on('message', (msg) => {
      const safe = String(msg).replaceAll('<','&lt;').replaceAll('>','&gt;');
      io.to('public').emit('message', safe);
    });
  });
}
