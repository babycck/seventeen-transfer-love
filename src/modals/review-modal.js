import { GS, escHtml, saveGame } from '../core.js';
import { MEMBERS } from '../data.js';
import { parseNarrative } from '../parser.js';

export function showReviewModal() {
  var isOneHeart = GS.gameMode === 'oneHeart';
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '200';

  // Tab 按钮
  var tabsHtml = '<div style="display:flex;gap:4px;margin-bottom:10px;flex-shrink:0">';
  if (isOneHeart) {
    tabsHtml += '<button class="tab-btn active" id="reviewTabSummary">📅 压缩记忆</button>' +
      '<button class="tab-btn" id="reviewTabPromises">📌 约定 (' + (GS.oneHeartPromises || []).filter(function(p){return !p.fulfilled;}).length + ')</button>';
  } else {
    tabsHtml += '<button class="tab-btn active" id="reviewTabHistory">📖 历史剧情</button>' +
      '<button class="tab-btn" id="reviewTabSummary">📅 压缩记忆</button>' +
      '<button class="tab-btn" id="reviewTabSms">📜 短信历史</button>';
  }
  tabsHtml += '</div>';

  var inner = '<div class="modal-content" style="display:flex;flex-direction:column">' +
    tabsHtml;
  if (!isOneHeart) {
    inner +=
    '<div id="reviewHistoryContent" style="flex:1;overflow-y:auto;padding-right:4px">' +
    buildHistoryContent() +
    '</div>';
  }
  inner +=
    '<div id="reviewSummaryContent" style="' + (isOneHeart ? '' : 'display:none;') + 'flex:1;overflow-y:auto;padding-right:4px">' +
    buildSummaryContent() +
    '</div>' +
    (isOneHeart ? '<div id="reviewPromisesContent" style="display:none;flex:1;overflow-y:auto;padding-right:4px">' +
    buildPromisesContent() +
    '</div>' : '') +
    (!isOneHeart ? '<div id="reviewSmsContent" style="display:none;flex:1;overflow-y:auto;padding-right:4px">' +
    buildSmsHistoryContent() +
    '</div>' : '') +
    '<button class="modal-close-x" id="reviewClose">✕</button></div>';

  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  if (!isOneHeart) {
    overlay.querySelector('#reviewTabHistory').addEventListener('click', function() {
      document.querySelectorAll('#reviewSummaryContent, #reviewSmsContent').forEach(function(el) {
        if (el) el.style.display = 'none';
      });
      document.getElementById('reviewHistoryContent').style.display = '';
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
    });
  }
  overlay.querySelector('#reviewTabSummary').addEventListener('click', function() {
    if (!isOneHeart) document.getElementById('reviewHistoryContent').style.display = 'none';
    if (!isOneHeart) document.getElementById('reviewSmsContent').style.display = 'none';
    if (isOneHeart) document.getElementById('reviewPromisesContent').style.display = 'none';
    document.getElementById('reviewSummaryContent').style.display = '';
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
  });
  if (isOneHeart) {
    overlay.querySelector('#reviewTabPromises').addEventListener('click', function() {
      document.getElementById('reviewSummaryContent').style.display = 'none';
      document.getElementById('reviewPromisesContent').style.display = '';
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
    });
  }
  var smsTab = overlay.querySelector('#reviewTabSms');
  if (smsTab) {
    smsTab.addEventListener('click', function() {
      document.getElementById('reviewHistoryContent').style.display = 'none';
      document.getElementById('reviewSummaryContent').style.display = 'none';
      document.getElementById('reviewSmsContent').style.display = '';
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
    });
  }
  overlay.querySelector('#reviewClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });

  if (!isOneHeart) loadDayContent();

  // 摘要保存
  overlay.querySelectorAll('.btn-summary-save').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var day = parseInt(this.dataset.day);
      var textarea = overlay.querySelector('.summary-edit[data-day="' + day + '"]');
      if (textarea) {
        GS.dailySummaries[day] = textarea.value.trim();
        saveGame();
        this.textContent = '✅ 已保存';
        var self = this;
        setTimeout(function() { self.textContent = '保存'; }, 2000);
      }
    });
  });

  // 约定编辑保存
  overlay.querySelectorAll('.promise-save').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.dataset.id;
      var ta = overlay.querySelector('.promise-edit[data-id="' + id + '"]');
      if (ta) {
        var p = GS.oneHeartPromises.find(function(x) { return x.id === id; });
        if (p) { p.text = ta.value.trim(); saveGame(); }
        this.textContent = '✅ 已保存';
        var self = this;
        setTimeout(function() { self.textContent = '保存'; }, 2000);
      }
    });
  });

  // 履行约定
  overlay.querySelectorAll('.promise-fulfill').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var id = this.dataset.id;
      var p = GS.oneHeartPromises.find(function(x) { return x.id === id; });
      if (!p || p.fulfilled || p._fulfilling) return;
      p._fulfilling = true;
      this.disabled = true;
      this.textContent = '⏳ 生成中...';
      GS.pendingChoiceText = '履行约定：' + p.text;
      saveGame();
      try {
        await window.generateOneHeartRound();
        p.fulfilled = true;
        saveGame();
        overlay.remove();
        showReviewModal();
      } catch (e) {
        p._fulfilling = false;
        this.disabled = false;
        this.textContent = '⚠️ 重试';
        saveGame();
      }
    });
  });

  // 标记已完成
  overlay.querySelectorAll('.promise-done').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.dataset.id;
      var p = GS.oneHeartPromises.find(function(x) { return x.id === id; });
      if (!p || p.fulfilled) return;
      p.fulfilled = true;
      saveGame();
      overlay.remove();
      showReviewModal();
    });
  });

  // 手动添加约定
  var addBtn = overlay.querySelector('#promiseManualAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      var input = overlay.querySelector('#promiseManualInput');
      if (!input) return;
      var text = input.value.trim();
      if (!text || text.length < 2) { showToast('请输入约定内容'); return; }
      if (!GS.oneHeartPromises) GS.oneHeartPromises = [];
      var exists = GS.oneHeartPromises.some(function(p) { return p.text === text; });
      if (exists) { showToast('该约定已存在'); return; }
      GS.oneHeartPromises.push({ id: 'p_manual_' + Date.now(), text: text, fulfilled: false });
      saveGame();
      input.value = '';
      overlay.remove();
      showReviewModal();
    });
  }

  // 手动扫描全部未压缩剧情
  var rescanBtn = overlay.querySelector('#promiseRescanBtn');
  if (rescanBtn) {
    rescanBtn.addEventListener('click', async function() {
      this.disabled = true;
      this.textContent = '⏳ 扫描中...';
      var _compIdx = GS.oneHeartLastCompressedIdx || 0;
      var _text = GS.todayFullText.slice(_compIdx).join('\n\n').slice(-3000);
      if (_text.length >= 50) {
        await window.detectOneHeartPromises(_text);
        overlay.remove();
        showReviewModal();
      } else {
        this.disabled = false;
        this.textContent = '🔄 扫描全部未压缩剧情（检测遗漏约定）';
      }
    });
  }
}

