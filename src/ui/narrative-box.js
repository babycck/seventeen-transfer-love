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
      var line = paras2[ii];
      if (line.indexOf('❥ 你的选择：') === 0) {
        html += '<div class="choice-tag">' + escHtml(line) + '</div>';
      } else {
        html += '<p>' + escHtml(line) + '</p>';
      }
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
    // 1v1 模式：跳过已压缩的条目，最多显示 15 条
    var _startIdx = 0;
    if (GS.gameMode === 'oneHeart') {
      var _compIdx = GS.oneHeartLastCompressedIdx || 0;
      var _total = GS.consequenceNarratives.length;
      _startIdx = Math.max(_compIdx, _total - 15);
    }
    // 除最后一条外，已有剧情直接显示
    for (var i = _startIdx; i < GS.consequenceNarratives.length - 1; i++) {
      var cn = GS.consequenceNarratives[i];
      html += '<div class="consequence-item">';
      if (cn.choiceText) {
        html += '<div class="choice-tag">❥ 你的选择：' + escHtml(cn.choiceText) + '</div>';
      }
      html += renderParsedNarrative(cn.parsed);
      html += '<button class="consequence-delete" data-idx="' + i + '" title="删除本条">✕</button>';
      html += '</div>';
    }
    // 最后一条新剧情：放入打字机容器
    var lastCn = GS.consequenceNarratives[GS.consequenceNarratives.length - 1];
    var newHtml = '';
    var lastIdx = GS.consequenceNarratives.length - 1;
    newHtml += '<div class="consequence-item">';
    if (lastCn.choiceText) {
      newHtml += '<div class="choice-tag">❥ 你的选择：' + escHtml(lastCn.choiceText) + '</div>';
    }
    newHtml += renderParsedNarrative(lastCn.parsed);
    newHtml += '<button class="consequence-delete" data-idx="' + lastIdx + '" title="删除本条">✕</button>';
    newHtml += '</div>';
    html += '<div id="narrativeNewContent" data-narrative-html="' + escHtml(newHtml) + '">';
    html += newHtml;
    html += '</div>';
  }

  html += '<button class="narrative-edit-btn" id="narrativeEditBtn" title="编辑剧情">✏️ 编辑</button>';
  html += '</div></div>';

  // 如果没有后续剧情，首次打字机用 data-narrative-html（不预填可见内容，避免闪烁）
  if (!hasConsequences && GS.phaseNarrative) {
    var allHtml = '';
    if (GS.phaseNarrative) {
      allHtml += renderParsedNarrative(GS.parsedNarrative);
    }
    // 直接渲染 innerHTML + 保留 data-narrative-html 供打字机使用（刷新后直接显示）
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
  // 清除容器上已有的打字机动画
  if (container._typewriterTimer) {
    clearInterval(container._typewriterTimer);
    container._typewriterTimer = null;
  }
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

  // 批量更新：每 tick 处理 BATCH_SIZE 个单元，减少 DOM 重排次数
  var BATCH_SIZE = speed <= 10 ? 5 : speed <= 20 ? 4 : 3;

  var timer = setInterval(function() {
    if (unitIdx >= units.length) {
      container.innerHTML = html;
      clearInterval(timer);
      container._typewriterTimer = null;
      showEditButton();
      return;
    }

    // 每 tick 批量推进 BATCH_SIZE 个单元
    for (var batch = 0; batch < BATCH_SIZE && unitIdx < units.length; batch++) {
      var u = units[unitIdx];
      if (u.t === 'tag') {
        html += u.v;
        unitIdx++;
        charIdx = 0;
      } else {
        if (charIdx < u.v.length) {
          html += u.v[charIdx];
          charIdx++;
          // 单个 text unit 未消费完时不算完成一个 batch 单元，继续在同一 unit 内推进
          if (charIdx >= u.v.length) {
            unitIdx++;
            charIdx = 0;
          }
        } else {
          unitIdx++;
          charIdx = 0;
        }
      }
    }

    // 更新 innerHTML（每 tick 只更新一次）
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
  }, speed * BATCH_SIZE);
  container._typewriterTimer = timer;
}

window.stopTypewriter = function(containerId) {
  var el = document.getElementById(containerId);
  if (el && el._typewriterTimer) {
    clearInterval(el._typewriterTimer);
    el._typewriterTimer = null;
  }
  if (el && el.getAttribute && el.getAttribute('data-narrative-html')) {
    el.innerHTML = el.getAttribute('data-narrative-html');
    el.removeAttribute('data-narrative-html');
    showEditButton();
  }
};

