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
  // [计划B问题6] 注入最近5条历史消息用于去重
  var _histMsgs = '';
  if (GS.messageHistory && GS.messageHistory.length > 0) {
    var _recent5 = GS.messageHistory.slice(-5);
    _histMsgs = '已有消息（禁止重复类似内容）：\n';
    for (var _hi = 0; _hi < _recent5.length; _hi++) {
      _histMsgs += '- ' + _recent5[_hi].text + '\n';
    }
    _histMsgs += '\n';
  }
  var promptText = '生成一条' + (member ? member.name : '他') + '主动发给女主的消息（30-50字）。\n' +
    '当前关系状态：' + moodDesc + '\n' +
    _histMsgs +
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
      // [计划B问题6] 去重校验：与最近5条做 Jaccard 相似度，>0.5 则重试1次
      if (GS.messageHistory && GS.messageHistory.length > 0) {
        var _recent5b = GS.messageHistory.slice(-5);
        var _isDup = false;
        for (var _di = 0; _di < _recent5b.length; _di++) {
          if (_jaccardMsgSim(parsed.message, _recent5b[_di].text) > 0.5) { _isDup = true; break; }
        }
        if (_isDup) {
          var _retryPrompt = promptText + '\n[避免重复] 你上一条发的和这条太像了，这次换一个完全不同的话题和语气。';
          try {
            var _res2 = await callDeepSeek(_retryPrompt, '生成消息（去重重试）', 200, false, 0.8);
            var _parsed2;
            try { _parsed2 = JSON.parse(_res2); } catch (e) {
              var _m2 = _res2.match(/\{[\s\S]*\}/);
              if (_m2) _parsed2 = JSON.parse(_m2[0]);
            }
            if (_parsed2 && _parsed2.message) parsed = _parsed2;
            else console.warn('[message] 去重重试仍重复，接受结果');
          } catch (e2) {}
        }
      }
      if (!GS.messageHistory) GS.messageHistory = [];
      GS.messageHistory.push({ sender: member.name, text: parsed.message, reply: '', round: GS.oneHeartGenCount || 0 });
      saveGame();
      return { sender: member.name, text: parsed.message };
    }
  } catch (e) {}
  return null;
}

// [计划B问题6] Jaccard 相似度（关键词集合交集/并集）
function _jaccardMsgSim(a, b) {
  var _wordsA = (a || '').match(/[\u4e00-\u9fa5]{2,}/g) || [];
  var _wordsB = (b || '').match(/[\u4e00-\u9fa5]{2,}/g) || [];
  if (_wordsA.length === 0 || _wordsB.length === 0) return 0;
  var _setA = {};
  for (var _i = 0; _i < _wordsA.length; _i++) _setA[_wordsA[_i]] = true;
  var _setB = {};
  for (var _j = 0; _j < _wordsB.length; _j++) _setB[_wordsB[_j]] = true;
  var _inter = 0;
  var _allKeys = {};
  for (var _k in _setA) { _allKeys[_k] = true; if (_setB[_k]) _inter++; }
  for (var _k2 in _setB) { _allKeys[_k2] = true; }
  var _union = 0;
  for (var _k3 in _allKeys) _union++;
  if (_union === 0) return 0;
  return _inter / _union;
}

window.showMessageModal = showMessageModal;
