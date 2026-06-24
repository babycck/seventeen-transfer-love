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
    (GS.day >= 10 && !GS.gameOver ? '<span class="countdown-tag" style="font-size:12px;font-weight:700;color:#c62828;padding:3px 10px;background:rgba(255,205,210,0.85);border-radius:12px;margin-left:6px;animation:pulse-sms 1.5s infinite">⏳ 距离最终选择还有 ' + (12 - GS.day) + ' 天</span>' : '') +
    '<span class="affection-hint" id="affectionHint" title="点击查看好感度详情">' +
    members.map(function(m) { return getAffectionHint(m.id); }).join(' · ') +
    '</span>' +
    '<div class="header-btns">' +
    '<button id="apiSettingsBtn" title="API设置">⚙️</button>' +
    '<button id="helpBtn" title="规则速览">❓</button>' +
    '<button id="helpManualBtn" title="使用说明">📖</button>' +
    '<button id="historyBtn" title="历史剧情回顾">📖</button>' +
    '<button id="xArchiveBtn" title="查看X档案">📋</button>' +
    '<button id="smsHistoryBtn" title="查看短信历史">📜</button>' +
    (Object.keys(GS.heartNotes).length > 0 ? '<button id="heartNotesBtn" title="心动笔记">📝</button>' : '') +
    '<button id="giftBtn" title="礼物 / 送礼记录">🎁</button>' +
    '<button id="exportBtn" title="导出剧情记录">📥</button>' +
    '<button id="saveExportBtn" title="导出存档(JSON)">💾</button>' +
    '<button id="saveImportBtnLabel" title="导入存档(JSON)" onclick="document.getElementById(\'saveImportInput\').click()">📂</button>' +
    '<input type="file" id="saveImportInput" accept=".json" style="display:none">' +
    (GS.day === 7 && GS.midnightCall && GS.midnightCall.status === 'done' ? '<button id="midnightCallRecordBtn" title="午夜电话记录（Day 7 反馈）">📞</button>' : '') +
    '<button id="resetGameBtn" title="重置游戏">🔄</button>' +
    '<button id="themeToggleBtn" title="切换深色/浅色模式">🌙</button>' +
    '<select id="typewriterSpeedSelect" title="打字机速度" style="margin-left:4px;padding:3px 6px;border-radius:10px;border:1px solid var(--border-primary);background:var(--bg-soft);color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:inherit">' +
    '<option value="0">即时</option><option value="100">慢</option><option value="50" selected>中</option><option value="20">快</option><option value="10">极快</option></select>' +
    '</div></div>';

  return html;
}
