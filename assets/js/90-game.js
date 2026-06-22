// ==================== 游戏流程 ====================
async function generatePhaseNarrative() {
  // Day 4/5/8 约会配对：弹出骰子弹窗
  if ([4, 5, 8].indexOf(GS.day) >= 0 && GS.phaseIndex === 0 && !GS.datingDiceResult) {
    showDatingDiceModal();
    return;
  }

  // [P0-3] Day 11 傍晚：初始化真心话模式（3轮制：轻度→中度→深度，每轮4人）
  if (GS.day === 11 && GS.phaseIndex === 2 && !GS.truthState) {
    // 按难度分组并打乱
    var lightCards = TRUTH_CARDS.filter(function(c) { return c.level === 'light'; });
    var mediumCards = TRUTH_CARDS.filter(function(c) { return c.level === 'medium'; });
    var deepCards = TRUTH_CARDS.filter(function(c) { return c.level === 'deep'; });
    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    }
    // 抽卡人顺序：女主 + 3位成员
    var drawerOrder = ['heroine'].concat(GS.selectedMembers);
    GS.truthState = {
      active: true,
      round: 1,              // 1=轻度轮, 2=中度轮, 3=深度轮
      subRound: 1,           // 1-4（当前轮中的第几个人）
      levelMap: {
        light: shuffle(lightCards),
        medium: shuffle(mediumCards),
        deep: shuffle(deepCards)
      },
      usedCards: [],
      drawerOrder: drawerOrder,
      drunkDeclared: false
    };
    saveGame();
  }

  // [P0-3] Day 11 深夜：真心话12轮结束后或醉酒触发后进入深夜
  if (GS.day === 11 && GS.phaseIndex === 3) {
    // 若真心话已结束且存在醉酒触发者，生成醉酒剧情
    if (GS.truthState && !GS.truthState.active && GS.drunkTrigger) {
      await generateDrunkNarrative();
      return;
    }
    // 若真心话已结束且无醉酒，正常深夜（发短信）
    if (GS.truthState && !GS.truthState.active && !GS.drunkTrigger) {
      // 正常深夜流程，继续执行后面的代码
    }
  }

  if (!GS.aiEnabled) {
    GS.phaseNarrative = '';
    GS.parsedNarrative = {
      narrative: '', directorOS: '', observerOS: '',
      interviews: [], memberInterviews: [], xInterviews: [], options: []
    };
    GS.currentOptions = [];
    GS.consequenceNarratives = [];
    GS.isInConsequence = false;
    GS.prevSummary = '';
    GS.prevRawText = '';
    GS.pendingDatingResult = null;
    saveGame();
    renderAll();
    return;
  }

  showLoading('正在生成时段剧情...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('phase');
    var rawText = await callDeepSeek(sysPrompt, userMsg, TOKEN_CONFIG.phaseNarrative);
    GS.phaseNarrative = rawText;
    GS.parsedNarrative = parseNarrative(rawText);
    GS.currentOptions = GS.parsedNarrative.options;
    GS.consequenceNarratives = [];
    GS.isInConsequence = false;
    GS.phaseChoiceCount = 0;

    // 约会日只保留1个选项，并追加「进入约会场景」
    var isDatingDay = ([4, 5, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0);
    if (isDatingDay && GS.currentOptions.length > 1) {
      GS.currentOptions = GS.currentOptions.slice(0, 1);
    }
    if (isDatingDay && GS.currentOptions.length >= 1) {
      GS.currentOptions.push({ label: '▶', text: '▶ 进入约会场景' });
    }

    if (GS.phaseIndex === 3 && !GS.smsSentToday) {
      GS.smsDrafts = extractSmsDrafts(rawText);
    } else {
      GS.smsDrafts = [];
    }

    GS.todayFullText.push(rawText);
    GS.mainInterview = (GS.parsedNarrative.interviews || []).join(' ').slice(0, 100);
    GS.prevSummary = rawText.slice(0, 200);
    GS.prevRawText = rawText;

    if (GS.datingDiceResult) {
      GS.currentDatingPartner = GS.datingDiceResult.partner;
      GS.pendingDatingResult = GS.datingDiceResult.partner;
      GS.datingDiceResult = null;
    } else {
      GS.pendingDatingResult = null;
    }

    saveGame();
    renderAll();
    // [P2-7] Day 4/6 自动弹出 X 记忆物品展示
    if ((GS.day === 4 || GS.day === 6) && GS.phaseIndex === 0) {
      setTimeout(showXItemsModal, 500);
    }
  } catch (e) {
    alert('⚠️ AI 生成失败：' + e.message + '\n请点击刷新按钮重试。');
    GS.phaseNarrative = '';
    GS.parsedNarrative = {
      narrative: '', directorOS: '', observerOS: '',
      interviews: [], memberInterviews: [], xInterviews: [], options: []
    };
    GS.currentOptions = [];
    GS.consequenceNarratives = [];
    GS.isInConsequence = false;
    GS.pendingDatingResult = null;
    saveGame();
    renderAll();
  }
  hideLoading();
}

