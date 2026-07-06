import { state } from './state.js';

// Manage WebSocket connections per chatId (Channels consumer at /ws/chat/<chat_id>/)
const sockets = {};
const handlers = {};

function wsUrlForChat(chatId) {
  const host = window.location.hostname || 'localhost';
  const port = window.location.port || '8000';
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // Assume Django ASGI server is served on port 8000 in development
  const asgiPort = (port === '3000' || port === '3001') ? '8000' : port;
  return `${protocol}://${host}:${asgiPort}/ws/chat/${chatId}/`;
}

export function initSocketForChat(chatId) {
  if (sockets[chatId]) return sockets[chatId];
  try {
    const url = wsUrlForChat(chatId);
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => {
      console.info('WS connected', chatId);
      // send presence info
      ws.send(JSON.stringify({ action: 'presence', userId: state.user?.id }));
    });

    ws.addEventListener('message', (ev) => {
      try {
        const data = JSON.parse(ev.data);
        const evName = data.event;
        (handlers[evName] || []).forEach(fn => fn(data));
      } catch (e) { console.error('WS parse error', e); }
    });

    ws.addEventListener('close', () => console.info('WS closed', chatId));
    sockets[chatId] = ws;
    return ws;
  } catch (e) {
    console.error('initSocketForChat failed', e);
  }
}

export function on(event, cb) {
  handlers[event] = handlers[event] || [];
  handlers[event].push(cb);
  return () => { handlers[event] = handlers[event].filter(f => f !== cb); };
}

export function sendMessage(chatId, text, temp_id = null) {
  const ws = initSocketForChat(chatId);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    // wait briefly and retry
    setTimeout(() => sendMessage(chatId, text, temp_id), 200);
    return;
  }
  ws.send(JSON.stringify({ action: 'send', text, temp_id }));
}

export function joinChat(chatId) {
  initSocketForChat(chatId);
}

export function markSeen(chatId, messageId) {
  const ws = initSocketForChat(chatId);
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ action: 'seen', messageId }));
}
