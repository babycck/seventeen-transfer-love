import { MEMBERS, GS, saveGame, showToast, escHtml } from '../core.js';
import { generateTheater } from '../game-engine.js';

export function showTheaterModal() {
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) return;

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  renderTheaterList(overlay, member);

  document.body.appendChild(overlay);

  closeOnOverlay(overlay);
}

function renderTheaterList(overlay, member) {
  var theaterHistory = GS.theaterHistory || [];
  var listHtml = '';

  if (theaterHistory.length === 0) {
    listHtml = '<div style="text-align:center;color:var(--text-muted);padding:40px 0;font-size:13px">还没有番外故事 🎭<br>点击下方按钮生成</div>';
  } else {
    for (var i = theaterHistory.length - 1; i >= 0; i--) {
      var t = theaterHistory[i];
      listHtml += '<div class="oneheart-theater-item" data-idx="' + i + '">' +
        '<div class="oneheart-theater-item-title">🎭 ' + escHtml(t.title || '番外') + '</div>' +
        '<div class="oneheart-theater-item-time">' + escHtml(t.timestamp || '') + '</div></div>';
    }
  }

  overlay.innerHTML = '<div class="modal-content" style="width:92%;max-width:420px">' +
    '<button class="modal-close-x" id="theaterModalClose">✕</button>' +
    '<h3 style="text-align:center;margin-bottom:12px">🎭 剧场 · 番外故事</h3>' +
    '<div class="oneheart-theater-list">' + listHtml + '</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">' +
    '<button class="quick-cmd" data-theme="婚后日常" style="flex:1 1 calc(50% - 6px)">💑 婚后日常</button>' +
    '<button class="quick-cmd" data-theme="校园IF" style="flex:1 1 calc(50% - 6px)">🏫 校园IF</button>' +
    '<button class="quick-cmd" data-theme="他的视角" style="flex:1 1 calc(50% - 6px)">👁 他的视角</button>' +
    '<button class="quick-cmd" data-theme="结局回忆" style="flex:1 1 calc(50% - 6px)">📖 结局回忆录</button>' +
    '<button class="quick-cmd" data-theme="情敌IF" style="flex:1 1 calc(50% - 6px)">🖤 情敌IF</button>' +
    '<button class="quick-cmd" data-theme="哥哥视角" style="flex:1 1 calc(50% - 6px)">👨 哥哥视角</button>' +
    '</div></div>';

  // Bind close
  var closeBtn = overlay.querySelector('#theaterModalClose');
  if (closeBtn) closeBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); overlay.remove(); });

  // Bind theater item clicks
  overlay.querySelectorAll('.oneheart-theater-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var idx = parseInt(this.dataset.idx);
      var theater = GS.theaterHistory[idx];
      if (!theater) return;
      showTheaterDetail(overlay, theater, member);
    });
  });

  // Bind generate buttons
  var _theaterStage = GS.oneHeartRomanceStage || 0;
  var _lockMap = { '他的视角': 1, '情敌IF': 1, '婚后日常': 2, '哥哥视角': 2 };
  overlay.querySelectorAll('[data-theme]').forEach(function(btn) {
    var _th = btn.dataset.theme;
    if (_lockMap[_th] !== undefined && _theaterStage < _lockMap[_th]) {
      btn.disabled = true;
      btn.style.opacity = '0.45';
      btn.title = '需' + (_lockMap[_th] === 1 ? '暧昧期' : '明确期') + '解锁';
      return;
    }
    btn.addEventListener('click', async function() {
      var theme = this.dataset.theme;
      var _origText = this.textContent;
      this.disabled = true;
      this.textContent = '⏳ 生成中...';
      var themePrompt = getTheaterPrompt(theme, member);
      var result = await generateTheater(themePrompt);
      if (result) {
        showToast('🎭 番外故事已生成');
        renderTheaterList(overlay, member);
      } else {
        showToast('⚠️ 生成失败，请稍后重试');
        this.disabled = false;
        this.textContent = _origText;
      }
    });
  });
}

function showTheaterDetail(overlay, theater, member) {
  overlay.innerHTML = '<div class="modal-content" style="width:92%;max-width:420px">' +
    '<button class="modal-close-x" id="theaterDetailBack">←</button>' +
    '<h3 style="text-align:center;margin-bottom:12px">🎭 ' + escHtml(theater.title || '番外') + '</h3>' +
    '<div class="oneheart-theater-content">' + escHtml(theater.content || '') + '</div></div>';

  var backBtn = overlay.querySelector('#theaterDetailBack');
  if (backBtn) backBtn.addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation();
    renderTheaterList(overlay, member);
  });
  closeOnOverlay(overlay);
}

function getTheaterPrompt(theme, member) {
  var prompts = {
    '婚后日常': '你和' + member.name + '的婚后日常生活片段。温馨甜蜜的某个周末早晨或傍晚。约1000字。',
    '校园IF': '平行世界设定：你和' + member.name + '是大学同学。描写一次图书馆偶遇或社团活动中的心动瞬间。约1000字。',
    '他的视角': '以' + member.name + '的第一人称视角，描写他眼中的你——从初见到心动的某个瞬间。约1000字。',
    '结局回忆录': '多年后，' + member.name + '回忆起你们的相遇——关于命运、选择和那个改变一切的瞬间。约1000字。',
    '情敌IF': '平行世界设定：你最终选择了情敌「' + ((GS.oneHeartRival && GS.oneHeartRival.name) || '他') + '」。以他的第一人称视角，描写他赢得你心意后的心境——从暗暗喜欢到终于靠近的某个瞬间。约1000字。',
    '哥哥视角': '以你哥哥「' + ((GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name) || '哥哥') + '」的第一人称视角，描写他作为妹妹的哥哥、也是男主队友的双重身份——看着妹妹和队友走到一起，他的欣慰、调侃与默默守护。约1000字。'
  };
  return prompts[theme] || '一段你和' + member.name + '的日常温馨片段。约1000字。';
}

function closeOnOverlay(overlay) {
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
}