function extractSmsDrafts(rawText) {
  var drafts = [];
  var match = rawText.match(/【短信草稿】([\s\S]*?)(?:【选项】|$)/);
  if (match) {
    var lines = match[1].split('\n');
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^\d+[\.、]\s*(.+)/);
      if (m && m[1].trim().length <= 50) drafts.push(m[1].trim());
    }
  }
  if (drafts.length === 0) {
    drafts.push('今天和你聊天很开心。', '谢谢你今天的陪伴。', '晚安，明天见。');
  }
  while (drafts.length < 3) drafts.push('今天过得很愉快。');
  return drafts.slice(0, 3);
}

// [P0-3] Day 11 深夜醉酒剧情生成
async function generateDrunkNarrative() {
  showLoading('正在生成醉酒剧情...');
  try {
    var members = GS.selectedMembers.map(function(id) {
      return MEMBERS.find(function(m) { return m.id === id; });
    });
    var triggerId = GS.drunkTrigger;
    var triggerName = '女主';
    var isHeroine = triggerId === 'heroine';
    var isX = triggerId === GS.secretX;
    var triggerMember = members.find(function(m) { return m.id === triggerId; });
    if (triggerMember) triggerName = triggerMember.name;

    // [P0-3] X 醉酒且好感<50：X自己回房间，不触发互动
    if (isX && (GS.affection[triggerId] || 0) < 50) {
      GS.phaseNarrative = '🎬【导演OS】' + triggerName + '喝得太多，独自起身回了房间。门轻轻关上，留下客厅里的其他人面面相觑。\n\n' +
        '这一夜，没有更多的故事发生。\n\n' +
        '💭【观察员OS】\n李龙真：看来X是真的放下了。\n金叡园：有点遗憾……但也松了一口气。\n郑基锡：酒精是情感的放大镜，有时是，有时不是。';
      GS.parsedNarrative = parseNarrative(GS.phaseNarrative);
      GS.currentOptions = [{ label: '▶', text: '▶ X已回房间，继续深夜' }];
      GS.consequenceNarratives = [];
      GS.isInConsequence = false;
      GS.phaseChoiceCount = 0;
      GS.todayFullText.push(GS.phaseNarrative);
      GS.smsDrafts = [];
      saveGame();
      renderAll();
      hideLoading();
      return;
    }

    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('phase') + '\n\n' +
      '## 醉酒剧情（强制执行）\n' +
      triggerName + '在真心话环节中喝到了≥2杯，现在处于醉酒状态。\n' +
      '请生成约500字的醉酒剧情：\n' +
      '- 描写醉酒者的状态（眼神、动作、语气变化）\n' +
      '- 其他在场成员的反应\n' +
      '- 醉酒者说出平时不会说的话（隐藏对话）\n' +
      '- 女主（玩家）的选择和感受\n' +
      (Math.random() < 0.6 ? '- ⚠️ 必须在剧情中插入一段「隐藏对话」：醉酒者说出平时绝对不会说的话（60%概率触发）\n' : '') +
      '- 结尾生成选项：\n' +
      (isHeroine ? '  ① 被某位嘉宾照顾（弹出选人）② 和某人去阳台吹风（弹出选人）③ 留在客厅陪某人（弹出选人）④ 和X单独对话（直接触发，不弹窗）\n' :
       isX ? '  ① 女主被X留住说话 ② 女主和X去阳台 ③ 嫉妒剧情（若X好感≥80且另一成员≥50）\n' :
       '  ① 女主照顾他 ② 他把女主留在客厅说话\n');

    var rawText = await callDeepSeek(sysPrompt, userMsg, TOKEN_CONFIG.phaseNarrative);
    GS.phaseNarrative = rawText;
    GS.parsedNarrative = parseNarrative(rawText);
    GS.currentOptions = GS.parsedNarrative.options;
    GS.consequenceNarratives = [];
    GS.isInConsequence = false;
    GS.phaseChoiceCount = 0;
    GS.todayFullText.push(rawText);
    GS.smsDrafts = [];
    saveGame();
    renderAll();
  } catch (e) {
    alert('⚠️ 醉酒剧情生成失败：' + e.message);
  }
  hideLoading();
}

