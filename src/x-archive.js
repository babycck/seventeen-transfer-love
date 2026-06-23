import {
  MEMBERS, BEHAVIOR_MAP, TOKEN_CONFIG,
  GS, saveGame, showLoading, hideLoading, callDeepSeek
} from './core.js';
import {
  findCachedMainStory, saveMainStoryToCache,
  findCachedMemberStory, saveMemberStoryToCache,
  findCachedXItems, saveXItemsToCache,
  getMemberComboKey
} from './story-cache.js';
// ==================== X档案生成 ====================
export function buildXArchiveMainPrompt() {
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
    '- ❌ 任何概括性词语（"经常""总是""每次"）→写具体的"有一次""那一天"\n' +
    '- ❌ 所有角色严格禁止抽烟（含电子烟、雪茄）。正文中不得出现任何与抽烟相关的描写、物品或暗示，包括但不限于：烟灰缸、打火机、烟味、点烟、吸烟、尼古丁等。\n\n' +
    '## 输出格式\n' +
    '【相识经过】\n...（至少200字）\n\n' +
    '【恋爱关键回忆】\n场景一：...（至少200字）\n场景二：...（至少200字）\n\n' +
    '【分手原因】\n...（至少200字）\n\n' +
    '【隐藏信息】\n场景意义：...\n当前隐藏情感：...';
}

export function buildXArchiveItemsPrompt(storyText) {
  return '基于以下恋爱故事，生成2件X记忆物品。每件包含：物品名称、外观样式、背后故事（约50字）。\n\n' +
    '## 恋爱故事\n' + storyText + '\n\n' +
    '## 要求\n' +
    '- 生成恰好2件物品\n' +
    '- 每件格式：\n  名称：xxx\n  样式：xxx\n  故事：xxx（约50字）\n' +
    '- 物品必须与故事中的具体场景直接关联\n' +
    '- 故事要克制、有画面感，不煽情';
}

export function buildXArchiveMemberPrompt(memberId) {
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
    '- ❌ 任何概括性描述\n' +
    '- ❌ 所有角色严格禁止抽烟（含电子烟、雪茄）。正文中不得出现任何与抽烟相关的描写、物品或暗示，包括但不限于：烟灰缸、打火机、烟味、点烟、吸烟、尼古丁等。\n\n' +
    '## 输出格式\n' +
    '【场外X信息】\n姓名：...\n年龄：...\n职业：...\n\n' +
    '【分手原因】\n...（至少150字）';
}

export function buildXArchiveItemsMemberPrompt(storyText, memberName) {
  return '基于以下分手故事，提取2-3件记忆物品（简洁索引）。\n\n' +
    '## 分手故事\n' + storyText + '\n\n' +
    '## 要求\n' +
    '- 每件物品与故事中的具体场景关联\n' +
    '- 格式：\n【记忆物品】\n1. 物品名称\n2. ...';
}

export async function generateAllXArchives() {
  var xMember = MEMBERS.find(function(m) { return m.id === GS.secretX; });
  var otherIds = GS.selectedMembers.filter(function(id) { return id !== GS.secretX; });

  // ====== 女主↔X 恋爱档案（查缓存） ======
  var cachedMain = findCachedMainStory(GS.selectedMembers, GS.secretX, GS.heroineProfile);
  if (cachedMain) {
    GS.xBackstory = cachedMain.xBackstory;
    GS.xBackstoryHidden = cachedMain.xBackstoryHidden;
    GS.xItems[GS.secretX] = cachedMain.xItems;
    console.log('[XArchive] 复用缓存的女主↔X恋爱档案');
  } else {
    showLoading('正在生成X关系故事...');
    try {
      var storyRaw = await callDeepSeek(
        buildXArchiveMainPrompt(),
        '请生成女主与' + xMember.name + '的完整恋爱档案。',
        TOKEN_CONFIG.xMainStory,
        false,
        0.5
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

    var comboKey = getMemberComboKey(GS.selectedMembers, GS.secretX);
    var cachedXItems = findCachedXItems(comboKey);
    if (cachedXItems) {
      GS.xItems[GS.secretX] = cachedXItems;
      console.log('[XArchive] 复用缓存的X记忆物品');
    } else if (GS.aiEnabled && GS.xBackstory && GS.xBackstory.length > 50 && GS.xBackstory.indexOf('X档案生成失败') < 0) {
      showLoading('正在生成X记忆物品...');
      try {
        var itemsRaw = await callDeepSeek(
          buildXArchiveItemsPrompt(GS.xBackstory),
          '请基于上述故事生成2件完整记忆物品（名称+样式+故事约50字）。',
          TOKEN_CONFIG.xItems,
          false,
          0.4
        );
        GS.xItems[GS.secretX] = itemsRaw.trim();
        saveXItemsToCache(comboKey, itemsRaw.trim());
        saveGame();
      } catch (e) {
        console.error('X items failed:', e);
      }
      hideLoading();
    }

    // 写入缓存
    if (GS.xBackstory && GS.xBackstory.indexOf('X档案生成失败') < 0) {
      saveMainStoryToCache(GS.selectedMembers, GS.secretX, GS.heroineProfile, {
        xBackstory: GS.xBackstory,
        xBackstoryHidden: GS.xBackstoryHidden,
        xItems: GS.xItems[GS.secretX] || ''
      });
    }
  }

  // ====== 场外X分手故事（查缓存，按成员ID永久缓存） ======
  for (var i = 0; i < otherIds.length; i++) {
    var id = otherIds[i];
    var m = MEMBERS.find(function(x) { return x.id === id; });

    var cachedMember = findCachedMemberStory(id);
    if (cachedMember) {
      GS.memberXBackstories[id] = cachedMember.backstory;
      GS.xItems[id] = cachedMember.items;
      console.log('[XArchive] 复用缓存的场外X档案：' + m.name);
      saveGame();
      continue;
    }

    showLoading('正在生成' + m.name + '的X档案（' + (i + 1) + '/' + otherIds.length + '）...');
    try {
      var memberRaw = await callDeepSeek(
        buildXArchiveMemberPrompt(id),
        '请生成' + m.name + '与场外X的分手原因。',
        TOKEN_CONFIG.xMemberReason,
        false,
        0.5
      );
      GS.memberXBackstories[id] = memberRaw.trim();
      saveGame();

      // 生成场外X记忆物品
      var memberItems = '';
      if (GS.aiEnabled && memberRaw && memberRaw.length > 30) {
        try {
          var itemsRaw2 = await callDeepSeek(
            buildXArchiveItemsMemberPrompt(memberRaw, m.name),
            '请提取记忆物品。',
            TOKEN_CONFIG.xItems,
            false,
            0.4
          );
          memberItems = itemsRaw2.trim();
          GS.xItems[id] = memberItems;
          saveGame();
        } catch (e) {
          console.error('Member X items failed:', e);
        }
      }

      // 写入缓存（按成员ID，永久缓存）
      saveMemberStoryToCache(id, {
        backstory: GS.memberXBackstories[id],
        items: memberItems
      });
    } catch (e) {
      GS.memberXBackstories[id] = '场外X档案生成失败，请刷新重试。';
      saveGame();
    }
    hideLoading();
  }
}



