import { GS, saveGame } from '../state.js';
import { JEALOUSY_EVENTS, SURPRISE_EVENTS, RIVAL_EVENTS } from '../data.js';
import { escHtml } from '../utils.js';

export function showJealousyEvent(event, callback) {
  showEventModal('❤️‍🔥 吃醋事件', event, callback);
}

export function showSurpriseEvent(event, callback) {
  showEventModal('💝 惊喜事件', event, callback);
}

export function showPoolEvent(event, callback) {
  showEventModal('🎲 意外事件', event, callback);
}

function showEventModal(title, event, callback) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var optsHtml = '';
  var labels = ['A', 'B', 'C'];
  for (var i = 0; i < (event.options || []).length; i++) {
    optsHtml += '<button class="btn-confirm event-opt-btn" data-idx="' + i + '" style="margin-top:6px;width:100%">' +
      '<span style="font-weight:700;margin-right:6px;color:var(--accent-primary)">' + labels[i] + '</span> ' +
      escHtml(event.options[i]) + '</button>';
  }

  overlay.innerHTML =
    '<div class="modal-content" style="text-align:center;max-width:360px">' +
    '<h3>' + title + '</h3>' +
    '<p style="color:var(--text-secondary);font-size:14px;line-height:1.8;margin:12px 0">' + escHtml(event.scenario) + '</p>' +
    '<p style="font-size:11px;color:var(--text-muted);margin-bottom:8px">你的选择将影响接下来的故事走向</p>' +
    '<div style="display:flex;flex-direction:column">' + optsHtml + '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.event-opt-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(this.dataset.idx);
      overlay.remove();
      if (typeof callback === 'function') callback(idx);
    });
  });
}

export function showRivalEvent(event, callback) {
  showEventModal('💗 情敌事件', event, callback);
}

export function showConfrontationEvent(event, callback) {
  showEventModal('💢 激烈争吵', event, callback);
}

export function showConfessionEvent(rivalName, callback) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML =
    '<div class="modal-content" style="text-align:center;max-width:360px">' +
    '<h3>💗 他表白了</h3>' +
    '<p style="color:var(--text-secondary);font-size:14px;line-height:1.8;margin:12px 0">' + escHtml(rivalName) + '站在你面前，认真地看着你：<br><br>「我知道我没有立场说这些话——但你在我这里，从来不是路过。」<br><br>他表白了。</p>' +
    '<p style="font-size:11px;color:var(--text-muted);margin-bottom:8px">你的选择将影响接下来的故事走向</p>' +
    '<div style="display:flex;flex-direction:column">' +
    '<button class="btn-confirm event-opt-btn" data-idx="0" style="margin-top:6px;width:100%"><span style="font-weight:700;margin-right:6px;color:var(--accent-primary)">A</span> 接受他的心意</button>' +
    '<button class="btn-confirm event-opt-btn" data-idx="1" style="margin-top:6px;width:100%"><span style="font-weight:700;margin-right:6px;color:var(--text-muted)">B</span> 对不起，我只把你当朋友</button>' +
    '<button class="btn-confirm event-opt-btn" data-idx="2" style="margin-top:6px;width:100%"><span style="font-weight:700;margin-right:6px;color:var(--text-muted)">C</span> 我需要时间</button>' +
    '</div></div>';

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.event-opt-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(this.dataset.idx);
      overlay.remove();
      if (typeof callback === 'function') callback(idx);
    });
  });
}