// [P0-3] 女主醉酒选人弹窗
function showDrunkMemberSelectModal(choiceText) {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>选择一位成员</h3>' +
    '<p style="font-size:12px;color:#8b6b6b;margin-bottom:10px">' + escHtml(choiceText) + '</p>' +
    '<div style="display:flex;flex-direction:column;gap:8px">';
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    inner += '<button class="sms-target-btn" data-member-id="' + m.id + '">' + m.emoji + ' ' + m.name + '</button>';
  }
  inner += '</div><button class="modal-close" id="drunkSelectClose" style="margin-top:10px">取消</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('#drunkSelectClose').addEventListener('click', function() {
    overlay.remove();
  });

  overlay.querySelectorAll('.sms-target-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var memberId = this.dataset.memberId;
      overlay.remove();
      await generateDrunkConsequence(choiceText, memberId);
    });
  });
}

// [P0-3] 生成醉酒后续剧情
async function generateDrunkConsequence(choiceText, memberId) {
  showLoading('正在生成醉酒后续...');
  try {
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('consequence', { choiceText: choiceText, drunkTarget: memberId });
    var rawText = await callDeepSeek(sysPrompt, userMsg, TOKEN_CONFIG.consequence);
    var parsed = parseNarrative(rawText);
    GS.consequenceNarratives.push({ rawText: rawText, parsed: parsed });
    GS.todayFullText.push(rawText);
    saveGame();
    renderAll();
  } catch (e) {
    alert('⚠️ AI 生成失败：' + e.message);
  }
  hideLoading();
}

// [P0-3] 真心话回答输入弹窗
function showTruthAnswerModal() {
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    var inner = '<div class="modal-content"><h3>🎙 如实回答</h3>' +
      '<p style="font-size:12px;color:#8b6b6b;margin-bottom:8px">请输入你的回答内容：</p>' +
      '<textarea id="truthAnswerInput" style="width:100%;min-height:120px;border:1.5px solid #e0c0c0;border-radius:10px;padding:10px;font-size:13px;font-family:inherit;resize:vertical;outline:none;" placeholder="写下你的真实回答..."></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:10px">' +
      '<button class="btn-confirm" id="truthSubmit" style="flex:1">提交回答</button>' +
      '<button class="modal-close" id="truthCancel" style="flex:1">取消</button>' +
      '</div></div>';
    overlay.innerHTML = inner;
    document.body.appendChild(overlay);

    var input = overlay.querySelector('#truthAnswerInput');
    input.focus();

    overlay.querySelector('#truthSubmit').addEventListener('click', function() {
      var val = input.value.trim();
      if (!val) {
        alert('请输入回答内容');
        return;
      }
      overlay.remove();
      resolve(val);
    });
    overlay.querySelector('#truthCancel').addEventListener('click', function() {
      overlay.remove();
      resolve('');
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.remove();
        resolve('');
      }
    });
  });
}

