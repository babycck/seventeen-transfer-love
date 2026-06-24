import { escHtml } from '../core.js';
import { GS } from '../state.js';
import { MEMBERS, PHASE_ACTION_LIMIT } from '../data.js';

// 渲染普通选项面板
export function renderOptionPanel(phaseChoicesExhausted, isDay11) {
  var isNight = GS.phaseIndex === 3;
  var opts = GS.currentOptions;
  var isDatingDayPhase0 = [4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0;
  if (opts.length > 0 && (!phaseChoicesExhausted || isDay11 || isDatingDayPhase0) && !isNight) {
    var html = '<div class="card"><div class="options-area" id="optionsArea">';
    var labels = ['A', 'B', 'C'];
    for (var j = 0; j < opts.length; j++) {
      var isSpecial = opts[j].text.indexOf('进入约会场景') >= 0;
      var optText = opts[j].text;
      var optAffHtml = '';
      if (opts[j].affName && opts[j].affDelta) {
        var aSign = opts[j].affDelta > 0 ? '+' : '';
        var aColor = opts[j].affDelta > 0 ? '#2e7d32' : '#c62828';
        optAffHtml += '<span style="display:block;font-size:10px;color:' + aColor + ';margin-top:2px">' +
          escHtml(opts[j].affName) + ' ' + aSign + opts[j].affDelta;
        if (opts[j].affReason) optAffHtml += ' · ' + escHtml(opts[j].affReason);
        optAffHtml += '</span>';
      }
      if (opts[j].riskMember && opts[j].riskDelta) {
        var rSign = opts[j].riskDelta > 0 ? '+' : '';
        var rColor = opts[j].riskDelta > 0 ? '#2e7d32' : '#c62828';
        optAffHtml += '<span style="display:block;font-size:10px;color:' + rColor + ';margin-top:2px">风险：' +
          escHtml(opts[j].riskMember) + ' ' + rSign + opts[j].riskDelta + '</span>';
      }
      html += '<button class="option-btn' + (isSpecial ? ' btn-special' : '') + '" data-idx="' + j + '">' +
        '<span class="opt-label">' + (labels[j] || (j + 1)) + '</span>' +
        escHtml(optText) + optAffHtml + '</button>';
    }
    if (!isDay11) {
      html += '<p style="font-size:10px;color:#8b6b6b;text-align:right;margin-top:4px">本时段剩余行动次数：' +
        Math.max(0, PHASE_ACTION_LIMIT - (GS.phaseOptionCount + GS.phaseFreeCount)) + '/' + PHASE_ACTION_LIMIT + '</p>';
    } else if (!GS.truthState) {
      html += '<p style="font-size:10px;color:#8b6b6b;text-align:right;margin-top:4px">Day 11 真心话环节 · 不限制选项次数</p>';
    }
    html += '</div></div>';
    return html;
  } else if (phaseChoicesExhausted && !isDay11 && !GS.smsSentToday) {
    return '<div class="card"><p style="text-align:center;color:#8b6b6b;font-size:13px">本时段选项次数已用完，请进入下一时段。</p></div>';
  }
  return '';
}

// 渲染真心话面板
export function renderTruthPanel() {
  if (!GS.truthState || !GS.truthState.active) return '';
  var ts = GS.truthState;
  var levelLabels = { light: '轻度', medium: '中度', deep: '深度' };
  var currentLevel = ts.round === 1 ? 'light' : ts.round === 2 ? 'medium' : 'deep';
  var drawerId = ts.drawerOrder[ts.subRound - 1];
  var isHeroineTurn = (drawerId === 'heroine');
  var html = '<div class="card"><div class="options-area" id="optionsArea">';

  if (isHeroineTurn) {
    // 女主回合：显示预抽的问题
    if (ts.currentCard) {
      html += '<div style="margin-bottom:8px;padding:8px;background:#fff3e0;border-radius:8px;font-size:13px">';
      html += '<strong>🎴 你的问题</strong><br><span style="color:#5d3a3a">' + escHtml(ts.currentCard.text) + '</span></div>';
    }
    html += '<button class="option-btn" data-idx="0"><span class="opt-label">A</span>如实回答（自由输入）</button>';
    html += '<button class="option-btn" data-idx="1"><span class="opt-label">B</span>拒绝回答并喝酒（+1杯）</button>';
  } else {
    var dm = MEMBERS.find(function(m) { return m.id === drawerId; });
    var dname = dm ? dm.name : '嘉宾';
    // 非女主回合：不显示问题，只显示名称和观看按钮（问题由 AI 在剧情中抽）
    html += '<div style="margin-bottom:8px;padding:8px;background:#f5f5f5;border-radius:8px;font-size:13px">';
    html += '<strong>🎴 ' + dname + '的回合</strong>';
    html += '</div>';
    html += '<button class="option-btn btn-special" data-idx="0"><span class="opt-label">▶</span>观看' + dname + '的回合</button>';
  }
  html += '<p style="font-size:10px;color:#8b6b6b;text-align:right;margin-top:4px">真心话第' + ts.round + '/3轮（' + levelLabels[currentLevel] + '）· 第' + ts.subRound + '/4人 · 当前：' + (isHeroineTurn ? '女主' : (dm ? dm.name : '嘉宾')) + '</p>';

  // 实时喝酒计数
  var drinkLines = [];
  for (var did in GS.drinkCounts) {
    var dn = did === 'heroine' ? '你' : (MEMBERS.find(function(m){return m.id===did})||{}).name;
    if (dn) drinkLines.push(dn + '：' + GS.drinkCounts[did] + '杯');
  }
  if (drinkLines.length > 0) {
    html += '<div style="margin-top:6px;padding:6px 8px;background:#fff3e0;border-radius:6px;font-size:11px;color:#e65100">🍺 ' + drinkLines.join(' | ') + '</div>';
  }
  html += '</div></div>';
  return html;
}

// 渲染提问箱面板
export function renderQuestionBoxPanel() {
  if (!GS.questionBox || !GS.questionBox.active) return '';
  return '<div class="card"><div class="options-area" id="optionsArea">' +
    '<div style="margin-bottom:8px;padding:8px;background:#fff3e0;border-radius:8px;font-size:13px;color:#5d3a3a">' +
    '<strong>📦 匿名提问箱</strong><br><span style="color:#8b6b6b">问题：' + escHtml(GS.questionBox.currentQuestion) + '</span></div>' +
    '<button class="option-btn" id="qbAnswer" data-idx="0"><span class="opt-label">A</span>如实回答</button>' +
    '<button class="option-btn" id="qbDrink" data-idx="1"><span class="opt-label">B</span>拒绝回答并喝酒（+2杯）</button>' +
    '</div></div>';
}
