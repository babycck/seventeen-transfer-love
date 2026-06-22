// ==================== X档案生成 ====================
function buildXArchiveMainPrompt() {
  var hp = GS.heroineProfile;
  var xMember = MEMBERS.find(function(m) { return m.id === GS.secretX; });
  var behaviorLines = [];
  for (var i = 0; i < hp.personality.length; i++) {
    var trait = hp.personality[i];
    var mapping = BEHAVIOR_MAP[trait];
    if (mapping) behaviorLines.push('【' + trait + '】' + mapping);
  }

  return '你是恋爱故事写手。请为《换乘恋爱》节目生成一对前任的完整情感档案。\n\n' +
    '## 人物\n' +
    '- 女主：' + hp.name + '，' + hp.age + '岁，' + hp.job + '\n' +
    '  性格：' + hp.personality.join('、') + '，MBTI：' + hp.mbti + '\n' +
    '  外貌：' + hp.appearance.join('、') + '\n' +
    (hp.privateTraits.length > 0 ? '  私密体质：' + hp.privateTraits.join('、') + '\n' : '') +
    '- X：' + xMember.name + '（' + xMember.stageName + '），SEVENTEEN ' + xMember.pos + '\n' +
    '  性格关键词：' + xMember.personality + '\n' +
    '  情感模式：' + xMember.loveStyle + '\n' +
    '  关键细节：' + xMember.traits + '\n' +
    '  第二职业：' + xMember.secondCareer + ' · 擅长：' + xMember.specialties + '\n' +
    '  关系：恋爱2年，分手1年\n\n' +
    '## ⚠️ 核心要求：故事必须由人物性格驱动\n' +
    '这不是一个通用的恋爱模板。你必须为「这位女主 × 这位成员」写出独一无二的故事。\n\n' +
    '### 女主特质驱动（必须在故事中体现）\n' +
    '- 职业：' + hp.job + '——相识场景必须与此职业相关\n' +
    '- 性格行为映射：\n' + behaviorLines.join('\n') + '\n' +
    '- 外貌特征：至少2个在场景中被对方注意到\n\n' +
    '### 成员特质驱动（必须在故事中体现）\n' +
    '- 性格关键词：' + xMember.personality + '\n' +
    '- 情感模式：' + xMember.loveStyle + '\n' +
    '- 关键细节：至少2个在故事中体现\n' +
    '- 相识场景必须与该成员的具体兴趣或专长匹配\n\n' +
    '### 性格碰撞分析\n' +
    '- 女主的性格是：' + hp.personality.join('、') + '\n' +
    '- 成员的性格是：' + xMember.personality + '\n' +
    '- 这两人的性格碰撞会产生什么独特的化学反应？分手原因必须是两人性格碰撞的必然结果，不是通用的"聚少离多"。\n\n' +
    '## 写作要求（每个部分有字数底线）\n' +
    '### 1. 相识经过（至少200字）\n' +
    '必须包含：具体的时间地点、第一次对话（至少3句来回）、视觉细节、听觉细节\n' +
    '### 2. 恋爱关键回忆（至少400字，至少2个具体场景）\n' +
    '每个场景包含：时间地点、对话片段（至少4句来回）、触觉/体感细节\n' +
    '不能概括！必须写具体的某一天、某一次。\n' +
    '### 3. 分手原因（至少200字）\n' +
    '必须包含：最后一次对话（至少5句来回）、谁提出的分手原话、分手时的环境氛围、分手后第一周两人的状态\n' +
    '### 4. 隐藏信息（后台使用，不在档案中展示）（至少250字）\n' +
    '包含：A.每个场景为什么对这段关系重要（每个场景1-2句话）B.当前隐藏情感——X现在对女主还藏着什么感情？他看到她时在想什么？他不敢说但希望她知道的话是什么？\n\n' +
    '## 严格禁止\n' +
    '- ❌ 通用相识场景（书店偶遇、咖啡厅邂逅等与两人特质无关的场景）\n' +
    '- ❌ 忽略任何一方性格的故事\n' +
    '- ❌ "聚少离多""性格不合"等通用分手理由\n' +
    '- ❌ "他们相爱了两年"→写具体怎么相爱\n' +
    '- ❌ 任何概括性词语（"经常""总是""每次"）→写具体的"有一次""那一天"\n\n' +
    '## 输出格式\n' +
    '【相识经过】\n...（至少200字）\n\n' +
    '【恋爱关键回忆】\n场景一：...（至少200字）\n场景二：...（至少200字）\n\n' +
    '【分手原因】\n...（至少200字）\n\n' +
    '【隐藏信息】\n场景意义：...\n当前隐藏情感：...';
}