// [P0-3] Day 11 真心话单轮处理（3轮制：轻度→中度→深度，每轮4人）
async function handleTruthRound(opt) {
  var ts = GS.truthState;
  var levelNames = { light: '轻度', medium: '中度', deep: '深度' };
  var currentLevel = ts.round === 1 ? 'light' : ts.round === 2 ? 'medium' : 'deep';
  var drawerId = ts.drawerOrder[ts.subRound - 1];
  var isHeroineTurn = (drawerId === 'heroine');

  // 从当前难度卡池抽取问题卡
  var card = null;
  if (ts.levelMap[currentLevel] && ts.levelMap[currentLevel].length > 0) {
    card = ts.levelMap[currentLevel].shift();
    ts.usedCards.push(card);
  }

  var playerAnswer = '';

  if (isHeroineTurn && opt.text.indexOf('回答') >= 0) {
    // 女主选择如实回答：弹出输入框
    playerAnswer = await showTruthAnswerModal();
    if (!playerAnswer) return; // 用户取消
  }

  if (opt.text.indexOf('喝酒') >= 0) {
    // 记录喝酒
    if (!GS.drinkCounts[drawerId]) GS.drinkCounts[drawerId] = 0;
    GS.drinkCounts[drawerId]++;
    if (!GS.drunkTrigger && GS.drinkCounts[drawerId] >= 2) {
      GS.drunkTrigger = drawerId;
      ts.drunkDeclared = true;
    }
  }

  // 推进轮次
  ts.subRound++;
  if (ts.subRound > 4) {
    // 当前轮（难度）的4人已结束，进入下一轮（下一个难度）
    ts.round++;
    ts.subRound = 1;
  }

  // 检查是否结束真心话（3轮 × 4人 = 12人次完成）
  if (ts.round > 3) {
    ts.active = false;
  }

  saveGame();

  // 生成真心话剧情（复用 consequence 机制）
  showLoading('正在生成真心话剧情...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('consequence', {
      choiceText: opt.text,
      truthRound: ts.round,
      truthSubRound: ts.subRound,
      truthLevel: currentLevel,
      truthCard: card,
      truthDrawer: drawerId,
      truthAnswer: playerAnswer
    });
    var rawText = await callDeepSeek(sysPrompt, userMsg, TOKEN_CONFIG.consequence);
    var parsed = parseNarrative(rawText);
    GS.consequenceNarratives.push({ rawText: rawText, parsed: parsed });
    GS.todayFullText.push(rawText);
    saveGame();
    renderAll();

    // 真心话结束后显示"进入深夜"按钮
    if (!ts.active) {
      GS.currentOptions = [{ label: '▶', text: '▶ 真心话结束，进入深夜' }];
      saveGame();
      renderAll();
    }
  } catch (e) {
    alert('⚠️ AI 生成失败：' + e.message + '\n请点击刷新按钮重试。');
  }
  hideLoading();
}