function buildHistoryContent() {
  var completedDays = GS.dailyFullTexts.length;
  var hasCurrentDay = GS.todayFullText && GS.todayFullText.length > 0 && !GS.gameOver;

  var html = '<div id="reviewStoryContent">';
  if (completedDays === 0 && !hasCurrentDay) {
    html += '<p style="color:var(--text-muted);text-align:center;padding:20px 0">暂无历史剧情</p>';
  } else {
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px" id="reviewDayTabs">';
    for (var d = 0; d < completedDays; d++) {
      html += '<button class="tab-btn-sm' + (d === completedDays - 1 ? ' active' : '') +
        '" data-day="' + d + '" data-source="daily">Day ' + (d + 1) + '</button>';
    }
    if (hasCurrentDay) {
      html += '<button class="tab-btn-sm active" data-day="' + GS.day + '" data-source="today">Day ' + GS.day + '（当前）</button>';
    }
    html += '</div><div id="reviewDayContent" style="font-size:13px;line-height:1.7;color:var(--text-secondary)"></div>';
  }
  html += '</div>';
  return html;
}

function loadDayContent() {
  var dayTabs = document.querySelectorAll('#reviewDayTabs .tab-btn-sm');
  if (dayTabs.length === 0) return;
  var activeTab = document.querySelector('#reviewDayTabs .tab-btn-sm.active');
  if (activeTab) {
    showDayContent(parseInt(activeTab.dataset.day), activeTab.dataset.source);
  } else {
    showDayContent(parseInt(dayTabs[dayTabs.length - 1].dataset.day), dayTabs[dayTabs.length - 1].dataset.source);
  }

  setTimeout(function() {
    document.querySelectorAll('#reviewDayTabs .tab-btn-sm').forEach(function(tab) {
      tab.addEventListener('click', function() {
        document.querySelectorAll('#reviewDayTabs .tab-btn-sm').forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        showDayContent(parseInt(this.dataset.day), this.dataset.source);
      });
    });
  }, 0);
}

