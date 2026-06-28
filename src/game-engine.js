import {
  MAX_STAY_COUNT, PHASE_ACTION_LIMIT, MEMBERS, TRUTH_CARDS,
  GIFT_TEMPLATES, MEMBER_GIFT_PREFERENCE, PHASES, PHASE_LABELS,
  QUESTION_BOX_QUESTIONS, TOKEN_CONFIG, HOLIDAYS, RETURN_GIFTS,
  ONE_HEART_TOKEN_CONFIG, ONE_HEART_RANDOM_EVENTS,
  GS, saveGame, showLoading, hideLoading, showToast, randInt, escHtml, dispatch
} from './core.js';
import { generateWithRetry, formatAIError } from './ai-generator.js';
import { callDeepSeek } from './api.js';
import { parseNarrative, completeSecretMission } from './parser.js';
import { compressTodayForInjection, getTodayNarrativeTail, getTodayKeyEventsSummary, popTodayFullText, compressTodayToSummary, getTodayFullText, getTodayFullTextCapped } from './memory.js';
import { rollDatingDice, pickDatingLocation } from './formatters.js';
import { buildSystemPrompt, buildUserMessage, buildOneHeartSystemPrompt, buildOneHeartUserMessage } from './prompts.js';
import { updateAffection, addAffectionLog, getAffectionDesc } from './affection.js';
import { extractPendingPromises, extractRevealedInfo } from './promises.js';
// renderAll 通过 window.__renderAll 调用，避免与 ui-renderer.js 循环依赖
import { showXItemsModal } from './modals.js';
import { validateNarrative } from './validator.js';
import { checkMissionInteract, shouldTriggerSecretMission } from './utils.js';
// 骨架模块（Phase 4 渐进式接管）
import { settlePendingAffChanges as skeletonSettleAff } from './skeleton/affection-engine.js';
import { applyDrinksFromParsed as skeletonApplyDrinks } from './skeleton/drink-engine.js';
import { checkExMessageTrigger as skeletonCheckExMsg, handleExMessageChoice as skeletonHandleExMsg, checkJealousyMissionTrigger as skeletonJealMission, checkJealousyEvent as skeletonJealEvent } from './skeleton/event-triggers.js';
import { generateOptions as skeletonGenOptions, getFallbackOptions as skeletonGetFallbackOpts } from './skeleton/option-engine.js';
// 模态弹窗（Phase 5 模块化）
import { showDatingDiceModal as modalDatingDice } from './modals/dating-dice.js';
import { showDay10DatingModal as modalDay10 } from './modals/day10-dating.js';
import { showDrunkMemberSelectModal as modalDrunkSelect } from './modals/drunk-select.js';
import { showTruthAnswerModal as modalTruthAnswer } from './modals/truth-answer.js';
import {
  resetDayState as skeletonResetDay,
  cleanupSecretMission as skeletonCleanupMission,
  updateObserverGuestPrevious as skeletonUpdateObserver,
  generateDayGifts as skeletonGenGifts,
  advanceDateAndWeather as skeletonAdvanceDate,
  checkMissionCard as skeletonMissionCard
} from './skeleton/scheduler.js';

// ==================== 游戏流程 ====================
function pushCorrections(corrections) {
  if (corrections && corrections.length > 0) {
    if (!GS.aiCorrections) GS.aiCorrections = [];
    GS.aiCorrections = GS.aiCorrections.concat(corrections);
  }
}

