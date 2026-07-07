import { MEMBERS, GS, escHtml, showToast } from '../core.js';
import { sendSms } from '../sms.js';

export function showSmsModal() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var isEarlyGame = GS.day <= 7;
  var availableMembers = isEarlyGame ?
    members.filter(function(m) { return m.id !== GS.secretX; }) :
    members;
  var drafts = GS.smsDrafts.length > 0 ? GS.smsDrafts : [
    '今天和你聊天很开心。',
    '谢谢你今天的陪伴。',
    '晚安，明天见。'
  ];

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var phoneStyle = 'background:#1a1a1a;border-radius:28px;padding:10px;width:360px;max-width:94vw;margin:0 auto;box-shadow:0 12px 40px rgba(0,0,0,0.35);';
  var screenStyle = 'background:#f5f5f7;border-radius:20px;overflow:hidden;height:540px;display:flex;flex-direction:column;';
  var notchStyle = 'background:#1a1a1a;height:22px;border-radius:20px 20px 0 0;display:flex;justify-content:center;align-items:flex-end;padding-bottom:3px;';
  var chatAreaStyle = 'flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:6px;scrollbar-width:thin;';
  var bubbleRight = 'background:linear-gradient(135deg,#f06292,#e91e63);color:#fff;padding:8px 12px;border-radius:16px 16px 4px 16px;font-size:13px;align-self:flex-end;max-width:78%;cursor:pointer;transition:all .2s;box-shadow:0 1px 3px rgba(233,30,99,0.2);line-height:1.4;';
  var bubbleLeft = 'background:#e8e8e8;color:#333;padding:8px 12px;border-radius:16px 16px 16px 4px;font-size:13px;align-self:flex-start;max-width:78%;line-height:1.4;';
  var bottomStyle = 'padding:10px;border-top:1px solid #e0e0e0;background:#fff;';

  var todaySms = GS.smsHistory.filter(function(s) { return s.day === GS.day; });

  var inner = '<div style="' + phoneStyle + '">' +
    '<div style="' + screenStyle + '">' +
    '<div style="' + notchStyle + '"><span style="color:#fff;font-size:10px;letter-spacing:1px;">💌 心动短信</span></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;border-bottom:1px solid #eee;background:#fff;">' +
    '<span style="font-size:12px;color:#c2185b;font-weight:600;">' + (isEarlyGame ? 'Day 1-7 · 不能发给X' : 'Day 8-11 · 可以发给X') + '</span>' +
    '<button id="smsModalClose" style="background:none;border:none;color:#888;font-size:18px;cursor:pointer;padding:0 4px;line-height:1;">✕</button></div>';

  inner += '<div style="' + chatAreaStyle + '" id="smsChatArea">';

  for (var i = todaySms.length - 1; i >= 0; i--) {
    var s = todaySms[i];
    inner += '<div style="' + bubbleRight + 'opacity:0.6;">' + escHtml(s.content) +
      '<div style="font-size:10px;opacity:0.85;text-align:right;margin-top:2px;">→ ' + escHtml(s.name) + '</div></div>';
  }

  inner += '<div style="font-size:10px;color:#999;text-align:center;margin:4px 0;">— 选择一条发送 —</div>';
  for (var j = 0; j < drafts.length; j++) {
    inner += '<div class="sms-draft-bubble" data-idx="' + j + '" style="' + bubbleRight + 'opacity:0.75;">' + escHtml(drafts[j]) + '</div>';
  }

  inner += '</div>';

  inner += '<div style="' + bottomStyle + '">' +
    '<textarea id="smsCustomInput" placeholder="或自己写一条..." style="width:100%;border:1.5px solid #e8c8c8;border-radius:12px;padding:8px;font-size:12px;resize:none;height:40px;outline:none;font-family:inherit;"></textarea>' +
    '<div style="display:flex;gap:5px;justify-content:center;margin-top:8px;flex-wrap:wrap;">';
  for (var k = 0; k < availableMembers.length; k++) {
    var m = availableMembers[k];
    inner += '<button class="sms-target-btn" data-id="' + m.id + '" style="padding:6px 10px;border-radius:14px;border:1.5px solid #e8c8c8;background:#fff5f5;cursor:pointer;font-size:12px;font-weight:600;color:#5d3a3a;transition:all .2s;">' +
      m.emoji + ' ' + m.name + '</button>';
  }
  inner += '</div>' +
    '</div></div></div>';

  overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;">' + inner + '</div>';
  document.body.appendChild(overlay);

  var selectedDraft = '';
  var selectedBubble = null;

  overlay.querySelectorAll('.sms-draft-bubble').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.sms-draft-bubble').forEach(function(b) {
        b.style.opacity = '0.55';
        b.style.transform = 'none';
        b.style.boxShadow = '0 1px 3px rgba(233,30,99,0.2)';
      });
      this.style.opacity = '1';
      this.style.transform = 'scale(1.03)';
      this.style.boxShadow = '0 3px 10px rgba(233,30,99,0.35)';
      selectedDraft = drafts[parseInt(this.dataset.idx)];
      selectedBubble = this;
    });
  });

  var firstBubble = overlay.querySelector('.sms-draft-bubble');
  if (firstBubble) firstBubble.click();

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });

  var smsCloseBtn = overlay.querySelector('#smsModalClose');
  if (smsCloseBtn) {
    smsCloseBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); overlay.remove(); });
  }

  overlay.querySelectorAll('.sms-target-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      if (this.disabled) return;
      this.disabled = true;
      overlay.querySelectorAll('.sms-target-btn').forEach(function(b) { b.disabled = true; });
      var customText = (document.getElementById('smsCustomInput') || {}).value || '';
      var finalText = customText.trim() || selectedDraft;
      if (!finalText) {
        showToast('请选择短信草稿或输入自定义内容');
        return;
      }
      var targetId = this.dataset.id;

      if (selectedBubble) {
        selectedBubble.style.transition = 'all 0.5s cubic-bezier(0.4,0,0.2,1)';
        selectedBubble.style.transform = 'translateY(-30px) scale(0.9)';
        selectedBubble.style.opacity = '0.3';
      }
      this.style.background = '#e91e63';
      this.style.color = '#fff';
      this.style.borderColor = '#e91e63';

      setTimeout(function() {
        overlay.remove();
      }, 450);

      await sendSms(targetId, finalText);
    });
  });
}
