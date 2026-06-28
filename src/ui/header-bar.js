import { GS } from '../state.js';
import { MEMBERS, PHASES, PHASE_LABELS } from '../data.js';
import { getAffectionHint, getAffectionDesc } from '../affection.js';

// 渲染顶部 Header（日期/时段/天气/好感度提示/6个功能按钮）
export function renderHeader() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  }).filter(function(m) { return m; });

  var dateText = GS.gameMode === 'oneHeart' && GS.currentDate && GS.currentDate.month
    ? (GS.oneHeartStartYear || 2025) + '年' + GS.currentDate.month + '月' + GS.currentDate.day + '日 · ' + (GS.oneHeartTimeOfDay || '上午')
    : 'Day ' + GS.day + (GS.currentDate && GS.currentDate.month ? ' · ' + GS.currentDate.month + '月' + GS.currentDate.day + '日' : '');

  var html = '<div class="header">' +
    '<span class="day-badge">' + dateText + '</span>' +
    (GS.gameMode !== 'oneHeart' ? '<span class="phase-tag">' + PHASE_LABELS[PHASES[GS.phaseIndex]] + '</span>' : '') +
    (GS.gameMode !== 'oneHeart' && GS.weather ? '<span class="weather-tag" style="font-size:11px;padding:2px 8px;background:rgba(255,255,255,0.7);border-radius:8px;margin-left:4px">' + GS.weather + '</span>' : '') +
    (GS.gameMode === 'transfer' && GS.day >= 10 && !GS.gameOver ? '<span class="countdown-tag" style="font-size:12px;font-weight:700;color:#c62828;padding:3px 10px;background:rgba(255,205,210,0.85);border-radius:12px;margin-left:6px;animation:pulse-sms 1.5s infinite">⏳ 距离最终选择还有 ' + (12 - GS.day) + ' 天</span>' : '') +
    '<span class="affection-hint" id="affectionHint" title="点击查看好感度详情">' +
    members.map(function(m) { return getAffectionHint(m.id); }).join(' · ') +
    '</span>' +
    '<div class="header-btns">' +
    '<button id="settingsBtn" title="设置">⚙️</button>' +
    '<button id="helpBtn" title="帮助（规则速览·使用说明）">❓</button>' +
    '<button id="reviewBtn" title="回顾（历史剧情·短信历史）">📚</button>' +
    (GS.gameMode !== 'oneHeart' ? '<button id="archiveBtn" title="档案（X档案·记忆物品·心动笔记·秘密任务）">📋</button>' : '') +
    (GS.gameMode === 'oneHeart' || (GS.gifts && GS.gifts.length > 0) ? '<button id="giftBtn" title="礼物 / 送礼记录">🎁</button>' : '') +
    (GS.day === 7 && GS.midnightCall && GS.midnightCall.status === 'done' ? '<button id="midnightCallRecordBtn" title="午夜电话记录（Day 7 反馈）">📞</button>' : '') +
    '</div></div>';

  return html;
}
