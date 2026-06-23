import { GS } from '../state.js';
import { MEMBERS, PHASES, PHASE_LABELS } from '../data.js';
import { getAffectionHint, getAffectionDesc } from '../affection.js';

// 渲染顶部 Header（日期/时段/天气/好感度提示/功能按钮）
export function renderHeader() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  }).filter(function(m) { return m; });

  var phaseLabel = PHASE_LABELS[PHASES[GS.phaseIndex]];
  var dateText = 'Day ' + GS.day + (GS.currentDate && GS.currentDate.month ? ' · ' + GS.currentDate.month + '月' + GS.currentDate.day + '日' : '');

  var html = '<div class="header">' +
    '<span class="day-badge">' + dateText + '</span>' +
    '<span class="phase-tag">' + phaseLabel + '</span>' +
    (GS.weather ? '<span class="weather-tag" style="font-size:11px;padding:2px 8px;background:rgba(255,255,255,0.7);border-radius:8px;margin-left:4px">' + GS.weather + '</span>' : '') +
    '<span class="affection-hint" id="affectionHint" title="点击查看好感度详情">' +
    members.map(function(m) { return getAffectionHint(m.id); }).join(' · ') +
    '</span>' +
    '<div class="header-btns">' +
    '<button id="apiSettingsBtn" title="API设置">⚙️</button>' +
    '<button id="helpBtn" title="规则速览">❓</button>' +
    '<button id="historyBtn" title="历史剧情回顾">📖</button>' +
    '<button id="xArchiveBtn" title="查看X档案">📋</button>' +
    '<button id="smsHistoryBtn" title="查看短信历史">📜</button>' +
    (Object.keys(GS.heartNotes).length > 0 ? '<button id="heartNotesBtn" title="心动笔记">📝</button>' : '') +
    (GS.gifts && GS.gifts.length > 0 ? '<button id="giftBtn" title="小礼物">🎁</button>' : '') +
    '<button id="exportBtn" title="导出剧情记录">📥</button>' +
    (GS.midnightCall && (GS.midnightCall.status === 'done' || GS.midnightCall.status === 'skipped') ? '<button id="midnightCallRecordBtn" title="午夜电话记录">📞</button>' : '') +
    '<button id="resetGameBtn" title="重置游戏">🔄</button>' +
    '</div></div>';

  return html;
}
