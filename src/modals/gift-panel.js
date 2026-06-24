import {
  MEMBERS, GIFT_TEMPLATES, MEMBER_GIFT_PREFERENCE, RETURN_GIFTS,
  GS, saveGame, escHtml, randInt, callDeepSeek, showLoading, hideLoading, showToast
} from '../core.js';
import { parseNarrative } from '../parser.js';
import { updateAffection, addAffectionLog } from '../affection.js';

export function showGiftPanel() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content" style="max-width:420px"><h3>🎁 礼物</h3>' +
    '<div style="display:flex;gap:4px;margin-bottom:12px;border-bottom:1.5px solid #e0c0c0">' +
    '<button class="gift-tab active" id="giftTabMyGifts" style="flex:1;padding:8px;border:none;background:#fce4ec;border-radius:8px 8px 0 0;font-size:13px;cursor:pointer;color:#c2185b;font-weight:600">🎁 我的礼物</button>' +
    '<button class="gift-tab" id="giftTabReceived" style="flex:1;padding:8px;border:none;background:transparent;border-radius:8px 8px 0 0;font-size:13px;cursor:pointer;color:#8b6b6b">📦 礼物柜</button>' +
    '<button class="gift-tab" id="giftTabRecords" style="flex:1;padding:8px;border:none;background:transparent;border-radius:8px 8px 0 0;font-size:13px;cursor:pointer;color:#8b6b6b">📖 记录</button>' +
    '</div>' +
    '<div id="giftTabContent">' +
    renderMyGifts(members) +
    '</div>' +
    '<button class="modal-close-x" id="giftPanelClose">✕</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
  overlay.querySelector('#giftPanelClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });

  // Tab 切换
  function switchTab(tabId, renderFn) {
    document.getElementById('giftTabContent').innerHTML = renderFn();
    document.querySelectorAll('.gift-tab').forEach(function(t) {
      t.style.background = 'transparent'; t.style.color = '#8b6b6b'; t.style.fontWeight = 'normal';
    });
    var btn = document.getElementById(tabId);
    if (btn) { btn.style.background = '#fce4ec'; btn.style.color = '#c2185b'; btn.style.fontWeight = '600'; }
  }

  overlay.querySelector('#giftTabMyGifts').addEventListener('click', function() {
    switchTab('giftTabMyGifts', function() { return renderMyGifts(members); });
  });
  overlay.querySelector('#giftTabReceived').addEventListener('click', function() {
    switchTab('giftTabReceived', renderReceivedGifts);
  });
  overlay.querySelector('#giftTabRecords').addEventListener('click', function() {
    switchTab('giftTabRecords', renderAllGiftRecords);
  });

  // 事件委托：Tab 内容中的送礼/改造按钮
  overlay.querySelector('#giftTabContent').addEventListener('click', function(e) {
    var remakeBtn = e.target.closest('[data-remake-idx]');
    if (remakeBtn) {
      var remakeIdx = parseInt(remakeBtn.dataset.remakeIdx);
      overlay.remove();
      showRemakeGiftModal(remakeIdx);
      return;
    }
    var giftBtn = e.target.closest('[data-gift-idx]');
    if (giftBtn) {
      var giftIdx = parseInt(giftBtn.dataset.giftIdx);
      var memberId = giftBtn.dataset.memberId;
      overlay.remove();
      sendGift(memberId, giftIdx);
      return;
    }
  });
}

