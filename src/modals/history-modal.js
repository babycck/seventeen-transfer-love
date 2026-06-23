import { GS, escHtml } from '../core.js';
import { parseNarrative } from '../parser.js';

export function showHistoryModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  var inner = '<div class="modal-content" style="width:520px;max-width:98vw"><h3>📖 历史剧情回顾</h3>';

  var totalDays = GS.dailyFullTexts.length;
  if (totalDays === 0) {
    inner += '<p style="color:#8b6b6b;text-align:center;padding:20px 0">暂无历史剧情（当前为 Day 1）</p>';
  } else {
    inner += '<div class="history-tabs" id="historyTabs">';
    for (var d = 0; d < totalDays; d++) {
      inner += '<button class="history-tab' + (d === totalDays - 1 ? ' active' : '') +
        '" data-day="' + d + '">Day ' + (d + 1) + '</button>';
    }
    inner += '</div><div class="history-content" id="historyContent"></div>';
  }

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

  overlay.querySelectorAll('.history-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      overlay.querySelectorAll('.history-tab').forEach(function(t) { t.classList.remove('active'); });
      this.classList.add('active');
      showDayContent(parseInt(this.dataset.day));
    });
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
  overlay.querySelector('#historyClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
}
