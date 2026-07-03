import {
  MEMBERS, GIFT_TEMPLATES, MEMBER_GIFT_PREFERENCE, RETURN_GIFTS,
  GS, saveGame, escHtml, randInt, callDeepSeek, showLoading, hideLoading, showToast
} from '../core.js';
import { parseNarrative } from '../parser.js';
import { updateAffection, addAffectionLog } from '../affection.js';
import { buildOneHeartSystemPrompt, buildOneHeartUserMessage } from '../prompts.js';
import { generateWithRetry } from '../ai-generator.js';

export function showGiftPanel() {
  var members;
  if (GS.gameMode === 'oneHeart') {
    var om = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
    members = om ? [om] : [];
  } else {
    members = GS.selectedMembers.map(function(id) {
      return MEMBERS.find(function(m) { return m.id === id; });
    });
  }
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>🎁 礼物</h3>' +
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
    var getBtn = e.target.closest('#getGiftBtn');
    if (getBtn) {
      var gift = GIFT_TEMPLATES[Math.floor(Math.random() * GIFT_TEMPLATES.length)];
      if (!GS.gifts) GS.gifts = [];
      GS.gifts.push({ type: gift.type, name: gift.name, desc: gift.desc, isExclusive: false });
      saveGame();
      showToast('🎁 获得了「' + gift.name + '」');
      // 重渲染礼物列表
      switchTab('giftTabMyGifts', function() { return renderMyGifts(members); });
      return;
    }
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
    var returnItem = e.target.closest('[data-gift-ri]');
    if (returnItem) {
      var ri = parseInt(returnItem.dataset.giftRi);
      var rg = GS.returnGiftHistory[ri];
      if (!rg) return;
      var rm = MEMBERS.find(function(m) { return m.id === rg.memberId; });
      if (!rm) return;
      // 显示加载，因为可能触发 AI 调用
      showLoading();
      getGiftDescription(rg, rm).then(function(desc) {
        hideLoading();
        showGiftDescModal(rg, rm, desc);
      }).catch(function(err) {
        hideLoading();
        showGiftDescModal(rg, rm, rg.gift + '——来自' + rm.name + '的心意。');
      });
      return;
    }
  });
}

