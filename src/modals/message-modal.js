import { GS, saveGame, escHtml, showToast } from '../core.js';
import { callDeepSeek } from '../api.js';
import { MEMBERS } from '../data.js';

export function showMessageModal(msg, callback) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-content" style="max-width:360px;padding:16px">' +
    '<div style="background:#f5f5ff;border-radius:12px;padding:12px;margin-bottom:12px">' +
    '<p style="font-size:11px;color:var(--text-muted);margin-bottom:4px">📨 ' + escHtml(msg.sender) + '</p>' +
    '<p style="font-size:14px;color:var(--text-primary);line-height:1.6">' + escHtml(msg.text) + '</p>' +
    '</div>' +
    '<textarea id="msgReplyInput" placeholder="回复他…" style="width:100%;min-height:50px;padding:10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:14px;font-family:inherit;resize:none;box-sizing:border-box;outline:none"></textarea>' +
    '<button id="msgSendBtn" style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:10px;background:var(--accent-primary);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">发送</button>' +
    '<button id="msgIgnoreBtn" style="width:100%;margin-top:4px;padding:6px;border:none;border-radius:8px;background:transparent;color:var(--text-muted);font-size:12px;cursor:pointer;font-family:inherit">已读不回</button>' +
    '</div>';

  document.body.appendChild(overlay);

  overlay.querySelector('#msgSendBtn').addEventListener('click', async function() {
    var reply = (document.getElementById('msgReplyInput') || {}).value || '';
    if (!reply.trim()) { showToast('请输入回复内容'); return; }
    this.disabled = true;
    this.textContent = '⏳ 发送中...';
    overlay.remove();
    if (typeof callback === 'function') await callback(reply.trim());
  });

  overlay.querySelector('#msgIgnoreBtn').addEventListener('click', function() {
    overlay.remove();
    if (typeof callback === 'function') callback(null);
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
}

export async function generateMessage(affection) {
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) return null;
  var moodDesc = '日常闲聊';
  if (affection >= 80) moodDesc = '热恋甜蜜';
  else if (affection >= 60) moodDesc = '暧昧升温';
  else if (affection >= 40) moodDesc = '暧昧试探';
  else if (affection >= 20) moodDesc = '初识客气';
  var promptText = '生成一条' + (member ? member.name : '他') + '主动发给女主的消息（30-50字）。\n' +
    '当前关系状态：' + moodDesc + '\n' +
    '消息类型：日常关心的闲聊内容，自然口语化。不要过于直白，保持他性格应有的语气。\n' +
    '输出格式：{"message":"消息内容"}';
  try {
    var res = await callDeepSeek(promptText, '生成消息', 200, false, 0.8);
    var parsed;
    try { parsed = JSON.parse(res); } catch (e) {
      var m = res.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    if (parsed && parsed.message) {
      if (!GS.messageHistory) GS.messageHistory = [];
      GS.messageHistory.push({ sender: member.name, text: parsed.message, reply: '', round: GS.oneHeartGenCount || 0 });
      saveGame();
      return { sender: member.name, text: parsed.message };
    }
  } catch (e) {}
  return null;
}

window.showMessageModal = showMessageModal;