function showDayContent(dayIdx, source) {
  var container = document.getElementById('reviewDayContent');
  if (!container) return;
  var texts = source === 'today' ? GS.todayFullText : (GS.dailyFullTexts[dayIdx] || []);
  var html = '';
  for (var i = 0; i < texts.length; i++) {
    var parsed = parseNarrative(texts[i]);
    var paras = parsed.narrative.split('\n').filter(function(p) { return p.trim(); });
    for (var p = 0; p < paras.length; p++) {
      html += '<p style="margin-bottom:6px">' + escHtml(paras[p]) + '</p>';
    }
    if (i < texts.length - 1) html += '<hr style="border:none;border-top:1px solid var(--border-light);margin:8px 0">';
  }
  container.innerHTML = html || '<p style="color:var(--text-muted);text-align:center;padding:20px 0">该天暂无剧情记录</p>';
}

function buildPromisesContent() {
  var promises = GS.oneHeartPromises || [];
  var html = '';
  var unfulfilled = promises.filter(function(p) { return !p.fulfilled; });
  var fulfilled = promises.filter(function(p) { return p.fulfilled; });

  if (promises.length === 0) {
    return '<p style="color:var(--text-muted);text-align:center;padding:20px 0">暂无约定<br>推进剧情后自动检测</p><button id="promiseRescanBtn" style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid var(--border-primary);background:var(--bg-card);font-size:12px;cursor:pointer">🔄 扫描未压缩的剧情</button>';
  }

  html += '<div style="display:flex;gap:6px;margin-bottom:10px">' +
    '<input id="promiseManualInput" type="text" placeholder="手动添加约定…" style="flex:1;padding:8px 10px;border:1.5px solid var(--border-primary,#e0c0c0);border-radius:8px;font-size:13px;font-family:inherit" />' +
    '<button id="promiseManualAddBtn" style="padding:8px 14px;border:none;border-radius:8px;background:var(--accent-primary);color:#fff;font-size:12px;cursor:pointer;white-space:nowrap">添加</button>' +
    '<button id="promiseRescanBtn" style="padding:8px 12px;border:1px solid var(--border-primary);border-radius:8px;background:var(--bg-card);font-size:12px;cursor:pointer">🔄 扫描</button>' +
    '</div>';
  html += '<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">💡 AI 自动从剧情中检测到的约定。可编辑、标记完成，或点击「履行」生成后续剧情。</p>';

  if (unfulfilled.length > 0) {
    html += '<p style="font-weight:700;font-size:13px;color:var(--accent-primary-dark);margin-bottom:8px">📌 待履行</p>';
    for (var i = 0; i < unfulfilled.length; i++) {
      var p = unfulfilled[i];
      html += '<div style="background:var(--bg-soft,#fff5f5);border-radius:10px;padding:12px;margin-bottom:10px">' +
        '<textarea class="promise-edit" data-id="' + p.id + '" style="width:100%;min-height:60px;border:1.5px solid var(--border-primary,#e0c0c0);border-radius:8px;padding:10px;font-size:14px;font-family:inherit;resize:vertical;box-sizing:border-box">' +
        escHtml(p.text) + '</textarea>' +
        '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">' +
        '<button class="promise-save" data-id="' + p.id + '" style="padding:4px 12px;border-radius:8px;border:1px solid var(--border-primary);background:var(--bg-card);font-size:12px;cursor:pointer">保存</button>' +
        '<button class="promise-fulfill" data-id="' + p.id + '" style="padding:4px 12px;border-radius:8px;border:none;background:var(--accent-primary);color:#fff;font-size:12px;cursor:pointer">履行这次邀约</button>' +
        '<button class="promise-done" data-id="' + p.id + '" style="padding:4px 12px;border-radius:8px;border:none;background:#4caf50;color:#fff;font-size:12px;cursor:pointer">✅ 已完成</button>' +
        '</div></div>';
    }
  }

  if (fulfilled.length > 0) {
    html += '<p style="font-weight:700;font-size:13px;color:#4caf50;margin:12px 0 8px">✅ 已履行</p>';
    for (var fi = 0; fi < fulfilled.length; fi++) {
      var fp = fulfilled[fi];
      html += '<div style="background:#f0faf0;border-radius:10px;padding:12px;margin-bottom:8px;opacity:0.8">' +
        '<p style="font-size:13px;color:var(--text-secondary)">' + escHtml(fp.text) + '</p></div>';
    }
  }

  return html;
}

