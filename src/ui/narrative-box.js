import { escHtml, showToast, saveGame } from '../core.js';
import { GS } from '../state.js';

// 中文自动断句：按句末标点断，不依赖 AI 的 \n，引号内不断
function splitChineseSentences(text) {
  if (!text) return [''];
  var result = [];
  var buf = '';
  var quoteDepth = 0;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (ch === '\n' || ch === '\r') continue;
    buf += ch;
    // 引号嵌套：ASCII " 用 toggle，中文引号用方向
    if (ch === '"' && quoteDepth === 0) { quoteDepth++; continue; }
    if (ch === '"' && quoteDepth > 0) { quoteDepth--; continue; }
    if (ch === '\u201c') { quoteDepth++; continue; }
    if (ch === '\u201d' && quoteDepth > 0) { quoteDepth--; continue; }
    if (ch === '\u300c') { quoteDepth++; continue; }
    if (ch === '\u300d' && quoteDepth > 0) { quoteDepth--; continue; }
    if (quoteDepth > 0) continue;
    // 句末标点断句
    if ('。！？；.!?;'.indexOf(ch) >= 0) {
      var next = text[i + 1] || '';
      if (next === '' || next === ' ' || (next >= '\u4e00' && next <= '\u9fff') || next === '\n') {
        result.push(buf.trim());
        buf = '';
      }
    }
  }
  if (buf.trim()) result.push(buf.trim());
  return result;
}

