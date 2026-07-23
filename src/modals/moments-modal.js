import { MEMBERS, GS, saveGame, showToast, escHtml, callDeepSeek } from '../core.js';
import { generateMoment } from '../game-engine.js';

export function showMomentsModal() {
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) return;
  GS._newMoments = false;
  var _oldDot = document.querySelector('.oneheart-tab[data-tab="moments"] .tab-notification-dot');
  if (_oldDot) _oldDot.remove();

  var hpName = GS.heroineProfile ? GS.heroineProfile.name : '';
  var memberName = member.name;

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
      var posterName = m.name || hpName;
      var replyName = posterName === memberName ? hpName : memberName;
      var photoHtml = m.photo ? '<div style="background:#f0eef5;border-radius:8px;padding:8px 10px;margin:6px 0;font-size:12px;color:#666">📷 ' + escHtml(m.photo) + '</div>' : '';
      var likeColor = m.liked ? '#ff6b9d' : 'var(--text-muted)';
      momentsHtml += '<div class="oneheart-moment-card" data-idx="' + i + '">' +
        '<div class="oneheart-moment-time">' + escHtml(m.timestamp || '') + ' · ' + (m.type || '日常') + '</div>' +
        '<div class="oneheart-moment-content"><strong>[' + escHtml(posterName) + ']</strong> ' + escHtml(m.post || '') + '</div>' +
        photoHtml +
        (m.reply ? '<div class="oneheart-moment-reply">└ <strong>[' + escHtml(replyName) + ']</strong> ' + escHtml(m.reply) + '</div>' : '') +
        (m.replyBack ? '<div class="oneheart-moment-reply" style="padding-left:16px">└↩ <strong>[' + escHtml(posterName) + ']</strong> ' + escHtml(m.replyBack) + '</div>' : '') +
        (m.userComment ? '<div class="oneheart-moment-reply" style="padding-left:16px">└↪ <strong>[我]</strong> ' + escHtml(m.userComment) + '</div>' : '') +
        (m.commentReply ? '<div class="oneheart-moment-reply" style="padding-left:16px">└↪ <strong>[' + escHtml(memberName) + ']</strong> ' + escHtml(m.commentReply) + '</div>' : '') +
        (m.rivalComment ? '<div class="oneheart-moment-reply" style="padding-left:16px;color:#e08e45">└😼 <strong>[' + escHtml((GS.oneHeartRival && GS.oneHeartRival.name) || '情敌') + ']</strong> ' + escHtml(m.rivalComment) + '</div>' : '') +
        '<div style="display:flex;gap:12px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border-light)" class="moment-actions">' +
        '<button class="moment-like-btn" data-idx="' + i + '" style="border:none;background:none;font-size:12px;cursor:pointer;color:' + likeColor + ';padding:2px 4px">❤️ ' + (m.liked ? '已赞' : '点赞') + '</button>' +
        '<button class="moment-comment-btn" data-idx="' + i + '" style="border:none;background:none;font-size:12px;cursor:pointer;color:var(--text-muted);padding:2px 4px">💬 评论</button>' +
        '</div></div>';
    }
  }

  overlay.innerHTML = '<div class="modal-content" style="width:92%;max-width:420px;display:flex;flex-direction:column;height:80vh">' +
    '<button class="modal-close-x" id="momentsModalClose">✕</button>' +
    '<h3 style="text-align:center;margin-bottom:12px">📸 朋友圈</h3>' +
    '<div style="flex:1;overflow-y:auto;min-height:0;padding:0 2px">' + momentsHtml + '</div>' +
    '<div style="display:flex;gap:6px;padding:8px 0 0;border-top:1px solid var(--border-light);flex-shrink:0">' +
    '<input id="momentSelfInput" type="text" placeholder="写一条动态…" style="flex:1;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:8px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box" />' +
    '<button id="momentSelfPostBtn" style="padding:8px 14px;border:none;border-radius:8px;background:var(--accent-primary);color:#fff;font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap">发送</button>' +
    '<button id="momentsRefreshBtn" style="padding:8px 12px;border:1px solid var(--border-primary);border-radius:8px;background:var(--bg-card);font-size:12px;cursor:pointer;font-family:inherit">🔄</button>' +
    '</div></div>';

  document.body.appendChild(overlay);

  var closeBtn = document.getElementById('momentsModalClose');
  if (closeBtn) closeBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); overlay.remove(); });
  overlay.addEventListener('click', function(e) { if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); } });

  // 点赞
  overlay.querySelectorAll('.moment-like-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(this.dataset.idx);
      var m = GS.moments && GS.moments[idx];
      if (!m) return;
      m.liked = !m.liked;
      if (m.liked) { var _mid = GS.oneHeartMember; if (_mid) { if (!GS.affection[_mid]) GS.affection[_mid] = 0; GS.affection[_mid] += 1; } }
      saveGame();
      overlay.remove();
      showMomentsModal();
    });
  });

  // 评论
  overlay.querySelectorAll('.moment-comment-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var idx = parseInt(this.dataset.idx);
      var m = GS.moments && GS.moments[idx];
      if (!m) return;
      var comment = await new Promise(function(resolve) {
        var _io = document.createElement('div');
        _io.className = 'modal-overlay';
        _io.innerHTML = '<div class="modal-content" style="max-width:340px;text-align:center">' +
          '<h3>✍️ 写下你的评论</h3>' +
          '<textarea id="commentInput" style="width:100%;min-height:80px;padding:10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:13px;resize:vertical;background:var(--bg-card);color:var(--text-primary);font-family:inherit;margin:12px 0;box-sizing:border-box" placeholder="写下你对这条动态的评论..." maxlength="200"></textarea>' +
          '<div style="display:flex;gap:8px">' +
          '<button id="commentSubmit" class="btn-primary" style="flex:1">发送</button>' +
          '<button id="commentCancel" class="btn-secondary" style="flex:1">取消</button></div></div>';
        document.body.appendChild(_io);
        _io.querySelector('#commentSubmit').addEventListener('click', function() {
          var val = _io.querySelector('#commentInput').value;
          _io.remove();
          resolve(val);
        });
        _io.querySelector('#commentCancel').addEventListener('click', function() {
          _io.remove();
          resolve('');
        });
        _io.addEventListener('click', function(e) {
          if (e.target === _io) { _io.remove(); resolve(''); }
        });
      });
      if (!comment || !comment.trim()) return;
      var posterName2 = m.name || hpName;
      var replyName2 = posterName2 === memberName ? hpName : memberName;
      this.disabled = true;
      this.textContent = '⏳ 评论中...';
      try {
        var res = await callDeepSeek(
          (posterName2 === memberName ? hpName : memberName) + '评论了"' + posterName2 + '"的动态："' + m.post + '"\n' +
          '评论内容：' + comment.trim() + '\n请以' + (posterName2 === memberName ? hpName : memberName) + '的身份回复这条评论（20字以内）。\n输出JSON：{"reply":"回复内容"}',
          '生成回复', 200, false, 0.8
        );
        var parsed;
        try { parsed = JSON.parse(res); } catch (e) { var mm = res.match(/\{[\s\S]*\}/); if (mm) parsed = JSON.parse(mm[0]); }
        if (parsed && parsed.reply) {
          m.userComment = comment.trim();
          m.commentReply = parsed.reply;
          saveGame();
        }
      } catch (e) {}
      overlay.remove();
      showMomentsModal();
    });
  });

  // 刷新
  document.getElementById('momentsRefreshBtn').addEventListener('click', async function() {
    this.disabled = true; this.textContent = '⏳';
    var result = await generateMoment();
    if (result) { showToast('📸 新动态已生成'); } else { showToast('⚠️ 生成失败'); }
    overlay.remove(); showMomentsModal();
  });

  // 自己发动态
  document.getElementById('momentSelfPostBtn').addEventListener('click', async function() {
    var input = document.getElementById('momentSelfInput');
    if (!input || !input.value.trim()) { showToast('请输入动态内容'); return; }
    var text = input.value.trim();
    this.disabled = true; this.textContent = '⏳';
    try {
      var res = await callDeepSeek(
        hpName + '发了条朋友圈："' + text + '"\n请以' + memberName + '的身份评论这条动态（15字以内）。\n输出JSON：{"reply":"评论内容"}',
        '生成回复', 200, false, 0.8
      );
      var parsed;
      try { parsed = JSON.parse(res); } catch (e) { var mm = res.match(/\{[\s\S]*\}/); if (mm) parsed = JSON.parse(mm[0]); }
      if (!GS.moments) GS.moments = [];
      GS.moments.push({
        id: 'moment_self_' + Date.now(),
        name: hpName,
        post: text,
        reply: (parsed && parsed.reply) ? parsed.reply : '',
        photo: '',
        type: '日常',
        timestamp: GS.currentDate ? GS.currentDate.month + '月' + GS.currentDate.day + '日' : '',
        liked: false
      });
      GS._newMoments = true;
      saveGame();
    } catch (e) {}
    overlay.remove(); showMomentsModal();
  });
}
