import {
  MAX_STAY_COUNT, PHASE_ACTION_LIMIT, MEMBERS, TRUTH_CARDS,
  GIFT_TEMPLATES, MEMBER_GIFT_PREFERENCE, PHASES, PHASE_LABELS,
  QUESTION_BOX_QUESTIONS, TOKEN_CONFIG, HOLIDAYS, RETURN_GIFTS,
  ONE_HEART_TOKEN_CONFIG, ONE_HEART_RANDOM_EVENTS,
  GS, saveGame, showLoading, hideLoading, showToast, randInt, escHtml, dispatch,
} from './core.js';
import { generateWithRetry, formatAIError } from './ai-generator.js';
import { callDeepSeek } from './api.js';
import { parseNarrative, completeSecretMission, parseOneHeartNarrative, validateOneHeartNarrative, safeParseJson } from './parser.js';
import { compressTodayForInjection, getTodayNarrativeTail, getTodayKeyEventsSummary, popTodayFullText, compressTodayToSummary, getTodayFullText, getTodayFullTextCapped, compressOneHeartYesterday, dedupeEventLog, mergePromises, mergeMemoryFacts, getTodayHybridContext } from './memory.js';
import { rollDatingDice, pickDatingLocation } from './formatters.js';
import { buildSystemPrompt, buildUserMessage, buildOneHeartSystemPrompt, buildOneHeartUserMessage, buildOneHeartEventStoryPrompt, buildOneHeartEventStorySystemPrompt, buildOneHeartChatSystemPrompt } from './prompts.js';
import { ENT_SCHEDULE_POOL, BROTHER_EVENTS } from './worlds/entertainment.js';
import { updateAffection, addAffectionLog, getAffectionDesc, updateRivalTendency, AFFECTION_MIN } from './affection.js';
import { extractPendingPromises, extractRevealedInfo, extractMemoryFacts } from './promises.js';
import { JEALOUSY_EVENTS, SURPRISE_EVENTS, RIVAL_EVENTS, CELEBRITY_EVENTS, SCANDAL_EVENTS, SICK_EVENTS, EX_JEALOUSY_EVENTS, LATE_NIGHT_EVENTS, ONE_HEART_ENDING_TEMPLATES, DAILY_EXPOSURE_DECAY, LOWKEY_BONUS, NEWS_TEMPLATES } from './data.js';
import { getWorldConfig } from './worlds/index.js';
import { showJealousyEvent, showSurpriseEvent, showPoolEvent, showRivalEvent, showConfrontationEvent, showConfessionEvent } from './modals/event-modal.js';
import { generateMessage } from './modals/message-modal.js';
// renderAll 通过 window.__renderAll 调用，避免与 ui-renderer.js 循环依赖
import { showXItemsModal } from './modals.js';
import { showActionInfoModal } from './modals/confirm-modal.js';
import { showVisitChoiceModal } from './modals/visit-choice-modal.js';
import { createModal } from './modals/modal-factory.js';
import { validateNarrative } from './validator.js';
import { checkMissionInteract, shouldTriggerSecretMission } from './utils.js';
// 骨架模块（Phase 4 渐进式接管）
import { settlePendingAffChanges as skeletonSettleAff } from './skeleton/affection-engine.js';
import { applyDrinksFromParsed as skeletonApplyDrinks } from './skeleton/drink-engine.js';
import { checkExMessageTrigger as skeletonCheckExMsg, handleExMessageChoice as skeletonHandleExMsg, checkJealousyMissionTrigger as skeletonJealMission, checkJealousyEvent as skeletonJealEvent, updateSecretDating as skeletonUpdateSecretDating } from './skeleton/event-triggers.js';
import { setMood as skeletonSetMood, driftMood as skeletonDriftMood, decayMoodDaily as skeletonDecayMoodDaily } from './skeleton/mood-engine.js';
import { generateOptions as skeletonGenOptions, getFallbackOptions as skeletonGetFallbackOpts } from './skeleton/option-engine.js';
// 模态弹窗（Phase 5 模块化）
import { showDatingDiceModal as modalDatingDice } from './modals/dating-dice.js';
import { showDay10DatingModal as modalDay10 } from './modals/day10-dating.js';
import { showDrunkMemberSelectModal as modalDrunkSelect } from './modals/drunk-select.js';
import { showTruthAnswerModal as modalTruthAnswer } from './modals/truth-answer.js';
import {
  resetDayState as skeletonResetDay,
  cleanupSecretMission as skeletonCleanupMission,
  cleanupMissionCard as skeletonCleanupMissionCard,
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
  skeletonUpdateSecretDating(); // IMP-10：副作用结算后刷新脚踏两条船高风险状态
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
    var drunkOpts = GS.parsedNarrative.options || [];
    // BUG-06: 保证醉酒流程始终存在"进入深夜"出口，避免选项不命中关键词时卡死
    if (!drunkOpts.some(function(o) { return o && o.text && o.text.indexOf('进入深夜') >= 0; })) {
      drunkOpts = drunkOpts.concat([{ label: '▶', text: '▶ 进入深夜' }]);
    }
    GS.currentOptions = drunkOpts;
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
    var drunkOpts2 = parsed.options || [];
    // BUG-06: 保证醉酒后续始终存在"进入深夜"出口，避免选项不命中关键词时卡死
    if (!drunkOpts2.some(function(o) { return o && o.text && o.text.indexOf('进入深夜') >= 0; })) {
      drunkOpts2 = drunkOpts2.concat([{ label: '▶', text: '▶ 进入深夜' }]);
    }
    GS.currentOptions = drunkOpts2;
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
  GS._isGenerating = true;
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
  } finally {
    GS._isGenerating = false;
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
  if (GS.gameMode === 'oneHeart') return;
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
    // BUG-06: 未命中上述关键词的醉酒选项（含女主醉酒的其他选择）统一走醉酒后续，
    // 避免落入普通 consequence 分支后无"进入深夜"入口而卡死
    var drunkTarget = (GS.drunkTrigger === 'heroine') ? null : GS.drunkTrigger;
    await generateDrunkConsequence(opt.text, drunkTarget);
    return;
  }

  // Day 7 匿名提问箱选项处理
  if (GS.questionBox && GS.questionBox.active) {
    await handleQuestionBoxChoice(opt);
    return;
  }

  // Day 11 不限制选项次数（非真心话的普通剧情）
  var isTruthRoundActive = GS.day === 11 && GS.truthState && GS.truthState.active;
  if (!isTruthRoundActive && GS.phaseOptionCount + GS.phaseFreeCount >= PHASE_ACTION_LIMIT) {
    showToast('⚠️ 本时段行动次数已用完，请进入下一时段。');
    return;
  }

  if (!GS.aiEnabled) {
    showToast('⚠️ AI 未启用，请先启用 AI。');
    return;
  }

  GS._isGenerating = true;
  showLoading('正在生成后续剧情...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('consequence', { choiceText: opt.text });
    var _opts = { tokens: TOKEN_CONFIG.consequence, temperature: 0.75 };
    if (GS.gameMode === 'oneHeart' && GS.useSeparateApi) {
      _opts.providerKey = GS.mainApiProvider || GS.apiProvider;
    }
    var _gr = await generateWithRetry(sysPrompt, userMsg, _opts);
    var rawText = _gr.raw;
    var parsed = parseNarrative(rawText);
    if (!parsed) parsed = { options: [] };
    applyDrinksFromParsed(parsed);
    var corrections = validateNarrative(rawText, parsed);
    pushCorrections(corrections);
    dispatch({ type: 'PUSH_CONSEQUENCE', rawText: rawText, parsed: parsed, choiceText: opt.text });
    GS.phaseOptionCount++;
    if (!isTruthRoundActive && GS.phaseOptionCount + GS.phaseFreeCount >= PHASE_ACTION_LIMIT) parsed.options = [];
    GS.currentOptions = parsed.options;
    GS.isInConsequence = true;
    dispatch({ type: 'PUSH_TODAY_TEXT', text:rawText });
    // 好感度快照（用于后续的 auto Toast 比对）
    GS._affSnapshot = JSON.parse(JSON.stringify(GS.affection));
    triggerAffectionFromChoice(opt.text, opt);
    // BUG-08: 结算风险选项扣分（选项自带 riskMember/riskDelta，此前被丢弃）
    if (opt && opt.riskMember && opt.riskDelta) {
      var riskMem = MEMBERS.find(function(m) { return m.name === opt.riskMember; });
      if (riskMem && GS.selectedMembers.indexOf(riskMem.id) >= 0) {
        updateAffection(riskMem.id, opt.riskDelta);
        addAffectionLog(riskMem.id, opt.riskDelta, '风险选项后果：' + (opt.affReason || '风险选择'));
      }
    }
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
    window.scrollTo(0, 0);
  } catch (e) {
    console.error('[handleOptionChoice] AI 生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
  } finally {
    GS._isGenerating = false;
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
  if (GS.gameMode === 'oneHeart') return;
  if (GS.smsSentToday && GS.phaseIndex === 3) {
    if (GS.stayCount >= MAX_STAY_COUNT) {
      showToast('⚠️ 今日继续次数已用完（' + MAX_STAY_COUNT + '/' + MAX_STAY_COUNT + '），请进入下一天。');
      return;
    }
    GS.stayCount++;
  }
  var isTruthRoundActive = GS.day === 11 && GS.truthState && GS.truthState.active;
  if (!isTruthRoundActive && GS.phaseOptionCount + GS.phaseFreeCount >= PHASE_ACTION_LIMIT) {
    showToast('⚠️ 本时段行动次数已用完（' + PHASE_ACTION_LIMIT + '/' + PHASE_ACTION_LIMIT + '），请进入下一时段。');
    return;
  }

  if (!GS.aiEnabled) {
    showToast('⚠️ AI 未启用，请先启用 AI。');
    return;
  }

  GS._isGenerating = true;
  showLoading('正在扩写你的剧情...');
  try {
    updateHeroinePersona(actionText); // IMP-09：自由输入也计入人格推断
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('freeAction', { actionText: actionText });
    var _opts = { tokens: TOKEN_CONFIG.freeAction, temperature: 0.8 };
    if (GS.gameMode === 'oneHeart' && GS.useSeparateApi) {
      _opts.providerKey = GS.mainApiProvider || GS.apiProvider;
    }
    var _gr = await generateWithRetry(sysPrompt, userMsg, _opts);
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
    window.scrollTo(0, 0);
  } catch (e) {
    console.error('[handleFreeAction] AI 生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
  } finally {
    GS._isGenerating = false;
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

// IMP-09：女主人格画像——由选项文本/自由输入关键词推断，暗藏积累，无额外 AI 成本
var PERSONA_KEYWORDS = {
  sajiao: ['撒娇', '抱抱', '蹭', '赖', '依靠', '求你', '委屈', '央求', '耍赖', '黏', '赖着', '撒个娇'],
  duli: ['自己', '独立', '不靠', '我行我素', '我来', '我决定', '靠自己', '不用你', '自己来', '我自己'],
  liaobo: ['撩', '挑逗', '故意', '靠近', '眼神', '调戏', '逗他', '撩拨', '撩他', '暧昧地', '勾引', '撩了一下'],
  chidun: ['没注意', '迟钝', '没反应', '愣', '没懂', '发呆', '愣住', '没察觉', '后知后觉', '没意识', '没发现']
};
var PERSONA_LABELS = { sajiao: '撒娇型', duli: '独立型', liaobo: '撩拨型', chidun: '迟钝型' };

export function updateHeroinePersona(text) {
  if (!text) return;
  if (!GS.heroinePersona) GS.heroinePersona = { scores: {}, current: '' };
  if (!GS.heroinePersona.scores) GS.heroinePersona.scores = {};
  var scores = GS.heroinePersona.scores;
  for (var key in PERSONA_KEYWORDS) {
    if (!PERSONA_KEYWORDS.hasOwnProperty(key)) continue;
    var kws = PERSONA_KEYWORDS[key];
    for (var i = 0; i < kws.length; i++) {
      if (text.indexOf(kws[i]) >= 0) {
        scores[key] = (scores[key] || 0) + 1;
        break; // 同一人格关键词每句最多 +1，避免长文本刷分
      }
    }
  }
  var bestKey = '';
  var bestVal = 0;
  for (var k in scores) {
    if (scores[k] > bestVal) { bestVal = scores[k]; bestKey = k; }
  }
  GS.heroinePersona.current = bestKey ? (PERSONA_LABELS[bestKey] || '') : '';
  saveGame();
}

export function triggerAffectionFromChoice(choiceText, opt) {
  updateHeroinePersona(choiceText);
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var targetMember = null;

  // 优先使用选项中的 affName（AI 返回的显式好感度变化）
  if (opt && opt.affName) {
    targetMember = members.find(function(m) { return m.name === opt.affName; });
    if (targetMember) {
      var delta = opt.affDelta || randInt(2, 4);
      // 负面扣分增强：扣分时额外追加 -2 风险扣分
      if (delta < 0) delta += -2;
      updateAffection(targetMember.id, delta);
      addAffectionLog(targetMember.id, delta, opt.affReason || '你选择了与' + targetMember.name + '相关的行动');
      var otherMembers = members.filter(function(m) { return m.id !== targetMember.id; });
      for (var j = 0; j < otherMembers.length; j++) {
        updateAffection(otherMembers[j].id, -1);
        addAffectionLog(otherMembers[j].id, -1, '未选中');
        skeletonDriftMood(otherMembers[j].id, 'jealous', '这一轮没被你选中', 1); // IMP-13
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
        // 负面扣分增强：扣分时额外追加 -2 风险扣分
        if (delta2 < 0) delta2 += -2;
        updateAffection(targetMember.id, delta2);
        addAffectionLog(targetMember.id, delta2, firstChange.reason || '你选择了与' + targetMember.name + '相关的行动');
        var otherMembers2 = members.filter(function(m) { return m.id !== targetMember.id; });
        for (var j2 = 0; j2 < otherMembers2.length; j2++) {
          updateAffection(otherMembers2[j2].id, -1);
          addAffectionLog(otherMembers2[j2].id, -1, '未选中');
          skeletonDriftMood(otherMembers2[j2].id, 'jealous', '这一轮没被你选中', 1); // IMP-13
        }
        // BUG-03: 即时消费后从 pending 移除，避免下一段 settlePendingAffChanges 重复结算同一笔
        GS.pendingAffChanges.shift();
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
    skeletonDriftMood(otherMembers[j].id, 'jealous', '这一轮没被你选中', 1); // IMP-13
  }
}

// ==================== 1v1 选项好感度应用（防通胀+下限+日志） ====================
export function applyOneHeartOptionAffection(opt) {
  if (!opt) return;
  var mid = GS.oneHeartMember;
  if (!mid) return;
  if (!GS.affection) GS.affection = {};
  if (!GS.affection[mid]) GS.affection[mid] = 0;
  var curAff = GS.affection[mid];
  var affDelta = opt.affDelta || 0;

  // [修复B] 情敌专属增减只走 rivalAffDelta，不再据此吞掉男主好感
  if (!GS._rivalSwitched && GS.oneHeartRival && typeof opt.rivalAffDelta === 'number' && opt.rivalAffDelta !== 0) {
    updateRivalTendency(opt.rivalAffDelta, opt.affReason || '主线选项涉及情敌');
  }

  // 防通胀：高分段正向加分封顶
  var finalDelta = affDelta;
  if (affDelta > 0) {
    if (curAff >= 80) finalDelta = Math.min(affDelta, 1);
    else if (curAff >= 60) finalDelta = Math.min(affDelta, 2);
    else if (curAff >= 40) finalDelta = Math.min(affDelta, 3);
  }
  // 负向扣分不受影响

  // 调用 updateAffection（含飘字+里程碑解锁，内部已按 AFFECTION_MIN/MAX 统一 clamp）
  updateAffection(mid, finalDelta);

  // [BUG-13] 不再二次 clamp：1v1 与 transfer 共用 updateAffection 的单一下限（AFFECTION_MIN），消除双标

  // 记录日志
  addAffectionLog(mid, finalDelta, opt.affReason || '你选择了某个行动' + (finalDelta !== affDelta ? '（防通胀调整：原' + affDelta + '）' : ''));
  // 约会检测：AI 标记 sceneType==='date' 的选项，后台结算绯闻热度/哥哥示好/锁探班
  if (opt.sceneType === 'date' || opt.sceneType === 'pubdate') {
    applyDateEffects(opt.sceneType === 'pubdate');
  }
}

// ==================== 1v1 情敌阶段检测与触发 ====================
export function getRivalStage(aff) {
  if (aff >= 100) return 6; // 退出
  if (aff >= 80) return 5;
  if (aff >= 60) return 4;
  if (aff >= 40) return 3;
  if (aff >= 20) return 2;
  return 1;
}

// 情敌攻势类型表
export var RIVAL_ACTIONS = {
  1: [
    { id: 's1_meet', desc: '偶遇', detail: '在某个地方不期而遇，他主动打招呼' },
    { id: 's1_greet', desc: '打招呼', detail: '发来一条简单的问候消息' },
    { id: 's1_like', desc: '点赞朋友圈', detail: '点赞了女主的朋友圈动态' },
    { id: 's1_chat', desc: '找借口聊天', detail: '找了一个蹩脚的借口开始聊天' }
  ],
  2: [
    { id: 's2_gift', desc: '送小礼物', detail: '送了一个贴心的小礼物' },
    { id: 's2_meal', desc: '约吃饭', detail: '约女主一起吃饭' },
    { id: 's2_alone', desc: '制造独处', detail: '制造了一个两人独处的机会' }
  ],
  3: [
    { id: 's3_contact', desc: '频繁联系', detail: '频繁发消息，明显在示好' },
    { id: 's3_hint', desc: '言语暗示', detail: '言语中带着暗示性的好感表达' },
    { id: 's3_care', desc: '关心私事', detail: '过度关心女主的私生活' }
  ],
  4: [
    { id: 's4_bigift', desc: '送大礼', detail: '送了一份贵重的大礼' },
    { id: 's4_misunderstand', desc: '制造误会', detail: '刻意制造正主对女主的误会' },
    { id: 's4_compete', desc: '暗示竞争', detail: '明确暗示自己才是更好的选择' }
  ],
  5: [
    { id: 's5_presence', desc: '刷存在感', detail: '偶尔出现刷一下存在感' },
    { id: 's5_reminisce', desc: '回忆过去', detail: '提起过去你们之间的某个瞬间' },
    { id: 's5_retreat', desc: '试探退意', detail: '试探性地表达可能要放弃' }
  ]
};

// 从当前阶段选取未触发过的攻势
export function pickRivalAction(stage, triggeredActions) {
  var actions = RIVAL_ACTIONS[stage] || RIVAL_ACTIONS[1];
  var available = actions.filter(function(a) {
    return triggeredActions.indexOf(a.id) < 0;
  });
  // 若全部已触发，重置该阶段记录重新随机
  if (available.length === 0) {
    available = actions.slice();
    // 从 triggeredActions 中移除当前阶段的所有ID
    for (var i = 0; i < actions.length; i++) {
      var idx = triggeredActions.indexOf(actions[i].id);
      if (idx >= 0) triggeredActions.splice(idx, 1);
    }
  }
  return available[Math.floor(Math.random() * available.length)];
}

// 剧情分支代码校验：检测剧情是否符合当前好感度阶段
export function validateStoryBranch(parsed, aff) {
  if (!parsed || !parsed.blocks) return null;
  var narrative = '';
  for (var i = 0; i < parsed.blocks.length; i++) {
    if (parsed.blocks[i] && parsed.blocks[i].content) narrative += parsed.blocks[i].content;
  }
  if (aff < 20) {
    // 低好感时检测甜宠关键词
    if (/表白|告白|我喜欢你|在一起|甜蜜|吻|拥抱/.test(narrative)) {
      return '当前好感度低于20，不应出现表白/甜蜜剧情，请改为误会/冷战/分手边缘风格';
    }
  }
  return null;
}

// 事件选项通用模板检测
export var GENERIC_EVENT_OPTIONS = ['跟着直觉走', '冷静观察', '大胆行动', '靠近他说话', '保持沉默观察', '转身离开现场', '靠近他', '保持距离', '装作没发现'];
export function hasGenericEventOptions(options) {
  if (!options || !Array.isArray(options)) return false;
  for (var i = 0; i < options.length; i++) {
    var optText = typeof options[i] === 'string' ? options[i] : ((options[i] && options[i].text) || '');
    for (var j = 0; j < GENERIC_EVENT_OPTIONS.length; j++) {
      if (optText.indexOf(GENERIC_EVENT_OPTIONS[j]) >= 0) return true;
    }
  }
  return false;
}

// Fix D：通用选项检测 → 重试1次（所有AI生成事件共用）
async function retryGenericEventOptions(scenario, opts, label) {
  if (!opts || !Array.isArray(opts)) return opts;
  if (!hasGenericEventOptions(opts)) return opts;
  try {
    var _retryRes = await callDeepSeek(
      '重新生成' + label + '选项（30字以内×3），不要使用"跟着直觉走/冷静观察/大胆行动/靠近他说话/保持沉默观察/转身离开现场/靠近他/保持距离/装作没发现"等通用选项。\n' +
      '场景：' + scenario + '\n输出JSON：{"options":["具体选项1","具体选项2","具体选项3"]}',
      '重新生成' + label + '选项', 300, false, 0.8
    );
    var _parsed;
    try { _parsed = JSON.parse(_retryRes); } catch (pe) {
      var _m = _retryRes.match(/\{[\s\S]*\}/);
      if (_m) try { _parsed = JSON.parse(_m[0]); } catch (pe2) { _parsed = null; }
    }
    if (_parsed && _parsed.options && _parsed.options.length >= 3 && !hasGenericEventOptions(_parsed.options)) {
      return _parsed.options;
    }
  } catch (e) {}
  return opts;
}

// ==================== 吃醋事件系统 ====================
// 触发条件委托给 skeleton/event-triggers.js
export function checkJealousyEvent(choiceText) {
  skeletonJealEvent(choiceText);
}

export async function handleRegenerate() {
  if (GS.gameMode === 'oneHeart') return;
  // 重置生成锁，允许重新尝试
  GS._isGenerating = false;
  GS._advancingPhase = false;  // 重置重入锁，避免卡死
  // 重新生成时旧pending被自然覆盖，不结算
  GS.pendingAffChanges = [];
  if (!GS.aiEnabled) {
    showToast('⚠️ AI 未启用，请先启用 AI。');
    return;
  }

  GS._isGenerating = true;
  try {
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
  } finally {
    GS._isGenerating = false;
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
    // [B] 约定跨天累积去重（不再每日覆盖，避免约定凭空蒸发）
    GS.pendingPromises = mergePromises(GS.pendingPromises, extractPendingPromises(summary));
    // [A] 结构化事实记忆合并（偏好/禁忌/过敏原 跨天持久累积）
    GS.memoryFacts = mergeMemoryFacts(GS.memoryFacts, extractMemoryFacts(summary));
    GS.todayRevealedInfo = extractRevealedInfo(summary);
    saveGame();
  }
  await proceedToNextDay();
}

export async function proceedToNextDay() {
  GS.dailyFullTexts.push(GS.todayFullText.slice());

  await skeletonGenGifts();
  skeletonCleanupMission();
  skeletonCleanupMissionCard();
  // 清理当日特殊状态
  GS.xGhostEvent = null;
  skeletonUpdateObserver();
  skeletonAdvanceDate();
  skeletonDecayMoodDaily(); // IMP-13：进入新一天，情绪强度自然衰减
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
    showToast('🎴 制作组任务卡：' + missionCard.name + '（点击右上角任务按钮查看详情并完成）');
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

  GS._isGenerating = true;
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
    window.scrollTo(0, 0);
  } catch (e) {
    console.error('[continueToday] 生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
  } finally {
    GS._isGenerating = false;
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

  GS._isGenerating = true;
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
  } finally {
    GS._isGenerating = false;
  }
  hideLoading();
}

// ==================== 成员回礼系统 ====================
export function scheduleReturnGift(memberId) {
  if (!GS.pendingReturnGifts) GS.pendingReturnGifts = [];
  var returnDay = GS.gameMode === 'oneHeart' ? (GS.oneHeartGenCount || 0) + 3 : GS.day + 1;
  GS.pendingReturnGifts.push({ memberId: memberId, day: returnDay });
  saveGame();
}
window.scheduleReturnGift = scheduleReturnGift;

export function checkPendingReturnGifts() {
  if (!GS.pendingReturnGifts || GS.pendingReturnGifts.length === 0) return null;
  var _curDay = GS.gameMode === 'oneHeart' ? (GS.oneHeartGenCount || 0) : GS.day;
  var pending = GS.pendingReturnGifts.filter(function(p) { return p.day <= _curDay; });
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
  GS.returnGiftHistory.push({ memberId: first.memberId, gift: gift, day: _curDay, giftDesc: '' });
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

// ==================== 任务卡交互（统一任务面板） ====================
// 注：原 showMissionCardModal 为死代码（无调用点、modals.js 未导出），已删除；
// 任务卡现通过 proceedToNextDay 的 toast 通知 + 统一任务面板（doActionTask / doInputTask）承接。

// 行动类任务：点击"做任务"立即生成一段任务执行剧情
export async function doActionTask() {
  if (!GS.todayMissionCard) {
    showToast('⚠️ 当前没有进行中的任务卡');
    return;
  }
  if (GS.todayMissionCard.type !== 'action') {
    showToast('⚠️ 此任务为输入类，请在任务面板中输入内容完成');
    return;
  }
  if (!GS.aiEnabled) {
    showToast('⚠️ AI 未启用，请先启用 AI。');
    return;
  }
  GS._isGenerating = true;
  showLoading('正在生成任务执行剧情...');
  try {
    await compressTodayForInjection();
    var card = GS.todayMissionCard;
    var sysPrompt = buildSystemPrompt();
    var actionDesc = '执行制作组任务卡「' + card.name + '」：' + card.desc;
    var userMsg = buildUserMessage('freeAction', {
      actionText: actionDesc,
      doActionTask: true,
      skipActiveMissionCard: true
    });
    var _opts = { tokens: TOKEN_CONFIG.freeAction, temperature: 0.8 };
    if (GS.gameMode === 'oneHeart' && GS.useSeparateApi) {
      _opts.providerKey = GS.mainApiProvider || GS.apiProvider;
    }
    var _gr = await generateWithRetry(sysPrompt, userMsg, _opts);
    var rawText = _gr.raw;
    var parsed = parseNarrative(rawText);
    applyParsedSideEffects(parsed);
    var corrections = validateNarrative(rawText, parsed);
    pushCorrections(corrections);
    dispatch({ type: 'PUSH_CONSEQUENCE', rawText: rawText, parsed: parsed, choiceText: '🎴 执行任务：' + card.name });
    // 标记任务已完成
    GS.todayMissionCard.completed = true;
    GS.isInConsequence = true;
    dispatch({ type: 'PUSH_TODAY_TEXT', text: rawText });
    saveGame();
    if (window.__renderAll) window.__renderAll();
    window.scrollTo(0, 0);
  } catch (e) {
    console.error('[doActionTask] AI 生成失败:', e);
    showToast('⚠️ ' + formatAIError(e));
  } finally {
    GS._isGenerating = false;
  }
  hideLoading();
}

// 输入类任务：玩家在面板输入内容后完成，存入 pendingTaskResult 注入下一段剧情
export function completeTaskInput(userInput) {
  if (!GS.todayMissionCard) {
    showToast('⚠️ 当前没有进行中的任务卡');
    return;
  }
  if (GS.todayMissionCard.type !== 'input') {
    showToast('⚠️ 此任务为行动类，请通过剧情完成后点击"已完成"');
    return;
  }
  if (!userInput || !userInput.trim()) {
    showToast('⚠️ 请输入任务内容');
    return;
  }
  GS.todayMissionCard.userInput = userInput.trim();
  GS.todayMissionCard.completed = true;
  GS.pendingTaskResult = {
    taskName: GS.todayMissionCard.name,
    taskDesc: GS.todayMissionCard.desc,
    userInput: userInput.trim()
  };
  saveGame();
  showToast('✅ 任务内容已记录，将在下一段剧情中体现');
  if (window.__renderAll) window.__renderAll();
}

// 行动类任务：玩家通过剧情完成后手动标记完成
export function completeMissionCard() {
  if (!GS.todayMissionCard) return;
  if (GS.todayMissionCard.completed) return;
  GS.todayMissionCard.completed = true;
  saveGame();
  showToast('✅ 任务「' + GS.todayMissionCard.name + '」已标记完成');
  if (window.__renderAll) window.__renderAll();
}

// ==================== 1v1「只为你心动」模式 ====================

// IMP-05：1v1 随机事件抽取——按关系阶段从对应分组抽 + 去重环形缓冲
function getOneHeartRelationshipStage(aff) {
  if (aff >= 60) return 'deep';
  if (aff >= 40) return 'love';
  if (aff >= 20) return 'crush';
  return 'early';
}

function pickOneHeartRandomEvent() {
  var aff = GS.affection[GS.oneHeartMember] || 0;
  var stage = getOneHeartRelationshipStage(aff);
  // 分组索引区间（与 data.js ONE_HEART_RANDOM_EVENTS 注释分组一一对应）
  var ranges = {
    early: [[0, 20]],                 // 暧昧升温（轻量初识）
    crush: [[0, 38]],                 // 暧昧升温 + 日常甜暖
    love:  [[20, 49]],                // 日常甜暖 + 情感冲击
    deep:  [[38, 60]]                 // 情感冲击 + 戏剧冲突
  }[stage];
  var pool = [];
  for (var r = 0; r < ranges.length; r++) {
    for (var i = ranges[r][0]; i < ranges[r][1]; i++) {
      if (ONE_HEART_RANDOM_EVENTS[i]) pool.push(ONE_HEART_RANDOM_EVENTS[i]);
    }
  }
  // 去重环形缓冲：抽过的近期（最近 10 个）不再抽，避免长线游玩明显重复
  if (!Array.isArray(GS.oneHeartRandomUsed)) GS.oneHeartRandomUsed = [];
  var avail = pool.filter(function(e) { return GS.oneHeartRandomUsed.indexOf(e.id) < 0; });
  if (avail.length === 0) {
    // 池内全部抽过 → 重置缓冲，重新从全池抽
    GS.oneHeartRandomUsed = [];
    avail = pool.slice();
  }
  var picked = avail[Math.floor(Math.random() * avail.length)];
  GS.oneHeartRandomUsed.push(picked.id);
  if (GS.oneHeartRandomUsed.length > 10) GS.oneHeartRandomUsed.shift();
  return picked;
}

// IMP-17[fix]：哥哥专属事件抽选（仅「队友的妹妹」设定，role==='哥哥'）
// 确定性：按「当前回合 >= minRound 且独立概率命中」筛选候选，去重缓冲 oneHeartBrotherPool 保证不重复，
// 使哥哥戏份稳定、多样、不靠 AI 随缘。返回事件对象（含 stanceDelta）。
function pickOneHeartBrotherEvent() {
  if (GS.gameMode !== 'oneHeart' || GS.worldSetting !== 'entertainment') return null;
  if (!GS.oneHeartRelationCharacter || GS.oneHeartRelationCharacter.role !== '哥哥') return null;
  if (!BROTHER_EVENTS || !BROTHER_EVENTS.length) return null;
  if (!Array.isArray(GS.oneHeartBrotherPool)) GS.oneHeartBrotherPool = [];
  var round = GS.oneHeartGenCount || 0;
  var used = GS.oneHeartBrotherPool;
  // 项7：早期哥哥登场保证——round<=2 强制登场一次（建立"无话不谈的参谋"基础关系），仅触发一次。
  var _intro = null;
  for (var _ii = 0; _ii < BROTHER_EVENTS.length; _ii++) {
    if (BROTHER_EVENTS[_ii].id === 'bro_intro') { _intro = BROTHER_EVENTS[_ii]; break; }
  }
  if (_intro && round <= 2 && used.indexOf('bro_intro') < 0) {
    GS.oneHeartBrotherPool.push('bro_intro');
    return _intro;
  }
  var candidates = [];
  for (var i = 0; i < BROTHER_EVENTS.length; i++) {
    var e = BROTHER_EVENTS[i];
    if (used.indexOf(e.id) >= 0) continue;            // 已触发过，跳过
    if (round < (e.minRound || 0)) continue;          // 未到节奏，跳过
    if (Math.random() < (e.prob || 0.15)) candidates.push(e);  // 独立概率命中
  }
  if (!candidates.length) {
    // 池内全部抽过 → 重置缓冲，重新从全池抽（保证长线游玩仍有哥哥戏份）
    GS.oneHeartBrotherPool = [];
    for (var j = 0; j < BROTHER_EVENTS.length; j++) {
      var e2 = BROTHER_EVENTS[j];
      if (e2.forcedIntro) continue;
      if (round >= (e2.minRound || 0) && Math.random() < (e2.prob || 0.15)) candidates.push(e2);
    }
  }
  if (!candidates.length) return null;
  var picked = candidates[Math.floor(Math.random() * candidates.length)];
  GS.oneHeartBrotherPool.push(picked.id);
  if (GS.oneHeartBrotherPool.length > 12) GS.oneHeartBrotherPool.shift();
  return picked;
}

// IMP-17：哥哥支持度更新（仅娱乐圈·「队友的妹妹」设定，role==='哥哥'）
// 立场由数值 oneHeartBrotherAff 单一推导：>=15 supportive / 0~15 consultant / -20~0 testing / <-20 protective
// 阈值从 ±30 收紧到 ±20，并将 supportive 阈值由 20 降到 15（K），使正常通关更易摸到 supportive（HE 可达），仍保留四态区分。
export function updateBrotherStance(delta, reason) {
  if (GS.gameMode !== 'oneHeart' || GS.worldSetting !== 'entertainment') return;
  if (!GS.oneHeartRelationCharacter || GS.oneHeartRelationCharacter.role !== '哥哥') return;
  if (!GS.oneHeartBrotherAff) GS.oneHeartBrotherAff = 0;
  var before = GS.oneHeartBrotherAff;
  var after = Math.max(-100, Math.min(100, before + (delta || 0)));
  GS.oneHeartBrotherAff = after;
  GS.brotherStance = after >= 15 ? 'supportive' : (after >= 0 ? 'consultant' : (after >= -20 ? 'testing' : 'protective'));
  if (!GS.oneHeartBrotherLog) GS.oneHeartBrotherLog = [];
  GS.oneHeartBrotherLog.push({ round: GS.oneHeartGenCount || 0, change: delta || 0, reason: reason || '', total: after });
  if (delta && delta !== 0 && typeof showToast === 'function') {
    var _sign = delta > 0 ? '+' : '';
    var _label = delta > 0 ? '🤝 哥哥更信任你了 ' : '⚠️ 哥哥有些顾虑 ';
    // 哥哥提示挪到底部并加前缀，避免与顶部男主好感飘字视觉重叠
    showToast('【哥哥立场】' + _label + _sign + delta, 'bottom');
  }
  saveGame();
}

// 约会效果结算：由 sceneType==='date' 选项触发，后台累加绯闻热度 + 哥哥示好 + 锁探班
function applyDateEffects(isPublic) {
  if (GS.gameMode !== 'oneHeart' || GS.worldSetting !== 'entertainment') return;
  if (GS.oneHeartDateToday) return;
  var _delta = isPublic ? 10 : 5;
  GS.exposureRisk = Math.max(0, Math.min(100, (GS.exposureRisk || 0) + _delta));
  if (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥') {
    if (GS.brotherAtHome) {
      updateBrotherStance(2, '男主借约会向哥哥示好（哥哥是地下恋把关人）');
    }
  }
  GS.oneHeartDateToday = true;
  saveGame();
  showToast('💞 约会场景已记录，绯闻热度 +' + _delta + (GS.brotherAtHome ? '，哥哥关注+2' : ''));
}

// 项5：绯闻热度累加（仅娱乐圈·队友的妹妹，0~100）。
// 由 sceneType date 选项、探班/高调行为等累加；超阈值(>=60)触发绯闻事件。
function accumulateScandalHeat(amount, reason) {
  if (GS.gameMode !== 'oneHeart' || GS.worldSetting !== 'entertainment') return;
  if (!GS.oneHeartRelationCharacter || GS.oneHeartRelationCharacter.role !== '哥哥') return;
  GS.exposureRisk = Math.max(0, Math.min(100, (GS.exposureRisk || 0) + (amount || 0)));
  if (GS.exposureRisk >= 60) {
    GS.exposureRisk = 30;
    showToast('🔥 绯闻预警：绯闻热度触顶回落至 30，你们的互动引起了外界关注…');
  }
  saveGame();
}

// 项2：哥哥立场每日缓慢回落（向 0 衰减），避免一次负向事件永久卡在 testing/protective。
// 配合高回合正向恢复事件（bro_bless 等），确保 testing/protective 有出口、supportive 仍可达。
export function applyBrotherStanceDailyDecay() {
  if (GS.gameMode !== 'oneHeart' || GS.worldSetting !== 'entertainment') return;
  if (!GS.oneHeartRelationCharacter || GS.oneHeartRelationCharacter.role !== '哥哥') return;
  if (!GS.oneHeartBrotherAff) GS.oneHeartBrotherAff = 0;
  GS.oneHeartBrotherAff = Math.round(GS.oneHeartBrotherAff * 0.9); // 每新一天向 0 衰减 10%
  GS.brotherStance = GS.oneHeartBrotherAff >= 15 ? 'supportive' : (GS.oneHeartBrotherAff >= 0 ? 'consultant' : (GS.oneHeartBrotherAff >= -20 ? 'testing' : 'protective'));
  saveGame();
}

// [H] 绯闻热度每日自然衰减（解决"只增不减"）：进入新一天时调用。
// 低调日（未约高风险约会）额外减值。与 accumulateScandalHeat 下限 0 配合。
export function applyScandalHeatDailyDecay(prevDated) {
  if (GS.gameMode !== 'oneHeart' || GS.worldSetting !== 'entertainment') return;
  if (!GS.oneHeartRelationCharacter || GS.oneHeartRelationCharacter.role !== '哥哥') return;
  var _decay = DAILY_EXPOSURE_DECAY || 12;
  // 低调日：昨日（prevDated，调用 generateOneHeartSchedule 前捕获，避免被其重置覆盖）未发起约会 → 额外减值
  var _lowkey = (prevDated === true) ? 0 : (LOWKEY_BONUS || 5);
  GS.exposureRisk = Math.max(0, (GS.exposureRisk || 0) - _decay - _lowkey);
  saveGame();
}

// IMP-ENT-DATE(B1)：主动「找哥哥聊聊」
export async function handleBrotherChat() {
  if (GS.gameMode !== 'oneHeart' || GS.worldSetting !== 'entertainment') return;
  if (!GS.oneHeartRelationCharacter || GS.oneHeartRelationCharacter.role !== '哥哥') return;
  if (GS.oneHeartBrotherChatToday) { showToast('🔒 今天已经跟哥哥聊过啦，明天再来吧'); return; }
  var _broName = GS.oneHeartRelationCharacter.name || '哥哥';
  var _bsNow = GS.brotherStance || 'consultant';
  var _opts = [
    { text: '报备进展：跟哥哥说说你和他的近况', delta: 2, reason: '向哥哥报备进展，兄妹更亲近', tone: '你跟哥哥闲聊，报备了最近和男主的点点滴滴，' },
    { text: '探口风：问哥哥觉得他这人怎么样', delta: (_bsNow === 'testing' || _bsNow === 'protective') ? 3 : 2, reason: '探哥哥对男主看法', tone: '你向哥哥试探他对男主的真实看法，' },
    { text: '撒娇：让哥哥替你打掩护（圆谎/挡视线）', delta: 3, reason: '撒娇让哥哥打掩护', tone: '你撒娇让哥哥帮你打掩护，' }
  ];
  var _chosen = await new Promise(function(resolve) {
    var _html = '<div class="modal-card" style="max-width:340px;background:var(--bg-card);border:1px solid var(--border-primary);border-radius:14px;padding:16px">' +
      '<div style="font-weight:600;margin-bottom:6px;font-size:14px">💬 找' + escHtml(_broName) + '聊聊</div>' +
      '<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">你想和哥哥聊点什么？</div>' +
      _opts.map(function(o, i) {
        return '<button class="brother-chat-opt" data-i="' + i + '" style="display:block;width:100%;text-align:left;margin:6px 0;padding:9px 11px;background:var(--bg-secondary);border:1px solid var(--border-primary);border-radius:9px;color:var(--text-primary);cursor:pointer;font-size:12px">' + escHtml(o.text) + '</button>';
      }).join('') +
      '<button class="brother-chat-cancel" style="margin-top:8px;width:100%;padding:9px;background:transparent;border:1px solid var(--border-primary);border-radius:9px;color:var(--text-muted);cursor:pointer;font-size:12px">取消</button>' +
      '</div>';
    var _ov = createModal(_html);
    _ov.querySelectorAll('.brother-chat-opt').forEach(function(b) {
      b.addEventListener('click', function() { _ov.remove(); resolve(_opts[parseInt(this.dataset.i)]); });
    });
    _ov.querySelector('.brother-chat-cancel').addEventListener('click', function() { _ov.remove(); resolve(null); });
  });
  if (!_chosen) return;
  updateBrotherStance(_chosen.delta, _chosen.reason);
  GS.oneHeartBrotherChatToday = true;
  saveGame();
  GS.pendingChoiceText = '💬 找' + _broName + '聊聊：' + _chosen.text;
  GS._pendingSource = 'brotherChat';
  if (window.__renderAll) window.__renderAll();
  // 不再冻结时间：找哥哥聊聊按普通回合在后台推进时钟（"时间约束只针对探班"）
  await generateOneHeartRound({ isBrotherChat: true, tone: _chosen.tone });
  if (window.__renderAll) window.__renderAll();
}
window.handleBrotherChat = handleBrotherChat;

// IMP-18：1v1 结局判定（聚合既有仪表盘，不新增独立数值）
// 输入：brotherStance(IMP-17) / oneHeartRivalAff(情敌倾向) / GS.mood(IMP-13) / oneHeartScandalPool(曝光) / affection(男主好感)
export function evaluateEnding() {
  var aff = GS.affection[GS.oneHeartMember] || 0;
  var brother = GS.brotherStance || 'consultant';
  var rival = GS.oneHeartRivalAff || 0; // >0 女主偏向情敌；<0 情敌线翻车（对正主有利）
  // IMP-18[fix]：scandal 应为「玩家实际经历的公众曝光翻车次数」，而非事件缓存池长度（池只增不减且语义为模板缓存）。
  // 优先取 oneHeartScandalCount（事件成功入队时 +1）；旧存档无此字段时回退兼容 oneHeartScandalPool 长度。
  var scandal = (GS.oneHeartScandalCount || 0) || ((GS.oneHeartScandalPool && GS.oneHeartScandalPool.length) || 0);
  // 男主情绪基调（IMP-13）：愤怒/冷淡最差，开心/感动最好
  var moodVal = 0;
  if (GS.mood && GS.oneHeartMember && GS.mood[GS.oneHeartMember]) {
    var _ms = GS.mood[GS.oneHeartMember].state;
    if (_ms === 'angry' || _ms === 'cold') moodVal = -2;
    else if (_ms === 'jealous') moodVal = -1;
    else if (_ms === 'happy' || _ms === 'moved' || _ms === 'touched') moodVal = 1;
  }
  var meters = { affection: aff, brotherStance: brother, rivalAff: rival, scandal: scandal, moodValue: moodVal };
  // 评分（越高越可能 HE）
  var score = 0;
  score += Math.max(-30, Math.min(40, aff - 40)); // 好感 40→0，80→40
  if (brother === 'supportive') score += 20;
  else if (brother === 'consultant') score += 8;
  else if (brother === 'protective') score += 0; // [I] protective=反对这段关系（在意被家人/公司发现），不再加分
  // testing 不加不减
  if (rival > 0) score -= rival * 0.5; // 偏向情敌→扣分
  else score += Math.min(10, -rival * 0.3); // 情敌翻车→略加分
  score -= scandal * 5; // 曝光翻车重罚
  score += moodVal * 5;
  var type;
  if (scandal >= 3 || rival >= 50 || aff < 20) type = 'BE';
  else if (score >= 35 && aff >= 60 && brother === 'supportive') type = 'HE';
  else if (score <= 0) type = 'BE';
  else type = 'NE';
  return { endingType: type, meters: meters, score: Math.round(score) };
}

// IMP-18：rollEnding（同档内轻随机，仅影响文案语气，不改变档位结论）
export function rollEnding() {
  var res = evaluateEnding();
  // 轻微随机扰动评分展示，但档位已由 evaluateEnding 锁定
  return res;
}

// IMP-19：感情进度阶段推进（由好感度驱动，门控激进/告白类行为）
// 0 初识(aff<20) / 1 暧昧(aff>=20) / 2 明确(aff>=60) / 3 高潮(aff>=80)
export function updateOneHeartRomanceStage() {
  if (GS.gameMode !== 'oneHeart') return;
  var _aff = GS.affection[GS.oneHeartMember] || 0;
  var _stage = 0;
  if (_aff >= 80) _stage = 3;
  else if (_aff >= 60) _stage = 2;
  else if (_aff >= 20) _stage = 1;
  else _stage = 0;
  if (GS.oneHeartRomanceStage !== _stage) {
    GS.oneHeartRomanceStage = _stage;
    saveGame();
  }
}

// IMP-16：生成娱乐圈今日行程（三人窗口错开，逼选其一）
export function generateOneHeartSchedule() {
  if (GS.gameMode !== 'oneHeart' || GS.worldSetting !== 'entertainment') return;
  if (!ENT_SCHEDULE_POOL || !ENT_SCHEDULE_POOL.length) return;
  var roles = [
    { key: 'main', id: GS.oneHeartMember },
    { key: 'related', id: (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.memberId) || '' },
    { key: 'rival', id: (GS.oneHeartRival && GS.oneHeartRival.memberId) || '' }
  ];

  var usedTasks = {};
  var schedule = {};
  for (var i = 0; i < roles.length; i++) {
    var r = roles[i];
    if (!r.id) { schedule[r.key] = null; continue; }
    var pick = null;
    var tries = 0;
    while (tries < 20) {
      var cand = ENT_SCHEDULE_POOL[Math.floor(Math.random() * ENT_SCHEDULE_POOL.length)];
      if (!usedTasks[cand.id]) { pick = cand; break; }
      tries++;
    }
    if (!pick) pick = ENT_SCHEDULE_POOL[Math.floor(Math.random() * ENT_SCHEDULE_POOL.length)];
    usedTasks[pick.id] = true;
    // [F/J] 标注 team/solo 类型（影响私密感与曝光判断），不再生成时段/空档/疲劳
    var _type = (pick.cat === '录音' || pick.cat === '舞蹈' || pick.cat === '拍摄') ? 'solo' : 'team';
    schedule[r.key] = {
      roleKey: r.key,
      memberId: r.id,
      task: pick.task,
      place: pick.place,
      cat: pick.cat,
      type: _type, // team=团体/公开场合（周围很多人，曝光高、私密低）；solo=单人工作/录影（更私密）
      visited: false
    };
    // IMP-17：哥哥（related）若当天是"行程"类（海外/品牌公开活动）则不在家=正当空档
    if (r.key === 'related') {
      schedule[r.key].away = (pick.cat === '行程');
      schedule[r.key].awayReason = (pick.cat === '行程') ? pick.task : '';
    }
  }
  // IMP-17：由哥哥（related）行程派生「是否在家」——仅队友的妹妹设定有意义
  if (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥') {
    var _relSch = schedule.related;
    GS.brotherAtHome = !(_relSch && _relSch.away);
  } else {
    GS.brotherAtHome = true;
  }
  // [F] 时间/空档概念已移除：重置当日约会/聊天标记，不再计算「有效空档窗口」
  GS.oneHeartDateToday = false;
  GS.oneHeartBrotherChatToday = false; // 新的一天重置「找哥哥聊聊」次数
  GS.oneHeartDateWindowAvailable = false;
  GS.oneHeartVisitLocked = ''; // 每日重置探班锁（修复：原漏重置导致第2天起探班永久禁用）
  GS.oneHeartBrotherTempChange = false;
  GS.oneHeartSchedule = schedule;
  saveGame();
}

// [F/J] 探班——独立按钮（无参），与约会互斥、每天一次；强制场景切换（不续写主线）
export async function doVisitMember() {
  if (GS.gameMode !== 'oneHeart' || GS.worldSetting !== 'entertainment') return;
  // [F] 与约会互斥、每天一次（函数层兜底，UI 灰化外的第二道闸）
  if (GS.oneHeartVisitLocked === 'done') {
    showToast('🔒 今天已经探过啦，先进入新的一天吧');
    return;
  }
  if (GS.oneHeartDateToday) {
    showToast('🔒 今天已经约过啦，先进入新的一天吧');
    return;
  }
  // [F/J] 探班 3 选 1：列出今天可探的成员行程（过滤空行程 & 已探过的），玩家选其一
  var _roleLabels = { main: '男主', related: '哥哥', rival: '情敌' };
  var _choices = [];
  if (GS.oneHeartSchedule) {
    ['main', 'related', 'rival'].forEach(function(rk) {
      var s = GS.oneHeartSchedule[rk];
      if (!s || s.visited) return;
      var m = MEMBERS.find(function(mm) { return mm.id === s.memberId; }) || { name: (rk === 'main' ? '他' : '未知') };
      var _note = '';
      if (rk === 'related' && GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥') {
        _note = '探哥哥会强化兄妹信任';
      } else if (rk === 'rival') {
        _note = '探情敌会让哥哥起疑';
      }
      _choices.push({ roleKey: rk, label: _roleLabels[rk] || rk, name: m.name, task: s.task, place: s.place, type: s.type, note: _note });
    });
  }
  if (!_choices.length) {
    showToast('今天没有可探的对象');
    return;
  }
  var _picked = await showVisitChoiceModal(_choices);
  if (!_picked) return; // 玩家取消选择
  var roleKey = _picked;
  var sch = GS.oneHeartSchedule[roleKey];
  var _vid = (sch && sch.memberId) || GS.oneHeartMember;
  var vname = (MEMBERS.find(function(m) { return m.id === _vid; }) || {}).name || '他';
  // [弹窗] 探班前展示今天探谁、在做什么（仅信息，确认后走原流程）
  var _task = sch ? sch.task : '（暂无公开行程）';
  var _place = sch ? sch.place : '';
  var _type = sch ? (sch.type === 'team' ? '团队·公开场合' : '单人·较私密') : '';
  var _bs = GS.brotherStance || 'consultant';
  var _bsText = { consultant: '参谋', supportive: '支持', testing: '试探', protective: '忧被察觉' }[_bs] || '参谋';
  var _risk = GS.exposureRisk || 0;
  var _info = '今天去探 <b>' + escHtml(vname) + '</b> 的班<br>' +
    '他今天在 <b>' + escHtml(_place) + '</b> 进行「' + escHtml(_task) + '」' + (_type ? '（' + _type + '）' : '') + '<br>' +
    '哥哥立场：' + _bsText + ' · 曝光风险：' + _risk + '/100<br>' +
    '<span style="color:#b9aee0">点「确认去探班」即生成一段独立探班剧情（不推进主线）。</span>';
  var _ok = await showActionInfoModal('🎬 今天去探班', _info, '确认去探班', '再想想');
  if (!_ok) return;
  GS.pendingChoiceText = '🎬 探班·' + vname + (sch ? '（' + sch.task + '）' : '');
  saveGame();
  if (window.__renderAll) window.__renderAll();
  // [fix] 先记录后果列表长度，仅当探班剧情真正生成成功后才消费当天名额与副作用，
  // 避免 AI 返回错误时白扣一次探班次数（且底部「你的选择」标签不会卡在旧文本）
  var _visitBeforeLen = GS.consequenceNarratives.length;
  await generateOneHeartRound({ isVisit: true, visitRoleKey: roleKey, noTimeAdvance: true });
  if (GS.consequenceNarratives.length > _visitBeforeLen) {
    GS.oneHeartVisitLocked = 'done'; // 每天一次（与约会互斥）
    GS._brotherShownThisDay = true; // [J] 探班即哥哥/男主到场，消费当天哥哥桥段标志，避免重复
    if (sch) sch.visited = true;
    if (!GS.oneHeartVisitLog) GS.oneHeartVisitLog = [];
    GS.oneHeartVisitLog.push({ roleKey: roleKey, day: GS.day, task: sch ? sch.task : '' });
    // IMP-17：探哥哥强化兄妹信任 / 探情敌让哥哥起疑（仅队友的妹妹设定生效）
    if (roleKey === 'related' && GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥') {
      updateBrotherStance(5, '探班哥哥，兄妹更亲近');
    } else if (roleKey === 'rival') {
      updateBrotherStance(-2, '你探情敌，哥哥起疑');
    }
  } else {
    // 生成失败：回滚 choiceText，避免底部标签停留在探班文案（让玩家可立即重试）
    GS.pendingChoiceText = '';
    showToast('🔄 探班剧情生成失败，名额未消耗，可重试');
  }
  saveGame();
  if (window.__renderAll) window.__renderAll();
}

// [约会按钮已移除] 约会功能已融入叙事选项（opt.sceneType==='date'），由 applyDateEffects / accumulateScandalHeat 取代。

export async function generateOneHeartRound(extra) {
  extra = extra || {};
  if (GS._isGenerating) { GS._pendingOneHeartGen = extra; return; } // 协作式：在飞生成结束后由 finally 补跑，避免并发双调用与死空白
  GS._isGenerating = true;
  showLoading('正在生成剧情...');
  var _needDiary = false;
  var _needMoment = false;
  var _needLetter = false;
  var _lockMorning = GS.justEnteredNewDay || (GS.pendingChoiceText && (
    GS.pendingChoiceText.indexOf('新的一天') >= 0 ||
    GS.pendingChoiceText.indexOf('生日') >= 0 ||
    GS.pendingChoiceText.indexOf('今天是') >= 0
  ));
  try {
    // [计划B问题1] 新的一天时压缩昨日全文为结构化摘要（在 prompt 构建前完成，确保 AI 能看到昨日记忆）
    if (_lockMorning) {
      // [v23-fix] 新的一天重置话题频率计数值（跨天衰减，只保留过去3天的高频话题）
      if (GS.dailyTopicFrequency && typeof GS.dailyTopicFrequency === 'object') {
        for (var _tfk in GS.dailyTopicFrequency) {
          GS.dailyTopicFrequency[_tfk] = Math.max(0, (GS.dailyTopicFrequency[_tfk] || 0) - 2); // 每天减2，3天后归零
        }
      }
      GS.todayUsedTopics = [];
    }
    if (_lockMorning && GS.todayFullText && GS.todayFullText.length > 0) {
      try {
        await compressOneHeartYesterday();
      } catch (e) {
        console.warn('[1v1] compressOneHeartYesterday error:', e);
      }
      // 更新今天起点索引，下次"新的一天"只压缩新一天的内容
      GS.oneHeartLastDayStartIdx = GS.todayFullText.length;
      // 项2：在 generateOneHeartSchedule 重置 oneHeartDateToday 前捕获昨日约会状态，供热度衰减判定低调日
      var _prevDated = GS.oneHeartDateToday;
      // IMP-16：新的一天生成娱乐圈行程（仅娱乐圈世界观）
      generateOneHeartSchedule();
      // 项2：新的一天哥哥立场向 0 缓慢回落（避免永久卡死 testing/protective）
      applyBrotherStanceDailyDecay();
      // [H] 新的一天绯闻热度自然衰减（含低调日额外减值，传入昨日约会状态）
      applyScandalHeatDailyDecay(_prevDated);
      // [J] 重置当天哥哥桥段标志
      GS._brotherShownThisDay = false;
    }
    // 首轮或新的一天都生成今日新闻（已有 GS.newsDay===GS.day 去重保护）
    if (GS.gameMode === 'oneHeart' && GS.worldSetting === 'entertainment') {
      generateDailyNews();
    }
    var _endType = '';
    var _endRes = null;
    if (extra.isEnding) {
      _endRes = rollEnding();
      _endType = _endRes.endingType;
      GS.oneHeartEnding = _endType;
      GS.endingMeters = _endRes.meters;
    }
    var sysMsg = buildOneHeartSystemPrompt();
    // 如果是走向结局，注入结局指令（按档位定调）
    if (extra.isEnding) {
      var _et = ONE_HEART_ENDING_TEMPLATES[_endType] || ONE_HEART_ENDING_TEMPLATES.NE;
      sysMsg += '\n\n[指令] 这是故事的最后一幕，必须是一个完整的结局场景。本局判定的结局基调为【' + _et.label + '】：' + _et.desc + '。写作语气：' + _et.tone + '给这段关系一个收尾，情感饱满、有始有终。';
    }
    // 如果是自由推演，注入自动推演指令
    if (extra.isFreeDeduction) {
      sysMsg += '\n\n[指令] 自由推演模式——请根据女主的性格、当前剧情发展，自然地推进故事。不需要特定方向，让故事跟随角色性格自然流动。';
    }
    // 如果是随机事件，按当前关系阶段从对应分组抽（IMP-05：阶段匹配 + 去重缓冲）
    if (extra.isRandom) {
      var picked = pickOneHeartRandomEvent();
      if (picked) {
        sysMsg += '\n\n[随机事件] 请触发以下剧情——根据当前世界观自然改编场景和人物互动方式，但保留核心情感互动：\n"' + picked.desc + '"';
      }
    }
    // IMP-ENT-DATE(B2/B5)：代码护栏——把「是否强制拦门 / 情敌助攻权重」从纯 prompt 提为代码判定，随 extra 传入 prompts.js
    var _bsNow = GS.brotherStance || 'consultant';
    var _enforceBrotherStop = (GS.oneHeartRomanceStage || 0) >= 2 && (_bsNow === 'testing' || _bsNow === 'protective');
    var _brotherAssist = (GS.oneHeartRivalAff || 0) >= 20 && _bsNow === 'supportive';
    var userMsg = buildOneHeartUserMessage(extra.isEnding ? 'ending' : 'phase', { endingType: _endType, isVisit: extra.isVisit, visitRoleKey: extra.visitRoleKey, enforceBrotherStop: _enforceBrotherStop, brotherAssist: _brotherAssist });

    // IMP-17[fix]：感情越深，哥哥越放心（确定性正向来源，仅「队友的妹妹」）
    // 好感度跨过 40/60/80 里程碑时各 +5，让正常通关可稳定推高 brotherStance → supportive（HE 可达）。
    if (GS.gameMode === 'oneHeart' && GS.worldSetting === 'entertainment' && GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥' && !extra.isEnding) {
      var _ba = GS.affection[GS.oneHeartMember] || 0;
      var _ms = [40, 60, 80];
      for (var _mi = 0; _mi < _ms.length; _mi++) {
        if (_ba >= _ms[_mi] && (GS.brotherAffMilestone || 0) < _ms[_mi]) {
          GS.brotherAffMilestone = _ms[_mi];
          updateBrotherStance(5, '感情稳定，哥哥也放心些');
        }
      }
    }

    // IMP-17 ⑦ 中点「哥哥的考验」：中局哥哥把男主单独叫去"谈谈"试探诚意（仅队友的妹妹设定）
    if (GS.gameMode === 'oneHeart' && GS.worldSetting === 'entertainment' && GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥') {
      if ((GS.oneHeartGenCount || 0) >= 15 && !GS.brotherTestNudged) {
        userMsg += '[角色出场] 中局，哥哥把男主单独叫去"谈谈"——他想试探男主是否真心对你好（哥哥是参谋/掩护，不是反对者）。请自然写出这段试探、男主的紧张反应、以及你（女主）在旁的微妙心情。哥哥的立场会因此次互动而微妙变化。\n\n';
        updateBrotherStance(3, '中局哥哥"谈谈"，更认可男主');
        GS.brotherTestNudged = true;
        saveGame();
      }
    }

    // IMP-17[fix]：哥哥专属事件（代码抽选，确定性触发，仅「队友的妹妹」）
    // 与 isRandom 同链路注入 userMsg；事件自带的 stanceDelta 立即结算，使 testing/protective 真正可达。
    if (GS.gameMode === 'oneHeart' && GS.worldSetting === 'entertainment' && GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥' && !extra.isEnding && !extra.isVisit) {
      var _be = pickOneHeartBrotherEvent();
      if (_be) {
        userMsg += '[哥哥专属] 请触发以下哥哥相关剧情——根据当前世界观自然改编场景与互动方式，但保留核心情感互动：\n"' + _be.desc + '"\n';
        if (_be.stanceDelta) updateBrotherStance(_be.stanceDelta, _be.name);
      }
    }


    // IMP-ENT-DATE：主动约会 / 找哥哥聊聊 场景约束注入
    if (extra.isDate) {
      userMsg += '[主动约会场景] 本段是女主主动发起的约会。\n';
      if (extra.brotherHome) {
        userMsg += '- 哥哥在家，男主不能登门，你们只能在外部低调匆匆见（楼梯间/车里/街角/便利店），注意避开哥哥视线——但哥哥其实知情、会调侃或掩护，绝不拆穿。\n';
      } else {
        userMsg += '- 哥哥不在家（正当空档），男主可名正言顺来住处，氛围放松、像偷偷谈恋爱的小日子。\n';
      }
      userMsg += '\n';
    }
    if (extra.isBrotherChat) {
      var _bcName = (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name) || '哥哥';
      userMsg += '[找哥哥聊聊] 本段是女主主动找哥哥「' + _bcName + '」聊天的场景。' + (extra.tone || '你们闲聊近况。') + '哥哥按当前立场（' + (GS.brotherStance || 'consultant') + '）自然回应：给建议 / 调侃 / 劝你别急着公开，并可轻微影响男主情绪（哥哥支持→男主放松）。哥哥是你最信任的参谋与掩护，绝不拆穿你。\n\n';
    }
    if (GS.justEnteredNewDay) {
      userMsg += '[INSTRUCTION] 现在是一天的开始（' + (GS.currentDate ? GS.currentDate.month + '月' + GS.currentDate.day + '日' : '新的一天') + '）。必须从早晨/上午场景重新开始（如醒来、晨光、早餐等），禁止延续昨晚的剧情场景。自然衔接昨日的余韵但不重复昨日已发生的事。\n\n';
      GS.justEnteredNewDay = false;
    }
    var _gr = await generateWithRetry(sysMsg, userMsg, { maxTokens: ONE_HEART_TOKEN_CONFIG.phaseNarrative, skipValidate: true, providerKey: GS.useSeparateApi ? (GS.mainApiProvider || GS.apiProvider) : GS.apiProvider });
    var raw = (_gr && _gr.raw) ? _gr.raw : '';
    if (typeof raw !== 'string') raw = '';
    if (!raw) {
      GS.phaseNarrative = '';
      GS.currentOptions = [];
      GS.parsedNarrative = { narrative: '', directorOS: '', options: [] };
      showToast('⚠️ 剧情生成失败（AI 返回为空），请重试或换个指令');
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

    // 1v1 校验：场景/人物/时段一致性（最多重试1次）
    if (GS.gameMode === 'oneHeart' && !extra.isRegenerate) {
      var _corrections = validateOneHeartNarrative(parsed, GS);
      if (_corrections) {
        var _retryMsg = userMsg + '\n\n[修正] ' + _corrections + '\n请根据修正指示重新生成。';
        var _retryGr = await generateWithRetry(sysMsg, _retryMsg, { maxTokens: ONE_HEART_TOKEN_CONFIG.phaseNarrative, skipValidate: true, providerKey: GS.useSeparateApi ? (GS.mainApiProvider || GS.apiProvider) : GS.apiProvider });
        var _retryRaw = (_retryGr && _retryGr.raw) ? _retryGr.raw : '';
        if (_retryRaw) {
          var _retryParsed = parseOneHeartNarrative(_retryRaw);
          if (_retryParsed && _retryParsed.narrative) {
            // 二次校验：如果仍有矛盾，记录警告但不阻塞（避免无限重试）
            var _retryCorrections = validateOneHeartNarrative(_retryParsed, GS);
            if (_retryCorrections) {
              console.warn('[1v1] 重试后仍有校验矛盾，采用重试结果：', _retryCorrections);
            }
            parsed = _retryParsed;
          }
        }
      }
    }

    // [J] 主流程（非探班）若已出现哥哥桥段，置标志供探班去重（防「上午哥哥说没事、下午探班又写哥哥」）
    if (GS.gameMode === 'oneHeart' && GS.worldSetting === 'entertainment' && GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥' && !extra.isVisit) {
      var _narr = parsed.narrative || '';
      if (_narr.indexOf('哥哥') >= 0) {
        GS._brotherShownThisDay = true;
      }
    }

    // 1v1 事件条目提取（合并到剧情生成调用，零额外 AI 成本；在重试逻辑后统一存储最终 parsed 的 eventItems）
    if (parsed.eventItems && parsed.eventItems.length > 0) {
      if (!GS.oneHeartEventLog) GS.oneHeartEventLog = [];
      GS.oneHeartEventLog = GS.oneHeartEventLog.concat(parsed.eventItems);
      // [计划B问题5+6] 事件日志去重 + 200条软上限
      GS.oneHeartEventLog = dedupeEventLog(GS.oneHeartEventLog);
      if (GS.oneHeartEventLog.length > 200) {
        var _earlyItems = GS.oneHeartEventLog.slice(0, 100);
        var _recentItems = GS.oneHeartEventLog.slice(100);
        var _merged = '[早期事件] ' + _earlyItems.join('；');
        GS.oneHeartEventLog = [_merged].concat(_recentItems);
      }
    }

    // [v23-fix] 话题频率追踪：提取 narrative 中的主题关键词，累加至 dailyTopicFrequency
    if (GS.gameMode === 'oneHeart' && parsed.narrative) {
      if (!GS.dailyTopicFrequency) GS.dailyTopicFrequency = {};
      var _topicKeywords = ['直拍', '舞台', '练习室', '视频', '编舞', '录音', '拍摄', '综艺', '直播', '打歌', '演唱会', '彩排', '签售', '杂志', '广告', 'MV', '歌曲', '专辑', '回归', '采访', '节目', '记者', '粉丝', '相机', '镜头', '热搜', '曝光', '礼物', '约会', '做饭', '吃饭', '散步', '电影', '逛街', '旅行', '生病', '医院', '吵架', '冷战', '误会', '吃醋', '表白', '告白', '牵手', '拥抱', '接吻', '礼物', '惊喜', '生日'];
      var _narrForTopics = parsed.narrative;
      for (var _tki = 0; _tki < _topicKeywords.length; _tki++) {
        var _kw = _topicKeywords[_tki];
        if (_narrForTopics.indexOf(_kw) >= 0 || (parsed.eventItems && parsed.eventItems.some(function(e) { return e.indexOf(_kw) >= 0; }))) {
          if (!GS.dailyTopicFrequency[_kw]) GS.dailyTopicFrequency[_kw] = 0;
          GS.dailyTopicFrequency[_kw]++;
        }
      }
      // 清理低频噪音段：低于2次的周期间清空，保持对象干净
      var _toDel = [];
      for (var _fk in GS.dailyTopicFrequency) {
        if (GS.dailyTopicFrequency[_fk] < 0) _toDel.push(_fk);
      }
      for (var _di = 0; _di < _toDel.length; _di++) delete GS.dailyTopicFrequency[_toDel[_di]];
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

    // 1v1 食物禁忌代码硬修正：删除/替换包含男主禁忌食材的选项
    if (GS.gameMode === 'oneHeart' && GS.currentOptions.length > 0) {
      var _mainMember = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
      var _taboos = (_mainMember && _mainMember.foodTaboos) || [];
      if (_taboos.length > 0) {
        var _safeOptions = [];
        for (var _oi = 0; _oi < GS.currentOptions.length; _oi++) {
          var _opt = GS.currentOptions[_oi];
          var _optText = (_opt && _opt.text) || '';
          var _hit = false;
          for (var _ti = 0; _ti < _taboos.length; _ti++) {
            if (_optText.indexOf(_taboos[_ti]) >= 0) { _hit = true; break; }
          }
          if (!_hit) _safeOptions.push(_opt);
        }
        if (_safeOptions.length < 2) {
          // 不足 2 个时补通用安全选项
          var _fallbacks = [
            { text: '静静地看着他，等他先开口', affDelta: 1, affReason: '安静的陪伴' },
            { text: '主动找话题，想多了解他一点', affDelta: 2, affReason: '主动靠近' },
            { text: '轻声问他今天累不累', affDelta: 2, affReason: '关心对方' }
          ];
          while (_safeOptions.length < 2 && _safeOptions.length < _fallbacks.length) {
            _safeOptions.push(_fallbacks[_safeOptions.length]);
          }
        }
        GS.currentOptions = _safeOptions;
      }
    }

  // [F] 时间概念已移除：不再推进 24h 时钟。仅刷新场景位置/在场人物（若有 AI 声明），保持场景延续。
  if (GS.gameMode === 'oneHeart') {
    var _ctx = GS.oneHeartSceneContext || { location: '', present: [] };
    var _declaredCtx = (parsed && parsed.sceneContext) || null;
    GS.oneHeartSceneContext = {
      location: (_declaredCtx && _declaredCtx.location) ? _declaredCtx.location : (_ctx.location || ''),
      present: (_declaredCtx && Array.isArray(_declaredCtx.present)) ? _declaredCtx.present : (Array.isArray(_ctx.present) ? _ctx.present : [])
    };
    saveGame();
  }


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
        _needDiary = true;
      }
      // 朋友圈计数器（随机 3-5 段触发）
      GS.oneHeartMomentCounter++;
      var momentThreshold = randInt(3, 5);
      if (GS.oneHeartMomentCounter >= momentThreshold) {
        GS.oneHeartMomentCounter = 0;
        _needMoment = true;
      }
    }

    GS.phaseFreeCount = 0;
    GS.phaseOptionCount = 0;
    GS.isInConsequence = false;
    GS.smsSentToday = false;

    // 1v1 回合计数（回礼/冷战/聊天回合判断依赖；旧异步压缩逻辑已移除，事件条目改为每篇剧情生成时 AI 顺带返回）
    if (GS.gameMode === 'oneHeart' && !extra.isRegenerate && !extra.noTimeAdvance) {
      GS.oneHeartGenCount = (GS.oneHeartGenCount || 0) + 1;
      // IMP-19：感情进度阶段推进（门控激进/告白类行为）
      updateOneHeartRomanceStage();
    }

    // 1v1 冷战检测 + 好感度阶段解锁 + 约会日检测
    if (GS.gameMode === 'oneHeart' && !extra.isRegenerate) {
      if (!GS._affMilestones) GS._affMilestones = {};
      var _prevAff = GS.oneHeartAffHistory && GS.oneHeartAffHistory.length > 0 ? GS.oneHeartAffHistory[GS.oneHeartAffHistory.length - 1] : 0;
      var memId = GS.oneHeartMember;
      var curAff = GS.affection[memId] || 0;
      if (!GS.oneHeartAffHistory) GS.oneHeartAffHistory = [];
      GS.oneHeartAffHistory.push(curAff);
      if (GS.oneHeartAffHistory.length > 5) GS.oneHeartAffHistory.shift();

      // 情敌阶段检测：好感度变化时检查是否进入新阶段
      if (GS.oneHeartRival && GS.oneHeartRival.name) {
        // 好感度100时情敌退出
        if (curAff >= 100) {
          GS.oneHeartRival.name = '';
          showToast('💔 情敌已彻底退出你们的故事');
        } else {
          var _newStage = getRivalStage(curAff);
          if (!GS.oneHeartRivalStage) GS.oneHeartRivalStage = { stage: 0, stageStartGenCount: 0, eventTriggered: false, lastDirection: '' };
          if (_newStage !== GS.oneHeartRivalStage.stage) {
            // 阶段变化（不管涨跌）→ 重置 eventTriggered，准备触发新事件
            var _direction = _newStage > GS.oneHeartRivalStage.stage ? 'up' : 'down';
            GS.oneHeartRivalStage = {
              stage: _newStage,
              stageStartGenCount: GS.oneHeartGenCount || 0,
              eventTriggered: false,
              lastDirection: _direction
            };
          }
        }
      }

      // 冷战检测：连续 2 回合好感度下降 3 点以上
      if (!GS.oneHeartColdWar) GS.oneHeartColdWar = { active: false, startRound: 0, consecutiveDrops: 0 };
      if (GS.oneHeartAffHistory.length >= 2) {
        var prev = GS.oneHeartAffHistory[GS.oneHeartAffHistory.length - 2];
        var diff = curAff - prev;
        if (diff < -3) {
          GS.oneHeartColdWar.consecutiveDrops++;
          if (GS.oneHeartColdWar.consecutiveDrops >= 2 && !GS.oneHeartColdWar.active) {
            GS.oneHeartColdWar.active = true;
            GS.oneHeartColdWar.startRound = GS.oneHeartGenCount || 0;
          }
        } else if (diff > 0) {
          var _wasActive = GS.oneHeartColdWar.active;
          GS.oneHeartColdWar.consecutiveDrops = 0;
          GS.oneHeartColdWar.active = false;
          if (_wasActive && showToast) showToast('❄️ 冷战终于结束了 💗');
        }
      }

      // 好感度阶段解锁（仅首次达到时提示）
      var _milestones = [40, 60, 80];
      for (var _mi = 0; _mi < _milestones.length; _mi++) {
        var _mVal = _milestones[_mi];
        if (curAff >= _mVal && (_prevAff < _mVal || !GS._affMilestones['m' + _mVal]) && curAff > _prevAff) {
          GS._affMilestones['m' + _mVal] = true;
          var _mLabel = _mVal >= 80 ? '💞 你们的心从未如此靠近' : _mVal >= 60 ? '💗 感情在悄然升温' : '💛 空气中弥漫着暧昧的气息';
          showToast('🎉 好感度达到 ' + _mVal + '！' + _mLabel);
        }
      }

      // 约会日检测：每 5 回合触发约会提示
      GS.oneHeartDiaryCounter = (GS.oneHeartDiaryCounter || 0);
      if (GS.oneHeartDiaryCounter > 0 && GS.oneHeartDiaryCounter % 5 === 0) {
        if (!GS._dateDayNotified) {
          GS._dateDayNotified = true;
          showToast('💞 又到了约会的日子……');
        }
      } else {
        GS._dateDayNotified = false;
      }
    }

    saveGame();

    // 1v1 事件触发（回合后检查，非重新生成非结局时）
    if (GS.gameMode === 'oneHeart' && !extra.isRegenerate && !extra.isEnding && !GS.gameOver) {
      await checkOneHeartEvents();
    }

    // 1v1 约定检测（每回合，只扫最新一回合）
    if (GS.gameMode === 'oneHeart' && !extra.isRegenerate && parsed && parsed.narrative) {
      if (parsed.narrative.length >= 50) detectOneHeartPromises(parsed.narrative);
    }

    // 1v1 秘密信件触发（确定性间隔 + 上限 6 封）
    var _letterEvery = GS.oneHeartLetterEvery || 5;
    if (GS.gameMode === 'oneHeart' && !extra.isRegenerate && (GS.letters || []).length < 6 && (GS.oneHeartGenCount || 0) > 0 && (GS.oneHeartGenCount || 0) % _letterEvery === 0) {
      _needLetter = true;
    }

    // 1v1 主动消息触发（每5-8回合）→ 推入 chatHistory 并标记红点
    if (GS.gameMode === 'oneHeart' && !extra.isRegenerate && (GS.oneHeartGenCount || 0) > 0 && (GS.oneHeartGenCount || 0) % randInt(5, 8) === 0 && Math.random() < 0.6) {
      var _aff = GS.affection[GS.oneHeartMember] || 0;
      var _msg = await generateMessage(_aff);
      if (_msg) {
        var _msgText = (typeof _msg === 'string') ? _msg : (_msg.text || '');
        if (_msgText) {
          if (!GS.chatHistory) GS.chatHistory = [];
          GS.chatHistory.push({ role: 'ai', content: _msgText });
          if (GS.chatHistory.length > 50) GS.chatHistory = GS.chatHistory.slice(-50);
          GS._newChat = true;
          saveGame();
        }
      }
    }

    // 如果是走向结局，生成后结束游戏
    if (extra.isEnding) {
      GS.gameOver = true;
      var _etLabel = (ONE_HEART_ENDING_TEMPLATES[GS.oneHeartEnding] || {}).label || '结局';
      GS.finalChoice = (_etLabel ? '【' + _etLabel + '】' : '') + (GS.oneHeartMainLine || '大结局');
      GS.finalResult = parsed.narrative;
      // 结局图鉴存档
      if (!GS.endingArchive) GS.endingArchive = [];
      var _affSnap = {};
      _affSnap[GS.oneHeartMember] = GS.affection[GS.oneHeartMember] || 0;
      GS.endingArchive.push({
        endingType: GS.oneHeartEnding,
        finalChoice: GS.finalChoice,
        affections: _affSnap,
        date: (GS.currentDate ? (GS.currentDate.month + '月' + GS.currentDate.day + '日') : '')
      });
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
  if (GS._pendingOneHeartGen) {
    var _pending = GS._pendingOneHeartGen;
    GS._pendingOneHeartGen = null;
    await generateOneHeartRound(_pending);
  }

  // [MOD-DAY] 1v1 跨天完全由玩家通过「新的一天」按钮手动触发（ui-renderer 中 btnNewDay）。
  // 时钟只驱动时段（上午→中午→下午→傍晚→深夜），到达深夜后封顶，剧情可继续生成，
  // 玩家想进入下一天时点击「新的一天」即可。故此处不再自动跨天，避免到点即跳天。

  // 锁已释放，执行延迟生成（主剧情成功才设置标志，失败 throw 时跳过）
  if (_needDiary) {
    try { await generateDiary(); } catch (e) { console.warn('[1v1] diary deferred error:', e); }
  }
  if (_needMoment) {
    try { await generateMoment(); } catch (e) { console.warn('[1v1] moment deferred error:', e); }
  }
  if (_needLetter) {
    try { await generateLetter(); } catch (e) { console.warn('[1v1] letter deferred error:', e); }
  }
  if (_needDiary || _needMoment) {
    window.__renderAll && window.__renderAll();
  }
}

window.generateOneHeartRound = generateOneHeartRound;

// 事件去重工具函数
function isEventUsed(scenario) {
  if (!scenario || !GS._usedEventScenarios) return false;
  return GS._usedEventScenarios.indexOf(scenario.slice(0, 30)) >= 0;
}
function markEventUsed(scenario) {
  if (!scenario || !GS._usedEventScenarios) return;
  var key = scenario.slice(0, 30);
  if (GS._usedEventScenarios.indexOf(key) < 0) GS._usedEventScenarios.push(key);
}
window.markEventUsed = markEventUsed;

// 从硬编码池选取未使用事件（如全部已用则清空标记并重新轮转）
function pickUnusedEvent(arr) {
  if (!arr || arr.length === 0) return null;
  var unused = arr.filter(function(e) { return !isEventUsed(e.scenario); });
  if (unused.length === 0) {
    GS._usedEventScenarios = []; // 全部用完了，清空轮转
    unused = arr;
  }
  var pick = unused[Math.floor(Math.random() * unused.length)];
  markEventUsed(pick.scenario);
  return pick;
}

// 小事件通用选取：50% 缓存池 / 50% AI 生成 / fallback 硬编码
var SMALL_EVENT_MAP = {
  celebrity: { pool: 'oneHeartCelebrityPool', hardcode: 'CELEBRITY_EVENTS', type: 'celebrity' },
  scandal: { pool: 'oneHeartScandalPool', hardcode: 'SCANDAL_EVENTS', type: 'scandal' },
  sick: { pool: 'oneHeartSickPool', hardcode: 'SICK_EVENTS', type: 'sick' },
  exjealous: { pool: 'oneHeartExJealousPool', hardcode: 'EX_JEALOUSY_EVENTS', type: 'exjealous' },
  latenight: { pool: 'oneHeartLateNightPool', hardcode: 'LATE_NIGHT_EVENTS', type: 'latenight' }
};
async function pickSmallEvent(key, hardcodeArr) {
  var cfg = SMALL_EVENT_MAP[key];
  if (!cfg) return;
  var pool = GS[cfg.pool] || [];
  var scenario = '';
  var opts = ['跟着直觉走', '冷静观察', '大胆行动'];
  // 50% 从缓存池抽（去重）
  if (pool.length > 0 && Math.random() < 0.5) {
    var unused = pool.filter(function(e) { return !isEventUsed(e.scenario); });
    if (unused.length > 0) {
      var pItem = unused[Math.floor(Math.random() * unused.length)];
      scenario = pItem.scenario;
      if (pItem.options && pItem.options.length >= 3) opts = pItem.options;
      markEventUsed(scenario);
    }
  }
  // 50% AI 生成或池未命中
  if (!scenario) {
    var _wc = getWorldConfig(GS.worldSetting);
    var _wcInfo = _wc ? (_wc.coreTension || '') : '';
    try {
      var promptText = '生成一个恋爱情境中的' + key + '场景（50字以内）+ 3个选项（每个20字以内）。\n';
      if (cfg.type === 'celebrity') promptText += '这是一个「路人认出来了」的情景。\n';
      else if (cfg.type === 'scandal') promptText += '这是一个「社交媒体/八卦传出流言」的情景。\n';
      else if (cfg.type === 'sick') promptText += '这是一个「他生病/受伤了需要照顾」的情景。\n';
      else if (cfg.type === 'exjealous') promptText += '这是一个「因为前任而产生的吃醋」的情景。\n';
      else if (cfg.type === 'latenight') promptText += '这是一个「深夜脆弱时刻」的情景。\n';
      var _affSmall = GS.affection[GS.oneHeartMember] || 0;
      var _psMemName = (MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; }) || {}).name || '他';
      promptText += '世界观背景：' + GS.worldSetting + (_wcInfo ? ' ' + _wcInfo : '') + '\n';
      promptText += '双方关系：好感度' + _affSmall + '（' + getAffectionDesc(_affSmall) + '）\n';
      promptText += '输出JSON：{"scenario":"场景描述","options":["靠近' + _psMemName + '说话","保持沉默观察","转身离开现场"]}';
      var _res = await callDeepSeek(promptText, '生成' + key + '事件', 300, false, 0.8);
      var _parsed;
      try { _parsed = JSON.parse(_res); } catch (pe) {
        var _m = _res.match(/\{[\s\S]*\}/);
        if (_m) try { _parsed = JSON.parse(_m[0]); } catch (pe2) { _parsed = null; }
      }
      if (_parsed && _parsed.scenario) {
        scenario = _parsed.scenario;
        if (_parsed.options && _parsed.options.length >= 3) opts = _parsed.options;
        opts = await retryGenericEventOptions(scenario, opts, key);
        if (pool.length < 50) {
          pool.push({ scenario: scenario, options: opts.slice(0, 3) });
          GS[cfg.pool] = pool;
        }
        markEventUsed(scenario);
      }
    } catch (e) {}
  }
  // AI 失败则硬编码兜底（去重 + minAff 过滤）
  if (!scenario) {
    var _affSmall = GS.affection[GS.oneHeartMember] || 0;
    var _filtered = hardcodeArr.filter(function(e) { return !e.minAff || _affSmall >= e.minAff; });
    var picked = pickUnusedEvent(_filtered);
    if (picked) {
      scenario = picked.scenario;
      opts = picked.options;
    }
  }
  if (scenario) {
    var _affDeltasEv = null;
    var _matched = hardcodeArr.find(function(e) { return e.scenario === scenario; });
    if (_matched && _matched.affDeltas) _affDeltasEv = _matched.affDeltas;
    GS.oneHeartLastEventRound = GS.oneHeartGenCount || 0;
    GS._pendingEvents.push({ type: cfg.type, scenario: scenario, options: opts, affDeltas: _affDeltasEv });
    // IMP-18[fix]：scandal 事件实际入队时累加曝光次数（= 玩家经历的公众翻车次数）
    if (cfg.type === 'scandal') {
      // IMP-ENT-DATE(B3)：妹妹正当接近权·降曝光——队友的妹妹出现在他工作场合可解释为"来找哥哥"，
      // 因此即便被拍，外人只联想到兄妹，半数公众曝光翻车被掩护掉、不计入 scandal 计数。
      var _shield = (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥');
      var _shielded = _shield && Math.random() < 0.5;
      if (!_shielded) {
        GS.oneHeartScandalCount = (GS.oneHeartScandalCount || 0) + 1;
      } else {
        console.warn('[1v1-shield] scandal 被妹妹身份掩护（解释为来找哥哥），曝光计数不打');
      }
      // IMP-17[fix]：公众曝光翻车 → 哥哥忧关系被察觉，立场下滑（仅队友的妹妹；可激活 testing/protective）
      updateBrotherStance(_shielded ? -1 : -3, '公众曝光翻车，哥哥忧关系被察觉');
    }
  }
}

// 1v1 事件触发检查（回合后）
async function checkOneHeartEvents() {
  // 意外池：每回合独立触发，不受冷却限制
  await tryPoolEvent();
  if (GS.oneHeartLastEventRound && (GS.oneHeartGenCount || 0) - GS.oneHeartLastEventRound < 2) return;
  var aff = GS.affection[GS.oneHeartMember] || 0;
  var _checkMem = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  var _checkMemName = _checkMem ? _checkMem.name : '他';
  var _cfMemName = _checkMemName;
  var _checkRivalName = (GS.oneHeartRival && GS.oneHeartRival.name) || '';

  // 争吵冷却递减
  if (GS.oneHeartArgueCooldown > 0) GS.oneHeartArgueCooldown--;

  var hasRival = !!(GS.oneHeartRival && GS.oneHeartRival.name);

  // === 告白事件（已改为阶段3触发，见下方情敌专属事件）===
  // 原 rivalAff >= 40 触发逻辑已移除，改为阶段变化时阶段3自动附带告白
  if (GS._confessionCooldown > 0 && GS._confessionCooldown < 99) GS._confessionCooldown--;

  // === 嫉妒事件（情敌好感度已废弃，改为固定概率）===
  var _jealousyChance = hasRival ? 0.20 : 0;
  if (aff >= 60 && Math.random() < _jealousyChance && GS._pendingEvents.length < 2) {
    // 情敌存在时，部分触发转为激烈争吵
    if (hasRival && Math.random() < 0.30) {
      // 争吵分支
      var _argueScenario = '';
      var _argueOpts = ['冷静解释', '沉默不语', '反问' + _cfMemName + '"你什么意思"'];
      try {
        var _arRes = await callDeepSeek(
          '生成一个情侣间因第三方介入而激烈争吵的场景（50字以内）+ 3个选项（每个20字以内）。\n' +
          '第三方是「' + _checkRivalName + '」，他对你们的关系构成了威胁。他发现了你们之间的暧昧。\n' +
          '输出JSON：{"scenario":"场景描述","options":["靠近' + _cfMemName + '说话","保持沉默观察","转身离开现场"]}',
          '生成争吵事件', 300, false, 0.8
        );
        var _arParsed;
        try { _arParsed = JSON.parse(_arRes); } catch (pe) {
          var _am = _arRes.match(/\{[\s\S]*\}/);
          if (_am) try { _arParsed = JSON.parse(_am[0]); } catch (pe2) { _arParsed = null; }
        }
        if (_arParsed && _arParsed.scenario) {
          _argueScenario = _arParsed.scenario;
          if (_arParsed.options && _arParsed.options.length >= 3) _argueOpts = _arParsed.options;
          _argueOpts = await retryGenericEventOptions(_argueScenario, _argueOpts, '争吵');
        }
      } catch (e) {}
      if (_argueScenario) {
        markEventUsed(_argueScenario);
        if (!GS._pendingEvents) GS._pendingEvents = [];
        GS._pendingEvents.push({ type: 'confrontation', scenario: _argueScenario, options: _argueOpts, targetId: GS.oneHeartMember });
        GS.oneHeartArgueCooldown = 3;
      }
    }
  } else if (aff >= 60 && Math.random() < _jealousyChance && GS._pendingEvents.length < 2) {
    var _jeaScenario = '';
    var _jeaOpts = ['跟着直觉走', '冷静观察', '大胆行动'];
    var _jeaPool = GS.oneHeartJealousyPool || [];
    var _useJeaPool = _jeaPool.length > 0 && Math.random() < 0.3;
    if (_useJeaPool) {
      var _jpUnused = _jeaPool.filter(function(e) { return !isEventUsed(e.scenario); });
      if (_jpUnused.length > 0) {
        var _jpItem = _jpUnused[Math.floor(Math.random() * _jpUnused.length)];
        _jeaScenario = _jpItem.scenario;
        if (_jpItem.options && _jpItem.options.length >= 3) _jeaOpts = _jpItem.options;
        markEventUsed(_jeaScenario);
      }
    }
    if (!_jeaScenario) {
      try {
        var _wcJe = getWorldConfig(GS.worldSetting);
        var _wcJeInfo = _wcJe ? (_wcJe.coreTension || '') : '';
        _wcJeInfo += ' 他的角色：' + (_wcJe ? (_wcJe.memberRole || '') : '');
        var _jeaRes = await callDeepSeek(
          '生成一个恋爱中的吃醋场景（50字以内）+ 3个选项（每个20字以内）。\n' +
          '世界观背景：' + GS.worldSetting + (_wcJeInfo ? ' ' + _wcJeInfo : '') + '\n' +
          '双方关系：好感度' + aff + '（' + getAffectionDesc(aff) + '）\n' +
          (GS.oneHeartRival && GS.oneHeartRival.name ? '情敌：' + GS.oneHeartRival.name + '\n' : '') +
          '输出JSON：{"scenario":"场景描述","options":["靠近' + _checkMemName + '说话","保持沉默观察","转身离开现场"]}',
          '生成吃醋事件', 300, false, 0.8
        );
        var _jeaParsed;
        try { _jeaParsed = JSON.parse(_jeaRes); } catch (pe) {
          var _jm = _jeaRes.match(/\{[\s\S]*\}/);
          if (_jm) try { _jeaParsed = JSON.parse(_jm[0]); } catch (pe2) { _jeaParsed = null; }
        }
        if (_jeaParsed && _jeaParsed.scenario) {
          _jeaScenario = _jeaParsed.scenario;
          if (_jeaParsed.options && _jeaParsed.options.length >= 3) _jeaOpts = _jeaParsed.options;
          _jeaOpts = await retryGenericEventOptions(_jeaScenario, _jeaOpts, '吃醋');
          if (!GS.oneHeartJealousyPool) GS.oneHeartJealousyPool = [];
          if (GS.oneHeartJealousyPool.length < 50) {
            GS.oneHeartJealousyPool.push({ scenario: _jeaParsed.scenario, options: _jeaParsed.options.slice(0, 3) });
          }
          markEventUsed(_jeaScenario);
        }
      } catch (e) {}
    }
    // 如 AI 生成失败，硬编码兜底（去重）
    var _jeaAffDeltas = null;
    if (!_jeaScenario) {
      var _jeaFallback = JEALOUSY_EVENTS.filter(function(e) { return aff >= e.minAff && !isEventUsed(e.scenario); });
      if (_jeaFallback.length === 0) {
        GS._usedEventScenarios = [];
        _jeaFallback = JEALOUSY_EVENTS.filter(function(e) { return aff >= e.minAff; });
      }
      if (_jeaFallback.length > 0) {
        var _jeaFb = _jeaFallback[Math.floor(Math.random() * _jeaFallback.length)];
        _jeaScenario = _jeaFb.scenario;
        _jeaAffDeltas = _jeaFb.affDeltas || null;
        if (GS.oneHeartRival && GS.oneHeartRival.name) {
          _jeaScenario = _jeaScenario.replace(/同事|异性朋友|别人|另一个男生|另一个/g, GS.oneHeartRival.name);
        }
        _jeaOpts = _jeaFb.options;
        markEventUsed(_jeaScenario);
      }
    }
    if (_jeaScenario) {
      GS.oneHeartLastEventRound = GS.oneHeartGenCount || 0;
      if (!GS._pendingEvents) GS._pendingEvents = [];
      GS._pendingEvents.push({ type: 'jealousy', scenario: _jeaScenario, options: _jeaOpts, affDeltas: _jeaAffDeltas, targetId: GS.oneHeartMember, hasRival: hasRival });
    }
  }

  // 惊喜事件（70% AI 生成 + 30% 池子 + 硬编码兜底）
  if (aff >= 50 && Math.random() < 0.15 && GS._pendingEvents.length < 2) {
    var _surScenario = '';
    var _surOpts = ['跟着直觉走', '冷静观察', '大胆行动'];
    var _useSurPool = GS.oneHeartSurprisePool && GS.oneHeartSurprisePool.length > 0 && Math.random() < 0.3;
    if (_useSurPool) {
      var _spItem = GS.oneHeartSurprisePool[Math.floor(Math.random() * GS.oneHeartSurprisePool.length)];
      _surScenario = _spItem.scenario;
      if (_spItem.options && _spItem.options.length >= 3) _surOpts = _spItem.options;
    } else {
      try {
        var _wcSu = getWorldConfig(GS.worldSetting);
        var _wcSuInfo = _wcSu ? (_wcSu.coreTension || '') : '';
        _wcSuInfo += ' 他的角色：' + (_wcSu ? (_wcSu.memberRole || '') : '');
        var _surRes = await callDeepSeek(
          '生成一个甜蜜的恋爱惊喜场景（50字以内）+ 3个选项（每个20字以内）。\n' +
          '世界观背景：' + GS.worldSetting + (_wcSuInfo ? ' ' + _wcSuInfo : '') + '\n' +
          '双方关系：好感度' + aff + '（' + getAffectionDesc(aff) + '）\n' +
          '输出JSON：{"scenario":"场景描述","options":["靠近' + _checkMemName + '说话","保持沉默观察","转身离开现场"]}',
          '生成惊喜事件', 300, false, 0.8
        );
        var _surParsed;
        try { _surParsed = JSON.parse(_surRes); } catch (pe) {
          var _sm = _surRes.match(/\{[\s\S]*\}/);
          if (_sm) try { _surParsed = JSON.parse(_sm[0]); } catch (pe2) { _surParsed = null; }
        }
        if (_surParsed && _surParsed.scenario) {
          _surScenario = _surParsed.scenario;
          if (_surParsed.options && _surParsed.options.length >= 3) _surOpts = _surParsed.options;
          _surOpts = await retryGenericEventOptions(_surScenario, _surOpts, '惊喜');
          if (!GS.oneHeartSurprisePool) GS.oneHeartSurprisePool = [];
          if (GS.oneHeartSurprisePool.length < 50) {
            GS.oneHeartSurprisePool.push({ scenario: _surParsed.scenario, options: _surParsed.options.slice(0, 3) });
          }
        }
      } catch (e) {}
    }
    // 如 AI 生成失败，硬编码兜底
    var _surAffDeltas = null;
    if (!_surScenario) {
      var _surFallback = SURPRISE_EVENTS.filter(function(e) { return aff >= e.minAff; });
      if (_surFallback.length > 0) {
        var _surFb = _surFallback[Math.floor(Math.random() * _surFallback.length)];
        _surScenario = _surFb.scenario;
        _surAffDeltas = _surFb.affDeltas || null;
        _surOpts = _surFb.options;
      }
    }
    if (_surScenario) {
      GS.oneHeartLastEventRound = GS.oneHeartGenCount || 0;
      if (!GS._pendingEvents) GS._pendingEvents = [];
      GS._pendingEvents.push({ type: 'surprise', scenario: _surScenario, options: _surOpts, affDeltas: _surAffDeltas });
    }
  }

  // === 情敌专属事件（阶段变化触发，去重不重复）===
  if (hasRival && !GS._confessionAccepted && GS.oneHeartRivalStage && !GS.oneHeartRivalStage.eventTriggered && GS._pendingEvents.length < 2) {
    var _rs = GS.oneHeartRivalStage;
    // 阶段变化后立即触发1次情敌事件
    // IMP：门槛设为 stage >= 2（好感 >= 20），避免 Day1 好感为 0 时阶段 0→1 误判为「变化」而空降情敌事件（内容空洞）
    if (_rs.stage >= 2 && _rs.stage <= 5) {
      // 代码选定攻势类型（去重），AI 只写场景文案
      if (!Array.isArray(GS.oneHeartRivalTriggeredActions)) GS.oneHeartRivalTriggeredActions = [];
      var _action = pickRivalAction(_rs.stage, GS.oneHeartRivalTriggeredActions);
      GS.oneHeartRivalTriggeredActions.push(_action.id);
      _rs.eventTriggered = true;

      var _direction = _rs.lastDirection || 'up';
      var _dirDesc = _direction === 'up' ? '升级攻势' : '卷土重来（他觉得你们关系出了问题，机会来了）';
      var _rivalName = GS.oneHeartRival.name || '他';

      // 阶段4触发告白（男主好感 >= 60，与男主本人告白门控对齐；原 stage===3 对应好感>=40 过早）
      var _isConfession = _rs.stage === 4;

      var _rivScenario = '';
      var _rivOpts = [_rivalName !== '他' ? '靠近' + _rivalName : '靠近他', '保持距离', '装作没发现'];
      try {
        var _wcRi2 = getWorldConfig(GS.worldSetting);
        var _wcRi2Info = _wcRi2 ? (_wcRi2.coreTension || '') : '';
        var _rivPrompt = '生成一个情敌事件场景（100字以内）+ 3个选项（每个30字以内）。场景发生在女主和「' + _rivalName + '」之间。\n' +
          '攻势类型必须是：' + _action.desc + '（' + _action.detail + '）。\n' +
          '方向：' + _dirDesc + '。\n' +
          '世界观背景：' + GS.worldSetting + (_wcRi2Info ? ' ' + _wcRi2Info : '') + '\n' +
          '双方关系：好感度' + aff + '（' + getAffectionDesc(aff) + '）\n' +
          '输出JSON：{"scenario":"场景描述","options":["选项1","选项2","选项3"]}';
        if (_isConfession) {
          _rivPrompt = '生成情敌告白事件场景（100字以内）+ 3个选项（每个30字以内）。\n' +
            '情敌「' + _rivalName + '」决定向女主表白。\n' +
            '方向：' + _dirDesc + '。\n' +
            '世界观背景：' + GS.worldSetting + (_wcRi2Info ? ' ' + _wcRi2Info : '') + '\n' +
            '输出JSON：{"scenario":"场景描述","options":["接受心意","只把你当朋友","需要时间考虑"]}';
        }
        var _rivRes = await callDeepSeek(_rivPrompt, '生成情敌事件', 500, false, 0.8);
        var _rivParsed;
        try { _rivParsed = JSON.parse(_rivRes); } catch (pe) {
          var _rm = _rivRes.match(/\{[\s\S]*\}/);
          if (_rm) try { _rivParsed = JSON.parse(_rm[0]); } catch (pe2) { _rivParsed = null; }
        }
        if (_rivParsed && _rivParsed.scenario) {
          _rivScenario = _rivParsed.scenario;
          if (_rivParsed.options && _rivParsed.options.length >= 3) _rivOpts = _rivParsed.options;
          _rivOpts = await retryGenericEventOptions(_rivScenario, _rivOpts, '情敌');
        }
      } catch (e) {}

      if (!_rivScenario) {
        // 兜底：基于攻势类型生成场景
        _rivScenario = _action.detail + '。' + _rivalName + '出现了。';
      }

      GS.oneHeartLastEventRound = GS.oneHeartGenCount || 0;
      if (_isConfession) {
        GS._pendingEvents.push({ type: 'confession', scenario: _rivScenario, options: _rivOpts, rivalName: _rivalName });
      } else {
        GS._pendingEvents.push({ type: 'rival', scenario: _rivScenario, options: _rivOpts });
      }
    }
  }

  // === 路人围观事件 ===
  if (aff >= 15 && Math.random() < 0.08 && GS._pendingEvents.length < 2) {
    pickSmallEvent('celebrity', CELEBRITY_EVENTS);
  }

  // === 媒体风波事件 ===
  if (aff >= 50 && Math.random() < 0.08 && GS._pendingEvents.length < 2) {
    pickSmallEvent('scandal', SCANDAL_EVENTS);
  }

  // === 生病事件 ===
  if (aff >= 20 && Math.random() < 0.05 && GS._pendingEvents.length < 2) {
    pickSmallEvent('sick', SICK_EVENTS);
  }

  // === 吃前任醋事件 ===
  if (aff >= 40 && Math.random() < 0.08 && GS._pendingEvents.length < 2) {
    pickSmallEvent('exjealous', EX_JEALOUSY_EVENTS);
  }

  // === 深夜脆弱事件 ===
  if (aff >= 40 && Math.random() < 0.10 && GS._pendingEvents.length < 2) {
    pickSmallEvent('latenight', LATE_NIGHT_EVENTS);
  }

}

// 意外事件池：独立于冷却系统，每回合单独触发
async function tryPoolEvent() {
  if (GS._pendingEvents.length >= 2) return; // 队列已满
  var _affPool = GS.affection[GS.oneHeartMember] || 0;
  if (_affPool < 20) return; // 好感度 < 20 不触发
  if (Math.random() >= 0.25) return;
  var usePool = GS.oneHeartEventPool && GS.oneHeartEventPool.length > 0 && Math.random() < 0.3;
  var scenario = '';
  var opts = ['跟着直觉走', '冷静观察', '大胆行动'];
  if (usePool) {
    // [fix] 意外事件池去重：用「近期不重复」环形缓冲（按 scenario 文本去重），
    // 避免同一意外场景跨回合反复出现（此前为纯随机有放回，导致意外事件老重复）
    if (!Array.isArray(GS.oneHeartPoolUsed)) GS.oneHeartPoolUsed = [];
    var _availPool = GS.oneHeartEventPool.filter(function(it) {
      return GS.oneHeartPoolUsed.indexOf(it.scenario) < 0;
    });
    if (_availPool.length === 0) {
      GS.oneHeartPoolUsed = [];
      _availPool = GS.oneHeartEventPool.slice();
    }
    var poolItem = _availPool[Math.floor(Math.random() * _availPool.length)];
    scenario = poolItem.scenario;
    if (poolItem.options && poolItem.options.length >= 3) opts = poolItem.options;
    GS.oneHeartPoolUsed.push(poolItem.scenario);
    if (GS.oneHeartPoolUsed.length > 10) GS.oneHeartPoolUsed.shift();
  } else {
    try {
      var _wcPool = getWorldConfig(GS.worldSetting);
      var _wcPoolInfo = _wcPool ? (_wcPool.coreTension || '') : '';
      _wcPoolInfo += ' 他的角色：' + (_wcPool ? (_wcPool.memberRole || '') : '');
      var _poolAffDesc = _affPool >= 60 ? '暧昧恋爱中' : _affPool >= 40 ? '有好感但未确认' : '初识了解的阶段';
      var _poolMemName = (MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; }) || {}).name || '他';
      var poolRes = await callDeepSeek(
        '生成一个简短的情感剧情场景（50字以内）。\n' +
        '世界观背景：' + GS.worldSetting + (_wcPoolInfo ? ' ' + _wcPoolInfo : '') + '\n' +
        '双方关系：好感度' + _affPool + '（' + _poolAffDesc + '），关系处于' + _poolAffDesc + '，还没有确认恋爱关系\n' +
        '包含3个选项（每个20字以内）。\n输出JSON：{"scenario":"场景描述","options":["靠近' + _poolMemName + '说话","保持沉默观察","转身离开现场"]}',
        '生成意外事件', 300, false, 0.8
      );
      var poolParsed;
      try { poolParsed = JSON.parse(poolRes); } catch (pe) {
        var pm = poolRes.match(/\{[\s\S]*\}/);
        if (pm) try { poolParsed = JSON.parse(pm[0]); } catch (pe2) { poolParsed = null; }
      }
      if (poolParsed && poolParsed.scenario) {
        scenario = poolParsed.scenario;
        if (poolParsed.options && poolParsed.options.length >= 3) opts = poolParsed.options;
        opts = await retryGenericEventOptions(scenario, opts, '意外');
        if (!GS.oneHeartEventPool) GS.oneHeartEventPool = [];
        if (GS.oneHeartEventPool.length < 50) {
          GS.oneHeartEventPool.push({ scenario: poolParsed.scenario, options: poolParsed.options.slice(0, 3) });
        }
      }
    } catch (e) { scenario = '发生了一个小小的意外'; }
  }
  if (scenario) {
    if (!GS._pendingEvents) GS._pendingEvents = [];
    GS._pendingEvents.push({ type: 'pool', scenario: scenario, options: opts });
  }
}

// 1v1 约定检测（扫描文本提取新约定 + 自动判断已履行的约定）
async function detectOneHeartPromises(text) {
  if (!text || text.length < 50) return;
  var unfulfilledIds = [];
  var unfulfilledTexts = [];
  if (GS.oneHeartPromises) {
    for (var _pi = 0; _pi < GS.oneHeartPromises.length; _pi++) {
      if (!GS.oneHeartPromises[_pi].fulfilled) {
        unfulfilledIds.push(GS.oneHeartPromises[_pi].id);
        unfulfilledTexts.push(GS.oneHeartPromises[_pi].text);
      }
    }
  }
  try {
    var promptText = '从以下剧情中：\n';
    promptText += '1. 提取角色之间约定了什么未来要一起做的事情（新约定）。如果没有，返回空数组。\n';
    promptText += '提取时去掉时间标记（如"明天""后天""下周"），只记录约定本身。例："明天一起做早餐"→"一起做早餐"。\n';
    if (unfulfilledTexts.length > 0) {
      promptText += '2. 检查以下待履行约定哪些已经在剧情中被履行了（角色已经做了这件事）：\n';
      for (var _ui = 0; _ui < unfulfilledTexts.length; _ui++) {
        promptText += '   ' + (_ui + 1) + '. "' + unfulfilledTexts[_ui] + '"\n';
      }
      promptText += '如果某个约定已在剧情中被履行，将其序号（1/2/3）列入 fulfilledIndices。\n';
    }
    promptText += '输出JSON：{"promises":["新约定1","新约定2"],"fulfilledIndices":[1,2]}\n\n剧情：\n' + text;

    var res = await callDeepSeek(promptText, '检测约定', 500, false, 0.3);
    var parsed;
    try { parsed = JSON.parse(res); } catch (e) {
      var m = res.match(/\{[\s\S]*?\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch (e2) { parsed = null; } }
    }
    if (!parsed) return;

    var changed = false;

    // 自动标记已履行的约定（用序号索引）
    if (Array.isArray(parsed.fulfilledIndices)) {
      for (var _fi = 0; _fi < parsed.fulfilledIndices.length; _fi++) {
        var _idx = parsed.fulfilledIndices[_fi] - 1; // 1-based → 0-based
        var _found = false;
        var _fj = 0;
        for (var _pj = 0; _pj < GS.oneHeartPromises.length; _pj++) {
          if (GS.oneHeartPromises[_pj].fulfilled) continue;
          if (_fj === _idx) {
            GS.oneHeartPromises[_pj].fulfilled = true;
            _found = true;
            changed = true;
            break;
          }
          _fj++;
        }
      }
    }

    // 提取新约定
    if (Array.isArray(parsed.promises)) {
      for (var _pi2 = 0; _pi2 < parsed.promises.length; _pi2++) {
        var pt = parsed.promises[_pi2];
        if (!pt || pt.length < 3) continue;
        // 去掉时间标记（明天/后天/下周等）
        pt = pt.replace(/^(明天|后天|下周|下个月|今晚|今天晚上|明天早上|明天下午|明天晚上|周一|周二|周三|周四|周五|周六|周日|这个周末|下周末|这个星期|下个星期)\s*/g, '').trim();
        if (!pt || pt.length < 3) continue;
        var exists = GS.oneHeartPromises.some(function(p) { return p.text === pt; });
        if (!exists) {
          if (!GS.oneHeartPromises) GS.oneHeartPromises = [];
          GS.oneHeartPromises.push({
            id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            text: pt,
            fulfilled: false
          });
          // 记录约定创建回合，用于延迟兑现控制
          if (!GS.oneHeartPromiseLog) GS.oneHeartPromiseLog = [];
          GS.oneHeartPromiseLog.push({ text: pt, createdAtRound: GS.oneHeartGenCount || 0 });
          changed = true;
        }
      }
    }

    if (changed) saveGame();
  } catch (e) {
    console.warn('[1v1 promise detect] error:', e);
  }
}
window.detectOneHeartPromises = detectOneHeartPromises;

export async function sendChatMessage(userMessage) {
  if (!userMessage || !userMessage.trim()) return '';
  if (!GS.chatHistory) GS.chatHistory = [];

  GS.chatHistory.push({ role: 'user', content: userMessage.trim() });

  // 聊天好感度：每5条+1，每天最多3次
  var _today = GS.gameMode === 'oneHeart' ? (GS.oneHeartDateIdx || 0) : GS.day;
  if (GS._chatAffDay !== _today) { GS._chatAffCount = 0; GS._chatAffDay = _today; }
  GS._chatAffCount++;
  // 每天最多3次好感度加成（对应15条）
  if (GS._chatAffCount > 0 && GS._chatAffCount % 5 === 0) {
    var _affChatCount = Math.floor(GS._chatAffCount / 5);
    if (_affChatCount <= 3) {
      var _mid = GS.oneHeartMember;
      if (_mid) { if (!GS.affection[_mid]) GS.affection[_mid] = 0; GS.affection[_mid] += 1; }
    }
  }
  // 每天聊天次数限制：最多20条
  if (GS._chatAffCount > 20) {
    showToast('今日聊天次数已用完，明天再来吧 💬');
    return '';
  }

  GS._isGenerating = true;
  try {
    var sysMsg = buildOneHeartChatSystemPrompt();
    var userMsg = buildOneHeartUserMessage('chat', { userMessage: userMessage.trim() });

    var _gr = await generateWithRetry(sysMsg, userMsg, { maxTokens: ONE_HEART_TOKEN_CONFIG.chatReply, temperature: 0.75, skipValidate: true, plainText: true });
    var raw = (_gr && _gr.raw) ? _gr.raw : '';
    if (typeof raw !== 'string') raw = '';
    var clean = raw.replace(/^[\s"'```]+|[\s"'```]+$/g, '');
    // 意外返回 JSON 时稳健提取字符串字段（不崩溃、不残留 JSON 原文）
    if (clean.charAt(0) === '{' || clean.charAt(0) === '[') {
      try {
        var parsedJson = JSON.parse(clean);
        var _extracted = '';
        if (parsedJson && typeof parsedJson.content === 'string' && parsedJson.content.trim()) _extracted = parsedJson.content.trim();
        else if (parsedJson && typeof parsedJson.narrative === 'string' && parsedJson.narrative.trim()) _extracted = parsedJson.narrative.trim();
        else if (parsedJson && parsedJson.blocks && Array.isArray(parsedJson.blocks) && parsedJson.blocks.length > 0) {
          _extracted = parsedJson.blocks.map(function(b) { return b && typeof b.content === 'string' ? b.content.trim() : ''; }).filter(Boolean).join('\n');
        } else if (typeof parsedJson === 'string') _extracted = parsedJson;
        if (_extracted) clean = _extracted;
      } catch (e) { /* 非完整 JSON，保留原文本 */ }
    }
    // 按句边界在约 200 字内截断（删去旧 slice(-50) 半句截断）
    if (clean.length > 200) {
      var _trunc = clean.slice(0, 200);
      var _lastPunc = Math.max(_trunc.lastIndexOf('。'), _trunc.lastIndexOf('！'), _trunc.lastIndexOf('？'));
      clean = (_lastPunc > 0 ? _trunc.slice(0, _lastPunc + 1) : _trunc);
    }
    // 兜底：API 失败/空回复 → 友好文案保证「显示」，不返回空串
    if (!clean) {
      clean = '（网络开小差了，再发一次试试）';
    }
    GS.chatHistory.push({ role: 'ai', content: clean });
    if (GS.chatHistory.length > 50) {
      GS.chatHistory = GS.chatHistory.slice(-50);
    }
    saveGame();
    return clean;
  } catch (e) {
    console.error('[1v1] chat error:', e);
    var _fallback = '（网络开小差了，再发一次试试）';
    GS.chatHistory.push({ role: 'ai', content: _fallback });
    saveGame();
    return _fallback;
  } finally {
    GS._isGenerating = false;
  }
}

export async function generateDiary() {
  if (GS._isGenerating) return null;
  GS._isGenerating = true;
  try {
    var sysMsg = buildOneHeartSystemPrompt();
    var userMsg = buildOneHeartUserMessage('diary');

    var _gr = await generateWithRetry(sysMsg, userMsg, { maxTokens: ONE_HEART_TOKEN_CONFIG.diaryGen, temperature: 0.8, skipValidate: true });
    var raw = (_gr && _gr.raw) ? _gr.raw : '';
    if (typeof raw !== 'string') raw = '';
    if (!raw) return null;

    var json = safeParseJson(raw);
    if (!json) return null;

    var entry = {
      date: GS.currentDate ? GS.currentDate.month + '月' + GS.currentDate.day + '日' : 'Day ' + GS.day,
      day: GS.day,
      round: (GS.diaryEntries.length || 0) + 1,
      heroineEntry: json.heroineEntry || '',
      memberEntry: json.memberEntry || ''
    };

    if (!GS.diaryEntries) GS.diaryEntries = [];
    GS.diaryEntries.push(entry);
    GS._newDiary = true;
    saveGame();
    return entry;
  } catch (e) {
    console.error('[1v1] diary error:', e);
    return null;
  } finally {
    GS._isGenerating = false;
  }
}

// 清理事件故事文本：去除推理模型的 <think> 块、markdown 围栏、首尾引号
function cleanEventStoryText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  var t = raw;
  // 去除 <think>...</think> 块（含跨行，部分推理模型如 DeepSeek-R1 会输出）
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // 去除未闭合的 <think> 到结尾
  t = t.replace(/<think>[\s\S]*$/gi, '');
  t = t.trim();
  // 去除 markdown 代码块围栏（整段被包裹时）
  if (t.indexOf('```') === 0) {
    t = t.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
  }
  // 去除首尾引号
  t = t.replace(/^["']+|["']+$/g, '');
  return t.trim();
}

// [事件卡片系统] 事件选择后立即生成独立短故事（~150-200字）
export async function generateEventStory(ev) {
  if (!ev || !ev.scenario) return '';
  try {
    var sysMsg = buildOneHeartEventStorySystemPrompt();
    var userMsg = buildOneHeartEventStoryPrompt(ev);
    var _gr = await generateWithRetry(sysMsg, userMsg, { maxTokens: ONE_HEART_TOKEN_CONFIG.eventStoryGen, temperature: 0.85, skipValidate: true, plainText: true });
    var raw = (_gr && _gr.raw) ? _gr.raw : '';
    if (typeof raw !== 'string') raw = '';
    var story = cleanEventStoryText(raw);
    if (story.length < 50) story = ev.scenario + '\n' + ev.chosenOption;
    return story;
  } catch (e) {
    console.warn('[1v1] event story error:', e);
    return ev.scenario + '\n' + ev.chosenOption;
  }
}

export async function generateMoment() {
  if (GS._isGenerating) return null;
  GS._isGenerating = true;
  try {
    var sysMsg = buildOneHeartSystemPrompt();
    var userMsg = buildOneHeartUserMessage('moment');

    var _gr = await generateWithRetry(sysMsg, userMsg, { maxTokens: ONE_HEART_TOKEN_CONFIG.momentGen, temperature: 0.85, skipValidate: true });
    var raw = (_gr && _gr.raw) ? _gr.raw : '';
    if (typeof raw !== 'string') raw = '';
    if (!raw) return null;

    var json = safeParseJson(raw);
    if (!json) return null;

    if (!GS.moments) GS.moments = [];
    var ts = GS.currentDate ? GS.currentDate.month + '月' + GS.currentDate.day + '日' : 'Day ' + GS.day;
    var memberName = '';
    var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
    if (member) memberName = member.name;

    // 女主的动态
    if (json.mine && (json.mine.post || json.mine.reply)) {
      var minePost = json.mine.post || json.mine.reply || '';
      var mineReply = json.mine.post ? (json.mine.reply || '') : '';
      GS.moments.push({
        id: 'moment_' + Date.now() + '_mine',
        name: GS.heroineProfile.name || '',
        post: minePost,
        reply: mineReply,
        replyBack: json.mine.replyBack || '',
        photo: json.mine.photo || '',
        type: json.mine.type || '日常',
        timestamp: ts,
        liked: false
      });
    }
    // 他的动态
    if (json.his && (json.his.post || json.his.reply)) {
      var hisPost = json.his.post || json.his.reply || '';
      var hisReply = json.his.post ? (json.his.reply || '') : '';
      GS.moments.push({
        id: 'moment_' + Date.now() + '_his',
        name: memberName,
        post: hisPost,
        reply: hisReply,
        replyBack: json.his.replyBack || '',
        photo: json.his.photo || '',
        type: json.his.type || '日常',
        timestamp: ts,
        liked: false
      });
    }

    GS._newMoments = true;
    saveGame();
    return true;
  } catch (e) {
    console.error('[1v1] moment error:', e);
    return null;
  } finally {
    GS._isGenerating = false;
  }
}

export async function generateTheater(themePrompt) {
  GS._isGenerating = true;
  showLoading('正在生成番外剧情...');
  try {
    var sysMsg = buildOneHeartSystemPrompt();
    var userMsg = buildOneHeartUserMessage('theater', { themePrompt: themePrompt });

    var _gr = await generateWithRetry(sysMsg, userMsg, { maxTokens: ONE_HEART_TOKEN_CONFIG.theaterGen, temperature: 0.9, skipValidate: true });
    var raw = (_gr && _gr.raw) ? _gr.raw : '';
    if (typeof raw !== 'string') raw = '';
    if (!raw) {
      return null;
    }

    var json = safeParseJson(raw);
    if (!json) return null;

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
    return theater;
  } catch (e) {
    console.error('[1v1] theater error:', e);
    return null;
  } finally {
    hideLoading();
    GS._isGenerating = false;
  }
}

// 1v1 秘密信箱
async function generateLetter() {
  if (GS._isGenerating) return;
  GS._isGenerating = true;
  try {
    var sysMsg = buildOneHeartSystemPrompt();
    var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
    var userMsg = '请以' + (member ? member.name : '他') + '的第一人称视角写一封给女主的信（200-300字）。\n' +
      '这是他不会当面说出口的话——比日记更私密、更坦诚。\n' +
      '基于近期剧情和当前关系状态。\n' +
      '当前关系：' + getAffectionDesc(GS.affection[GS.oneHeartMember] || 0) + '\n' +
      '不需要日期，直接写正文。结尾署名他的名字。\n\n' +
      '近期剧情：\n' + (GS.todayFullText.slice(-1)[0] || '') + '\n\n' +
      '输出格式：{"content":"信的正文..."}';
    var _gr = await generateWithRetry(sysMsg, userMsg, { maxTokens: 800, temperature: 0.8, skipValidate: true });
    var raw = (_gr && _gr.raw) ? _gr.raw : '';
    if (typeof raw !== 'string') raw = '';
    if (!raw) return;
    var json = safeParseJson(raw);
    if (!json || !json.content) return;
    if (!GS.letters) GS.letters = [];
    GS.letters.push({
      round: GS.oneHeartGenCount || 0,
      content: json.content,
      timestamp: GS.currentDate ? GS.currentDate.month + '月' + GS.currentDate.day + '日' : ''
    });
    saveGame();
  } catch (e) {
    console.warn('[1v1 letter] error:', e);
  } finally {
    GS._isGenerating = false;
  }
}

// ==================== 新闻生成 ====================
export function generateDailyNews() {
  if (GS.gameMode !== 'oneHeart' || GS.worldSetting !== 'entertainment') return;
  if (GS.newsDay === GS.day) return;
  if (!GS.newsFeed) GS.newsFeed = [];
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) return;
  var vars = {
    memberName: member.name,
    memberStage: member.stageName || '',
    memberEmoji: member.emoji || '',
    rivalName: (GS.oneHeartRival && GS.oneHeartRival.name) || '某位',
    brotherName: (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name) || '家人',
    team: 'SEVENTEEN'
  };
  var pool = NEWS_TEMPLATES.filter(function(t) { return t; });
  if (!pool.length) return;
  var count = 3;
  if ((GS.exposureRisk || 0) >= 60) count = 4;
  var shuffled = pool.slice().sort(function() { return Math.random() - 0.5; });
  var picked = [];
  for (var pi = 0; pi < shuffled.length && picked.length < count; pi++) {
    var tpl = shuffled[pi];
    var title = fillVars(tpl.title, vars);
    var content = fillVars(tpl.content || '', vars);
    var isDup = false;
    for (var di = 0; di < GS.newsFeed.length; di++) {
      if (GS.newsFeed[di].title === title) { isDup = true; break; }
    }
    if (!isDup) picked.push({ id: tpl.id, type: tpl.type, emoji: tpl.emoji, sentiment: tpl.sentiment, title: title, content: content, source: tpl.source, related: [], timestamp: Date.now(), shared: false });
  }
  if ((GS.exposureRisk || 0) >= 60 && picked.length < count) {
    picked.push({
      id: 'news_ai_scandal', type: 'scandal', emoji: '💔', sentiment: 'negative',
      title: member.name + ' 与神秘女性深夜约会被拍，公司紧急公关',
      content: '据 D 社独家报道，' + member.name + ' 与一位神秘女性深夜同行，疑似恋情曝光。粉丝反应两极分化…',
      source: 'D社', related: ['heroine', 'main'], timestamp: Date.now(), shared: false
    });
  }
  Array.prototype.push.apply(GS.newsFeed, picked);
  if (GS.newsFeed.length > 30) GS.newsFeed = GS.newsFeed.slice(-30);
  GS.newsDay = GS.day;
  GS._newNews = true;
  saveGame();
}

function fillVars(text, vars) {
  if (!text) return '';
  var r = text;
  for (var k in vars) {
    if (vars.hasOwnProperty(k) && vars[k]) {
      r = r.split('{' + k + '}').join(vars[k]);
    }
  }
  return r;
}
