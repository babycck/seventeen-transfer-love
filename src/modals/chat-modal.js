import { MEMBERS, GS, saveGame, showLoading, hideLoading, showToast, escHtml } from '../core.js';
import { sendChatMessage } from '../game-engine.js';

export function showChatModal() {
  GS._newChat = false;
  saveGame();
  var _oldDot = document.querySelector('.oneheart-tab[data-tab="chat"] .tab-notification-dot');
  if (_oldDot) _oldDot.remove();
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
    '<input class="oneheart-chat-input" id="chatInput" placeholder="输入消息...">' +
    '<button class="oneheart-chat-topic" id="chatTopicBtn" style="width:32px;height:32px;padding:0;border:none;border-radius:50%;background:var(--accent-primary);color:#fff;cursor:pointer;font-size:14px;line-height:32px;text-align:center;flex-shrink:0" title="话题引导">💡</button>' +
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

  // 💡 话题引导按钮
  var topicBtn = document.getElementById('chatTopicBtn');
  if (topicBtn) {
    topicBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      // 移除已有的话题面板
      var existing = document.getElementById('chatTopicPanel');
      if (existing) { existing.remove(); return; }
      var _aff = GS.affection[GS.oneHeartMember] || 0;
      var topics = ['今天过得怎么样', '最近在忙什么', '我喜欢你', '你在干嘛'];
      if (_aff >= 40) topics = topics.concat(['周末有空吗', '我们见面吧']);
      if (_aff >= 60) topics = topics.concat(['我想你了', '你觉得我们是什么关系']);
      if (GS.oneHeartColdWar && GS.oneHeartColdWar.active) topics = ['我们谈谈吧', '对不起', '你在生气吗'];
      if (GS.oneHeartRival && GS.oneHeartRival.name) topics.push('关于' + GS.oneHeartRival.name);
      var panel = document.createElement('div');
      panel.id = 'chatTopicPanel';
      panel.style.cssText = 'position:absolute;bottom:100%;left:0;right:0;background:var(--bg-card);border:1px solid var(--border-primary);border-radius:12px;padding:8px;z-index:10;display:flex;flex-wrap:wrap;gap:6px';
      for (var _ti = 0; _ti < topics.length; _ti++) {
        var chip = document.createElement('span');
        chip.textContent = topics[_ti];
        chip.style.cssText = 'padding:6px 10px;border-radius:16px;background:var(--bg-secondary);color:var(--text-primary);font-size:12px;cursor:pointer;white-space:nowrap';
        chip.addEventListener('click', function(t) {
          var input = document.getElementById('chatInput');
          if (input) { input.value = t; input.focus(); }
          var p = document.getElementById('chatTopicPanel');
          if (p) p.remove();
        }.bind(null, topics[_ti]));
        panel.appendChild(chip);
      }
      var inputArea = document.querySelector('.oneheart-chat-input-area');
      if (inputArea) {
        inputArea.style.position = 'relative';
        inputArea.appendChild(panel);
      }
    });
  }
}