// 渲染剧情内容（blocks 优先，兼容旧字段格式）
export function renderParsedNarrative(parsed) {
  var html = '';

  if (parsed.blocks && parsed.blocks.length > 0) {
    for (var i = 0; i < parsed.blocks.length; i++) {
      var b = parsed.blocks[i];
      var content = (b.content || '').trim();
      if (!content) continue;

      if (b.type === 'narrative') {
        var paras = splitChineseSentences(content);
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
    var paras2 = splitChineseSentences(parsed.narrative);
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
  var hasConsequences = GS.consequenceNarratives && GS.consequenceNarratives.length > 0;

  var html = '<div class="card"><div class="narrative-box" id="narrativeBox">';

  // 约会地点横幅
  if (GS.currentDatingLocation && GS.currentDatingLocation.name) {
    html += '<div class="dating-location-banner">📍 ' + escHtml(GS.currentDatingLocation.name) + '</div>';
  }

  if (GS.phaseNarrative) {
    html += renderParsedNarrative(GS.parsedNarrative);
  }
  if (hasConsequences) {
    // 除最后一条外，已有剧情直接显示
    for (var i = 0; i < GS.consequenceNarratives.length - 1; i++) {
      html += '<div class="separator"></div>';
      var cn = GS.consequenceNarratives[i];
      if (cn.choiceText) {
        html += '<div class="choice-tag">❥ 你的选择：' + escHtml(cn.choiceText) + '</div>';
      }
      html += renderParsedNarrative(cn.parsed);
    }
    // 最后一条新剧情：放入打字机容器
    var lastCn = GS.consequenceNarratives[GS.consequenceNarratives.length - 1];
    var newHtml = '';
    if (lastCn.choiceText) {
      newHtml += '<div class="choice-tag">❥ 你的选择：' + escHtml(lastCn.choiceText) + '</div>';
    }
    newHtml += renderParsedNarrative(lastCn.parsed);
    html += '<div class="separator"></div>';
    html += '<div id="narrativeNewContent" data-narrative-html="' + escHtml(newHtml) + '">';
    html += newHtml;
    html += '</div>';
  }

  html += '<button class="narrative-edit-btn" id="narrativeEditBtn" title="编辑剧情">✏️ 编辑</button>';
  html += '</div></div>';

  // 如果没有后续剧情，首次打字机用 data-narrative-html
  if (!hasConsequences && GS.phaseNarrative) {
    var allHtml = '';
    if (GS.phaseNarrative) {
      allHtml += renderParsedNarrative(GS.parsedNarrative);
    }
    html = '<div class="card"><div class="narrative-box" id="narrativeBox" data-narrative-html="' + escHtml(allHtml) + '">' + allHtml + '</div></div>';
    html += '<button class="narrative-edit-btn" id="narrativeEditBtn" title="编辑剧情">✏️ 编辑</button>';
  }

  return html;
}

// 打字机效果：逐字显示叙事内容
export function startTypewriter(containerId, speed) {
  if (speed == null) speed = 30;
  var container = document.getElementById(containerId);
  if (!container) return;
  var fullHtml = container.getAttribute('data-narrative-html');
  if (!fullHtml) return;
  container.innerHTML = '';
  container.removeAttribute('data-narrative-html');

  if (speed === 0) {
    container.innerHTML = fullHtml;
    showEditButton();
    return;
  }

  // 将 HTML 拆分为原子单元（字符和标签）
  var units = [];
  var buf = '';
  var inTag = false;
  for (var i = 0; i < fullHtml.length; i++) {
    var c = fullHtml[i];
    if (c === '<') {
      if (buf) { units.push({ t: 'text', v: buf }); buf = ''; }
      inTag = true; buf = '<';
    } else if (c === '>') {
      buf += '>'; units.push({ t: 'tag', v: buf }); buf = ''; inTag = false;
    } else if (inTag) {
      buf += c;
    } else {
      buf += c;
    }
  }
  if (buf) units.push({ t: inTag ? 'tag' : 'text', v: buf });

  if (units.length === 0) return;

  // 点击容器跳过动画
  container.onclick = function skipAnimation() {
    if (unitIdx >= units.length) return;
    clearInterval(timer);
    showAll();
  };

  var html = '';
  var unitIdx = 0;
  var charIdx = 0;
  var atBottom = true;

  function showAll() {
    html = '';
    for (var ui = 0; ui < units.length; ui++) {
      html += units[ui].v;
    }
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
    unitIdx = units.length;
    showEditButton();
  }

  var timer = setInterval(function() {
    if (unitIdx >= units.length) {
      container.innerHTML = html;
      clearInterval(timer);
      showEditButton();
      return;
    }

    var u = units[unitIdx];
    if (u.t === 'tag') {
      html += u.v;
      unitIdx++;
      charIdx = 0;
    } else {
      if (charIdx < u.v.length) {
        html += u.v[charIdx];
        charIdx++;
      } else {
        unitIdx++;
        charIdx = 0;
      }
    }

    // 更新 innerHTML
    var displayHtml = html;
    var cursorNeeded = unitIdx < units.length;
    if (cursorNeeded) {
      if (html.lastIndexOf('<') > html.lastIndexOf('>')) {
        displayHtml += '</span>';
      }
      displayHtml += '<span class="typewriter-cursor">|</span>';
    }
    container.innerHTML = displayHtml;

    // 检测用户滚动位置（在 innerHTML 更新后）
    var dist = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (dist > 60) atBottom = false;
    else if (dist < 10) atBottom = true;

    // 只在用户位于底部时自动滚动
    if (atBottom) container.scrollTop = container.scrollHeight;
  }, speed);
}

// ==================== 剧情编辑功能 ====================

var _narrativeEditorOverlay = null;

// 从 parsedNarrative 中提取剧情文本（仅 narrative 类型，不含采访间/OS）
function extractNarrativeText(parsed) {
  if (!parsed || !parsed.blocks || parsed.blocks.length === 0) return '';
  var parts = [];
  for (var i = 0; i < parsed.blocks.length; i++) {
    var b = parsed.blocks[i];
    if (b.type === 'narrative' && b.content) {
      parts.push(b.content);
    }
  }
  return parts.join('\n\n');
}

export function showNarrativeEditor() {
  if (!GS.phaseNarrative || !GS.parsedNarrative || !GS.parsedNarrative.blocks) {
    showToast('⚠️ 暂无剧情可编辑');
    return;
  }

  var text = extractNarrativeText(GS.parsedNarrative);

  var overlay = document.createElement('div');
  overlay.className = 'narrative-editor-overlay';
  overlay.innerHTML =
    '<div class="narrative-editor-panel">' +
    '<div class="narrative-editor-header">' +
    '<span style="font-weight:700;font-size:14px;color:var(--text-secondary)">✏️ 编辑剧情</span>' +
    '<span style="font-size:11px;color:var(--text-muted);margin-left:8px">仅剧情文本，采访间/OS 保持不变</span>' +
    '<span class="narrative-editor-close-btn">&times;</span>' +
    '</div>' +
    '<textarea class="narrative-editor-textarea" spellcheck="false">' + escHtml(text) + '</textarea>' +
    '<div class="narrative-editor-footer">' +
    '<button class="btn btn-secondary" id="narrativeEditorCancel">取消</button>' +
    '<button class="btn btn-primary" id="narrativeEditorSave">保存</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  _narrativeEditorOverlay = overlay;

  var textarea = overlay.querySelector('.narrative-editor-textarea');
  textarea.focus();
  textarea.selectionStart = textarea.value.length;
  textarea.selectionEnd = textarea.value.length;

  // 关闭按钮
  overlay.querySelector('.narrative-editor-close-btn').onclick = closeNarrativeEditor;
  // 取消按钮
  overlay.querySelector('#narrativeEditorCancel').onclick = closeNarrativeEditor;
  // 点击遮罩层关闭
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeNarrativeEditor();
  });
  // 保存按钮
  overlay.querySelector('#narrativeEditorSave').onclick = function() {
    saveNarrativeEdit(textarea.value);
  };
  // Ctrl+Enter 保存
  textarea.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      saveNarrativeEdit(textarea.value);
    }
  });
}

