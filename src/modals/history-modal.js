import { GS, escHtml, saveGame } from '../core.js';
import { parseNarrative } from '../parser.js';

export function showHistoryModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  var inner = '<div class="modal-content" style="width:520px;max-width:98vw"><h3>📖 历史剧情回顾</h3>' +
    '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">' +
    '<button class="history-tab active" id="historyTabStory">📖 剧情</button>' +
    '<button class="history-tab" id="historyTabSummary">📅 记忆摘要</button>' +
    '</div>';

  var totalDays = GS.dailyFullTexts.length;
  inner += '<div id="historyStoryContent">';
  if (totalDays === 0) {
    inner += '<p style="color:#8b6b6b;text-align:center;padding:20px 0">暂无历史剧情（当前为 Day 1）</p>';
  } else {
    inner += '<div class="history-tabs" id="historyTabs">';
    for (var d = 0; d < totalDays; d++) {
      inner += '<button class="history-day-tab' + (d === totalDays - 1 ? ' active' : '') +
        '" data-day="' + d + '">Day ' + (d + 1) + '</button>';
    }
    inner += '</div><div class="history-content" id="historyContent"></div>';
  }
  inner += '</div>';

  inner += '<div id="historySummaryContent" style="display:none">';
  var summaries = GS.dailySummaries || [];
  if (summaries.length === 0) {
    inner += '<p style="color:#8b6b6b;text-align:center;padding:20px 0">暂无记忆摘要（进入下一天后自动生成）</p>';
  } else {
    for (var si = 0; si < summaries.length; si++) {
      var dayNum = si + 1;
      inner += '<div style="background:var(--bg-soft,#fff5f5);border-radius:10px;padding:14px;margin-bottom:10px">' +
        '<p style="font-weight:700;font-size:13px;color:var(--text-secondary,#5d3a3a);margin-bottom:6px">Day ' + dayNum + '</p>' +
        '<textarea class="summary-edit" data-day="' + si + '" style="width:100%;min-height:400px;border:1.5px solid var(--border-primary,#e0c0c0);border-radius:8px;padding:12px;font-size:14px;line-height:1.7;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box">' +
        escHtml(summaries[si]) + '</textarea>' +
        '<button class="btn-summary-save" data-day="' + si + '" style="margin-top:4px;padding:4px 14px;border-radius:8px;border:none;background:#fce4ec;color:#c2185b;font-size:12px;cursor:pointer">保存</button></div>';
    }
  }
  inner += '</div>';

  inner += '<button class="modal-close-x" id="historyClose">✕</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  function showDayContent(dayIdx) {
    var content = document.getElementById('historyContent');
    if (!content) return;
    var texts = GS.dailyFullTexts[dayIdx] || [];
    var html = '';
    for (var i = 0; i < texts.length; i++) {
      var parsed = parseNarrative(texts[i]);
      var paras = parsed.narrative.split('\n').filter(function(p) { return p.trim(); });
      for (var p = 0; p < paras.length; p++) {
        html += '<p>' + escHtml(paras[p]) + '</p>';
      }
      if (i < texts.length - 1) html += '<div class="separator"></div>';
    }
    content.innerHTML = html;
  }

  if (totalDays > 0) showDayContent(totalDays - 1);

  // Tab 切换
  overlay.querySelector('#historyTabStory').addEventListener('click', function() {
    this.classList.add('active');
    overlay.querySelector('#historyTabSummary').classList.remove('active');
    document.getElementById('historyStoryContent').style.display = '';
    document.getElementById('historySummaryContent').style.display = 'none';
  });
  overlay.querySelector('#historyTabSummary').addEventListener('click', function() {
    this.classList.add('active');
    overlay.querySelector('#historyTabStory').classList.remove('active');
    document.getElementById('historyStoryContent').style.display = 'none';
    document.getElementById('historySummaryContent').style.display = '';
  });

  // Day tab 点击
  overlay.querySelectorAll('.history-day-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      overlay.querySelectorAll('.history-day-tab').forEach(function(t) { t.classList.remove('active'); });
      this.classList.add('active');
      showDayContent(parseInt(this.dataset.day));
    });
  });

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

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
  overlay.querySelector('#historyClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
}
