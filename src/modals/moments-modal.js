import { MEMBERS, GS, saveGame, showToast, escHtml } from '../core.js';
import { generateMoment } from '../game-engine.js';

export function showMomentsModal() {
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) return;

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  var moments = GS.moments || [];
  var momentsHtml = '';

  if (moments.length === 0) {
    momentsHtml = '<div style="text-align:center;color:var(--text-muted);padding:40px 0;font-size:13px">还没有朋友圈动态 📸<br>继续剧情会自然生成</div>';
  } else {
    for (var i = moments.length - 1; i >= 0; i--) {
      var m = moments[i];
      momentsHtml += '<div class="oneheart-moment-card">' +
        '<div class="oneheart-moment-time">' + escHtml(m.timestamp || '') + '</div>' +
        '<div class="oneheart-moment-content">' + escHtml(m.post || '') + '</div>' +
        (m.reply ? '<div class="oneheart-moment-reply"><span class="oneheart-moment-reply-label">' + escHtml(member.name) + '：</span>' + escHtml(m.reply) + '</div>' : '') +
        '</div>';
    }
  }

  overlay.innerHTML = '<div class="modal-content" style="width:92%;max-width:420px">' +
    '<button class="modal-close-x" id="momentsModalClose">✕</button>' +
    '<h3 style="text-align:center;margin-bottom:12px">📸 朋友圈</h3>' +
    '<div style="max-height:400px;overflow-y:auto">' + momentsHtml + '</div>' +
    '<button id="momentsRefreshBtn" style="width:100%;margin-top:10px;padding:8px;border:1px solid var(--border-primary);border-radius:8px;background:var(--bg-card);color:var(--text-secondary);cursor:pointer;font-size:12px;font-family:inherit">🔄 刷新动态</button></div>';

  document.body.appendChild(overlay);

  var closeBtn = document.getElementById('momentsModalClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation(); overlay.remove();
    });
  }
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });

  var refreshBtn = document.getElementById('momentsRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async function() {
      this.disabled = true;
      this.textContent = '⏳ 生成中...';
      var result = await generateMoment();
      if (result) {
        showToast('📸 新动态已生成');
        var container = this.parentElement.querySelector('div:first-child');
        var newCard = document.createElement('div');
        newCard.className = 'oneheart-moment-card';
        newCard.innerHTML = '<div class="oneheart-moment-time">' + escHtml(result.timestamp || '') + '</div>' +
          '<div class="oneheart-moment-content">' + escHtml(result.post || '') + '</div>' +
          (result.reply ? '<div class="oneheart-moment-reply"><span class="oneheart-moment-reply-label">' + escHtml(member.name) + '：</span>' + escHtml(result.reply) + '</div>' : '');
        if (container) container.insertBefore(newCard, container.firstChild);
      } else {
        showToast('⚠️ 生成失败，请稍后重试');
      }
      this.disabled = false;
      this.textContent = '🔄 刷新动态';
    });
  }
}