function closeNarrativeEditor() {
  if (_narrativeEditorOverlay) {
    _narrativeEditorOverlay.remove();
    _narrativeEditorOverlay = null;
  }
}

function saveNarrativeEdit(newText) {
  if (!GS.parsedNarrative || !GS.parsedNarrative.blocks) return;

  var blocks = GS.parsedNarrative.blocks;
  var oldRaw = GS.phaseNarrative;

  // 只更新 narrative 类型的 block，采访间/OS 保持不变
  var narrativeIndices = [];
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'narrative' && blocks[i].content !== undefined) {
      narrativeIndices.push(i);
    }
  }
  if (narrativeIndices.length === 0) return;

  var totalOldLen = 0;
  for (var ni = 0; ni < narrativeIndices.length; ni++) {
    totalOldLen += blocks[narrativeIndices[ni]].content.length;
  }
  if (totalOldLen === 0) return;

  var newLen = newText.length;
  var start = 0;
  for (var ni = 0; ni < narrativeIndices.length; ni++) {
    var idx = narrativeIndices[ni];
    var portion = Math.floor(newLen * (blocks[idx].content.length / totalOldLen));
    if (ni === narrativeIndices.length - 1) portion = newLen - start;
    blocks[idx].content = newText.slice(start, start + portion).trim() || '(空)';
    start += portion;
  }

  // 重建 JSON
  var newRaw = JSON.stringify(GS.parsedNarrative);
  GS.phaseNarrative = newRaw;

  // 同步更新 todayFullText
  var phasePrefixes = ['【上午】', '【下午】', '【傍晚】', '【深夜】'];
  for (var ti = 0; ti < GS.todayFullText.length; ti++) {
    var entry = GS.todayFullText[ti];
    for (var pi = 0; pi < phasePrefixes.length; pi++) {
      if (entry === phasePrefixes[pi] + oldRaw) {
        GS.todayFullText[ti] = phasePrefixes[pi] + newRaw;
        break;
      }
    }
  }

  saveGame();
  closeNarrativeEditor();
  showToast('✅ 剧情已更新');

  // 重渲染
  if (window.__renderAll) window.__renderAll();
}

// 打字机完成后显示编辑按钮
function showEditButton() {
  var btn = document.getElementById('narrativeEditBtn');
  if (btn) btn.classList.add('visible');
}

// 导出暴露给点击事件绑定
window.__showNarrativeEditor = showNarrativeEditor;

// 全局点击委托：捕获编辑按钮点击
document.addEventListener('click', function(e) {
  var target = e.target;
  if (target && target.id === 'narrativeEditBtn') {
    showNarrativeEditor();
  }
});