function buildXArchiveItemsPrompt(storyText) {
  return '基于以下恋爱故事，提取3-5件可公开的X记忆物品。这些物品将在后续节目环节中公开，不要在档案中提前剧透具体细节。\n\n' +
    '## 恋爱故事\n' + storyText + '\n\n' +
    '## 要求\n' +
    '- 每件物品必须与上述故事中的具体场景直接关联\n' +
    '- 每件物品的描述简洁（1句话）：物品是什么、与哪个场景相关\n' +
    '- 格式：\n【记忆物品】\n1. 物品名称（与场景X相关）\n2. ...';
}

function buildXArchiveMemberPrompt(memberId) {
  var m = MEMBERS.find(function(x) { return x.id === memberId; });
  return '请为一个SEVENTEEN成员生成他与场外X的分手原因。\n\n' +
    '## 人物\n' +
    '- 成员：' + m.name + '（' + m.stageName + '），SEVENTEEN ' + m.pos + '，性格：' + m.personality + '\n' +
    '- 场外X：女性（不在节目中出场），姓名由你设定\n\n' +
    '## 写作要求\n' +
    '### 1. 场外X基本信息\n' +
    '姓名、年龄、职业（必须与成员的身份和性格匹配）\n' +
    '### 2. 分手原因（至少150字）\n' +
    '必须包含：最后一次对话的具体内容（至少4句来回）、谁提出的分手原话、分手时的情绪和氛围、分手后成员的状态\n\n' +
    '## 严格禁止\n' +
    '- ❌ "因为性格不合分手"→写最后一次对话\n' +
    '- ❌ 任何概括性描述\n\n' +
    '## 输出格式\n' +
    '【场外X信息】\n姓名：...\n年龄：...\n职业：...\n\n' +
    '【分手原因】\n...（至少150字）';
}

function buildXArchiveItemsMemberPrompt(storyText, memberName) {
  return '基于以下分手故事，提取2-3件记忆物品（简洁索引）。\n\n' +
    '## 分手故事\n' + storyText + '\n\n' +
    '## 要求\n' +
    '- 每件物品与故事中的具体场景关联\n' +
    '- 格式：\n【记忆物品】\n1. 物品名称\n2. ...';
}