// ==================== 剧情编辑功能 ====================

var _narrativeEditorOverlay = null;
var _editingConsequenceIdx = -1; // -1 = 编辑主剧情, >=0 = 编辑第几条后续剧情

// 从 parsedNarrative 中提取全部剧情文本（含采访间/OS 前缀标记）
function extractNarrativeText(parsed) {
  if (!parsed) return '';
  if (!parsed.blocks || parsed.blocks.length === 0) {
    // 1v1 模式：用 narrative 字段兜底
    return parsed.narrative || '';
  }
  var parts = [];
  for (var i = 0; i < parsed.blocks.length; i++) {
    var b = parsed.blocks[i];
    if (!b.content) continue;
    var prefix = '';
    if (b.type === 'interview') { prefix = '🎙 '; }
    else if (b.type === 'xInterview') { prefix = '🎙️💔 '; }
    else if (b.type === 'memberInterview') { prefix = '🎤【' + (b.member || '') + '】 '; }
    else if (b.type === 'directorOS') { prefix = '🎬 '; }
    else if (b.type === 'observerOS') { prefix = '💭 '; }
    parts.push(prefix + b.content);
  }
  return parts.join('\n\n');
}

export function showNarrativeEditor() {
  var hasCons = GS.consequenceNarratives && GS.consequenceNarratives.length > 0;

  var targetRaw, targetParsed;
  _editingConsequenceIdx = -1;
  if (hasCons) {
    _editingConsequenceIdx = GS.consequenceNarratives.length - 1;
    var last = GS.consequenceNarratives[_editingConsequenceIdx];
    targetRaw = last.rawText;
    targetParsed = last.parsed;
  } else {
    targetRaw = GS.phaseNarrative;
    targetParsed = GS.parsedNarrative;
  }

  // 1v1 模式 parsed 无 blocks 字段，用 narrative 兜底
  if (!targetRaw || !targetParsed) {
    showToast('⚠️ 暂无剧情可编辑');
    return;
  }
  if (!targetParsed.blocks && !targetParsed.narrative) {
    showToast('⚠️ 暂无剧情可编辑');
    return;
  }

  var text = extractNarrativeText(targetParsed);
  var label = hasCons ? '编辑后续剧情（自由输入/选项）' : '编辑时段剧情';

  var overlay = document.createElement('div');
  overlay.className = 'narrative-editor-overlay';
  overlay.innerHTML =
    '<div class="narrative-editor-panel">' +
    '<div class="narrative-editor-header">' +
    '<span style="font-weight:700;font-size:14px;color:var(--text-secondary)">✏️ ' + label + '</span>' +
    '<span style="font-size:11px;color:var(--text-muted);margin-left:8px">每段用空行分隔，采访间等前缀标记保留</span>' +
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

  overlay.querySelector('.narrative-editor-close-btn').onclick = closeNarrativeEditor;
  overlay.querySelector('#narrativeEditorCancel').onclick = closeNarrativeEditor;
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeNarrativeEditor();
  });
  overlay.querySelector('#narrativeEditorSave').onclick = function() {
    saveNarrativeEdit(textarea.value);
  };
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
  var targetParsed, targetKey;
  if (_editingConsequenceIdx >= 0 && GS.consequenceNarratives && GS.consequenceNarratives[_editingConsequenceIdx]) {
    targetParsed = GS.consequenceNarratives[_editingConsequenceIdx].parsed;
    targetKey = 'consequence_' + _editingConsequenceIdx;
  } else {
    targetParsed = GS.parsedNarrative;
    targetKey = 'phase';
  }

  if (!targetParsed) return;

  // 1v1 模式：parsed 无 blocks，直接写回 narrative 字符串
  if (!targetParsed.blocks && targetParsed.narrative !== undefined) {
    targetParsed.narrative = newText;
    if (_editingConsequenceIdx >= 0 && GS.consequenceNarratives && GS.consequenceNarratives[_editingConsequenceIdx]) {
      GS.consequenceNarratives[_editingConsequenceIdx].rawText = newText;
      if (GS.todayFullText && _editingConsequenceIdx < GS.todayFullText.length) {
        GS.todayFullText[_editingConsequenceIdx] = newText;
      }
    } else {
      GS.phaseNarrative = newText;
      if (GS.todayFullText && GS.todayFullText.length > 0) {
        GS.todayFullText[GS.todayFullText.length - 1] = newText;
      }
    }
    var dayIdx = GS.day - 1;
    if (GS.dailyFullTexts && GS.dailyFullTexts[dayIdx]) {
      GS.dailyFullTexts[dayIdx] = GS.todayFullText.slice();
    }
    saveGame();
    closeNarrativeEditor();
    showToast('✅ 剧情已更新');
    if (window.__renderAll) window.__renderAll();
    return;
  }

  if (!targetParsed.blocks) return;

  var blocks = targetParsed.blocks;
  var oldRaw = (targetKey === 'phase') ? GS.phaseNarrative : GS.consequenceNarratives[_editingConsequenceIdx].rawText;

  // 按段落（双换行分割）逐段映射回对应 block，不搞比例分配
  var paragraphs = newText.split(/\n{2,}/).filter(function(p) { return p.trim(); });

  var pi = 0;
  for (var bi = 0; bi < blocks.length && pi < paragraphs.length; bi++) {
    var b = blocks[bi];
    if (b.content === undefined) continue;

    var para = paragraphs[pi].trim();

    // 去掉 block 类型前缀标记（🎙 🎬 💭 🎤 等），只取纯内容
    var clean = para.replace(/^(🎙 |🎙️💔 |🎤【[^】]*】 |🎬 |💭 )/, '').trim();
    b.content = clean || '(空)';
    pi++;
  }

  // 兜底：如果段落数 > block 数（如送礼兜底单 block 多段），
  // 把剩余段落合并到最后一个有 content 的 block
  if (pi < paragraphs.length) {
    for (var bi2 = blocks.length - 1; bi2 >= 0; bi2--) {
      var lastB = blocks[bi2];
      if (lastB.content === undefined) continue;
      var remaining = [];
      for (; pi < paragraphs.length; pi++) {
        var rp = paragraphs[pi].trim();
        rp = rp.replace(/^(🎙 |🎙️💔 |🎤【[^】]*】 |🎬 |💭 )/, '').trim();
        remaining.push(rp || '(空)');
      }
      lastB.content = lastB.content + '\n\n' + remaining.join('\n\n');
      break;
    }
  }

  // 重建 JSON
  var newRaw = JSON.stringify(targetParsed);

  if (targetKey === 'phase') {
    GS.phaseNarrative = newRaw;
    // 同步更新 todayFullText：从末尾向前找第一条带时段前缀的（当前阶段剧情）
    var phasePrefixes = ['【上午】', '【下午】', '【傍晚】', '【深夜】'];
    var phaseIdx = GS.phaseIndex !== undefined ? GS.phaseIndex : 0;
    var prefix = phasePrefixes[phaseIdx] || '';
    for (var ti = GS.todayFullText.length - 1; ti >= 0; ti--) {
      var entry = GS.todayFullText[ti];
      if (entry.indexOf('【') === 0) {
        // 找到当前时段：替换前缀后的内容
        var entryContent = entry.slice(entry.indexOf('】') + 1);
        if (entryContent.length > 50 && (oldRaw.indexOf(entryContent.slice(0, 30)) >= 0 || entryContent.indexOf(oldRaw.slice(0, 30)) >= 0)) {
          GS.todayFullText[ti] = prefix + newRaw;
        }
        break;
      }
    }
  } else {
    // 后续剧情：更新 consequence 的 rawText + todayFullText
    GS.consequenceNarratives[_editingConsequenceIdx].rawText = newRaw;
    // 从末尾向前找第一条匹配旧内容的条目
    for (var ti = GS.todayFullText.length - 1; ti >= 0; ti--) {
      var entry = GS.todayFullText[ti];
      if (entry === oldRaw || (entry.length > 50 && oldRaw.length > 50 && entry.slice(0, 80) === oldRaw.slice(0, 80))) {
        GS.todayFullText[ti] = newRaw;
        break;
      }
    }
  }

  // 额外保险：同步更新 dailyFullTexts 中当天（已存档）的记录
  var dayIdx = GS.day - 1;
  if (GS.dailyFullTexts && GS.dailyFullTexts[dayIdx]) {
    // 用 todayFullText 替换当天记录（保持引用）
    GS.dailyFullTexts[dayIdx] = GS.todayFullText.slice();
  }

  saveGame();
  closeNarrativeEditor();
  showToast('✅ 剧情已更新');

  // 重渲染
  if (window.__renderAll) window.__renderAll();
}

// 打字机完成后显示编辑按钮
export function showEditButton() {
  var btn = document.getElementById('narrativeEditBtn');
  if (btn) btn.classList.add('visible');
}

// 全局点击委托：捕获编辑按钮点击
document.addEventListener('click', function(e) {
  var target = e.target;
  if (target && target.id === 'narrativeEditBtn') {
    showNarrativeEditor();
  }
});