async function handleOptionChoice(opt) {
  // [P0-3] 真心话结束后进入深夜
  if (opt.text.indexOf('进入深夜') >= 0 || opt.text.indexOf('真心话结束') >= 0 || opt.text.indexOf('X已回房间') >= 0) {
    await advancePhase();
    return;
  }

  if (GS.day === 12 && (opt.text.indexOf('选择') >= 0 || opt.text.indexOf('复合') >= 0 || opt.text.indexOf('换乘') >= 0)) {
    await handleFinalChoice(opt);
    return;
  }

  // [P0-3] Day 11 真心话模式：完全独立处理
  if (GS.truthState && GS.truthState.active) {
    await handleTruthRound(opt);
    return;
  }

  // [P0-3] Day 11 醉酒剧情选项处理
  if (GS.day === 11 && GS.drunkTrigger) {
    // 女主醉酒：需要选人的选项
    if (GS.drunkTrigger === 'heroine' &&
        (opt.text.indexOf('照顾') >= 0 || opt.text.indexOf('阳台') >= 0 || opt.text.indexOf('客厅') >= 0)) {
      showDrunkMemberSelectModal(opt.text);
      return;
    }
    // 女主醉酒：和X单独对话（直接触发）
    if (GS.drunkTrigger === 'heroine' && opt.text.indexOf('X') >= 0) {
      await generateDrunkConsequence(opt.text, GS.secretX);
      return;
    }
    // X醉酒或攻略对象醉酒：直接生成后续
    if (GS.drunkTrigger !== 'heroine') {
      await generateDrunkConsequence(opt.text, GS.drunkTrigger);
      return;
    }
  }

  // Day 11 不限制选项次数（非真心话的普通剧情）
  var isDay11 = GS.day === 11;
  if (!isDay11 && GS.phaseChoiceCount >= MAX_PHASE_CHOICES) {
    alert('⚠️ 本时段选项次数已用完，请进入下一时段。');
    return;
  }

  if (!GS.aiEnabled) {
    alert('⚠️ AI 未启用，请先启用 AI。');
    return;
  }

  showLoading('正在生成后续剧情...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('consequence', { choiceText: opt.text });
    var rawText = await callDeepSeek(sysPrompt, userMsg, TOKEN_CONFIG.consequence);
    var parsed = parseNarrative(rawText);
    GS.consequenceNarratives.push({ rawText: rawText, parsed: parsed });
    GS.phaseChoiceCount++;
    if (!isDay11 && GS.phaseChoiceCount >= MAX_PHASE_CHOICES) parsed.options = [];
    GS.currentOptions = parsed.options;
    GS.isInConsequence = true;
    GS.todayFullText.push(rawText);
    triggerAffectionFromChoice(opt.text);
    saveGame();
    renderAll();
  } catch (e) {
    alert('⚠️ AI 生成失败：' + e.message + '\n请点击刷新按钮重试。');
  }
  hideLoading();
}

// ==================== Day 12 双向选择 ====================
function determineMemberChoice(memberId) {
  var aff = GS.affection[memberId] || 0;
  if (memberId === GS.secretX) {
    if (aff >= 75) return '选择了你（复合·他还爱着你）';
    if (aff >= 55) return '选择了你（复合·但内心仍有犹豫）';
    if (aff >= 35) return '选择了你（复合·更多是习惯和不舍）';
    if (aff >= 15) return '选择了回到过去（但表示"已经回不去了"）';
    return '选择了独自离开（他放下了）';
  }
  if (aff >= 75) return '选择了你（换乘·真心被你吸引）';
  if (aff >= 55) return '选择了你（换乘·但还在整理对前任的感情）';
  if (aff >= 35) return '选择了回到前任身边';
  if (aff >= 15) return '选择了独自离开';
  return '选择了独自离开';
}

function getEndingType(chosenId, memberChoices) {
  var chosenChoice = '';
  for (var i = 0; i < memberChoices.length; i++) {
    if (memberChoices[i].id === chosenId) {
      chosenChoice = memberChoices[i].choice;
      break;
    }
  }
  if (chosenChoice.indexOf('选择了你') >= 0) {
    return chosenId === GS.secretX ? '复合成功 ❤️' : '换乘成功 ❤️';
  }
  return '独自离开 💔';
}

