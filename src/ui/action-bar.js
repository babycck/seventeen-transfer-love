import { GS } from '../state.js';
import { MAX_STAY_COUNT } from '../data.js';

// 渲染底部操作栏
export function renderActionBar(hasConsequences, phaseChoicesExhausted, isDay11) {
  var isNight = GS.phaseIndex === 3;
  var smsSent = GS.smsSentToday;
  var stayExhausted = GS.stayCount >= MAX_STAY_COUNT;

  // 真心话模式下只显示重新生成
  if (GS.truthState && GS.truthState.active) {
    return '<div class="card"><div class="action-bar" id="actionBar">' +
      '<button class="btn-regenerate" id="btnSkipTruth" style="background:linear-gradient(135deg,#ff8a65,#ff6f00);color:#fff;border:none">⏭ 跳过真心话进入下一时段</button>' +
      '<button class="btn-regenerate" id="btnRegenerate">🔄 重新生成本段</button></div></div>';
  }

  var html = '<div class="card"><div class="action-bar" id="actionBar">';

  if (!hasConsequences) {
    html += '<button class="btn-regenerate" id="btnRegenerate">🔄 重新生成本段</button>';
    if (!phaseChoicesExhausted || isDay11) {
      html += '<button class="btn-skip" id="btnSkip">▶ ' + (isNight ? '进入下一天' : '跳过进入下一时段') + '</button>';
    } else {
      html += '<button class="btn-skip" id="btnSkip" style="font-weight:900">▶ ' + (isNight ? '进入下一天' : '进入下一时段') + '</button>';
    }
    if (isNight && !smsSent && !GS.gameOver) {
      if (GS.day === 6 && GS.midnightCall && GS.midnightCall.status === 'pending') {
        html += '<button class="btn-sms" id="btnMidnightCall" style="background:linear-gradient(135deg,#7c4dff,#651fff);color:#fff;border:none">📞 午夜电话亭</button>';
      }
      html += '<button class="btn-sms" id="btnSms">📨 发送心动短信</button>';
    }
  } else {
    // 有后续剧情：显示下一时段+重生成
    if (!isNight) {
      if (!phaseChoicesExhausted || isDay11) {
        html += '<button class="btn-skip" id="btnNextPhase">▶ 进入下一时段</button>';
      } else {
        html += '<button class="btn-skip" id="btnNextPhase" style="font-weight:900">▶ 进入下一时段</button>';
      }
      html += '<button class="btn-regenerate" id="btnRegenerate">🔄 重新生成本段</button>';
    } else {
      if (!smsSent && !GS.gameOver) {
        if (GS.day === 6 && GS.midnightCall && GS.midnightCall.status === 'pending') {
          html += '<button class="btn-sms" id="btnMidnightCall" style="background:linear-gradient(135deg,#7c4dff,#651fff);color:#fff;border:none">📞 午夜电话亭</button>';
        }
        html += '<button class="btn-sms" id="btnSms">📨 发送心动短信</button>';
      }
      html += '<button class="btn-regenerate" id="btnRegenerate">🔄 重新生成本段</button>';
    }
  }

  // 短信发送后显示进入下一天/继续今天
  if (smsSent && isNight) {
    html += '<button class="btn-next-day" id="btnNextDay">✅ 确认进入下一天</button>';
    if (!stayExhausted) {
      html += '<button class="btn-continue" id="btnContinue">✍️ 继续今天（' + GS.stayCount + '/' + MAX_STAY_COUNT + '）</button>';
    }
  }

  html += '</div></div>';
  return html;
}
