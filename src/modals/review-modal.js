import { GS, escHtml } from '../core.js';
import { MEMBERS } from '../data.js';
import { parseNarrative } from '../parser.js';

export function showReviewModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '200';

  var inner = '<div class="modal-content" style="display:flex;flex-direction:column">' +
    '<div style="display:flex;gap:4px;margin-bottom:10px;flex-shrink:0">' +
    '<button class="tab-btn active" id="reviewTabHistory">📖 历史剧情</button>' +
    '<button class="tab-btn" id="reviewTabSms">📜 短信历史</button>' +
    '</div>' +

    // Tab 1：历史剧情
    '<div id="reviewHistoryContent" style="flex:1;overflow-y:auto;padding-right:4px">' +
    buildHistoryContent() +
    '</div>' +

    // Tab 2：短信历史
    '<div id="reviewSmsContent" style="display:none;flex:1;overflow-y:auto;padding-right:4px">' +
    buildSmsHistoryContent() +
    '</div>' +

    '<button class="modal-close-x" id="reviewClose">✕</button></div>';

  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.querySelector('#reviewTabHistory').addEventListener('click', function() {
    this.classList.add('active');
    overlay.querySelector('#reviewTabSms').classList.remove('active');
    document.getElementById('reviewHistoryContent').style.display = '';
    document.getElementById('reviewSmsContent').style.display = 'none';
  });
  overlay.querySelector('#reviewTabSms').addEventListener('click', function() {
    this.classList.add('active');
    overlay.querySelector('#reviewTabHistory').classList.remove('active');
    document.getElementById('reviewHistoryContent').style.display = 'none';
    document.getElementById('reviewSmsContent').style.display = '';
  });
  overlay.querySelector('#reviewClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });

  // 默认加载最后一天的剧情
  loadDayContent();
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

  // 绑定 day tab 点击
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