async function handleFinalChoice(opt) {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var xMember = members.find(function(m) { return m.id === GS.secretX; });
  var otherMembers = members.filter(function(m) { return m.id !== GS.secretX; });
  var chosenId = '';

  if (opt.text.indexOf(xMember.name) >= 0) {
    chosenId = GS.secretX;
  } else {
    for (var i = 0; i < otherMembers.length; i++) {
      if (opt.text.indexOf(otherMembers[i].name) >= 0) {
        chosenId = otherMembers[i].id;
        break;
      }
    }
  }

  var memberChoices = [];
  for (var j = 0; j < members.length; j++) {
    memberChoices.push({
      id: members[j].id,
      name: members[j].name,
      choice: determineMemberChoice(members[j].id)
    });
  }

  var chosenMember = members.find(function(m) { return m.id === chosenId; });
  var endingType = getEndingType(chosenId, memberChoices);
  var chosenMemberChoice = '';
  for (var k = 0; k < memberChoices.length; k++) {
    if (memberChoices[k].id === chosenId) {
      chosenMemberChoice = memberChoices[k].choice;
      break;
    }
  }

  var isMutual = chosenMemberChoice.indexOf('选择了你') >= 0;
  GS.finalChoice = isMutual ?
    ('你选择了 ' + chosenMember.name + '，' + chosenMember.name + '也选择了你 —— ' + endingType) :
    ('你选择了 ' + chosenMember.name + '，但' + chosenMember.name + chosenMemberChoice + ' —— ' + endingType);

  if (!GS.aiEnabled) {
    GS.gameOver = true;
    saveGame();
    renderAll();
    return;
  }

  showLoading('正在生成最终结局...');
  try {
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('finalResult', {
      choiceText: GS.finalChoice,
      memberChoices: memberChoices
    });
    var rawText = await callDeepSeek(sysPrompt, userMsg, TOKEN_CONFIG.finalResult);
    var parsed = parseNarrative(rawText);
    GS.consequenceNarratives.push({ rawText: rawText, parsed: parsed });
    GS.currentOptions = [];
    GS.gameOver = true;
    saveGame();
    renderAll();
  } catch (e) {
    alert('⚠️ 结局生成失败：' + e.message + '\n请点击刷新按钮重试。');
  }
  hideLoading();
}

async function handleFreeAction(actionText) {
  if (GS.smsSentToday && GS.phaseIndex === 3) {
    if (GS.stayCount >= MAX_STAY_COUNT) {
      alert('⚠️ 今日继续次数已用完（' + MAX_STAY_COUNT + '/' + MAX_STAY_COUNT + '），请进入下一天。');
      return;
    }
    GS.stayCount++;
  }
  var isDay11 = GS.day === 11;
  if (!isDay11 && GS.phaseChoiceCount >= MAX_PHASE_CHOICES) {
    alert('⚠️ 本时段选项次数已用完，请进入下一时段。');
    return;
  }

  if (!GS.aiEnabled) {
    alert('⚠️ AI 未启用，请先启用 AI。');
    return;
  }

  showLoading('正在按你的行动生成剧情...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('freeAction', { actionText: actionText });
    var rawText = await callDeepSeek(sysPrompt, userMsg, TOKEN_CONFIG.freeAction);
    var parsed = parseNarrative(rawText);
    GS.consequenceNarratives.push({ rawText: rawText, parsed: parsed });
    GS.phaseChoiceCount++;
    if (!isDay11 && GS.phaseChoiceCount >= MAX_PHASE_CHOICES) parsed.options = [];
    GS.currentOptions = parsed.options;
    GS.isInConsequence = true;
    GS.todayFullText.push(rawText);
    triggerAffectionFromChoice(actionText);
    GS.freeInput = '';
    saveGame();
    renderAll();
  } catch (e) {
    alert('⚠️ AI 生成失败：' + e.message + '\n请点击刷新按钮重试。');
  }
  hideLoading();
}

function triggerAffectionFromChoice(choiceText) {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var targetMember = null;
  for (var i = 0; i < members.length; i++) {
    if (choiceText.indexOf(members[i].name) >= 0) {
      targetMember = members[i];
      break;
    }
  }
  if (!targetMember) targetMember = members[Math.floor(Math.random() * members.length)];

  var delta = randInt(2, 4);
  updateAffection(targetMember.id, delta);
  addAffectionLog(targetMember.id, delta, '你选择了与' + targetMember.name + '相关的行动');

  // 未选中者 -1~2
  var otherMembers = members.filter(function(m) { return m.id !== targetMember.id; });
  for (var j = 0; j < otherMembers.length; j++) {
    var deltaNeg = -randInt(1, 2);
    updateAffection(otherMembers[j].id, deltaNeg);
    addAffectionLog(otherMembers[j].id, deltaNeg, '未选中');
  }
}

