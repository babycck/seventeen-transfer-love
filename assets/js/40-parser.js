// ==================== 叙事解析器（状态机） ====================
function parseNarrative(rawText) {
  var text = rawText.replace(/-xi\b/gi, '');

  // 剥离短信草稿——不出现在正文中
  text = text.replace(/【短信草稿】[\s\S]*?(?=【选项】|$)/g, '');

  text = text
    .replace(/([^\n])(🎬)/g, '$1\n$2')
    .replace(/([^\n])(💭)/g, '$1\n$2')
    .replace(/([^\n])(🎙)/g, '$1\n$2')
    .replace(/([^\n])(🎤)/g, '$1\n$2')
    .replace(/([^\n])(【选项】)/g, '$1\n$2')
    .replace(/【选项】\s*(\d)/g, '【选项】\n\$1');

  var lines = text.split('\n');
  var result = {
    narrative: '',
    directorOS: '',
    observerOS: '',
    interviews: [],
    memberInterviews: [],
    xInterviews: [],
    options: [],
    blocks: []
  };

  var currentNarrativeLines = [];
  var collectMode = null;
  var collectBuffer = [];

  function flushNarrative() {
    if (currentNarrativeLines.length === 0) return;
    var content = currentNarrativeLines.join('\n');
    result.blocks.push({ type: 'narrative', content: content });
    result.narrative += (result.narrative ? '\n' : '') + content;
    currentNarrativeLines = [];
  }

  function pushBlock(type, content) {
    if (!content) return;
    result.blocks.push({ type: type, content: content });
    if (type === 'directorOS') {
      result.directorOS += (result.directorOS ? '\n' : '') + content;
    } else if (type === 'observerOS') {
      result.observerOS += (result.observerOS ? '\n' : '') + content;
    } else if (type === 'interview') {
      result.interviews.push(content);
    } else if (type === 'xInterview') {
      result.xInterviews.push(content);
    } else if (type === 'memberInterview') {
      result.memberInterviews.push(content);
    }
  }

  function flushCollect() {
    if (!collectMode) return;
    var content = collectBuffer.join('\n');
    if (collectMode === 'options') {
      // options were already pushed during collection; nothing to store as block
    } else if (content) {
      pushBlock(collectMode, content);
    }
    collectMode = null;
    collectBuffer = [];
  }

  function tryParseOptionLine(trimmed) {
    var patterns = [
      /^(\d+)[\.、]\s*(.+)/,
      /^(\d+)\)\s*(.+)/,
      /^[①②③④⑤⑥](\d*)\s*(.+)/,
      /^（(\d+)）\s*(.+)/,
      /^[（(](\d+)[)）]\s*(.+)/,
      /^(\d+)\s+(.+)/
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = trimmed.match(patterns[i]);
      if (m) {
        var t = m[2] || m[3] || '';
        if (t.trim()) return { label: m[1], text: t.trim() };
      }
    }
    return null;
  }

  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();

    if (trimmed.startsWith('🎙️💔') || trimmed.startsWith('🎙💔')) {
      flushCollect();
      flushNarrative();
      var cx = trimmed.replace(/^🎙️?💔\s*/, '').replace(/^【X采访间】\s*/, '');
      if (cx) pushBlock('xInterview', cx);
      else { collectMode = 'xInterview'; collectBuffer = []; }
      continue;
    }

    if (trimmed.startsWith('🎬')) {
      flushCollect();
      flushNarrative();
      var c = trimmed.replace(/^🎬\s*/, '').replace(/^【导演OS】\s*/, '');
      if (c) pushBlock('directorOS', c);
      else { collectMode = 'directorOS'; collectBuffer = []; }
      continue;
    }

    if (trimmed.startsWith('💭')) {
      flushCollect();
      flushNarrative();
      var c2 = trimmed.replace(/^💭\s*/, '').replace(/^【观察员OS】\s*/, '');
      if (c2) pushBlock('observerOS', c2);
      else { collectMode = 'observerOS'; collectBuffer = []; }
      continue;
    }

    if (trimmed.startsWith('🎙')) {
      flushCollect();
      flushNarrative();
      var c3 = trimmed.replace(/^🎙\s*/, '').replace(/^【采访间】\s*/, '');
      if (c3) pushBlock('interview', c3);
      else { collectMode = 'interview'; collectBuffer = []; }
      continue;
    }

    if (trimmed.startsWith('🎤')) {
      flushCollect();
      flushNarrative();
      var c4 = trimmed.replace(/^🎤\s*/, '');
      if (c4) pushBlock('memberInterview', c4);
      else { collectMode = 'memberInterview'; collectBuffer = []; }
      continue;
    }

    if (trimmed === '【选项】' || trimmed.startsWith('【选项】')) {
      flushCollect();
      flushNarrative();
      var afterMarker = trimmed.replace(/^【选项】\s*/, '');
      if (afterMarker) {
        var optParts = afterMarker.split(/(?=\d+[\.、\)])/);
        for (var j = 0; j < optParts.length; j++) {
          var opt = tryParseOptionLine(optParts[j].trim());
          if (opt) result.options.push(opt);
        }
      } else {
        collectMode = 'options';
        collectBuffer = [];
      }
      continue;
    }

    if (trimmed === '') {
      flushCollect();
      flushNarrative();
      continue;
    }

    if (collectMode) {
      if (collectMode === 'options') {
        var optParts2 = trimmed.split(/(?=\d+[\.、\)])/);
        for (var p = 0; p < optParts2.length; p++) {
          var opt2 = tryParseOptionLine(optParts2[p].trim());
          if (opt2) result.options.push(opt2);
        }
      } else {
        collectBuffer.push(trimmed);
      }
      continue;
    }

    currentNarrativeLines.push(trimmed);
  }

  flushCollect();
  flushNarrative();

  // 兜底：扫描 narrative block 中是否混入了观察员名字开头的行，遇到时 inline 插入 observerOS block
  var observerNames = ['李龙真', '金叡园', '郑基锡'];
  if (GS && GS.observerGuest) {
    var gsn = GS.observerGuest.split('（')[0];
    if (gsn && observerNames.indexOf(gsn) < 0) observerNames.push(gsn);
  }

  var newBlocks = [];
  var newNarrativeLines = [];
  for (var b = 0; b < result.blocks.length; b++) {
    var block = result.blocks[b];
    if (block.type !== 'narrative') {
      newBlocks.push(block);
      continue;
    }
    var blockLines = block.content.split('\n');
    var currentLines = [];
    for (var li = 0; li < blockLines.length; li++) {
      var line = blockLines[li].trim();
      var isObs = false;
      for (var s = 0; s < observerNames.length; s++) {
        if (line.indexOf(observerNames[s] + '：') === 0 || line.indexOf(observerNames[s] + ':') === 0) {
          if (currentLines.length > 0) {
            var content = currentLines.join('\n');
            newBlocks.push({ type: 'narrative', content: content });
            newNarrativeLines = newNarrativeLines.concat(currentLines);
            currentLines = [];
          }
          newBlocks.push({ type: 'observerOS', content: line });
          result.observerOS += (result.observerOS ? '\n' : '') + line;
          isObs = true;
          break;
        }
      }
      if (!isObs) currentLines.push(blockLines[li]);
    }
    if (currentLines.length > 0) {
      var content = currentLines.join('\n');
      newBlocks.push({ type: 'narrative', content: content });
      newNarrativeLines = newNarrativeLines.concat(currentLines);
    }
  }
  result.blocks = newBlocks;
  result.narrative = newNarrativeLines.join('\n');

  // 观察员OS硬截断：每个 observerOS block 最多保留4行
  result.observerOS = '';
  for (var nb = 0; nb < result.blocks.length; nb++) {
    var blk = result.blocks[nb];
    if (blk.type === 'observerOS') {
      var obsLines = blk.content.split('\n').filter(function(l) { return l.trim(); });
      if (obsLines.length > 4) obsLines = obsLines.slice(0, 4);
      blk.content = obsLines.join('\n');
      result.observerOS += (result.observerOS ? '\n' : '') + blk.content;
    }
  }

  // 兜底扫描末尾500字
  if (result.options.length === 0) {
    var tail = rawText.slice(-500);
    var tailLines = tail.split('\n');
    for (var t = 0; t < tailLines.length; t++) {
      var opt = tryParseOptionLine(tailLines[t].trim());
      if (opt) result.options.push(opt);
    }
  }

  // 终极兜底：全文本扫描编号行
  if (result.options.length === 0) {
    var allLines = rawText.split('\n');
    for (var u = 0; u < allLines.length; u++) {
      var optU = tryParseOptionLine(allLines[u].trim());
      if (optU) result.options.push(optU);
    }
  }

  // [P0-3] 提取喝酒标记 [喝酒: 成员名]
  var drinkMatches = rawText.match(/\[喝酒:\s*([^\]]+)\]/g);
  if (drinkMatches) {
    for (var dmi = 0; dmi < drinkMatches.length; dmi++) {
      var dm = drinkMatches[dmi].match(/\[喝酒:\s*([^\]]+)\]/);
      if (dm) {
        var drinkerName = dm[1].trim();
        var drinkerMember = MEMBERS.find(function(m) { return m.name === drinkerName; });
        if (drinkerMember && GS.selectedMembers.indexOf(drinkerMember.id) >= 0) {
          if (!GS.drinkCounts[drinkerMember.id]) GS.drinkCounts[drinkerMember.id] = 0;
          GS.drinkCounts[drinkerMember.id]++;
          // 检查醉酒触发（仅第一位达到2杯的人）
          if (!GS.drunkTrigger && GS.drinkCounts[drinkerMember.id] >= 2) {
            GS.drunkTrigger = drinkerMember.id;
          }
        }
      }
    }
  }

  // 从正文及 narrative block 中删除喝酒标记
  result.narrative = result.narrative.replace(/\[喝酒:\s*[^\]]+\]/g, '').trim();
  for (var bj = 0; bj < result.blocks.length; bj++) {
    if (result.blocks[bj].type === 'narrative') {
      result.blocks[bj].content = result.blocks[bj].content.replace(/\[喝酒:\s*[^\]]+\]/g, '').trim();
    }
  }

  // 提取好感度隐藏标记（兼容普通方括号 [好感度: ... ]）
  var affMatches = rawText.match(/\[好感度:\s*([^\]]+)\]/g);
  if (affMatches) {
    for (var v = 0; v < affMatches.length; v++) {
      var affM = affMatches[v].match(/\[好感度:\s*([^,]+)\s*([+-]\d+),\s*原因:\s*([^\]]+)\]/);
      if (!affM) affM = affMatches[v].match(/\[好感度:\s*([^\]\d]+?)\s*([+-]\d+)[^\]]*\]/);
      if (affM) {
        var affName = affM[1].trim();
        var affDelta = parseInt(affM[2]);
        var affReason = affM[3] ? affM[3].trim() : '（AI未提供原因）';
        var affMember = MEMBERS.find(function(m) { return m.name === affName; });
        if (affMember && GS.selectedMembers.indexOf(affMember.id) >= 0) {
          updateAffection(affMember.id, affDelta);
          if (!GS.affectionLog[affMember.id]) GS.affectionLog[affMember.id] = [];
          GS.affectionLog[affMember.id].push({
            day: GS.day,
            phase: PHASE_LABELS[PHASES[GS.phaseIndex]],
            change: affDelta,
            reason: affReason,
            total: GS.affection[affMember.id]
          });
        }
      }
    }
  }

  // 从正文及 narrative block 中删除好感度标记
  result.narrative = result.narrative.replace(/\[好感度:\s*[^\]]+\]/g, '').trim();
  for (var bi = 0; bi < result.blocks.length; bi++) {
    if (result.blocks[bi].type === 'narrative') {
      result.blocks[bi].content = result.blocks[bi].content.replace(/\[好感度:\s*[^\]]+\]/g, '').trim();
    }
  }

  return result;
}