function buildSummaryContent() {
  var isOneHeart = GS.gameMode === 'oneHeart';
  var summaries = GS.dailySummaries || [];
  var html = '';
  if (isOneHeart) {
    // 1v1 压缩规则说明
    html += '<div style="background:var(--bg-soft,#fff5f5);border-radius:10px;padding:12px;margin-bottom:10px;font-size:12px;line-height:1.7;color:var(--text-secondary)">' +
      '<p style="font-weight:700;margin:0 0 6px 0">📋 压缩规则</p>' +
      '<p style="margin:0">累积到 15 次剧情生成后，自动将前 10 段剧情压缩为摘要。之后每累积 10 次再压缩前 10 段。<br>原文保留在缓存中，导出剧情时可导出全部原文。</p>' +
      '</div>';
  }
  if (summaries.length === 0) {
    html += '<p style="color:var(--text-muted);text-align:center;padding:20px 0">暂无压缩记忆（推进剧情后自动生成）</p>';
    return html;
  }
  for (var si = 0; si < summaries.length; si++) {
    var dayNum = si + 1;
    html += '<div style="background:var(--bg-soft,#fff5f5);border-radius:10px;padding:14px;margin-bottom:10px">' +
      '<p style="font-weight:700;font-size:13px;color:var(--text-secondary,#5d3a3a);margin-bottom:6px">Day ' + dayNum + '</p>' +
      '<textarea class="summary-edit" data-day="' + si + '" style="width:100%;min-height:400px;border:1.5px solid var(--border-primary,#e0c0c0);border-radius:8px;padding:12px;font-size:14px;line-height:1.7;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box">' +
      escHtml(summaries[si]) + '</textarea>' +
      '<button class="btn-summary-save" data-day="' + si + '" style="margin-top:4px;padding:4px 14px;border-radius:8px;border:none;background:#fce4ec;color:#c2185b;font-size:12px;cursor:pointer">保存</button></div>';
  }
  return html;
}

function buildSmsHistoryContent() {
  if (GS.smsHistory.length === 0) {
    return '<p style="color:var(--text-muted);text-align:center;padding:20px 0">暂无已发送的短信</p>';
  }
  var html = '';
  for (var i = GS.smsHistory.length - 1; i >= 0; i--) {
    var sms = GS.smsHistory[i];
    var member = MEMBERS.find(function(m) { return m.id === sms.target; });
    var emoji = member ? member.emoji : '💬';
    html += '<div style="background:var(--bg-soft);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:flex-start;gap:10px">' +
      '<span style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent-primary-light),#f8bbd0);font-size:18px;flex-shrink:0">' + emoji + '</span>' +
      '<div style="flex:1;min-width:0">' +
      '<p style="font-size:13px;font-weight:600;color:var(--accent-primary-dark);margin-bottom:4px">📨 发给 ' + emoji + ' ' + escHtml(sms.name) + '</p>' +
      '<p style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Day ' + sms.day + '</p>' +
      '<p style="font-size:13px;color:var(--text-secondary)">' + escHtml(sms.content) + '</p>' +
      '</div></div>';
  }
  return html;
}
