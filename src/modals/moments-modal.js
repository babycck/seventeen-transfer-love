import { MEMBERS, GS, saveGame, showToast, escHtml } from '../core.js';
import { generateMoment } from '../game-engine.js';

export function showMomentsModal() {
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) return;
  GS._newMoments = false;

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  var hpName = GS.heroineProfile ? GS.heroineProfile.name : '';
  var memberName = member.name;

  var moments = GS.moments || [];
  var momentsHtml = '';

  if (moments.length === 0) {
    momentsHtml = '<div style="text-align:center;color:var(--text-muted);padding:40px 0;font-size:13px">还没有朋友圈动态 📸<br>继续剧情会自然生成</div>';
  } else {
    for (var i = moments.length - 1; i >= 0; i--) {
      var m = moments[i];
      var posterName = m.name;
      if (!posterName) {
        // 旧格式动态（无 name 字段）→ 女主发 post，成员回复
        posterName = hpName;
      }
      var replyName = posterName === memberName ? hpName : memberName;
      momentsHtml += '<div class="oneheart-moment-card">' +
        '<div class="oneheart-moment-time">' + escHtml(m.timestamp || '') + '</div>' +
        '<div class="oneheart-moment-content"><strong>[' + escHtml(posterName) + ']</strong> ' + escHtml(m.post || '') + '</div>' +
        (m.reply ? '<div class="oneheart-moment-reply">└ <strong>[' + escHtml(replyName) + ']</strong> ' + escHtml(m.reply) + '</div>' : '') +
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
        overlay.remove();
        showMomentsModal();
      } else {
        showToast('⚠️ 生成失败，请稍后重试');
      }
      this.disabled = false;
      this.textContent = '🔄 刷新动态';
    });
  }
}