// ==================== Tab 1: 我的礼物（可送人） ====================
function renderMyGifts(members) {
  var html = '';
  if (GS.gifts.length === 0) {
    html += '<p style="color:#8b6b6b;text-align:center;padding:20px 0">暂无礼物</p>';
  } else {
    html += '<p style="font-size:12px;color:#8b6b6b;margin-bottom:8px">选择一份礼物送给谁。对口+5，通用+2~3。</p>';
    for (var i = 0; i < GS.gifts.length; i++) {
      var g = GS.gifts[i];
      var typeLabel = g.type === 'handcraft' ? '手作' : g.type === 'food' ? '食物' : g.type === 'xMemory' ? '回忆' : '情感';
      var badge = g.isExclusive ? '<span style="background:#e91e63;color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:4px">专属</span>' : '';
      if (g.type === 'xMemory') badge += '<span style="background:#333;color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:4px">🖤 X</span>';

      // 来源标注
      var fromLabel = '';
      if (g.fromPartner) {
        var fromMember = MEMBERS.find(function(m) { return m.id === g.fromPartner; });
        if (fromMember) fromLabel = '<span style="font-size:10px;color:#999;margin-left:6px">来自 ' + escHtml(fromMember.name) + ' · Day ' + g.fromDay + '</span>';
      }

      html += '<div style="background:#fff5f5;border-radius:10px;padding:10px;margin-bottom:8px">' +
        '<p style="font-weight:700;font-size:13px;margin-bottom:4px">' + escHtml(g.name) + badge + ' <span style="font-size:11px;color:#8b6b6b">[' + typeLabel + ']</span>' + fromLabel + (g.isRemade ? '<span style="color:#4caf50;font-size:11px;margin-left:4px">✅ 已改造</span>' : '') + '</p>' +
        '<p style="font-size:11px;color:#8b6b6b;margin-bottom:6px">' + escHtml(g.desc) + '</p>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">';
      for (var j = 0; j < members.length; j++) {
        var m = members[j];
        var prefType = MEMBER_GIFT_PREFERENCE[m.id];
        var matchHint = (g.type === prefType) ? ' (+5)' : ' (+2~3)';
        if (g.type === 'xMemory' && m.id === GS.secretX) matchHint = ' (+8~-3)';
        html += '<button class="sms-target-btn" data-gift-idx="' + i + '" data-member-id="' + m.id + '">' +
          m.emoji + ' ' + m.name + matchHint + '</button>';
      }
      html += '</div>';
      if (!g.isExclusive && !g.isRemade) {
        html += '<button class="btn-secondary" data-remake-idx="' + i + '" style="margin-top:6px;font-size:11px;padding:4px 10px">🔧 改造为…</button>';
      }
      html += '</div>';
    }
  }
  return html;
}

// ==================== Tab 2: 礼物柜（我收到的） ====================
function renderReceivedGifts() {
  var html = '';
  var hasDateGifts = GS.dateGiftHistory && GS.dateGiftHistory.length > 0;
  var hasReturns = GS.returnGiftHistory && GS.returnGiftHistory.length > 0;

  if (!hasDateGifts && !hasReturns) {
    html += '<p style="color:#8b6b6b;text-align:center;padding:20px 0">暂无收到礼物</p>';
    return html;
  }

  // 约会礼物（按 day 倒序）
  if (hasDateGifts) {
    html += '<p style="font-size:12px;color:#8b6b6b;margin-bottom:6px;font-weight:600">🎯 约会礼物</p>';
    for (var dg = GS.dateGiftHistory.length - 1; dg >= 0; dg--) {
      var d = GS.dateGiftHistory[dg];
      var dm = MEMBERS.find(function(m) { return m.id === d.memberId; });
      var tag = d.isExclusive ? '<span style="background:#e91e63;color:#fff;font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px">专属</span>' : '';
      html += '<div style="background:#fff5f5;border-radius:8px;padding:8px;margin-bottom:6px;font-size:12px">' +
        (dm ? dm.emoji + ' ' + escHtml(dm.name) + '：' : '') + escHtml(d.giftName) + tag + '<span style="color:#999;font-size:10px;margin-left:6px">Day ' + d.day + '</span></div>';
    }
  }

  // 回礼（按 day 倒序）
  if (hasReturns) {
    html += '<p style="font-size:12px;color:#8b6b6b;margin-bottom:6px;margin-top:10px;font-weight:600">📩 回礼</p>';
    for (var r = GS.returnGiftHistory.length - 1; r >= 0; r--) {
      var rg = GS.returnGiftHistory[r];
      var rm = MEMBERS.find(function(m) { return m.id === rg.memberId; });
      html += '<div style="background:#f0faf0;border-radius:8px;padding:8px;margin-bottom:6px;font-size:12px">' +
        (rm ? rm.emoji + ' ' + escHtml(rm.name) + '：' : '') + escHtml(rg.gift) + '<span style="color:#999;font-size:10px;margin-left:6px">Day ' + rg.day + '</span></div>';
    }
  }

  return html;
}

