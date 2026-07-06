const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// In-memory store (for demo only)
const conversations = {
  'keys': {
    id: 'keys',
    title: 'Found: Dorm Keys',
    subtitle: 'Chatting with Alex River',
    icon: 'vpn_key',
    userId: 'user-alex',
    phone: '+1234567890',
    messages: [
      { id: 'm1', from: 'user-alex', from_name: 'Alex River', text: 'Hi! I think those might be mine.', time: Date.now(), delivered: true, seen: false }
    ],
    participants: ['user-me','user-alex']
  },
  'bottle': {
    id: 'bottle',
    title: 'Found: Water Bottle',
    subtitle: 'Chatting with Sam Taylor',
    icon: 'water_drop',
    userId: 'user-sam',
    phone: null,
    messages: [],
    participants: ['user-me','user-sam']
  }
};

// REST endpoints
app.get('/api/chats', (req, res) => {
  const list = Object.values(conversations).map(c => ({ id: c.id, title: c.title, subtitle: c.subtitle, icon: c.icon, userId: c.userId, phone: c.phone, last_message: c.messages[c.messages.length-1] || null, unread: 0 }));
  res.json(list);
});

app.get('/api/chats/:id/messages', (req, res) => {
  const id = req.params.id;
  const conv = conversations[id];
  if (!conv) return res.status(404).json({ error: 'Not found' });
  res.json(conv.messages);
});

app.post('/api/chats/:id/messages', (req, res) => {
  const id = req.params.id;
  const conv = conversations[id];
  if (!conv) return res.status(404).json({ error: 'Not found' });
  const { from, from_name, text } = req.body;
  const msg = { id: 'm' + Date.now(), from, from_name, text, time: Date.now(), delivered: false, seen: false };
  conv.messages.push(msg);
  // emit to participants via socket
  io.to(id).emit('chat.message', { chatId: id, message: text, from, from_name });
  // simulate delivered
  setTimeout(() => io.to(id).emit('chat.delivered', { chatId: id, messageId: msg.id }), 300);
  res.status(201).json(msg);
});

// Socket.io handlers
io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('chat.join', ({ chatId }) => {
    socket.join(chatId);
    console.log(socket.id, 'joined', chatId);
  });

  socket.on('chat.message', ({ chatId, message }) => {
    // for demo, assume sender id stored on socket
    const from = socket.handshake.query.userId || 'user-unknown';
    const from_name = socket.handshake.query.name || 'Unknown';
    const msg = { id: 'm'+Date.now(), from, from_name, text: message, time: Date.now(), delivered: false, seen: false };
    if (conversations[chatId]) conversations[chatId].messages.push(msg);
    // broadcast to room
    socket.to(chatId).emit('chat.message', { chatId, message, from, from_name });
    // emit delivered back to sender
    socket.emit('chat.delivered', { chatId, messageId: msg.id });
  });

  socket.on('chat.seen', ({ chatId }) => {
    socket.to(chatId).emit('chat.seen', { chatId });
  });

  socket.on('presence.set', ({ userId, online }) => {
    socket.broadcast.emit('presence', { userId, online });
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => console.log('Socket server running on', PORT));