// ==================== Tab 1: 我的礼物（可送人） ====================
function renderMyGifts(members) {
  var html = '';
  if (GS.gifts.length === 0) {
    html += '<div style="text-align:center;padding:20px 0">' +
      '<p style="color:var(--text-muted);margin-bottom:12px;font-size:13px">暂无礼物</p>' +
      '<button id="getGiftBtn" style="padding:10px 24px;border:none;border-radius:10px;background:var(--accent-primary);color:#fff;cursor:pointer;font-size:13px;font-weight:600">🎁 获取礼物</button>' +
      '</div>';
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

      var giftName = (g.name && g.name.trim().length >= 2 && g.name !== '...' && g.name !== '…') ? g.name : '✨ 专属礼物';
      html += '<div style="background:#fff5f5;border-radius:10px;padding:10px;margin-bottom:8px">' +
        '<p style="font-weight:700;font-size:13px;margin-bottom:4px">' + escHtml(giftName) + badge + ' <span style="font-size:11px;color:#8b6b6b">[' + typeLabel + ']</span>' + fromLabel + (g.isRemade ? '<span style="color:#4caf50;font-size:11px;margin-left:4px">🔄 已改造</span>' : '') + '</p>' +
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

// ==================== Tab 2: 礼物柜（回礼） ====================
function renderReceivedGifts() {
  var html = '';
  var hasReturns = GS.returnGiftHistory && GS.returnGiftHistory.length > 0;

  if (!hasReturns) {
    html += '<p style="color:#8b6b6b;text-align:center;padding:20px 0">暂无收到回礼</p>';
    return html;
  }

  // 回礼（按 day 倒序）
  html += '<p style="font-size:12px;color:#8b6b6b;margin-bottom:8px;font-weight:600">📩 回礼（点击查看描述）</p>';
  for (var ri = GS.returnGiftHistory.length - 1; ri >= 0; ri--) {
    var rg = GS.returnGiftHistory[ri];
    var rm = MEMBERS.find(function(m) { return m.id === rg.memberId; });
    html += '<div class="gift-return-item" data-gift-ri="' + ri + '" style="background:#f0faf0;border-radius:8px;padding:8px;margin-bottom:6px;font-size:12px;cursor:pointer;transition:background 0.15s">' +
      (rm ? rm.emoji + ' ' + escHtml(rm.name) + '：' : '') + escHtml(rg.gift) + '<span style="color:#999;font-size:10px;margin-left:6px">Day ' + rg.day + '</span>' +
      '<span style="float:right;color:#4caf50;font-size:11px">📖</span></div>';
  }

  return html;
}

// ==================== AI 生成礼物描述（仅执行一次，结果缓存到 GS） ====================
async function getGiftDescription(rg, member) {
  // 已缓存 → 直接返回
  if (rg.giftDesc && rg.giftDesc.length > 0) return rg.giftDesc;

  try {
    var hp = GS.heroineProfile;
    var sysPrompt = '你只输出礼物描述文本，不要输出任何思考过程或解释。\n' +
      '礼物：' + rg.gift + '\n' +
      '赠送者：' + member.name + '（' + (member.personality || '') + '）\n' +
      '女主：' + hp.name + '，当前日期：Day ' + GS.day + '\n' +
      '要求：约100字，中文，自然叙事风格，贴合赠送者性格。只输出描述文本，不要标题和引号。';
    var desc = await callDeepSeek(sysPrompt, '回礼描述', 200, false, 0.7);

    if (!desc || desc.trim().length < 5) throw new Error('描述太短');

    // 剥离可能的思考痕迹（模型有时会输出"好的，用户要求..."等元文本）
    desc = desc.replace(/^好的[，,].*?(?=可以|我将|接下来|描述)/, '');
    desc = desc.replace(/^(我理解|根据|用户要求|作为).*?。\s*/, '');
    desc = desc.trim();

    // 存入缓存
    rg.giftDesc = desc;
    saveGame();
    return rg.giftDesc;
  } catch (e) {
    console.error('[getGiftDescription] 生成失败:', e);
    return rg.gift + '——来自' + member.name + '的心意。';
  }
}

// ==================== 礼物描述弹窗 ====================
function showGiftDescModal(rg, member, desc) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content">' +
    '<p style="font-size:12px;color:#8b6b6b;margin-bottom:4px">' + member.emoji + ' ' + escHtml(member.name) + ' 的回礼</p>' +
    '<h3 style="margin-bottom:12px">' + escHtml(rg.gift) + '<span style="font-size:11px;color:#999;margin-left:8px">Day ' + rg.day + '</span></h3>' +
    '<div style="background:#f0faf0;border-radius:8px;padding:12px;font-size:13px;line-height:1.7;color:#3d2c2c">' +
    escHtml(desc) +
    '</div>' +
    '<button class="btn-primary" id="giftDescClose" style="margin-top:14px;width:100%">关闭</button>' +
    '</div>';

  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
  overlay.querySelector('#giftDescClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
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

// ==================== 送礼逻辑（1v1 兼容） ====================
export async function sendGift(memberId, giftIdx) {
  var gift = GS.gifts[giftIdx];
  if (!gift) return;
  var member = MEMBERS.find(function(m) { return m.id === memberId; });
  if (!member) return;

  if (GS.gameMode === 'oneHeart') {
    // 1v1 模式：走 AI 完整生成
    showLoading('正在生成送礼剧情...');
    try {
      var prefType = MEMBER_GIFT_PREFERENCE[member.id];
      var bonus = (gift.type === prefType) ? 5 : randInt(2, 3);
      updateAffection(memberId, bonus);
      addAffectionLog(memberId, bonus, '收到礼物「' + gift.name + '」' + (bonus >= 5 ? '（对口）' : '（通用）'));
      GS.gifts.splice(giftIdx, 1);
      GS.pendingChoiceText = '🎁 送礼给 ' + member.name + '：' + gift.name;
      saveGame();
      window.scheduleReturnGift(memberId);
      await window.generateOneHeartRound();
    } catch (e) {
      console.error('[sendGift] 1v1 送礼失败:', e);
      showToast('⚠️ 送礼失败：' + e.message);
    }
    hideLoading();
    return;
  }

  // 换乘模式（原逻辑不变）
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

// ==================== 改造礼物（1v1 兼容） ====================
export function showRemakeGiftModal(giftIdx) {
  var gift = GS.gifts[giftIdx];
  if (!gift) return;
  var members;
  if (GS.gameMode === 'oneHeart') {
    var om = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
    members = om ? [om] : [];
  } else {
    members = GS.selectedMembers.map(function(id) {
      return MEMBERS.find(function(m) { return m.id === id; });
    });
  }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>🔧 选择改造方向</h3>' +
    '<p style="font-size:12px;color:#8b6b6b;margin-bottom:10px">将「' + escHtml(gift.name) + '」改造成什么类型的礼物？</p>' +
    '<div style="display:flex;flex-direction:column;gap:8px">';
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var prefType = MEMBER_GIFT_PREFERENCE[m.id];
    var types = [
      { key: 'handcraft', label: '🧶 手作类', bonus: prefType === 'handcraft' ? ' +5 ⭐' : ' +2~3' },
      { key: 'food', label: '🍪 食物类', bonus: prefType === 'food' ? ' +5 ⭐' : ' +2~3' },
      { key: 'emotion', label: '💌 情感类', bonus: prefType === 'emotion' ? ' +5 ⭐' : ' +2~3' }
    ];
    for (var t = 0; t < types.length; t++) {
      var tp = types[t];
      inner += '<button class="sms-target-btn" data-member-id="' + m.id + '" data-type="' + tp.key + '" style="font-size:14px;padding:12px">' +
        m.emoji + ' ' + m.name + ' → ' + tp.label + '（' + tp.bonus + '）</button>';
    }
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
    btn.addEventListener('click', async function() {
      var memberId = this.dataset.memberId;
      var chosenType = this.dataset.type;
      this.disabled = true;
      this.textContent = '✨ 生成中...';
      var member = MEMBERS.find(function(m) { return m.id === memberId; });
      var typeLabel = chosenType === 'handcraft' ? '手作' : chosenType === 'food' ? '食物' : '情感';

      try {
        var prompt = '你是一位浪漫的礼物改造师。把「' + gift.name + '」改造成「' + typeLabel + '」类的礼物，送给' + (member ? member.name : '对方') + '。\n' +
          '要求：名称不超过12字，描述不超过40字，体现出专属感和用心。\n' +
          '输出格式：{"name":"改造后的名称","desc":"简短描述"}';
        var res = await callDeepSeek(prompt, '改造礼物', 200, false, 0.8);
        var parsed;
        try {
          parsed = JSON.parse(res);
        } catch (e) {
          var m = res.match(/\{[\s\S]*\}/);
          if (m) parsed = JSON.parse(m[0]);
        }
        if (parsed && parsed.name) {
          gift.name = parsed.name;
          gift.desc = parsed.desc || '';
        } else {
          // AI 返回异常时从同类型池兜底
          var chosenTemplates = GIFT_TEMPLATES.filter(function(g) { return g.type === chosenType; });
          var fallback = chosenTemplates[Math.floor(Math.random() * chosenTemplates.length)];
          gift.name = fallback.name;
          gift.desc = fallback.desc;
        }
      } catch (e) {
        var chosenTemplates2 = GIFT_TEMPLATES.filter(function(g) { return g.type === chosenType; });
        var fallback2 = chosenTemplates2[Math.floor(Math.random() * chosenTemplates2.length)];
        gift.name = fallback2.name;
        gift.desc = fallback2.desc;
      }

      // 确保 name 有效（防止 Safari 等浏览器上 AI 返回异常导致显示 ...）
      if (!gift.name || gift.name.trim().length < 2 || gift.name === '...' || gift.name === '…') {
        gift.name = '专属「' + (member ? member.name : 'ta') + '」的礼物';
      }
      gift.type = chosenType;
      gift.isRemade = true;
      saveGame();
      overlay.remove();
      showGiftPanel();
    });
  });
}
