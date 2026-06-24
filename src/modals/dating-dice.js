import { GS, saveGame } from '../state.js';
import { MEMBERS } from '../data.js';
import { rollDatingDice } from '../formatters.js';
import { escHtml } from '../utils.js';

// 约会骰子弹窗（接受 onConfirm 回调，避免循环依赖）
export function showDatingDiceModal(onConfirm) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content" style="text-align:center">' +
    '<h3>🎲 Day ' + GS.day + ' · 约会配对</h3>' +
    '<p style="color:#8b6b6b;font-size:13px;margin-bottom:14px">投出骰子，决定今天的约会对象</p>' +
    '<div class="dice-area">' +
    '<div class="dice-box" id="diceBox">?</div>' +
    '<p class="dice-result hidden" id="diceResult"></p>' +
    '</div>' +
    '<button class="btn-confirm" id="diceRollBtn" style="max-width:200px;margin:0 auto">🎲 投骰子</button>' +
    '<button class="btn-confirm hidden" id="diceConfirmBtn" style="max-width:200px;margin:8px auto 0">✅ 确认，开始约会</button>' +
    '</div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  var diceRolled = false;

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay && !diceRolled) overlay.remove();
  });

  overlay.querySelector('#diceRollBtn').addEventListener('click', function() {
    this.disabled = true;
    var diceBox = document.getElementById('diceBox');
    diceBox.classList.add('rolling');

    setTimeout(function() {
      var result = rollDatingDice();
      diceBox.classList.remove('rolling');
      diceBox.textContent = result.roll;
      GS.datingDiceResult = result;
      GS.pendingDatingResult = result.partner;

      var dateMember = MEMBERS.find(function(m) { return m.id === result.partner; });
      var resultEl = document.getElementById('diceResult');
      resultEl.innerHTML = '🎲 骰子点数 <strong>' + result.roll + '</strong> → 约会对象：<strong>' +
        escHtml(dateMember.emoji) + ' ' + escHtml(dateMember.name) + '</strong><br>' +
        '<span style="font-size:12px;color:#8b6b6b">命运选择了' + escHtml(dateMember.name) + '作为你今天的约会对象</span>';
      resultEl.classList.remove('hidden');

      // Day 8 约会修罗场竞争
      var showShura = false;
      if (GS.day === 8 && Math.random() < 0.3) {
        var members = GS.selectedMembers.map(function(id) { return MEMBERS.find(function(m) { return m.id === id; }); });
        var affs = members.map(function(m) { return { id: m.id, aff: GS.affection[m.id] || 0 }; });
        affs.sort(function(a, b) { return a.aff - b.aff; });
        if (affs[0].id === result.partner) {
          showShura = true;
          var others = members.filter(function(m) { return m.id !== result.partner; });
          var protestHtml = '<div style="margin-top:12px;padding:10px;background:#fff3e0;border-radius:8px;font-size:13px;color:#5d3a3a">' +
            '<p>👀 修罗场！' + escHtml(others[0].name) + '和' + escHtml(others[1].name) + '似乎对结果有些不满……</p>' +
            '<p style="font-size:12px;color:#8b6b6b;margin-top:6px">有人低声嘀咕，有人看向别处，空气突然变得微妙。</p>' +
            '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">' +
            '<button class="btn-confirm shura-btn" data-choice="keep" style="flex:1;min-width:80px;font-size:12px;padding:6px">维持原结果</button>' +
            '<button class="btn-confirm shura-btn" data-choice="' + others[0].id + '" style="flex:1;min-width:80px;font-size:12px;padding:6px">换成' + escHtml(others[0].name) + '</button>' +
            '<button class="btn-confirm shura-btn" data-choice="' + others[1].id + '" style="flex:1;min-width:80px;font-size:12px;padding:6px">换成' + escHtml(others[1].name) + '</button>' +
            '</div></div>';
          resultEl.insertAdjacentHTML('afterend', protestHtml);

          document.querySelectorAll('.shura-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var choice = this.dataset.choice;
              if (choice !== 'keep') {
                GS.datingDiceResult.partner = choice;
                GS.pendingDatingResult = choice;
                var newMember = MEMBERS.find(function(m) { return m.id === choice; });
                resultEl.innerHTML = '🎲 骰子点数 <strong>' + result.roll + '</strong> → 最终约会对象：<strong>' +
                  escHtml(newMember.emoji) + ' ' + escHtml(newMember.name) + '</strong><br>' +
                  '<span style="font-size:12px;color:#8b6b6b">你选择了' + escHtml(newMember.name) + '</span>';
              } else {
                resultEl.innerHTML += '<br><span style="font-size:12px;color:#4caf50">你坚持维持原结果。</span>';
              }
              document.querySelectorAll('.shura-btn').forEach(function(b) { b.disabled = true; });
              document.getElementById('diceConfirmBtn').classList.remove('hidden');
            });
          });
        }
      }

      if (!showShura) {
        document.getElementById('diceConfirmBtn').classList.remove('hidden');
      }
      diceRolled = true;
      saveGame();
    }, 600);
  });

  overlay.querySelector('#diceConfirmBtn').addEventListener('click', async function() {
    overlay.remove();
    if (typeof onConfirm === 'function') await onConfirm();
  });
}