async function generateAllXArchives() {
  var xMember = MEMBERS.find(function(m) { return m.id === GS.secretX; });
  var otherIds = GS.selectedMembers.filter(function(id) { return id !== GS.secretX; });

  showLoading('正在生成X关系故事...');
  try {
    var storyRaw = await callDeepSeek(
      buildXArchiveMainPrompt(),
      '请生成女主与' + xMember.name + '的完整恋爱档案。',
      TOKEN_CONFIG.xMainStory
    );
    var hiddenMatch = storyRaw.match(/【隐藏信息】([\s\S]*)$/i);
    if (hiddenMatch) {
      GS.xBackstoryHidden = hiddenMatch[1].trim();
      GS.xBackstory = storyRaw.replace(/【隐藏信息】[\s\S]*$/i, '').trim();
    } else {
      GS.xBackstory = storyRaw.trim();
      GS.xBackstoryHidden = '';
    }
    saveGame();
  } catch (e) {
    GS.xBackstory = 'X档案生成失败，请刷新重试。';
    saveGame();
  }
  hideLoading();

  if (GS.aiEnabled && GS.xBackstory && GS.xBackstory.length > 50 && GS.xBackstory.indexOf('失败') < 0) {
    showLoading('正在生成X记忆物品索引...');
    try {
      var itemsRaw = await callDeepSeek(
        buildXArchiveItemsPrompt(GS.xBackstory),
        '请基于上述故事提取记忆物品（简洁索引）。',
        TOKEN_CONFIG.xItems
      );
      GS.xItems[GS.secretX] = itemsRaw.trim();
      saveGame();
    } catch (e) {
      console.error('X items failed:', e);
    }
    hideLoading();
  }

  for (var i = 0; i < otherIds.length; i++) {
    var id = otherIds[i];
    var m = MEMBERS.find(function(x) { return x.id === id; });
    showLoading('正在生成' + m.name + '的X档案（' + (i + 1) + '/' + otherIds.length + '）...');
    try {
      var memberRaw = await callDeepSeek(
        buildXArchiveMemberPrompt(id),
        '请生成' + m.name + '与场外X的分手原因。',
        TOKEN_CONFIG.xMemberReason
      );
      GS.memberXBackstories[id] = memberRaw.trim();
      saveGame();

      // 生成场外X记忆物品
      if (GS.aiEnabled && memberRaw && memberRaw.length > 30) {
        try {
          var itemsRaw2 = await callDeepSeek(
            buildXArchiveItemsMemberPrompt(memberRaw, m.name),
            '请提取记忆物品。',
            TOKEN_CONFIG.xItems
          );
          GS.xItems[id] = itemsRaw2.trim();
          saveGame();
        } catch (e) {
          console.error('Member X items failed:', e);
        }
      }
    } catch (e) {
      GS.memberXBackstories[id] = '场外X档案生成失败，请刷新重试。';
      saveGame();
    }
    hideLoading();
  }
}

// ==================== 好感度系统 ====================
function updateAffection(memberId, delta) {
  if (!GS.affection[memberId]) GS.affection[memberId] = 0;
  var before = GS.affection[memberId];
  var after = Math.max(-100, Math.min(100, before + delta));
  GS.affection[memberId] = after;

  // [P1-4] 好感度里程碑 Toast（每位成员只触发一次）
  if (!GS.affMilestoneShown) GS.affMilestoneShown = {};
  if (!GS.affMilestoneShown[memberId]) GS.affMilestoneShown[memberId] = {};
  var m = MEMBERS.find(function(x) { return x.id === memberId; });
  var thresholds = [40, 60, 80];
  var msgs = { 40: '💚 他开始在意你了', 60: '❤️ 他明显对你有好感', 80: '❤️🔥 他深深被你吸引' };
  for (var t = 0; t < thresholds.length; t++) {
    var th = thresholds[t];
    if (before < th && after >= th && !GS.affMilestoneShown[memberId][th]) {
      GS.affMilestoneShown[memberId][th] = true;
      if (m) showToast(m.name + ' ' + msgs[th]);
    }
  }
}

function getAffectionDesc(aff) {
  if (aff >= 80) return '❤️🔥';
  if (aff >= 60) return '❤️';
  if (aff >= 40) return '💚';
  if (aff >= 15) return '😐';
  if (aff >= 0) return '💙';
  return '💔';
}

function getAffectionHint(memberId) {
  var aff = GS.affection[memberId] || 0;
  var m = MEMBERS.find(function(x) { return x.id === memberId; });
  return m.emoji + m.name + ' ' + getAffectionDesc(aff);
}

function addAffectionLog(memberId, delta, reason) {
  if (!GS.affectionLog[memberId]) GS.affectionLog[memberId] = [];
  GS.affectionLog[memberId].push({
    day: GS.day,
    phase: PHASE_LABELS[PHASES[GS.phaseIndex]],
    change: delta,
    reason: reason,
    total: GS.affection[memberId]
  });
}