// ==================== Tab 3: 记录（收送记录） ====================
function renderAllGiftRecords() {
  var records = [];

  // 送出的礼物
  if (GS.smsHistory) {
    for (var si = 0; si < GS.smsHistory.length; si++) {
      var s = GS.smsHistory[si];
      if (s.isGift) {
        records.push({ type: 'sent', day: s.day, memberId: s.target, text: s.content });
      }
    }
  }

  // 约会收到的礼物
  if (GS.dateGiftHistory) {
    for (var di = 0; di < GS.dateGiftHistory.length; di++) {
      var d = GS.dateGiftHistory[di];
      records.push({ type: 'dateGift', day: d.day, memberId: d.memberId, text: d.giftName, isExclusive: d.isExclusive });
    }
  }

  // 回礼
  if (GS.returnGiftHistory) {
    for (var ri = 0; ri < GS.returnGiftHistory.length; ri++) {
      var rg = GS.returnGiftHistory[ri];
      records.push({ type: 'return', day: rg.day, memberId: rg.memberId, text: rg.gift });
    }
  }

  // 按 day 倒序
  records.sort(function(a, b) { return b.day - a.day || 0; });

  if (records.length === 0) {
    return '<p style="color:#8b6b6b;text-align:center;padding:20px 0">暂无记录</p>';
  }

  var html = '';
  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    var rm = MEMBERS.find(function(m) { return m.id === rec.memberId; });
    var label = '';
    var bgColor = '';

    if (rec.type === 'sent') {
      label = '🎁 送出 → ' + (rm ? rm.name : '成员');
      bgColor = '#fff5f5';
    } else if (rec.type === 'dateGift') {
      label = '🎯 约会收到 · ' + (rm ? rm.name : '成员');
      bgColor = '#f0f4fa';
    } else if (rec.type === 'return') {
      label = '📩 回礼 · ' + (rm ? rm.name : '成员');
      bgColor = '#f0faf0';
    }

    var extra = rec.isExclusive ? '<span style="background:#e91e63;color:#fff;font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px">专属</span>' : '';
    html += '<div style="background:' + bgColor + ';border-radius:8px;padding:8px;margin-bottom:6px;font-size:12px">' +
      '<span style="font-weight:600">' + label + '</span>：' + escHtml(rec.text) + extra + '<span style="color:#999;font-size:10px;margin-left:6px">Day ' + rec.day + '</span></div>';
  }

  return html;
}

