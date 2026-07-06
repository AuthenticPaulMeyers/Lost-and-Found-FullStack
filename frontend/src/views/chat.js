import { state } from '../state.js';
import { initSocketForChat as initSocket, on as onSocket, sendMessage, joinChat, markSeen } from '../socket.js';
import { api } from '../api.js';
import { showToast } from '../toast.js';

export default {
  async render(params, query) {
    return `
      <div class="max-w-7xl mx-auto my-6 px-4 md:px-8 animate-fade-in">
        <div class="h-[calc(100vh-12rem)] min-h-[500px] w-full flex bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <!-- Sidebar: Conversations List -->
          <aside class="w-80 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 shrink-0">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800">
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input id="chat-search" class="w-full rounded-xl bg-slate-50 border-none py-2 pl-9 pr-4 text-xs focus:ring-2 focus:ring-primary/20" placeholder="Search chats..." type="text"/>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto" id="chat-threads-list">
              <!-- Conversation Threads -->
              <div class="chat-thread-item flex cursor-pointer items-center gap-3 border-l-4 border-primary bg-primary/5 p-4 transition-colors" data-chat-id="keys">
                <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <span class="material-symbols-outlined text-slate-400 text-2xl absolute inset-0 flex items-center justify-center bg-slate-200/50">vpn_key</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <p class="truncate text-xs font-bold text-slate-800 dark:text-white">Dorm Keys</p>
                    <span class="text-[9px] text-slate-400" id="thread-time-keys">2:14 PM</span>
                  </div>
                  <p class="truncate text-[11px] text-slate-500" id="thread-preview-keys">Yes, they do! I found them near...</p>
                </div>
              </div>

              <div class="chat-thread-item flex cursor-pointer items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" data-chat-id="bottle">
                <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <span class="material-symbols-outlined text-slate-400 text-2xl absolute inset-0 flex items-center justify-center bg-slate-200/50">water_drop</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <p class="truncate text-xs font-bold text-slate-800 dark:text-white">Water Bottle</p>
                    <span class="text-[9px] text-slate-400">Yesterday</span>
                  </div>
                  <p class="truncate text-[11px] text-slate-500">Is it the blue Hydroflask?</p>
                </div>
              </div>
            </div>
          </aside>

          <!-- Chat Window -->
          <section class="flex flex-1 flex-col bg-white dark:bg-slate-950">
            <!-- Item-Context Header -->
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 shadow-sm z-10 shrink-0">
              <div class="flex items-center gap-4">
                <div class="h-10 w-10 overflow-hidden rounded-lg border border-slate-200 shrink-0 flex items-center justify-center bg-slate-50 text-slate-500">
                  <span class="material-symbols-outlined" id="chat-header-icon">vpn_key</span>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-bold text-slate-800 dark:text-white" id="chat-header-title">Found: Dorm Keys</h3>
                    <span class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-700">Active</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span id="chat-header-subtitle">Chatting with Alex River</span>
                    <span class="flex items-center gap-0.5 text-primary font-bold">
                      <span class="material-symbols-outlined text-[12px]">verified</span> Verified Student
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Message Feed -->
            <div class="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/30 p-6 space-y-4" id="chat-message-feed">
              <!-- Rendered dynamically -->
            </div>

            <!-- Message Input Area -->
            <div class="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shrink-0">
              <form id="form-chat-input" class="mx-auto flex max-w-4xl items-center gap-3">
                <div class="relative flex-1">
                  <input id="chat-message-input" autocomplete="off" class="w-full rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 py-2.5 pl-5 pr-12 text-xs focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" placeholder="Type a message..." type="text"/>
                  <button type="submit" class="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95 shadow-sm">
                    <span class="material-symbols-outlined text-sm">send</span>
                  </button>
                </div>
              </form>
              <div class="mt-2 text-center">
                <p class="text-[10px] text-slate-400">Remember to meet in a public campus area for safety.</p>
              </div>
            </div>
          </section>

          <!-- Right Detail Panel (Safety tips) -->
          <aside class="hidden xl:flex w-60 flex-col border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shrink-0">
            <h4 class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Safety Guidelines</h4>
            <ul class="space-y-4">
              <li class="flex gap-2">
                <span class="material-symbols-outlined text-primary text-sm shrink-0">groups</span>
                <p class="text-[11px] text-slate-600 dark:text-slate-300">Meet in public spaces (e.g. Student Union lobby).</p>
              </li>
              <li class="flex gap-2">
                <span class="material-symbols-outlined text-primary text-sm shrink-0">light_mode</span>
                <p class="text-[11px] text-slate-600 dark:text-slate-300">Schedule meetups during daylight hours.</p>
              </li>
              <li class="flex gap-2">
                <span class="material-symbols-outlined text-primary text-sm shrink-0">shield_person</span>
                <p class="text-[11px] text-slate-600 dark:text-slate-300">Do not exchange passwords or login codes.</p>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    `;
  },

  async afterRender(params, query) {
    const feed = document.getElementById('chat-message-feed');
    const input = document.getElementById('chat-message-input');
    const form = document.getElementById('form-chat-input');
    const threadItems = document.querySelectorAll('.chat-thread-item');

    const chatHeaderTitle = document.getElementById('chat-header-title');
    const chatHeaderSubtitle = document.getElementById('chat-header-subtitle');
    const chatHeaderIcon = document.getElementById('chat-header-icon');

    // conversations loaded from backend
    const conversations = {};

    // Add unread counts
    Object.keys(conversations).forEach(k => conversations[k].unread = 0);

    let activeChatId = null;

    // If the router passed a `user` query param (from item view), open or create a conversation
    if (query && query.user) {
      try {
        const res = await api.post('/api/chat/get_or_create/', { user_id: query.user, item_id: query.item || null });
        if (res.ok) {
          const data = await res.json();
          const chatId = data.chatId;
          // normalize messages from server format to UI format
          const msgs = (data.messages || []).map(m => ({
            sender: (m.sender_id === state.user?.id) ? 'me' : 'them',
            name: m.sender_name,
            text: m.text,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            id: m.id,
            sender_id: m.sender_id,
            delivered: m.delivered,
            seen: m.seen,
          }));
          const other = data.other || null;
          conversations[chatId] = { title: other ? other.name : 'Chat', subtitle: '', icon: other && other.avatar ? other.avatar : 'chat_bubble', userId: query.user, messages: msgs, unread: 0, other };
          activeChatId = chatId;
        } else {
          console.error('Failed to get or create chat', res.status);
        }
      } catch (e) {
        console.error('Chat get_or_create error', e);
      }
    }

    const renderThreadList = () => {
      const container = document.getElementById('chat-threads-list');
      container.innerHTML = Object.keys(conversations).map(id => {
        const c = conversations[id];
        const badge = c.unread > 0 ? `<span class="ml-2 text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">${c.unread}</span>` : '';
        return `
          <div class="chat-thread-item flex cursor-pointer items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" data-chat-id="${id}">
            <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              ${c.other && c.other.avatar ? `<img src="${c.other.avatar}" class="w-full h-full object-cover"/>` : `<span class="material-symbols-outlined text-slate-400 text-2xl absolute inset-0 flex items-center justify-center bg-slate-200/50">${c.icon}</span>`}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p class="truncate text-xs font-bold text-slate-800 dark:text-white">${c.title}</p>
                <span class="text-[9px] text-slate-400" id="thread-time-${id}">--</span>
              </div>
              <p class="truncate text-[11px] text-slate-500" id="thread-preview-${id}">${(c.messages.length && c.messages[c.messages.length-1].text) || ''}</p>
            </div>
            ${badge}
          </div>
        `;
      }).join('');

      // rebind events
      const items = document.querySelectorAll('.chat-thread-item');
      items.forEach(item => item.addEventListener('click', () => {
        items.forEach(i => i.classList.remove('border-l-4','border-primary','bg-primary/5'));
        item.classList.add('border-l-4','border-primary','bg-primary/5');
        selectChat(item.dataset.chatId);
      }));
    };

    const renderMessages = () => {
      const chat = conversations[activeChatId];
      if (!chat) return;

      feed.innerHTML = `
        <div class="flex justify-center my-2">
          <span class="rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-[10px] font-semibold text-slate-400 shadow-sm uppercase tracking-wider">Today</span>
        </div>
      `;

      // ensure every message has sender_id for deterministic rendering
      chat.messages = chat.messages.map(m => {
        if (!m.sender_id) {
          m.sender_id = (m.sender === 'me') ? state.user?.id : m.sender_id || null;
        }
        return m;
      });

      chat.messages.forEach(msg => {
        const isMine = (state.user && msg.sender_id && state.user.id && (String(msg.sender_id) === String(state.user.id))) || msg.sender === 'me';
        if (!isMine) {
          // recipient message: left aligned (full-width wrapper ensures left placement), no avatar or username
          feed.innerHTML += `
            <div class="w-full flex justify-start animate-fade-in">
              <div class="max-w-[85%]">
                <div class="rounded-2xl rounded-bl-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 text-xs text-slate-800 dark:text-slate-200 shadow-sm">
                  ${msg.text}
                </div>
                <div class="mt-1 text-[9px] text-slate-400">${msg.time}</div>
              </div>
            </div>
          `;
        } else {
          // Determine tick icon based on delivery/online/seen status
          const partnerOnline = chat.partnerOnline;
          let icon = 'schedule';
          let color = 'slate-400';
          if (msg._status === 'sending') {
            icon = 'schedule'; color = 'slate-400';
          } else if (msg.seen) {
            icon = 'done_all'; color = 'green';
          } else if (msg._status === 'delivered') {
            if (partnerOnline) { icon = 'done_all'; color = 'primary'; }
            else { icon = 'done'; color = 'slate-400'; }
          }
          feed.innerHTML += `
            <div class="w-full flex justify-end animate-fade-in">
              <div class="max-w-[85%] text-right">
                <div class="rounded-2xl rounded-br-none bg-primary p-3.5 text-xs text-white shadow-md shadow-primary/10 inline-block">
                  ${msg.text}
                </div>
                <div class="mt-1 text-[9px] text-slate-400 flex items-center justify-end gap-0.5">${msg.time} <span class="material-symbols-outlined text-${color} text-xs">${icon}</span></div>
              </div>
            </div>
          `;
        }
      });

      // Scroll to bottom
      feed.scrollTop = feed.scrollHeight;
    };

    const selectChat = (chatId) => {
      activeChatId = chatId;
      const chat = conversations[chatId];
      if (!chat) return;

      // Update header details
      chatHeaderTitle.innerText = chat.title;
      chatHeaderSubtitle.innerText = chat.subtitle || (chat.other ? `Chatting with ${chat.other.name}` : '');
      if (chat.other && chat.other.avatar) {
        chatHeaderIcon.innerHTML = `<img src="${chat.other.avatar}" alt="avatar" class="w-full h-full object-cover">`;
      } else {
        chatHeaderIcon.innerText = chat.icon || 'chat_bubble';
      }

      // Load messages from API if none present
      (async () => {
        if ((!chat.messages || chat.messages.length === 0) && chatId) {
          try {
            const res = await api.get(`/api/chat/${chatId}/messages/`);
            if (res.ok) {
              const msgs = await res.json();
              chat.messages = msgs.map(m => ({ sender: (m.sender_id === state.user?.id) ? 'me' : 'them', name: m.sender_name, text: m.text, time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), id: m.id, sender_id: m.sender_id, delivered: m.delivered, seen: m.seen }));
            }
          } catch (e) { console.error('Failed to load messages', e); }
        }
        renderMessages();
        // If there are messages from the other user, mark the latest as seen
        const lastMsg = chat.messages && chat.messages[chat.messages.length - 1];
        if (lastMsg && lastMsg.sender === 'them' && !lastMsg.seen) {
          try { markSeen(chatId, lastMsg.id); } catch (e) { /* ignore */ }
        }
      })();
      // join WS for this chat and clear unread
      try { joinChat(chatId); } catch (e) { /* ignore */ }
      chat.unread = 0;
      renderThreadList();
    };

    // Fetch conversation list from backend and render threads
    try {
      const listRes = await api.get('/api/chat/');
      if (listRes.ok) {
        const list = await listRes.json();
        list.forEach(c => {
          if (!conversations[c.id]) {
            conversations[c.id] = { title: (c.other && c.other.name) || c.title || 'Chat', subtitle: c.subtitle || '', icon: (c.other && c.other.avatar) || c.icon || 'chat_bubble', userId: null, messages: [], unread: c.unread || 0, other: c.other || null };
          }
        });
      }
    } catch (e) { console.error('Failed to load chat list', e); }

    // Render dynamic thread list
    renderThreadList();

    // Initialize WebSocket handlers
    try {
      // incoming chat message
      onSocket('chat.message', (p) => {
        if (!p) return;
        const msg = p.message;
        const c = conversations[p.chatId] || (conversations[p.chatId] = { title: p.chatId, subtitle: '', icon: 'chat_bubble', messages: [], unread: 0, userId: msg.sender_id });
        // If the message is from me (sender), update local optimistic message instead of adding as 'them'
        if (msg.sender_id === state.user?.id) {
          // try mapping by temp_id first
          let local = c.messages.find(m => m.id === p.temp_id) || c.messages.find(m => m.id === msg.id);
          if (local) {
            local.id = msg.id;
            local._status = 'delivered';
            local.delivered = true;
            local.sender_id = msg.sender_id;
          } else {
            // not found: append as my message
            c.messages.push({ sender: 'me', text: msg.text, time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), id: msg.id, _status: 'delivered', delivered: msg.delivered, seen: msg.seen, sender_id: msg.sender_id });
          }
        } else {
          c.messages.push({ sender: 'them', name: msg.sender_name, text: msg.text, time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), id: msg.id, delivered: msg.delivered, seen: msg.seen, sender_id: msg.sender_id });
        }

        if (activeChatId !== p.chatId) {
          c.unread = (c.unread || 0) + 1;
          renderThreadList();
        } else {
          renderMessages();
              // Acknowledge seen for incoming messages from others
              if (msg.sender_id !== state.user?.id) markSeen(p.chatId, msg.id);
        }
      });

      // delivery ack (maps temp_id -> real id)
      onSocket('chat.delivered', (p) => {
        if (!p) return;
        const chat = conversations[p.chatId];
        if (!chat) return;
        // try temp_id first
        let msg = chat.messages.find(m => m.id === p.temp_id) || chat.messages.find(m => m.id === p.messageId);
        if (msg) {
          msg.id = p.messageId;
          msg._status = 'delivered';
          msg.delivered = true;
        }
        if (activeChatId === p.chatId) renderMessages();
      });

      

      // seen ack
      onSocket('chat.seen', (p) => {
        if (!p) return;
        const chat = conversations[p.chatId];
        if (!chat) return;
        chat.messages.forEach(m => { if (m.id === p.messageId) { m.seen = true; m._status = 'delivered'; } });
        if (activeChatId === p.chatId) renderMessages();
        // decrement unread for that chat if present
        if (chat.unread && chat.unread > 0) {
          chat.unread = Math.max(0, chat.unread - 1);
          renderThreadList();
        }
      });

      // presence updates
      onSocket('chat.presence', (p) => {
        if (!p) return;
        const chat = conversations[p.chatId];
        if (!chat) return;
        chat.partnerOnline = !!p.online;
        // Re-render header/status
        if (activeChatId === p.chatId) {
          // show active badge
          const activeBadge = document.querySelector('#chat-header-title + span');
          // not manipulating DOM deeply here; re-render messages to update ticks color
          renderMessages();
        }
      });
    } catch (e) { console.error('Socket init error', e); }

    // Handle sending message
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      const chat = conversations[activeChatId];
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Append my message with temp id for optimistic UI
      const temp_id = `temp-${Date.now()}`;
      const localMsg = { sender: 'me', text: text, time: now, _status: 'sending', id: temp_id, sender_id: state.user?.id };
      chat.messages.push(localMsg);
      // emit via socket with temp_id so server can ack with real id
      try { sendMessage(activeChatId, text, temp_id); } catch(e) { console.error(e); }

      input.value = '';
      renderMessages();

      // Update previews
      const previewEl = document.getElementById(`thread-preview-${activeChatId}`);
      if (previewEl) previewEl.innerText = text;
      const timeEl = document.getElementById(`thread-time-${activeChatId}`);
      if (timeEl) timeEl.innerText = now;

      // optimistic: update preview/time
      if (previewEl) previewEl.innerText = text;
      if (timeEl) timeEl.innerText = now;
    });

    // Search filter
    const searchInput = document.getElementById('chat-search');
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.chat-thread-item').forEach(el => {
        const title = el.querySelector('p')?.innerText.toLowerCase() || '';
        const preview = el.querySelector('p + p')?.innerText.toLowerCase() || '';
        el.style.display = (title.includes(q) || preview.includes(q)) ? '' : 'none';
      });
    });

    // Select initial chat (first available) if none active
    if (!activeChatId) {
      const keys = Object.keys(conversations);
      if (keys.length) activeChatId = keys[0];
    }
    if (activeChatId) selectChat(activeChatId);
  }
};