async function handleRegenerate() {
  if (!GS.aiEnabled) {
    alert('⚠️ AI 未启用，请先启用 AI。');
    return;
  }

  if (GS.consequenceNarratives.length > 0) {
    var last = GS.consequenceNarratives.pop();
    popTodayFullText();
    GS.prevSummary = last && last.rawText ? last.rawText.slice(0, 200) : '';
    GS.prevRawText = last && last.rawText ? last.rawText : '';
    if (GS.consequenceNarratives.length === 0) {
      GS.currentOptions = GS.parsedNarrative.options;
      GS.isInConsequence = false;
      saveGame();
      renderAll();
    } else {
      GS.currentOptions = GS.consequenceNarratives[GS.consequenceNarratives.length - 1].parsed.options;
      saveGame();
      renderAll();
    }
  } else {
    var oldRaw = GS.phaseNarrative;
    GS.prevSummary = oldRaw ? oldRaw.slice(0, 200) : '';
    GS.prevRawText = oldRaw || '';
    popTodayFullText();
    await generatePhaseNarrative();
  }
}

async function advancePhase() {
  if (GS.dayCompleted) return;
  if (GS.phaseIndex < 3) {
    GS.phaseIndex++;
    resetPhaseState();
    saveGame();
    renderAll();
    await generatePhaseNarrative();
  } else {
    await goToNextDay();
  }
}

function resetPhaseState() {
  GS.phaseNarrative = '';
  GS.parsedNarrative = {
    narrative: '', directorOS: '', observerOS: '',
    interviews: [], memberInterviews: [], xInterviews: [], options: []
  };
  GS.consequenceNarratives = [];
  GS.currentOptions = [];
  GS.isInConsequence = false;
  GS.smsSentToday = false;
  GS.smsTarget = '';
  GS.smsDrafts = [];
  GS.stayCount = 0;
  GS.phaseChoiceCount = 0;
  GS.freeInput = '';
  GS.prevSummary = '';
  GS.prevRawText = '';
  GS.pendingDatingResult = null;
  GS.day10ChosenDate = null;
  GS.todayRandomEventTriggered = false; // [P1-5] 新的一天重置
}

async function goToNextDay() {
  if (GS.day >= 12) {
    if (GS.currentOptions.length > 0 && GS.currentOptions[0].text.indexOf('选择') >= 0) return;
    GS.gameOver = true;
    GS.finalChoice = '（请在最终选项中选择）';
    saveGame();
    renderAll();
    return;
  }

  showLoading('正在压缩今日记忆...');
  var summary = await compressTodayToSummary();
  hideLoading();
  if (summary) {
    var promises = extractPendingPromises(summary);
    var revealed = extractRevealedInfo(summary);
    // 使用非模态面板
    GS.pendingMemoryReview = {
      day: GS.day,
      summary: summary,
      promises: promises,
      revealed: revealed
    };
    saveGame();
    renderAll();
  } else {
    proceedToNextDay();
  }
}

async function proceedToNextDay() {
  GS.dailyFullTexts.push(GS.todayFullText.slice());

  // [P0-2] 约会后获得小礼物（Day 4 / Day 8）
  if ((GS.day === 4 || GS.day === 8) && GS.currentDatingPartner) {
    var tmpl = GIFT_TEMPLATES[Math.floor(Math.random() * GIFT_TEMPLATES.length)];
    GS.gifts.push({
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      type: tmpl.type,
      name: tmpl.name,
      desc: tmpl.desc,
      fromDay: GS.day,
      fromPartner: GS.currentDatingPartner
    });
  }

  GS.observerGuestPrevious = GS.observerGuest.split('（')[0];
  GS.day++;
  GS.phaseIndex = 0;
  GS.stayCount = 0;
  GS.todayFullText = [];
  GS._todayCompressedSummary = '';
  GS.observerGuest = '';
  GS.currentDatingPartner = null;
  GS.datingDiceResult = null;
  GS.pendingMemoryReview = null;
  GS.drunkTrigger = null;
  GS.drunkRoundCount = 0;
  resetPhaseState();
  saveGame();
  renderAll();

  if (GS.aiEnabled && GS.dailySummaries.length > 0) {
    var lastSummary = GS.dailySummaries[GS.dailySummaries.length - 1];
    showImagePromptModal(lastSummary);
  } else {
    if (GS.day === 10) showDay10DatingModal();
    else await generatePhaseNarrative();
  }
}