// ==================== 送礼逻辑（不变） ====================
export async function sendGift(memberId, giftIdx) {
  var gift = GS.gifts[giftIdx];
  if (!gift) return;
  var member = MEMBERS.find(function(m) { return m.id === memberId; });
  if (!member) return;

  showLoading('正在生成送礼剧情...');
  try {
    var hp = GS.heroineProfile;
    var sysPrompt = '你是《换乘恋爱》的短篇剧情生成AI。请根据以下信息，写一段约300字的送礼反应剧情。' +
      '女主姓名：' + hp.name + '，年龄：' + hp.age + '岁，职业：' + hp.job + '，外貌：' + hp.appearance.join('、') + '。' +
      '女主把「' + gift.name + '」送给了' + member.name + '。' +
      '写出他的即时反应、对话、以及女主的感受。' +
      '注意礼物质感分级：如果礼物恰好是对方的偏好类型（偏好类型有handcraft/food/emotion三种）则反应更强烈；如果礼物与当前场景和对方人设契合则好感度更高；如果礼物敷衍则反应平淡。' +
      '只输出正文，不要写选项、不要写采访间、不要写导演OS、不要写观察员OS。';
    var reaction = await callDeepSeek(sysPrompt, '生成送礼剧情', 800, false, 0.7);

    var parsed = parseNarrative(reaction);
    if ((!parsed.blocks || parsed.blocks.length === 0) && !parsed.narrative && reaction.trim()) {
      parsed = {
        narrative: reaction,
        blocks: [{ type: 'narrative', content: reaction }],
        interviews: [], memberInterviews: [], xInterviews: [],
        directorOS: '', observerOS: '', observers: [],
        options: [], affChanges: [], drinks: [], smsDrafts: []
      };
    }
    GS.consequenceNarratives.push({
      rawText: reaction,
      parsed: parsed,
      choiceText: '🎁 送礼给 ' + member.name + '：' + gift.name
    });
    GS.todayFullText.push(reaction);

    var prefType = MEMBER_GIFT_PREFERENCE[member.id];
    var bonus = (gift.type === prefType) ? 5 : randInt(2, 3);
    updateAffection(memberId, bonus);
    addAffectionLog(memberId, bonus, '收到礼物「' + gift.name + '」' + (bonus >= 5 ? '（对口）' : '（通用）'));

    var otherMembers = GS.selectedMembers.filter(function(id) { return id !== memberId; });
    for (var i = 0; i < otherMembers.length; i++) {
      updateAffection(otherMembers[i], -1);
      addAffectionLog(otherMembers[i], -1, '看到你送了礼物给别人');
    }

    GS.gifts.splice(giftIdx, 1);
    if (!Array.isArray(GS.smsHistory)) GS.smsHistory = [];
    GS.smsHistory.push({
      day: GS.day,
      target: memberId,
      name: member.name,
      content: '🎁 送出了「' + gift.name + '」',
      isGift: true
    });
    saveGame();
    if (window.__renderAll) window.__renderAll();

    window.scheduleReturnGift(memberId);
  } catch (e) {
    console.error('[sendGift] 送礼剧情生成失败:', e);
    showToast('⚠️ 送礼剧情生成失败：' + e.message);
  }
  hideLoading();
}

// ==================== 改造礼物（不变） ====================
export function showRemakeGiftModal(giftIdx) {
  var gift = GS.gifts[giftIdx];
  if (!gift) return;
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>🔧 改造礼物</h3>' +
    '<p style="font-size:12px;color:#8b6b6b;margin-bottom:10px">将「' + escHtml(gift.name) + '」改造成谁的专属喜好类型？</p>' +
    '<div style="display:flex;flex-direction:column;gap:8px">';
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var prefType = MEMBER_GIFT_PREFERENCE[m.id];
    var prefLabel = prefType === 'handcraft' ? '手作' : prefType === 'food' ? '食物' : '情感';
    inner += '<button class="sms-target-btn" data-member-id="' + m.id + '" style="font-size:14px;padding:12px">' +
      m.emoji + ' ' + m.name + ' → ' + prefLabel + '类（+' + (m.id === GS.currentDatingPartner ? '5专属' : '5') + '）</button>';
  }
  inner += '</div><button class="modal-close-x" id="remakeCancel">✕</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
  overlay.querySelector('#remakeCancel').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });

  overlay.querySelectorAll('[data-member-id]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var memberId = this.dataset.memberId;
      var prefType = MEMBER_GIFT_PREFERENCE[memberId];
      var prefTemplates = GIFT_TEMPLATES.filter(function(g) { return g.type === prefType; });
      var newTmpl = prefTemplates[Math.floor(Math.random() * prefTemplates.length)];

      gift.type = newTmpl.type;
      gift.name = newTmpl.name;
      gift.desc = newTmpl.desc;
      gift.isRemade = true;

      saveGame();
      overlay.remove();
      showGiftPanel();
    });
  });
}