export async function generatePhaseNarrative() {
  if (GS.gameMode === 'oneHeart') {
    return generateOneHeartRound();
  }
  if (GS._isGenerating) { console.log('[gen] skip reentrant call'); return; }
  GS._isGenerating = true;
  try {
  // 结算上一段 pending 好感度
  skeletonSettleAff();
  // X幽灵存在：Day 3-5 随机触发
  if (GS.day >= 3 && GS.day <= 5 && !GS.xGhostEvent && Math.random() < 0.15) {
    GS.xGhostEvent = { day: GS.day };
    saveGame();
  }
  // 秘密任务触发（在生成剧情前检查）
  if (shouldTriggerSecretMission()) {
    saveGame();
  }

  // 嫉妒任务（制作组搞事）触发检查
  if (checkJealousyMissionTrigger()) {
    saveGame();
  }

  // 前任来电/来信触发检查（Day 5-9 傍晚/深夜）
  if (checkExMessageTrigger()) {
    saveGame();
  }

  // Day 4/6/8 约会配对：弹出骰子弹窗
  if ([4, 6, 8].indexOf(GS.day) >= 0 && GS.phaseIndex === 0 && !GS.datingDiceResult) {
    modalDatingDice(generatePhaseNarrative);
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
    // 抽卡人顺序：女主 + 3位成员，每轮开始前重新随机
    var baseDrawers = ['heroine'].concat(GS.selectedMembers);
    function shuffleDrawers() {
      var arr = baseDrawers.slice();
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    }
    var shuffledLight = shuffle(lightCards);
    var firstCard = shuffledLight.shift(); // 预抽第一张
    GS.truthState = {
      active: true,
      round: 1,              // 1=轻度轮, 2=中度轮, 3=深度轮
      subRound: 1,           // 1-4（当前轮中的第几个人）
      levelMap: {
        light: shuffledLight,
        medium: shuffle(mediumCards),
        deep: shuffle(deepCards)
      },
      usedCards: [firstCard],
      currentCard: firstCard,     // 预抽卡，显示和传给 AI 的都是同一个对象
      drawerOrder: shuffleDrawers(),
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

  // Day 6 深夜：初始化午夜匿名电话亭
  if (GS.day === 6 && GS.phaseIndex === 3 && !GS.midnightCall) {
    GS.midnightCall = { day: 6, status: 'pending', targetId: null, content: null };
    saveGame();
  }

  // Day 7 傍晚：初始化匿名提问箱
  if (GS.day === 7 && GS.phaseIndex === 2 && !GS.questionBox) {
    var qbQuestions = QUESTION_BOX_QUESTIONS.slice();
    for (var qbi = qbQuestions.length - 1; qbi > 0; qbi--) {
      var qbj = Math.floor(Math.random() * (qbi + 1));
      var qbtmp = qbQuestions[qbi]; qbQuestions[qbi] = qbQuestions[qbj]; qbQuestions[qbj] = qbtmp;
    }
    GS.questionBox = {
      active: true,
      day: 7,
      questions: qbQuestions.slice(0, 4),
      currentQuestion: qbQuestions[0],
      answered: [],
      history: []
    };
    saveGame();
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
    if (window.__renderAll) window.__renderAll();
    return;
  }

  showLoading('正在生成时段剧情...');
  try {
    // 每时段触发一次回礼（非阻塞弹窗）
    var returnGiftInfo = checkPendingReturnGifts();
    if (returnGiftInfo) {
      showReturnGiftModal(returnGiftInfo.member, returnGiftInfo.gift);
    }

    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('phase');
    var _gr = await generateWithRetry(sysPrompt, userMsg, { tokens: TOKEN_CONFIG.phaseNarrative, temperature: 0.8 });
    var rawText = _gr.raw;
    var parsed = parseNarrative(rawText);

    // ====== Step 1: 剧情文本生成（不含选项） ======
    dispatch({ type: 'SET_PHASE_NARRATIVE', payload: { rawText: rawText, parsed: parsed } });
    GS.pendingAffChanges = [];  // 选项好感度在 Step 2 处理
    // 保存 Step 1 叙事中 AI 自带的选项，作为 Step 2 生成失败时的第一级兜底
    var narrativeOptions = (parsed.options || []).filter(function(o) { return o && o.text; });
    applyDrinksFromParsed(parsed);
    var corrections = validateNarrative(rawText, parsed);
    pushCorrections(corrections);
    GS.consequenceNarratives = [];
    GS.isInConsequence = false;
    GS.phaseOptionCount = 0;

    if (GS.phaseIndex === 3 && !GS.smsSentToday) {
      var drafts = (GS.parsedNarrative.smsDrafts || []).slice(0, 3);
      if (drafts.length === 0) {
        drafts = ['今天和你聊天很开心。', '谢谢你今天的陪伴。', '晚安，明天见。'];
      }
      while (drafts.length < 3) drafts.push('今天过得很愉快。');
      GS.smsDrafts = drafts;
    } else {
      GS.smsDrafts = [];
    }

    var phaseTagMap = { morning: '【上午】', afternoon: '【下午】', evening: '【傍晚】', night: '【深夜】' };
    dispatch({ type: 'PUSH_TODAY_TEXT', text:(phaseTagMap[PHASES[GS.phaseIndex]] || '') + rawText });
    GS.mainInterview = (GS.parsedNarrative.interviews || []).join(' ').slice(0, 100);
    GS.prevSummary = rawText.slice(0, 200);
    GS.prevRawText = rawText;

    if (GS.datingDiceResult) {
      GS.currentDatingPartner = GS.datingDiceResult.partner;
      GS.pendingDatingResult = GS.datingDiceResult.partner;
      GS.datingDiceResult = null;
    } else {
      GS.pendingDatingResult = null;
      if (GS.day === 9 && GS.secretX) {
        GS.currentDatingPartner = GS.secretX;
      }
    }

    // 约会日 phase 0：提前抽取约会地点，让首次渲染时横幅就能显示
    var _isDatingDayEarly = ([4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0);
    if (_isDatingDayEarly && !GS.currentDatingLocation) {
      GS.currentDatingLocation = pickDatingLocation(GS.season, GS.weather);
    }

    saveGame();
    if (window.__renderAll) window.__renderAll();

    // Step 1 完成，先隐藏加载层让用户看到剧情
    hideLoading();

    // ====== Step 2: 基于已生成的剧情文本生成选项 ======
    var isDatingDay = ([4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0);
    if (isDatingDay) {
      // 约会日：固定选项
      GS.currentOptions = [{ label: '\u25B6', text: '\u25B6 进入约会场景' }];
      if (!GS.currentDatingLocation) {
        GS.currentDatingLocation = pickDatingLocation(GS.season, GS.weather);
      }
    } else {
      // 先试骨架（处理真心话/提问箱/深夜等特殊场景的固定选项）
      var skeletonOpts = (GS.skeletonConfig && GS.skeletonConfig.optionEngine) ? skeletonGenOptions() : null;
      if (skeletonOpts && skeletonOpts.length > 0) {
        GS.currentOptions = skeletonOpts;
      } else if (narrativeOptions && narrativeOptions.length >= 3) {
        // [优化] Step 1 已返回 >= 3 个有效选项，直接复用叙事自带选项，跳过 Step 2 AI 调用
        GS.pendingAffChanges = [];
        dispatch({ type: 'SET_OPTIONS', payload: { options: narrativeOptions } });
      } else {
        // 正常+约会场景：AI 基于剧情生成选项（剧情延伸 + 好感度字段）
        showLoading('正在根据剧情生成选项...');
        try {
          var optSysPrompt = buildSystemPrompt();
          var optUserMsg = buildUserMessage('generateOptions', { narrativeText: rawText });
          var optResult = await generateWithRetry(optSysPrompt, optUserMsg, { tokens: 1000, temperature: 0.7, skipValidate: true });
          // AI 选项生成返回 {"options":[...]} 格式，优先直接 JSON.parse 提取 options，
          // 避免 parseNarrative（针对 blocks 修复）兜底返回空 options 导致回退默认项
          var optParsed;
          try {
            optParsed = JSON.parse(optResult.raw);
          } catch (e) {
            optParsed = parseNarrative(optResult.raw);
          }
          if (optParsed.options && optParsed.options.length > 0) {
            GS.pendingAffChanges = optParsed.affChanges || [];
            dispatch({ type: 'SET_OPTIONS', payload: { options: optParsed.options } });
          } else if (narrativeOptions && narrativeOptions.length > 0) {
            console.warn('[generatePhaseNarrative] 选项生成返回空数组，复用叙事自带选项');
            dispatch({ type: 'SET_OPTIONS', payload: { options: narrativeOptions } });
          } else {
            console.warn('[generatePhaseNarrative] 选项生成返回空数组且无叙事选项，使用骨架兜底');
            dispatch({ type: 'SET_OPTIONS', payload: { options: skeletonGetFallbackOpts() } });
          }
        } catch (optErr) {
          console.error('[generatePhaseNarrative] 选项生成失败:', optErr);
          showToast('⚠️ 选项生成失败，使用兜底选项');
          if (narrativeOptions && narrativeOptions.length > 0) {
            dispatch({ type: 'SET_OPTIONS', payload: { options: narrativeOptions } });
          } else {
            dispatch({ type: 'SET_OPTIONS', payload: { options: skeletonGetFallbackOpts() } });
          }
        }
      }
    }

    saveGame();
    if (window.__renderAll) window.__renderAll();

    // [P2-7] Day 4/5 自动弹出 X 记忆物品展示
    if ((GS.day === 4 || GS.day === 5) && GS.phaseIndex === 0) {
      var members2 = GS.selectedMembers;
      for (var mi = 0; mi < members2.length; mi++) {
        if (GS.day === 4) {
          GS.xItemsRevealState[members2[mi]] = 'first';
        } else if (GS.day === 5 && GS.xItemsRevealState[members2[mi]] === 'first') {
          GS.xItemsRevealState[members2[mi]] = 'second';
        }
      }
      saveGame();
      setTimeout(showXItemsModal, 500);
    }
  } catch (e) {
    console.error('[generatePhaseNarrative] AI 生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
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
    if (window.__renderAll) window.__renderAll();
  }
  hideLoading();
} finally { GS._isGenerating = false; }
}

// [改造] 把 parsed.drinks 数组累加到 GS.drinkCounts，并触发醉酒判定
export function applyDrinksFromParsed(parsed) {
  skeletonApplyDrinks(parsed);
}

// [改造] 统一应用 parsed 的副作用：drinks 累加 + 秘密任务完成
export function applyParsedSideEffects(parsed) {
  applyDrinksFromParsed(parsed);
}

// [P0-3] Day 11 深夜醉酒剧情生成
export async function generateDrunkNarrative() {
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
      GS.phaseNarrative = JSON.stringify({
        blocks: [
          { type: 'directorOS', content: triggerName + '喝得太多，独自起身回了房间。门轻轻关上，留下客厅里的其他人面面相觑。' },
          { type: 'narrative', content: '这一夜，没有更多的故事发生。' }
        ],
        observers: [
          { name: '李龙真', line: '看来X是真的放下了。' },
          { name: '金叡园', line: '有点遗憾……但也松了一口气。' },
          { name: '郑基锡', line: '酒精是情感的放大镜，有时是，有时不是。' }
        ]
      });
      GS.parsedNarrative = parseNarrative(GS.phaseNarrative);
      GS.currentOptions = [{ label: '▶', text: '▶ X已回房间，继续深夜' }];
      GS.consequenceNarratives = [];
      GS.isInConsequence = false;
      GS.phaseOptionCount = 0;
      dispatch({ type: 'PUSH_TODAY_TEXT', text:'【深夜】' + GS.phaseNarrative });
      GS.smsDrafts = [];
      saveGame();
      if (window.__renderAll) window.__renderAll();
      hideLoading();
      return;
    }

    // [FIX-9.3] X醉酒嫉妒剧情：好感≥80且另一成员≥50时触发
    if (isX && (GS.affection[triggerId] || 0) >= 80) {
      var jealousTarget = members.find(function(m) {
        return m.id !== triggerId && (GS.affection[m.id] || 0) >= 50;
      });
      if (jealousTarget) {
        try {
          var jPrompt = buildSystemPrompt();
          var jMsg = buildUserMessage('phase') + '\n\n' +
            '[INSTRUCTION] 醉酒嫉妒剧情（强制执行）\n' +
            triggerName + '在真心话环节中喝到了≥2杯，处于醉酒状态。\n' +
            '⚠️ 关键设定：' + triggerName + '对女主的好感度≥80，且' + jealousTarget.name + '对女主的好感度≥50。\n' +
            triggerName + '醉酒后看到女主和' + jealousTarget.name + '之间的微妙互动（或仅仅是假想），压抑已久的嫉妒情绪爆发。\n' +
            '请生成约1000字的嫉妒剧情：\n' +
            '- ' + triggerName + '醉酒状态下的嫉妒表现（眼神变暗、语气变化、不自觉靠近女主、对' + jealousTarget.name + '的冷淡或敌意）\n' +
            '- ' + jealousTarget.name + '察觉到X的异常反应\n' +
            '- 女主感受到两人之间的张力\n' +
            '- 必须插入一段「隐藏对话」：' + triggerName + '说出平时绝对不会说的占有欲宣言\n' +
            '- 结尾生成选项：\n' +
            '  ① 安抚' + triggerName + '的情绪\n' +
            '  ② 和' + jealousTarget.name + '一起离开现场\n' +
            '  ③ 让两人自己解决（你退到一旁）\n';
    var _gr = await generateWithRetry(jPrompt, jMsg, { tokens: TOKEN_CONFIG.phaseNarrative, temperature: 0.8 });
    var jRaw = _gr.raw;
    GS.phaseNarrative = jRaw;
          GS.parsedNarrative = parseNarrative(jRaw);
          GS.currentOptions = GS.parsedNarrative.options;
          GS.consequenceNarratives = [];
          GS.isInConsequence = false;
          GS.phaseOptionCount = 0;
          dispatch({ type: 'PUSH_TODAY_TEXT', text:jRaw });
          GS.smsDrafts = [];
          saveGame();
          if (window.__renderAll) window.__renderAll();
          hideLoading();
          return;
        } catch (e) {
          console.error('嫉妒剧情生成失败，降级为普通醉酒剧情:', e);
        }
      }
    }

    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('phase') + '\n\n' +
      '## 醉酒剧情（强制执行）\n' +
      triggerName + '在真心话环节中喝到了≥2杯，现在处于醉酒状态。\n' +
      '请生成约1000字的醉酒剧情：\n' +
      '- 描写醉酒者的状态（眼神、动作、语气变化）\n' +
      '- 其他在场成员的反应\n' +
      '- 醉酒者说出平时不会说的话（隐藏对话）\n' +
      '- 女主（玩家）的选择和感受\n' +
      (Math.random() < 0.6 ? '- ⚠️ 必须在剧情中插入一段「隐藏对话」：醉酒者说出平时绝对不会说的话（60%概率触发）\n' : '') +
      '- 结尾生成选项：\n' +
      (isHeroine ? '  ① 被某位嘉宾照顾（弹出选人）② 和某人去阳台吹风（弹出选人）③ 留在客厅陪某人（弹出选人）④ 和X单独对话（直接触发，不弹窗）\n' :
       isX ? '  ① 女主被X留住说话 ② 女主和X去阳台\n' :
       '  ① 女主照顾他 ② 他把女主留在客厅说话\n');
    if (GS.truthPunishment) {
      userMsg += '\n## 真心话惩罚剧情（强制执行）\n' +
        '在醉酒剧情中融入以下惩罚设定：\n' +
        '惩罚类型：' + GS.truthPunishment.type + '\n' +
        (GS.truthPunishment.targetId ? '目标成员：' + (MEMBERS.find(function(m){return m.id===GS.truthPunishment.targetId})||{}).name + '\n' : '') +
        '请将以上惩罚自然地融入到醉酒剧情发展中。\n';
    }

    var _gr = await generateWithRetry(sysPrompt, userMsg, { tokens: TOKEN_CONFIG.phaseNarrative, temperature: 0.8 });
    var rawText = _gr.raw;
    GS.phaseNarrative = rawText;
    GS.parsedNarrative = parseNarrative(rawText);
    applyParsedSideEffects(GS.parsedNarrative);
    var corrections = validateNarrative(rawText, GS.parsedNarrative);
    pushCorrections(corrections);
    GS.currentOptions = GS.parsedNarrative.options;
    GS.consequenceNarratives = [];
    GS.isInConsequence = false;
    GS.phaseOptionCount = 0;
    dispatch({ type: 'PUSH_TODAY_TEXT', text:'【深夜】' + rawText });
    GS.smsDrafts = [];
    saveGame();
    if (window.__renderAll) window.__renderAll();
  } catch (e) {
    console.error('[generateDrunkNarrative] 醉酒剧情生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
  }
  hideLoading();
}

// [P0-3] 生成醉酒后续剧情
export async function generateDrunkConsequence(choiceText, memberId) {
  showLoading('正在生成醉酒后续...');
  try {
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('consequence', { choiceText: choiceText, drunkTarget: memberId });
    var _gr = await generateWithRetry(sysPrompt, userMsg, { tokens: TOKEN_CONFIG.consequence, temperature: 0.75 });
    var rawText = _gr.raw;
    var parsed = parseNarrative(rawText);
    applyParsedSideEffects(parsed);
    var corrections = validateNarrative(rawText, parsed);
    pushCorrections(corrections);
    dispatch({ type: 'PUSH_CONSEQUENCE', rawText: rawText, parsed: parsed, choiceText: choiceText });
    GS.currentOptions = parsed.options;
    dispatch({ type: 'PUSH_TODAY_TEXT', text:rawText });
    saveGame();
    if (window.__renderAll) window.__renderAll();
  } catch (e) {
    console.error('[generateDrunkConsequence] 醉酒后续生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
  }
  hideLoading();
}

// [P0-3] 真心话回答输入弹窗
// [P0-3] Day 11 真心话单轮处理（3轮制：轻度→中度→深度，每轮4人）
export async function handleTruthRound(opt) {
  var ts = GS.truthState;
  var levelNames = { light: '轻度', medium: '中度', deep: '深度' };
  var currentLevel = ts.round === 1 ? 'light' : ts.round === 2 ? 'medium' : 'deep';
  var drawerId = ts.drawerOrder[ts.subRound - 1];
  var isHeroineTurn = (drawerId === 'heroine');

  // 保存推进前的轮次编号（给 prompt 用）
  var promptRound = ts.round;
  var promptSubRound = ts.subRound;

  // 使用预抽卡（与 UI 显示的 currentCard 是同一个对象）
  var card = ts.currentCard;

  var playerAnswer = '';

  if (isHeroineTurn && opt.text.indexOf('如实回答') >= 0) {
    // 女主选择如实回答：弹出输入框
    playerAnswer = await modalTruthAnswer();
    if (!playerAnswer) {
      // 用户取消：恢复 UI 按钮状态，让玩家可重新选择
      if (window.__renderAll) window.__renderAll();
      return;
    }
  }

  // 本地兜底：仅女主拒答→+1（成员喝酒由 AI 在 parsed.drinks 中返回）
  var drankThisRound = false;
  if (isHeroineTurn && opt.text.indexOf('喝酒') >= 0) {
    GS.drinkCounts['heroine'] = (GS.drinkCounts['heroine'] || 0) + 1;
    drankThisRound = true;
  }
  if (drankThisRound && !GS.drunkTrigger && (GS.drinkCounts[drawerId] || 0) >= 2) {
    GS.drunkTrigger = drawerId;
    if (GS.truthState) GS.truthState.drunkDeclared = true;
  }

  // 推进轮次
  ts.subRound++;
  if (ts.subRound > 4) {
    // 当前轮（难度）的4人已结束，进入下一轮（下一个难度）
    ts.round++;
    ts.subRound = 1;
    // 每轮开始前重新随机抽卡顺序
    var baseDrawers = ['heroine'].concat(GS.selectedMembers);
    for (var i = baseDrawers.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = baseDrawers[i]; baseDrawers[i] = baseDrawers[j]; baseDrawers[j] = tmp;
    }
    ts.drawerOrder = baseDrawers;
  }

  // 检查是否结束真心话（3轮 × 4人 = 12人次完成）
  if (ts.round > 3) {
    ts.active = false;
  }

  // 预抽下一张卡（与 UI 显示以及下一轮传给 AI 的是同一个对象）
  if (ts.active) {
    var nextLevelName = ts.round === 1 ? 'light' : ts.round === 2 ? 'medium' : 'deep';
    if (ts.levelMap[nextLevelName] && ts.levelMap[nextLevelName].length > 0) {
      var nextCard = ts.levelMap[nextLevelName].shift();
      ts.usedCards.push(nextCard);
      ts.currentCard = nextCard;
    } else {
      ts.currentCard = null;
    }
  } else {
    ts.currentCard = null;
  }

  saveGame();

  // 生成真心话剧情（复用 consequence 机制）
  showLoading('正在生成真心话剧情...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('consequence', {
      choiceText: opt.text,
      truthRound: promptRound,
      truthSubRound: promptSubRound,
      truthLevel: currentLevel,
      truthCard: card,
      truthDrawer: drawerId,
      truthAnswer: playerAnswer
    });
    var _gr = await generateWithRetry(sysPrompt, userMsg, { tokens: TOKEN_CONFIG.consequence, temperature: 0.6 });
    var rawText = _gr.raw;
    var parsed = parseNarrative(rawText);
    // 去重：本地已给女主 +1，防止 AI 返回的 drinks 中再重复累加
    if (parsed && parsed.drinks && drankThisRound) {
      parsed.drinks = parsed.drinks.filter(function(d) {
        return !(d && (d.name === '女主' || d.name === '你'));
      });
    }
    applyParsedSideEffects(parsed);
    var corrections = validateNarrative(rawText, parsed);
    pushCorrections(corrections);
    dispatch({ type: 'PUSH_CONSEQUENCE', rawText: rawText, parsed: parsed, choiceText: '真心话：' + opt.text });
    dispatch({ type: 'PUSH_TODAY_TEXT', text:rawText });
    saveGame();
    if (window.__renderAll) window.__renderAll();

    // 真心话结束后显示"进入深夜"按钮
    if (!ts.active) {
      GS.currentOptions = [{ label: '▶', text: '▶ 真心话结束，进入深夜' }];
      saveGame();
      if (window.__renderAll) window.__renderAll();
      // 检查是否触发惩罚（谁先到2杯就触发谁）
      if (GS.day === 11 && !GS.truthState.active && GS.drunkTrigger) {
        triggerTruthPunishment(GS.drunkTrigger);
      }
    }
  } catch (e) {
    console.error('[handleTruthRound] AI 生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
  }
  hideLoading();
}

// 跳过真心话进入下一时段
export function skipTruthRound() {
  if (!GS.truthState) return;
  GS.truthState.active = false;
  GS.truthState.currentCard = null;
  saveGame();
  if (window.__renderAll) window.__renderAll();
  // 延迟一帧调用 advancePhase 避免渲染阻塞
  setTimeout(function() {
    if (typeof advancePhase === 'function') {
      advancePhase();
    }
  }, 100);
}
window.skipTruthRound = skipTruthRound;

export function triggerTruthPunishment(drunkerId) {
  var punishments = [
    { type: 'carry', desc: '照顾你的成员必须公主抱你回卧室' },
    { type: 'darkroom', desc: '你与随机成员被关进书房强制独处5分钟' },
    { type: 'reverse', desc: '被指定成员可以反问你一个必须如实回答的问题' }
  ];
  var p = punishments[Math.floor(Math.random() * punishments.length)];
  var members = GS.selectedMembers.filter(function(id) { return id !== 'heroine'; });
  var target = members[Math.floor(Math.random() * members.length)];
  GS.truthPunishment = {
    type: p.type,
    targetId: target,
    desc: p.desc,
  };
}

export async function handleOptionChoice(opt) {
  // [P0-3] 真心话结束后进入深夜
  if (opt.text.indexOf('进入深夜') >= 0 || opt.text.indexOf('真心话结束') >= 0 || opt.text.indexOf('X已回房间') >= 0) {
    await advancePhase();
    return;
  }

  // Day 12 最终选择检测：检查选项文本是否包含选择/复合/换乘/成员名
  var isFinalChoice = GS.day === 12 && (
    opt.text.indexOf('选择') >= 0 ||
    opt.text.indexOf('复合') >= 0 ||
    opt.text.indexOf('换乘') >= 0 ||
    GS.selectedMembers.some(function(id) {
      var m = MEMBERS.find(function(mm) { return mm.id === id; });
      return m && opt.text.indexOf(m.name) >= 0;
    })
  );
  if (isFinalChoice) {
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
      modalDrunkSelect(opt.text, generateDrunkConsequence);
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

  // Day 7 匿名提问箱选项处理
  if (GS.questionBox && GS.questionBox.active) {
    await handleQuestionBoxChoice(opt);
    return;
  }

  // Day 11 不限制选项次数（非真心话的普通剧情）
  var isTruthRound = GS.day === 11 && GS.truthState && GS.truthState.active; var isDay11 = isTruthRound;
  if (!isDay11 && GS.phaseOptionCount + GS.phaseFreeCount >= PHASE_ACTION_LIMIT) {
    showToast('⚠️ 本时段行动次数已用完，请进入下一时段。');
    return;
  }

  if (!GS.aiEnabled) {
    showToast('⚠️ AI 未启用，请先启用 AI。');
    return;
  }

  showLoading('正在生成后续剧情...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('consequence', { choiceText: opt.text });
    var _gr = await generateWithRetry(sysPrompt, userMsg, { tokens: TOKEN_CONFIG.consequence, temperature: 0.75 });
    var rawText = _gr.raw;
    var parsed = parseNarrative(rawText);
    applyDrinksFromParsed(parsed);
    var corrections = validateNarrative(rawText, parsed);
    pushCorrections(corrections);
    dispatch({ type: 'PUSH_CONSEQUENCE', rawText: rawText, parsed: parsed, choiceText: opt.text });
    GS.phaseOptionCount++;
    if (!isDay11 && GS.phaseOptionCount + GS.phaseFreeCount >= PHASE_ACTION_LIMIT) parsed.options = [];
    GS.currentOptions = parsed.options;
    GS.isInConsequence = true;
    dispatch({ type: 'PUSH_TODAY_TEXT', text:rawText });
    // 好感度快照（用于后续的 auto Toast 比对）
    GS._affSnapshot = JSON.parse(JSON.stringify(GS.affection));
    triggerAffectionFromChoice(opt.text, opt);
    checkJealousyEvent(opt.text);
    checkMissionInteract(opt.text);
    // 应用 pendingJealousy 好感度变化并清除
    if (GS.pendingJealousy) {
      var pj = GS.pendingJealousy;
      updateAffection(pj.observerId, -3);
      addAffectionLog(pj.observerId, -3, '看到女主与' + pj.targetName + '互动，心生醋意');
      updateAffection(pj.targetId, 1);
      addAffectionLog(pj.targetId, 1, '被' + pj.observerName + '关注（吃醋事件）');
      GS.pendingJealousy = null;
    }

    // 好感度变化自动汇总 Toast
    var affParts = [];
    for (var ai = 0; ai < GS.selectedMembers.length; ai++) {
      var ma = GS.selectedMembers[ai];
      var mm = MEMBERS.find(function(x) { return x.id === ma; });
      if (!mm) continue;
      // 从之前的 snapshot 比对
      var oldVal = GS._affSnapshot && GS._affSnapshot[ma] !== undefined ? GS._affSnapshot[ma] : (GS.affection[ma] || 0);
      var newVal = GS.affection[ma] || 0;
      var diff = newVal - oldVal;
      if (diff !== 0) {
        affParts.push((diff > 0 ? '+' : '') + diff + ' ' + mm.name);
      }
    }
    if (affParts.length > 0) {
      showToast(affParts.join('  '));
    }
    GS._affSnapshot = null;

    // 积累已用选项文本（用于 prompt 多样性约束）
    if (!Array.isArray(GS.todayOptionTexts)) GS.todayOptionTexts = [];
    parsed.options.forEach(function(o) {
      if (GS.todayOptionTexts.indexOf(o.text) < 0) {
        GS.todayOptionTexts.push(o.text);
      }
    });

    saveGame();
    if (window.__renderAll) window.__renderAll();
  } catch (e) {
    console.error('[handleOptionChoice] AI 生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
  }
  hideLoading();
}

// ==================== Day 12 双向选择 ====================
export function determineMemberChoice(memberId) {
  var aff = GS.affection[memberId] || 0;
  // 额外权重：秘密任务完成 + 送礼
  var bonus = 0;
  if (GS.secretMissionHistory) {
    for (var si = 0; si < GS.secretMissionHistory.length; si++) {
      var sm = GS.secretMissionHistory[si];
      if (sm.status === 'completed' && sm.targetMemberId === memberId) bonus += 5;
    }
  }
  if (GS.returnGiftHistory) {
    for (var ri = 0; ri < GS.returnGiftHistory.length; ri++) {
      if (GS.returnGiftHistory[ri].memberId === memberId) bonus += 3;
    }
  }
  aff += bonus;

  if (memberId === GS.secretX) {
    if (aff >= 70) return '选择了你（复合·深深爱着你）';
    if (aff >= 50) return '选择了你（复合·他还爱着你）';
    if (aff >= 30) return '选择了你（复合·但内心仍有犹豫）';
    if (aff >= 15) return '选择了回到过去（但表示"已经回不去了"）';
    return '选择了独自离开（他放下了）';
  }
  if (aff >= 70) return '选择了你（换乘·真心被你吸引）';
  if (aff >= 50) return '选择了你（换乘·但还在整理对前任的感情）';
  if (aff >= 30) return '选择了回到前任身边';
  if (aff >= 15) return '选择了独自离开';
  return '选择了独自离开';
}

export function getEndingType(chosenId, memberChoices) {
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

export async function handleFinalChoice(opt) {
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

  // 结算 pending 好感变动
  skeletonSettleAff();

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
  GS.endingMemberChoices = memberChoices;
  GS.endingChosenId = chosenId;

  // 记录结局到图鉴
  if (!GS.endingArchive) GS.endingArchive = [];
  GS.endingArchive.push({
    date: new Date().toISOString().slice(0, 10),
    endingType: endingType,
    chosenName: chosenMember ? chosenMember.name : '',
    chosenId: chosenId,
    isMutual: isMutual,
    finalChoice: GS.finalChoice,
    affections: JSON.parse(JSON.stringify(GS.affection)),
    memberChoices: JSON.parse(JSON.stringify(memberChoices)),
    day: GS.day
  });

  if (!GS.aiEnabled) {
    GS.gameOver = true;
    saveGame();
    if (window.__renderAll) window.__renderAll();
    return;
  }

  showLoading('正在生成最终结局...');
  try {
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('finalResult', {
      choiceText: GS.finalChoice,
      memberChoices: memberChoices
    });
    var _gr = await generateWithRetry(sysPrompt, userMsg, { tokens: TOKEN_CONFIG.finalResult, temperature: 0.8 });
    var rawText = _gr.raw;
    var parsed = parseNarrative(rawText);
    applyParsedSideEffects(parsed);
    var corrections = validateNarrative(rawText, parsed);
    pushCorrections(corrections);
    dispatch({ type: 'PUSH_CONSEQUENCE', rawText: rawText, parsed: parsed, choiceText: '最终选择：' + GS.finalChoice });
    GS.currentOptions = [];
    GS.gameOver = true;

    // 生成一年后 Epilogue
    try {
      var epiPrompt = '你是《换乘恋爱》的短篇AI。请根据以下信息，写一段约200字的「一年后」尾声叙事，描写女主和她选择了的人（或独自一人）一年后的生活片段。要温暖、克制、有画面感。\n\n结局：' + GS.finalChoice + '\n\n如果女主选择了某人，描写两人一年后某个日常瞬间；如果女主独自一人，描写她的成长和释怀。只输出正文，不要选项、不要采访间、不要OS。';
      var epiRaw = await callDeepSeek(buildSystemPrompt(), epiPrompt, 600, false, 0.8);
      var epiParsed = parseNarrative(epiRaw);
      GS.endingEpilogue = epiParsed;
    } catch (e2) {
      GS.endingEpilogue = null;
    }

    saveGame();
    if (window.__renderAll) window.__renderAll();
  } catch (e) {
    console.error('[handleFinalChoice] 结局生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
  }
  hideLoading();
}

export async function handleFreeAction(actionText) {
  if (GS.smsSentToday && GS.phaseIndex === 3) {
    if (GS.stayCount >= MAX_STAY_COUNT) {
      showToast('⚠️ 今日继续次数已用完（' + MAX_STAY_COUNT + '/' + MAX_STAY_COUNT + '），请进入下一天。');
      return;
    }
    GS.stayCount++;
  }
  var isTruthRound = GS.day === 11 && GS.truthState && GS.truthState.active; var isDay11 = isTruthRound;
  if (!isDay11 && GS.phaseOptionCount + GS.phaseFreeCount >= PHASE_ACTION_LIMIT) {
    showToast('⚠️ 本时段行动次数已用完（' + PHASE_ACTION_LIMIT + '/' + PHASE_ACTION_LIMIT + '），请进入下一时段。');
    return;
  }

  if (!GS.aiEnabled) {
    showToast('⚠️ AI 未启用，请先启用 AI。');
    return;
  }

  showLoading('正在扩写你的剧情...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('freeAction', { actionText: actionText });
    var _gr = await generateWithRetry(sysPrompt, userMsg, { tokens: TOKEN_CONFIG.freeAction, temperature: 0.8 });
    var rawText = _gr.raw;
    var parsed = parseNarrative(rawText);
    applyParsedSideEffects(parsed);
    var corrections = validateNarrative(rawText, parsed);
    pushCorrections(corrections);
    dispatch({ type: 'PUSH_CONSEQUENCE', rawText: rawText, parsed: parsed, choiceText: '✍️ 自由剧情：' + actionText });
    GS.phaseFreeCount++;
    // 约会日 phase 0：未进入约会场景时，强制塞回按钮
    var isDatingDayPhase0 = [4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0;
    var hasEnteredDating = false;
    for (var ci = 0; ci < GS.consequenceNarratives.length; ci++) {
      if (GS.consequenceNarratives[ci].choiceText &&
          GS.consequenceNarratives[ci].choiceText.indexOf('进入约会场景') >= 0) {
        hasEnteredDating = true;
        break;
      }
    }
    if (isDatingDayPhase0 && !hasEnteredDating) {
      GS.currentOptions = [{ label: '\u25B6', text: '\u25B6 进入约会场景' }];
    } else {
      showLoading('正在根据自由剧情生成选项...');
      try {
        var optSysPrompt = buildSystemPrompt();
        var optUserMsg = buildUserMessage('generateOptions', { narrativeText: rawText });
        var optResult = await generateWithRetry(optSysPrompt, optUserMsg, { tokens: 1000, temperature: 0.7, skipValidate: true });
        var optParsed;
        try {
          optParsed = JSON.parse(optResult.raw);
        } catch (e) {
          optParsed = parseNarrative(optResult.raw);
        }
        if (optParsed.options && optParsed.options.length > 0) {
          GS.pendingAffChanges = optParsed.affChanges || [];
          dispatch({ type: 'SET_OPTIONS', payload: { options: optParsed.options } });
        } else {
          console.warn('[handleFreeAction] 选项生成返回空数组，使用兜底选项');
          dispatch({ type: 'SET_OPTIONS', payload: { options: skeletonGetFallbackOpts() } });
        }
      } catch (optErr) {
        console.error('[handleFreeAction] 选项生成失败:', optErr);
        showToast('⚠️ 选项生成失败，使用兜底选项');
        dispatch({ type: 'SET_OPTIONS', payload: { options: skeletonGetFallbackOpts() } });
      }
    }
    GS.isInConsequence = true;
    dispatch({ type: 'PUSH_TODAY_TEXT', text:rawText });
    GS.freeInput = '';
    saveGame();
    if (window.__renderAll) window.__renderAll();
  } catch (e) {
    console.error('[handleFreeAction] AI 生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
  }
  hideLoading();
}

// ==================== 嫉妒任务（制作组搞事） ====================
export function checkJealousyMissionTrigger() {
  return skeletonJealMission();
}

// ==================== 前任来电/来信 ====================
export function checkExMessageTrigger() {
  return skeletonCheckExMsg();
}

export function handleExMessageChoice(choice) {
  return skeletonHandleExMsg(choice);
}

export function triggerAffectionFromChoice(choiceText, opt) {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var targetMember = null;

  // 优先使用选项中的 affName（AI 返回的显式好感度变化）
  if (opt && opt.affName) {
    targetMember = members.find(function(m) { return m.name === opt.affName; });
    if (targetMember) {
      var delta = opt.affDelta || randInt(2, 4);
      updateAffection(targetMember.id, delta);
      addAffectionLog(targetMember.id, delta, opt.affReason || '你选择了与' + targetMember.name + '相关的行动');
      var otherMembers = members.filter(function(m) { return m.id !== targetMember.id; });
      for (var j = 0; j < otherMembers.length; j++) {
        updateAffection(otherMembers[j].id, -1);
        addAffectionLog(otherMembers[j].id, -1, '未选中');
      }
      return;
    }
  }

  // fallback: 从文本中匹配成员名
  for (var i = 0; i < members.length; i++) {
    if (choiceText.indexOf(members[i].name) >= 0) {
      targetMember = members[i];
      break;
    }
  }
  if (!targetMember) {
    // 仍然匹配不到时，从 pendingAffChanges 中查找
    var pending = GS.pendingAffChanges || [];
    if (pending.length > 0) {
      var firstChange = pending[0];
      var fallbackMember = MEMBERS.find(function(m) {
        return m.id === firstChange.memberId || m.name === firstChange.name;
      });
      if (fallbackMember) {
        targetMember = fallbackMember;
        var delta2 = firstChange.delta || randInt(2, 4);
        updateAffection(targetMember.id, delta2);
        addAffectionLog(targetMember.id, delta2, firstChange.reason || '你选择了与' + targetMember.name + '相关的行动');
        var otherMembers2 = members.filter(function(m) { return m.id !== targetMember.id; });
        for (var j2 = 0; j2 < otherMembers2.length; j2++) {
          updateAffection(otherMembers2[j2].id, -1);
          addAffectionLog(otherMembers2[j2].id, -1, '未选中');
        }
        return;
      }
    }
    // 终极 fallback：告知玩家
    showToast('💡 好感度变化已记录至日志面板');
    return;
  }

  var delta = randInt(2, 4);
  updateAffection(targetMember.id, delta);
  addAffectionLog(targetMember.id, delta, '你选择了与' + targetMember.name + '相关的行动');

  // 未选中者 -1
  var otherMembers = members.filter(function(m) { return m.id !== targetMember.id; });
  for (var j = 0; j < otherMembers.length; j++) {
    updateAffection(otherMembers[j].id, -1);
    addAffectionLog(otherMembers[j].id, -1, '未选中');
  }
}

// ==================== 吃醋事件系统 ====================
// 触发条件委托给 skeleton/event-triggers.js
export function checkJealousyEvent(choiceText) {
  skeletonJealEvent(choiceText);
}

export async function handleRegenerate() {
  // 重置生成锁，允许重新尝试
  GS._isGenerating = false;
  GS._advancingPhase = false;  // 重置重入锁，避免卡死
  // 重新生成时旧pending被自然覆盖，不结算
  GS.pendingAffChanges = [];
  if (!GS.aiEnabled) {
    showToast('⚠️ AI 未启用，请先启用 AI。');
    return;
  }

  if (GS.consequenceNarratives.length > 0) {
    var last = GS.consequenceNarratives.pop();
    popTodayFullText();
    GS.prevSummary = last && last.rawText ? last.rawText.slice(0, 200) : '';
    GS.prevRawText = last && last.rawText ? last.rawText : '';
    var choiceText = last.choiceText;

    showLoading('正在重新生成...');
    try {
      await compressTodayForInjection();
      var sysPrompt = buildSystemPrompt();
      var userMsg = buildUserMessage('consequence', { choiceText: choiceText });
var _gr = await generateWithRetry(sysPrompt, userMsg, { tokens: TOKEN_CONFIG.consequence, temperature: 0.75 });
    var rawText = _gr.raw;
    var savedDrinkCounts = JSON.parse(JSON.stringify(GS.drinkCounts));
      var parsed = parseNarrative(rawText);
      applyParsedSideEffects(parsed);
      var corrections = validateNarrative(rawText, parsed);
      pushCorrections(corrections);
      dispatch({ type: 'PUSH_CONSEQUENCE', rawText: rawText, parsed: parsed, choiceText: choiceText });
      GS.currentOptions = parsed.options;
      // 约会日 phase 0 未进入约会场景时，强制保留按钮
      var _isDatingDay0 = [4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0;
      if (_isDatingDay0) {
        var _hasEntered = (last.choiceText && last.choiceText.indexOf('进入约会场景') >= 0);
        for (var _ci = 0; _ci < GS.consequenceNarratives.length; _ci++) {
          if (GS.consequenceNarratives[_ci].choiceText &&
              GS.consequenceNarratives[_ci].choiceText.indexOf('进入约会场景') >= 0) {
            _hasEntered = true;
            break;
          }
        }
        if (!_hasEntered) {
          GS.currentOptions = [{ label: '\u25B6', text: '\u25B6 进入约会场景' }];
        }
      }
      GS.isInConsequence = true;
      dispatch({ type: 'PUSH_TODAY_TEXT', text:rawText });
      saveGame();
      if (window.__renderAll) window.__renderAll();
    } catch (e) {
      console.error('[handleRegenerate] AI 生成失败:', e);
      showToast('⚠️ ' + formatAIError(e));
    }
    hideLoading();
  } else {
    var oldRaw = GS.phaseNarrative;
    GS.prevSummary = oldRaw ? oldRaw.slice(0, 200) : '';
    GS.prevRawText = oldRaw || '';
    popTodayFullText();
    await generatePhaseNarrative();
  }
}

export async function advancePhase() {
  if (GS.gameMode === 'oneHeart') return;
  if (GS.dayCompleted) return;
  if (GS._advancingPhase) { console.log('[advancePhase] skip reentrant call'); return; }
  GS._advancingPhase = true;
  try {
    var maxPhase = GS.day === 12 ? 2 : 3;
    if (GS.phaseIndex < maxPhase) {
      GS.phaseIndex++;
      resetPhaseState();
      saveGame();
      showLoading('正在进入下一时段...');
      if (window.__renderAll) window.__renderAll();
      await generatePhaseNarrative();
    } else {
      await goToNextDay();
    }
  } finally {
    GS._advancingPhase = false;
  }
}

export function resetPhaseState() {
  dispatch({ type: 'RESET_PHASE_STATE' });
  GS.pendingDatingResult = null;
  GS.day10ChosenDate = null;
  GS.todayRandomEventTriggered = false;
}

export async function goToNextDay() {
  if (GS.day >= 12) {
    if (GS.currentOptions.length > 0) return;
    GS.gameOver = true;
    GS.finalChoice = '（请在最终选项中选择）';
    saveGame();
    if (window.__renderAll) window.__renderAll();
    return;
  }

  showLoading('正在压缩今日记忆...');
  var summary = await compressTodayToSummary();
  hideLoading();
  if (summary) {
    GS.dailySummaries.push(summary);
    GS.pendingPromises = extractPendingPromises(summary);
    GS.todayRevealedInfo = extractRevealedInfo(summary);
    saveGame();
  }
  await proceedToNextDay();
}

export async function proceedToNextDay() {
  GS.dailyFullTexts.push(GS.todayFullText.slice());

  await skeletonGenGifts();
  skeletonCleanupMission();
  // 清理当日特殊状态
  GS.xGhostEvent = null;
  skeletonUpdateObserver();
  skeletonAdvanceDate();
  // 好感度快照（用于结局折线图）
  if (!Array.isArray(GS.affectionHistory)) GS.affectionHistory = [];
  GS.affectionHistory.push({
    day: GS.day,
    aff: Object.assign({}, GS.affection),
    drinkCounts: Object.assign({}, GS.drinkCounts),
    rivalryIntensity: GS.rivalryIntensity || 0
  });

  skeletonResetDay();
  resetPhaseState();
  // 重置当天选项文本黑名单
  GS.todayOptionTexts = [];

  // 任务卡触发检查
  var missionCard = skeletonMissionCard();
  if (missionCard) {
    showMissionCardModal(missionCard);
  }

  saveGame();
  if (window.__renderAll) window.__renderAll();
  setTimeout(function() { window.scrollTo(0, 0); }, 100);

  if (GS.day === 10) await modalDay10(generatePhaseNarrative);
  else {
    // 下集预告：与次日剧情并发生成
    var previewPromise = generateNextEpisodePreview();
    var phasePromise = generatePhaseNarrative();
    var previewText = await previewPromise;
    if (previewText) {
      showNextEpisodeOverlay(previewText);
    }
    await phasePromise;
  }
}

// ==================== 下集预告 ====================
async function generateNextEpisodePreview() {
  try {
    // 只在 AI 可用且非测试模式时生成
    if (!GS.aiEnabled || GS.testMode) return '';
    // Day 1 跳过（今天没有"昨天"的总结）
    if (GS.day <= 1) return '';
    // 获取今日关键事件摘要
    var summary = getTodayKeyEventsSummary();
    if (!summary || summary.length < 10) return '';
    var sysPrompt = '你是一位综艺节目预告文案撰写专家。基于以下当天节目剧情总结，用一句话（≤40字）撰写下集悬念预告。语气类似韩剧"下集更精彩"，要有钩子感和悬念感。只输出预告文本，不要任何前缀、引号或额外说明。';
    var rawText = await callDeepSeek(sysPrompt, '当天剧情总结：' + summary, 80, false, 0.6);
    if (rawText && rawText.trim().length > 0) {
      GS.nextEpisodePreview = rawText.trim();
      saveGame();
      return GS.nextEpisodePreview;
    }
  } catch (e) {
    console.warn('[preview] generate failed:', e.message);
  }
  return '';
}

function showNextEpisodeOverlay(previewText) {
  var overlay = document.createElement('div');
  overlay.className = 'next-episode-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;animation:nextEpFadeIn 0.5s ease;';
  overlay.innerHTML = '<div style="text-align:center;padding:0 40px;max-width:600px">' +
    '<div style="font-size:14px;color:#ffb74d;letter-spacing:3px;margin-bottom:12px;opacity:0.9">📺 下 集 预 告</div>' +
    '<div style="font-size:24px;font-weight:700;color:#fff;line-height:1.6;text-shadow:0 2px 8px rgba(0,0,0,0.5)">' + escHtml(previewText) + '</div>' +
    '<div style="margin-top:24px;font-size:13px;color:#e91e63;letter-spacing:1px">— 即将进入 Day ' + GS.day + ' —</div>' +
    '</div>';
  document.body.appendChild(overlay);

  // 3.5 秒后淡出并移除
  setTimeout(function() {
    overlay.style.animation = 'nextEpFadeOut 0.6s ease forwards';
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 600);
  }, 3500);
}

export async function handleMidnightCall(targetId, content, reaction) {
  if (!GS.midnightCall) return;
  if (targetId === null) {
    GS.midnightCall.status = 'skipped';
    saveGame();
    if (window.__renderAll) window.__renderAll();
    return;
  }
  GS.midnightCall.status = 'done';
  GS.midnightCall.targetId = targetId;
  GS.midnightCall.content = content;
  if (reaction) GS.midnightCall.reaction = reaction;

  var targetMember = MEMBERS.find(function(m) { return m.id === targetId; });

  updateAffection(targetId, 5);
  addAffectionLog(targetId, 5, '收到匿名电话，隐约猜到是你');

  var otherIds = GS.selectedMembers.filter(function(id) { return id !== targetId; });
  for (var i = 0; i < otherIds.length; i++) {
    updateAffection(otherIds[i], -2);
    addAffectionLog(otherIds[i], -2, '猜疑匿名电话的对象不是自己');
  }

  saveGame();
  if (window.__renderAll) window.__renderAll();
}

// ==================== 匿名提问箱 ====================
export function showQuestionBoxAnswerModal() {
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    var inner = '<div class="modal-content"><h3>📦 匿名提问箱</h3>' +
      '<p style="font-size:12px;color:#8b6b6b;margin-bottom:8px">你抽到了这个问题：</p>' +
      '<p style="font-size:14px;color:#c2185b;font-weight:600;margin-bottom:12px;padding:10px;background:#fff5f5;border-radius:8px;">' + escHtml(GS.questionBox.currentQuestion) + '</p>' +
      '<p style="font-size:11px;color:#8b6b6b;margin-bottom:8px">请输入你的回答：</p>' +
      '<textarea id="qbAnswerInput" style="width:100%;min-height:120px;border:1.5px solid #e0c0c0;border-radius:10px;padding:10px;font-size:13px;font-family:inherit;resize:vertical;outline:none;" placeholder="写下你的真实回答..."></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:10px">' +
      '<button class="btn-confirm" id="qbSubmit" style="flex:1">提交回答</button>' +
      '</div>' +
      '<button class="modal-close-x" id="qbCancel">✕</button></div>';
    overlay.innerHTML = inner;
    document.body.appendChild(overlay);

    var input = overlay.querySelector('#qbAnswerInput');
    input.focus();

    overlay.querySelector('#qbSubmit').addEventListener('click', function() {
      var val = input.value.trim();
      if (!val) {
        showToast('请输入回答内容');
        return;
      }
      overlay.remove();
      resolve(val);
    });
    overlay.querySelector('#qbCancel').addEventListener('click', function() {
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

export async function continueToday() {
  if (GS.stayCount >= MAX_STAY_COUNT) {
    showToast('⚠️ 今日继续次数已用完（' + MAX_STAY_COUNT + '/' + MAX_STAY_COUNT + '）。');
    return;
  }
  GS.stayCount++;

  if (!GS.aiEnabled) {
    showToast('⚠️ AI 未启用，请先启用 AI。');
    return;
  }

  showLoading('正在生成延伸剧情...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('stay');
    var _gr = await generateWithRetry(sysPrompt, userMsg, { tokens: TOKEN_CONFIG.stay, temperature: 0.8 });
    var rawText = _gr.raw;
    var parsed = parseNarrative(rawText);
    applyParsedSideEffects(parsed);
    var corrections = validateNarrative(rawText, parsed);
    pushCorrections(corrections);
    dispatch({ type: 'PUSH_CONSEQUENCE', rawText: rawText, parsed: parsed, choiceText: '✍️ 继续今天（第' + GS.stayCount + '次）' });
    GS.currentOptions = parsed.options;
    dispatch({ type: 'PUSH_TODAY_TEXT', text:rawText });
    saveGame();
    if (window.__renderAll) window.__renderAll();
  } catch (e) {
    console.error('[continueToday] 生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
  }
  hideLoading();
}

export async function handleQuestionBoxChoice(opt) {
  var qb = GS.questionBox;
  var playerAnswer = '';
  var isDrink = opt.text.indexOf('喝酒') >= 0;

  if (!isDrink) {
    playerAnswer = await showQuestionBoxAnswerModal();
    if (!playerAnswer) {
      if (window.__renderAll) window.__renderAll();
      return;
    }
  }

  if (isDrink) {
    GS.drinkCounts['heroine'] = (GS.drinkCounts['heroine'] || 0) + 2;
    if (!GS.drunkTrigger && (GS.drinkCounts['heroine'] || 0) >= 2) {
      GS.drunkTrigger = 'heroine';
    }
  }

  qb.answered.push({
    drawer: 'heroine',
    choice: isDrink ? 'drink' : 'answered',
    content: playerAnswer
  });
  qb.active = false;
  GS.currentOptions = [];  // 清空残留选项，防止 renderOptionPanel 渲染提问箱按钮
  saveGame();

  showLoading('正在生成提问箱后续...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('consequence', {
      choiceText: opt.text,
      questionBoxAnswer: playerAnswer,
      questionBoxQuestion: qb.currentQuestion
    });
    var _gr = await generateWithRetry(sysPrompt, userMsg, { tokens: TOKEN_CONFIG.consequence, temperature: 0.6 });
    var rawText = _gr.raw;
    var parsed = parseNarrative(rawText);
    applyParsedSideEffects(parsed);
    var corrections = validateNarrative(rawText, parsed);
    pushCorrections(corrections);
    dispatch({ type: 'PUSH_CONSEQUENCE', rawText: rawText, parsed: parsed, choiceText: '匿名提问箱：' + qb.currentQuestion + ' - ' + (isDrink ? '拒绝回答并喝酒' : playerAnswer) });
    dispatch({ type: 'PUSH_TODAY_TEXT', text:rawText });
    saveGame();
    if (window.__renderAll) window.__renderAll();
  } catch (e) {
    console.error('[handleQuestionBoxChoice] AI 生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
  }
  hideLoading();
}

// ==================== 成员回礼系统 ====================
export function scheduleReturnGift(memberId) {
  if (!GS.pendingReturnGifts) GS.pendingReturnGifts = [];
  GS.pendingReturnGifts.push({ memberId: memberId, day: GS.day + 1 });
  saveGame();
}
window.scheduleReturnGift = scheduleReturnGift;

export function checkPendingReturnGifts() {
  if (!GS.pendingReturnGifts || GS.pendingReturnGifts.length === 0) return null;
  var pending = GS.pendingReturnGifts.filter(function(p) { return p.day <= GS.day; });
  if (pending.length === 0) return null;
  var first = pending[0];
  var member = MEMBERS.find(function(m) { return m.id === first.memberId; });
  if (!member) return null;
  var allGifts = RETURN_GIFTS[first.memberId] || ['一份小礼物'];

  // 回礼去重：排除该成员已送过的礼物
  var usedGifts = [];
  if (GS.returnGiftHistory) {
    for (var _rgi = 0; _rgi < GS.returnGiftHistory.length; _rgi++) {
      if (GS.returnGiftHistory[_rgi].memberId === first.memberId) {
        usedGifts.push(GS.returnGiftHistory[_rgi].gift);
      }
    }
  }
  var available = allGifts.filter(function(g) { return usedGifts.indexOf(g) < 0; });
  // 池耗尽时回退全池
  if (available.length === 0) available = allGifts.slice();

  var gift = available[Math.floor(Math.random() * available.length)];
  GS.pendingReturnGifts = GS.pendingReturnGifts.filter(function(p) { return p.memberId !== first.memberId || p.day !== first.day; });
  if (!GS.returnGiftHistory) GS.returnGiftHistory = [];
  GS.returnGiftHistory.push({ memberId: first.memberId, gift: gift, day: GS.day, giftDesc: '' });
  updateAffection(first.memberId, 2);
  addAffectionLog(first.memberId, 2, '收到了' + member.name + '的回礼「' + gift + '」');
  saveGame();
  return { member: member, gift: gift };
}

export function showReturnGiftModal(member, gift) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal-content" style="text-align:center">' +
    '<button class="modal-close-x" id="returnGiftClose">✕</button>' +
    '<h3>🎁 收到回礼</h3>' +
    '<p style="font-size:36px;margin:12px 0">' + member.emoji + '</p>' +
    '<p style="font-size:15px;color:#5d3a3a;margin-bottom:4px">' + member.name + ' 送了你一份回礼</p>' +
    '<div style="background:#fff5f5;border-radius:12px;padding:16px;margin:12px 0">' +
    '<p style="font-size:14px;font-weight:600;color:#c2185b;margin-bottom:6px">' + escHtml(gift) + '</p>' +
    '</div>' +
    '<p style="font-size:12px;color:#8b6b6b;margin-bottom:12px">好感度 +2</p>' +
    '<button id="returnGiftAck" style="padding:10px 32px;border-radius:14px;border:none;background:#fce4ec;color:#c2185b;cursor:pointer;font-weight:600;font-size:14px">收下</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#returnGiftClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
  overlay.querySelector('#returnGiftAck').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
}

// ==================== 任务卡弹窗 ====================
export function showMissionCardModal(card) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal-content" style="text-align:center;border:2px solid #c62828">' +
    '<button class="modal-close-x" id="missionCardClose" style="color:#fff">✕</button>' +
    '<div style="background:#c62828;color:#fff;padding:16px;border-radius:10px 10px 0 0;margin:-16px -16px 16px -16px">' +
    '<p style="font-size:11px;letter-spacing:2px;opacity:0.8">制作组任务卡</p>' +
    '<p style="font-size:18px;font-weight:700;margin-top:4px">' + escHtml(card.name) + '</p>' +
    '</div>' +
    '<div style="background:#fce4ec;border-radius:12px;padding:16px;margin:12px 0;border-left:4px solid #c62828">' +
    '<p style="font-size:14px;color:#5d3a3a;line-height:1.6">' + escHtml(card.desc) + '</p>' +
    '</div>' +
    '<button id="missionCardAck" style="background:#c62828;color:#fff;padding:10px 32px;border:none;border-radius:8px;font-size:14px;cursor:pointer">确认接收</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#missionCardClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
  overlay.querySelector('#missionCardAck').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
}

// ==================== 1v1「只为你心动」模式 ====================

export async function generateOneHeartRound(extra) {
  extra = extra || {};
  if (GS._isGenerating) { console.log('[1v1] skip reentrant'); return; }
  GS._isGenerating = true;
  showLoading('正在生成剧情...');
  try {
    var sysMsg = buildOneHeartSystemPrompt();
    // 如果是走向结局，注入结局指令
    if (extra.isEnding) {
      sysMsg += '\n\n[指令] 这是故事的最后一幕。请根据已有的故事发展和主线方向，生成一个完整的结局场景，给这段关系一个收尾。情感要饱满，有始有终。结局可以是温暖的、遗憾的、开放式的——但必须是完整的。';
    }
    // 如果是自由推演，注入自动推演指令
    if (extra.isFreeDeduction) {
      sysMsg += '\n\n[指令] 自由推演模式——请根据女主的性格、当前剧情发展，自然地推进故事。不需要特定方向，让故事跟随角色性格自然流动。';
    }
    // 如果是随机事件，从 1v1 专属池中随机选取
    if (extra.isRandom) {
      var pool = ONE_HEART_RANDOM_EVENTS;
      var picked = pool[Math.floor(Math.random() * pool.length)];
      if (picked) {
        sysMsg += '\n\n[随机事件] 请触发以下剧情——根据当前世界观自然改编场景和人物互动方式，但保留核心情感互动：\n"' + picked.desc + '"';
      }
    }
    var userMsg = buildOneHeartUserMessage('phase');

    var _gr = await generateWithRetry(sysMsg, userMsg, { maxTokens: ONE_HEART_TOKEN_CONFIG.phaseNarrative, skipValidate: true });
    var raw = (_gr && _gr.raw) ? _gr.raw : '';
    if (typeof raw !== 'string') raw = '';
    if (!raw) {
      GS.phaseNarrative = '';
      GS.currentOptions = [];
      GS.parsedNarrative = { narrative: '', directorOS: '', options: [] };
      return;
    }

    var parsed = parseOneHeartNarrative(raw);
    if (!parsed || !parsed.narrative) {
      GS.phaseNarrative = '';
      GS.currentOptions = [];
      GS.parsedNarrative = { narrative: '', directorOS: '', options: [] };
      showToast('⚠️ AI 返回格式异常，请重试或换一条指令');
      return;
    }

    if (GS.pendingChoiceText) {
      // 保存当前 phaseNarrative 到 consequence，防止被后续清空丢失
      if (GS.phaseNarrative && GS.parsedNarrative && GS.parsedNarrative.narrative) {
        GS.consequenceNarratives.push({
          rawText: GS.phaseNarrative,
          parsed: { narrative: GS.parsedNarrative.narrative, options: [] }
        });
      }
      // 新内容推入 consequence（含 choice tag），phaseNarrative 清空
      var _entry = {
        rawText: parsed.narrative,
        parsed: parsed,
        choiceText: GS.pendingChoiceText
      };
      if (GS._pendingSource) {
        _entry.source = GS._pendingSource;
        GS._pendingSource = '';
      }
      GS.consequenceNarratives.push(_entry);
      GS.parsedNarrative = { narrative: '', directorOS: '', options: [] };
      GS.phaseNarrative = '';
      GS.pendingChoiceText = '';
    } else {
      GS.parsedNarrative = parsed;
      GS.phaseNarrative = parsed.narrative;
    }
    GS.currentOptions = parsed.options || [];

    if (GS.todayFullText.length === 0) {
      GS.todayFullText = [parsed.narrative];
    } else {
      GS.todayFullText.push(parsed.narrative);
    }

    // 日记/朋友圈计数器
    if (GS.gameMode === 'oneHeart') {
      // 回礼检测
      var returnGiftInfo = checkPendingReturnGifts();
      if (returnGiftInfo) {
        showReturnGiftModal(returnGiftInfo.member, returnGiftInfo.gift);
      }
      // 日记计数器
      GS.oneHeartDiaryCounter++;
      if (GS.oneHeartDiaryCounter >= 3) {
        GS.oneHeartDiaryCounter = 0;
        await generateDiary();
      }
      // 朋友圈计数器（随机 3-5 段触发）
      GS.oneHeartMomentCounter++;
      var momentThreshold = randInt(3, 5);
      if (GS.oneHeartMomentCounter >= momentThreshold) {
        GS.oneHeartMomentCounter = 0;
        await generateMoment();
      }
    }

    GS.phaseFreeCount = 0;
    GS.phaseOptionCount = 0;
    GS.isInConsequence = false;
    GS.smsSentToday = false;

    // 1v1 剧情压缩计数 + 触发（基于 todayFullText，不删除原文）
    if (GS.gameMode === 'oneHeart' && !extra.isRegenerate) {
      GS.oneHeartGenCount = (GS.oneHeartGenCount || 0) + 1;
      if (GS.oneHeartLastCompressedIdx === undefined) GS.oneHeartLastCompressedIdx = 0;
      var _needMore = GS.todayFullText.length - GS.oneHeartLastCompressedIdx;
      if (GS.oneHeartGenCount >= 15 && _needMore >= 10) {
        var _startIdx = GS.oneHeartLastCompressedIdx;
        // 从 todayFullText 取未压缩的 10 条（只读，不 splice）
        var _toCompress = GS.todayFullText.slice(_startIdx, _startIdx + 10);
        // 原文缓存（用于导出）
        if (!GS.oneHeartArchivedNarratives) GS.oneHeartArchivedNarratives = [];
        GS.oneHeartArchivedNarratives = GS.oneHeartArchivedNarratives.concat(_toCompress);
        // 异步 AI 压缩（不阻塞渲染）
        (async function(entries, start) {
          try {
            var compressText = '';
            for (var ci = 0; ci < entries.length; ci++) {
              compressText += (start + ci + 1) + '. ' + (entries[ci] || '(空)') + '\n';
            }
            if (compressText.length > 100) {
              var summary = await callDeepSeek(
                '你是记忆压缩助手。将以下多段剧情压缩为约1000字的详细摘要。保留关键事件、对话和情感转折。去掉冗余描写。只输出压缩后的文本。',
                '请将以下剧情压缩为约1000字摘要：\n\n' + compressText,
                TOKEN_CONFIG.dailySummary || 2000,
                false,
                0.2
              );
              if (summary && summary.trim()) {
                if (!GS.dailySummaries) GS.dailySummaries = [];
                GS.dailySummaries.push('第' + (start + 1) + '-' + (start + entries.length) + '回合压缩记忆：\n' + summary.trim());
              }
            }
            GS.oneHeartGenCount -= 10;
            GS.oneHeartLastCompressedIdx = start + entries.length;
            saveGame();
          } catch (e) {
            console.error('[1v1 compress] error:', e);
          }
        })(_toCompress, _startIdx);
      }
    }

    saveGame();

    // 如果是走向结局，生成后结束游戏
    if (extra.isEnding) {
      GS.gameOver = true;
      GS.finalChoice = GS.oneHeartMainLine || '与大结局';
      GS.finalResult = parsed.narrative;
      saveGame();
    }
  } catch (e) {
    console.error('[1v1] generation error:', e);
    showToast('剧情生成失败：' + e.message);
  } finally {
    GS._isGenerating = false;
    window.__renderAll && window.__renderAll();
    hideLoading();
  }
}

window.generateOneHeartRound = generateOneHeartRound;

function parseOneHeartNarrative(raw) {
  try {
    var json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      var match = raw.match(/\{[\s\S]*\}/);
      if (match) json = JSON.parse(match[0]);
      else throw e;
    }

    var narrative = '';
    var options = [];

    if (json.blocks && Array.isArray(json.blocks)) {
      for (var i = 0; i < json.blocks.length; i++) {
        var b = json.blocks[i];
        if ((b.type === 'narrative' || b.type === 'directorOS') && b.content) {
          narrative += (narrative ? '\n\n' : '') + b.content;
        }
      }
    }

    if (json.options && Array.isArray(json.options)) {
      options = json.options.map(function(o) {
        return { text: o.text || '', affDelta: o.affDelta || 0, affReason: o.affReason || '' };
      });
    }

    return { narrative: narrative, options: options };
  } catch (e) {
    // 1v1 fallback：AI 返回非 JSON 时作纯文本 narrative 兜底
    var trimmed = (raw || '').trim();
    if (trimmed.length > 20) {
      console.warn('[1v1] parse error, using plain text fallback');
      return { narrative: trimmed, options: [] };
    }
    console.warn('[1v1] parse error, returning empty:', e.message);
    return { narrative: '', options: [] };
  }
}

export async function sendChatMessage(userMessage) {
  if (!userMessage || !userMessage.trim()) return '';
  if (!GS.chatHistory) GS.chatHistory = [];

  GS.chatHistory.push({ role: 'user', content: userMessage.trim() });

  try {
    var sysMsg = buildOneHeartSystemPrompt();
    var userMsg = buildOneHeartUserMessage('chat', { userMessage: userMessage.trim() });

    var _gr = await generateWithRetry(sysMsg, userMsg, { maxTokens: ONE_HEART_TOKEN_CONFIG.chatReply, temperature: 0.9, skipValidate: true });
    var raw = (_gr && _gr.raw) ? _gr.raw : '';
    if (typeof raw !== 'string') raw = '';
    if (!raw) {
      showToast('聊天回复生成失败');
      return '';
    }

    var clean = raw.replace(/^["'\s]+|["'\s]+$/g, '');
    // 取最后一段对话：优先匹配「」或“”，否则取最后一个非空段落
    var diaMatch = clean.match(/「([^」]+)」/g);
    if (!diaMatch) diaMatch = clean.match(/“([^”]+)”/g);
    if (diaMatch && diaMatch.length > 0) {
      clean = diaMatch[diaMatch.length - 1].replace(/[「」“”]/g, '');
      // 检测复述：如果最后一段与用户输入相同或仅差语气词，取倒数第二段
      var strippedUser = userMessage.trim().replace(/[〜～~!！?？。、\s]/g, '');
      var strippedClean = clean.replace(/[〜～~!！?？。、\s]/g, '');
      if (strippedClean === strippedUser || strippedClean.indexOf(strippedUser) >= 0) {
        if (diaMatch.length >= 2) {
          clean = diaMatch[diaMatch.length - 2].replace(/[「」“”]/g, '');
        } else {
          clean = '……';
        }
      }
    } else {
      var parts = clean.split('\n').filter(Boolean);
      if (parts.length > 0) clean = parts[parts.length - 1];
      // 如果最后一句话包含思考痕迹，取末尾短句
      if (/[？。！]/.test(clean)) {
        var sentences = clean.split(/[？。！]+/).filter(Boolean);
        clean = sentences[sentences.length - 1];
      }
      if (clean.length > 80) clean = clean.slice(-50);
      // 检测复述（无引号路径）
      var strippedUser2 = userMessage.trim().replace(/[〜～~!！?？。、\s]/g, '');
      var strippedClean2 = clean.replace(/[〜～~!！?？。、\s]/g, '');
      if (strippedClean2 === strippedUser2 || strippedClean2.indexOf(strippedUser2) >= 0) {
        clean = '……';
      }
    }
    GS.chatHistory.push({ role: 'ai', content: clean });
    if (GS.chatHistory.length > 50) {
      GS.chatHistory = GS.chatHistory.slice(-50);
    }
    saveGame();
    return clean;
  } catch (e) {
    console.error('[1v1] chat error:', e);
    showToast('聊天回复生成失败');
    return '';
  }
}

export async function generateDiary() {
  try {
    var sysMsg = buildOneHeartSystemPrompt();
    var userMsg = buildOneHeartUserMessage('diary');

    var _gr = await generateWithRetry(sysMsg, userMsg, { maxTokens: ONE_HEART_TOKEN_CONFIG.diaryGen, temperature: 0.8, skipValidate: true });
    var raw = (_gr && _gr.raw) ? _gr.raw : '';
    if (typeof raw !== 'string') raw = '';
    if (!raw) return null;

    var json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      var match = raw.match(/\{[\s\S]*\}/);
      if (match) json = JSON.parse(match[0]);
      else throw e;
    }

    var entry = {
      date: GS.currentDate ? GS.currentDate.month + '月' + GS.currentDate.day + '日' : 'Day ' + GS.day,
      day: GS.day,
      heroineEntry: json.heroineEntry || '',
      memberEntry: json.memberEntry || ''
    };

    if (!GS.diaryEntries) GS.diaryEntries = [];
    GS.diaryEntries.push(entry);
    saveGame();
    return entry;
  } catch (e) {
    console.error('[1v1] diary error:', e);
    return null;
  }
}

export async function generateMoment() {
  try {
    var sysMsg = buildOneHeartSystemPrompt();
    var userMsg = buildOneHeartUserMessage('moment');

    var _gr = await generateWithRetry(sysMsg, userMsg, { maxTokens: ONE_HEART_TOKEN_CONFIG.momentGen, temperature: 0.85, skipValidate: true });
    var raw = (_gr && _gr.raw) ? _gr.raw : '';
    if (typeof raw !== 'string') raw = '';
    if (!raw) return null;

    var json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      var match = raw.match(/\{[\s\S]*\}/);
      if (match) json = JSON.parse(match[0]);
      else throw e;
    }

    var moment = {
      id: 'moment_' + Date.now(),
      post: json.post || '',
      reply: json.reply || '',
      timestamp: GS.currentDate ? GS.currentDate.month + '月' + GS.currentDate.day + '日' : 'Day ' + GS.day
    };

    if (!GS.moments) GS.moments = [];
    GS.moments.push(moment);
    saveGame();
    return moment;
  } catch (e) {
    console.error('[1v1] moment error:', e);
    return null;
  }
}

export async function generateTheater(themePrompt) {
  try {
    var sysMsg = buildOneHeartSystemPrompt();
    var userMsg = buildOneHeartUserMessage('theater', { themePrompt: themePrompt });

    GS._isGenerating = true;
    showLoading('正在生成番外剧情...');

    var _gr = await generateWithRetry(sysMsg, userMsg, { maxTokens: ONE_HEART_TOKEN_CONFIG.theaterGen, temperature: 0.9, skipValidate: true });
    var raw = (_gr && _gr.raw) ? _gr.raw : '';
    if (typeof raw !== 'string') raw = '';
    if (!raw) {
      hideLoading();
      GS._isGenerating = false;
      return null;
    }

    var json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      var match = raw.match(/\{[\s\S]*\}/);
      if (match) json = JSON.parse(match[0]);
      else throw e;
    }

    var narrativeBlocks = '';
    if (json.blocks && Array.isArray(json.blocks)) {
      for (var i = 0; i < json.blocks.length; i++) {
        if (json.blocks[i].content) {
          narrativeBlocks += (narrativeBlocks ? '\n\n' : '') + json.blocks[i].content;
        }
      }
    }

    var theater = {
      id: 'theater_' + Date.now(),
      title: '番外_' + (GS.oneHeartMember ? (MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; }) || {}).name : ''),
      type: 'custom',
      content: narrativeBlocks,
      timestamp: GS.currentDate ? GS.currentDate.month + '月' + GS.currentDate.day + '日' : 'Day ' + GS.day
    };

    if (!GS.theaterHistory) GS.theaterHistory = [];
    GS.theaterHistory.push(theater);
    saveGame();
    hideLoading();
    GS._isGenerating = false;
    return theater;
  } catch (e) {
    console.error('[1v1] theater error:', e);
    hideLoading();
    GS._isGenerating = false;
    return null;
  }
}
