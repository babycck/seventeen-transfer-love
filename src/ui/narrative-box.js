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
        var memberTag = b.member ? '【' + escHtml(b.member) + '】' : '';
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
            /^(李龙真|金叡园|郑基锡|[\u4e00-\u9fa5]+)[：:](.*)$/,
            function(match, name, rest) {
              return '<span class="obs-name">' + escHtml(name) + '：</span>' + escHtml(rest);
            }
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
        /^(李龙真|金叡园|郑基锡|[\u4e00-\u9fa5]+)[：:](.*)$/,
        function(match, name, rest) {
          return '<span class="obs-name">' + escHtml(name) + '：</span>' + escHtml(rest);
        }
      );
      html += '<div class="observer-os">💭 ' + formatted2 + '</div>';
    }
  }
  return html;
}

// 渲染完整叙事区域（含 choice-tag 分割线）
export function renderNarrativeSection() {
  var html = '<div class="card"><div class="narrative-box" id="narrativeBox" data-narrative-html="';

  var narrativeHtml = '';
  if (GS.phaseNarrative) {
    narrativeHtml += renderParsedNarrative(GS.parsedNarrative);
  }
  if (GS.consequenceNarratives) {
    for (var i = 0; i < GS.consequenceNarratives.length; i++) {
      narrativeHtml += '<div class="separator"></div>';
      var cn = GS.consequenceNarratives[i];
      if (cn.choiceText) {
        narrativeHtml += '<div class="choice-tag">❥ 你的选择：' + escHtml(cn.choiceText) + '</div>';
      }
      narrativeHtml += renderParsedNarrative(cn.parsed);
    }
  }

  html += escHtml(narrativeHtml) + '">';
  html += narrativeHtml;
  html += '</div></div>';
  return html;
}

// 打字机效果：逐字显示叙事内容
export function startTypewriter(containerId, speed) {
  speed = speed || 30;
  var container = document.getElementById(containerId);
  if (!container) return;
  var fullHtml = container.getAttribute('data-narrative-html');
  if (!fullHtml) return;
  container.innerHTML = '';
  container.removeAttribute('data-narrative-html');
  // 将 HTML 拆分为原子单元（字符和标签）
  var units = [];
  var buf = '';
  var inTag = false;
  for (var i = 0; i < fullHtml.length; i++) {
    var c = fullHtml[i];
    if (c === '<') { inTag = true; if (buf) { units.push({ t:'text', v:buf }); buf = ''; } buf = '<'; }
    else if (c === '>') { buf += '>'; units.push({ t:'tag', v:buf }); buf = ''; inTag = false; }
    else if (inTag) { buf += c; }
    else { buf += c; }
  }
  if (buf) units.push({ t: inTag ? 'tag' : 'text', v: buf });

  var html = '';
  var idx = 0;
  var textBuf = '';

  function flushText() {
    if (!textBuf) return 0;
    var len = textBuf.length;
    for (var k = 0; k < len; k++) {
      (function(pos) {
        setTimeout(function() {
          html += textBuf[pos];
          container.innerHTML = html + '<span class="typewriter-cursor">|</span>';
          container.scrollTop = container.scrollHeight;
        }, pos * speed);
      })(k);
    }
    html += textBuf;
    textBuf = '';
    return len * speed;
  }

  function process() {
    for (; idx < units.length; idx++) {
      var u = units[idx];
      if (u.t === 'tag') {
        flushText();
        html += u.v;
      } else {
        textBuf = u.v;
        var delay = flushText();
        idx++;
        if (delay > 0) {
          setTimeout(process, delay + speed);
          return;
        }
      }
    }
    // 完成后移除光标
    setTimeout(function() {
      container.innerHTML = html;
    }, speed * 2);
  }

  process();
}
