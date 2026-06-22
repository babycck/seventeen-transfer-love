import { escHtml } from '../core.js';
import { GS } from '../state.js';

// 渲染剧情内容（blocks 优先，兼容旧字段格式）
export function renderParsedNarrative(parsed) {
  var html = '';

  if (parsed.blocks && parsed.blocks.length > 0) {
    for (var i = 0; i < parsed.blocks.length; i++) {
      var b = parsed.blocks[i];
      var content = (b.content || '').trim();
      if (!content) continue;

      if (b.type === 'narrative') {
        var paras = content.split('\n').filter(function(p) { return p.trim(); });
        for (var p = 0; p < paras.length; p++) {
          html += '<p>' + escHtml(paras[p]) + '</p>';
        }
      } else if (b.type === 'interview') {
        html += '<div class="interview">🎙 <strong>【采访间】</strong> ' + escHtml(content) + '</div>';
      } else if (b.type === 'xInterview') {
        html += '<div class="x-interview">🎙️💔 <strong>【X采访间】</strong> ' + escHtml(content) + '</div>';
      } else if (b.type === 'memberInterview') {
        var memberTag = b.member ? '【' + b.member + '】' : '';
        html += '<div class="member-interview">🎤 <strong>' + memberTag + '</strong> ' + escHtml(content) + '</div>';
      } else if (b.type === 'directorOS') {
        var dlines = content.split('\n').filter(function(l) { return l.trim(); });
        for (var m = 0; m < dlines.length; m++) {
          html += '<div class="director-os">🎬 <strong>【导演OS】</strong> ' + escHtml(dlines[m]) + '</div>';
        }
      } else if (b.type === 'observerOS') {
        var olines = content.split('\n').filter(function(l) { return l.trim(); });
        for (var n = 0; n < olines.length; n++) {
          var formatted = olines[n].replace(
            /^(李龙真|金叡园|郑基锡|[\u4e00-\u9fa5]+)[：:]/,
            '<span class="obs-name">$1：</span>'
          );
          html += '<div class="observer-os">💭 ' + formatted + '</div>';
        }
      }
    }
    return html;
  }

  // 旧格式兼容
  if (parsed.narrative) {
    var paras2 = parsed.narrative.split('\n').filter(function(p) { return p.trim(); });
    for (var ii = 0; ii < paras2.length; ii++) {
      html += '<p>' + escHtml(paras2[ii]) + '</p>';
    }
  }
  if (parsed.interviews && parsed.interviews.length > 0) {
    for (var j = 0; j < parsed.interviews.length; j++) {
      html += '<div class="interview">🎙 <strong>【采访间】</strong> ' + escHtml(parsed.interviews[j]) + '</div>';
    }
  }
  if (parsed.xInterviews && parsed.xInterviews.length > 0) {
    for (var k = 0; k < parsed.xInterviews.length; k++) {
      html += '<div class="x-interview">🎙️💔 <strong>【X采访间】</strong> ' + escHtml(parsed.xInterviews[k]) + '</div>';
    }
  }
  if (parsed.memberInterviews && parsed.memberInterviews.length > 0) {
    for (var l = 0; l < parsed.memberInterviews.length; l++) {
      html += '<div class="member-interview">🎤 ' + escHtml(parsed.memberInterviews[l]) + '</div>';
    }
  }
  if (parsed.directorOS) {
    var dlines2 = parsed.directorOS.split('\n').filter(function(l) { return l.trim(); });
    for (var mm = 0; mm < dlines2.length; mm++) {
      html += '<div class="director-os">🎬 <strong>【导演OS】</strong> ' + escHtml(dlines2[mm]) + '</div>';
    }
  }
  if (parsed.observerOS) {
    var olines2 = parsed.observerOS.split('\n').filter(function(l) { return l.trim(); });
    for (var nn = 0; nn < olines2.length; nn++) {
      var formatted2 = olines2[nn].replace(
        /^(李龙真|金叡园|郑基锡|[\u4e00-\u9fa5]+)[：:]/,
        '<span class="obs-name">$1：</span>'
      );
      html += '<div class="observer-os">💭 ' + formatted2 + '</div>';
    }
  }
  return html;
}

// 渲染完整叙事区域（含 choice-tag 分割线）
export function renderNarrativeSection() {
  var html = '<div class="card"><div class="narrative-box" id="narrativeBox">';

  if (GS.phaseNarrative) {
    html += renderParsedNarrative(GS.parsedNarrative);
  }
  if (GS.consequenceNarratives) {
    for (var i = 0; i < GS.consequenceNarratives.length; i++) {
      html += '<div class="separator"></div>';
      var cn = GS.consequenceNarratives[i];
      if (cn.choiceText) {
        html += '<div class="choice-tag">❥ 你的选择：' + escHtml(cn.choiceText) + '</div>';
      }
      html += renderParsedNarrative(cn.parsed);
    }
  }

  html += '</div></div>';
  return html;
}
