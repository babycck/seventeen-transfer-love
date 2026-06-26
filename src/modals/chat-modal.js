import { MEMBERS, GS, saveGame, showLoading, hideLoading, showToast, escHtml } from '../core.js';
import { sendChatMessage } from '../game-engine.js';

export function showChatModal() {
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) return;

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  var memberName = member.name;
  var memberEmoji = member.emoji;

  var messagesHtml = '';
  var chatHistory = GS.chatHistory || [];
  for (var i = 0; i < chatHistory.length; i++) {
    var c = chatHistory[i];
    if (c.role === 'user') {
      messagesHtml += '<div class="oneheart-chat-msg user">' + escHtml(c.content) + '</div>';
    } else {
      messagesHtml += '<div class="oneheart-chat-msg ai">' + escHtml(c.content) + '</div>';
    }
  }
  if (messagesHtml === '') {
    messagesHtml = '<div style="text-align:center;color:var(--text-muted);padding:40px 0;font-size:13px">开始和 ' + memberName + ' 聊天吧 💬</div>';
  }

  overlay.innerHTML = '<div class="modal-content" style="width:92%;max-width:420px;padding:0;overflow:hidden;border-radius:16px">' +
    '<button class="modal-close-x" id="chatModalClose">✕</button>' +
    '<div class="oneheart-chat-modal">' +
    '<div class="oneheart-chat-header">' +
    '<span class="oneheart-chat-avatar">' + memberEmoji + '</span>' +
    '<span class="oneheart-chat-name">' + escHtml(memberName) + '</span>' +
    '</div>' +
    '<div class="oneheart-chat-messages" id="chatMessages">' + messagesHtml + '</div>' +
    '<div class="oneheart-chat-input-area">' +
    '<input class="oneheart-chat-input" id="chatInput" placeholder="输入消息..." autofocus>' +
    '<button class="oneheart-chat-send" id="chatSendBtn">发送</button>' +
    '</div></div></div>';

  document.body.appendChild(overlay);

  var closeBtn = document.getElementById('chatModalClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation(); overlay.remove();
    });
  }
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });

  var chatInput = document.getElementById('chatInput');
  var chatSend = document.getElementById('chatSendBtn');
  var chatMessages = document.getElementById('chatMessages');

  function scrollToBottom() {
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  setTimeout(scrollToBottom, 50);

  async function doSend() {
    var text = (chatInput.value || '').trim();
    if (!text) return;
    chatInput.value = '';
    chatInput.disabled = true;
    chatSend.disabled = true;

    // Show user message
    var userDiv = document.createElement('div');
    userDiv.className = 'oneheart-chat-msg user';
    userDiv.textContent = text;
    chatMessages.appendChild(userDiv);

    // Show typing indicator
    var typingDiv = document.createElement('div');
    typingDiv.className = 'oneheart-chat-typing';
    typingDiv.textContent = memberName + ' 正在输入...';
    chatMessages.appendChild(typingDiv);
    scrollToBottom();

    // Send to AI
    var reply = await sendChatMessage(text);
    chatMessages.removeChild(typingDiv);

    if (reply) {
      var aiDiv = document.createElement('div');
      aiDiv.className = 'oneheart-chat-msg ai';
      aiDiv.textContent = reply;
      chatMessages.appendChild(aiDiv);
    } else {
      var errDiv = document.createElement('div');
      errDiv.className = 'oneheart-chat-msg ai';
      errDiv.textContent = '（对方没有回应）';
      chatMessages.appendChild(errDiv);
    }

    chatInput.disabled = false;
    chatSend.disabled = false;
    chatInput.focus();
    scrollToBottom();
  }

  chatSend.addEventListener('click', doSend);
  chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });
}
