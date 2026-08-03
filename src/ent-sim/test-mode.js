// test-mode.js — 正式版 entSim 测试模式
// 与正式版共用同一套引擎，仅替换 AI 文本生成
// 控制台输入: __toggleTestMode() 开关
//
// 测试模式链路（全透明可追踪）：
//   日程抽取 → 事件触发 → 选项生成 → 换天
//   绿色边框 = 池子数据展示（来源池名 + 抽取规则 + 过滤条件 + 抽取结果）
//   金色边框 = AI 扩写位置标注（AI 会收到什么 prompt、遵守什么约束、生成什么、记忆什么）

import { GS } from '../state.js';
import { MEMBERS } from '../data.js';
import { randInt } from '../utils.js';
import { affectionStageLabel } from './romance.js';

// 固定测试角色：男主/哥哥/情敌
export var TEST_FIXED_ROLES = {
  maleLead: 'wonwoo',
  brother: 'dk',
  suitor: 'jeonghan'
};

// ── 链路追踪日志 ──
// 每次 generateEntSimRound 调用时清空，各步骤写入
var _traceLog = [];

function traceLog(category, text) {
  _traceLog.push({ cat: category, text: text });
}

function clearTrace() {
  _traceLog.length = 0;
}

// ── 成员查找 ──
function findMember(id) {
  for (var i = 0; i < MEMBERS.length; i++) {
    if (MEMBERS[i].id === id) return MEMBERS[i];
  }
  return null;
}

function buildMannerisms(member) {
  var pool = [];
  if (member.catchphrases && member.catchphrases.length) pool = pool.concat(member.catchphrases.slice(0, 2));
  if (member.comforts && member.comforts.length) pool = pool.concat(member.comforts.slice(0, 2));
  if (member.habits && member.habits.length) pool = pool.concat(member.habits.slice(0, 2));
  if (member.quirks && member.quirks.length) pool = pool.concat(member.quirks.slice(0, 2));
  if (pool.length === 0) return ['无意识地看向你', '听到你名字时停顿了一下'];
  var uniq = [];
  for (var i = 0; i < pool.length; i++) {
    if (uniq.indexOf(pool[i]) === -1) uniq.push(pool[i]);
  }
  var out = [];
  while (out.length < 2 && uniq.length) {
    var idx = randInt(0, uniq.length - 1);
    out.push(uniq.splice(idx, 1)[0]);
  }
  return out.length ? out : ['无意识地看向你'];
}

// 强制固定测试角色（init 或运行时切换调用）
export function applyTestFixedRoles() {
  var E = GS.entSim;
  if (!E) return;
  var ml = findMember(TEST_FIXED_ROLES.maleLead);
  var bro = findMember(TEST_FIXED_ROLES.brother);
  var suit = findMember(TEST_FIXED_ROLES.suitor);
  if (ml) {
    E.romance = E.romance || {};
    E.romance.maleLead = { id: ml.id, name: ml.name, memberId: ml.id };
    E.romance.mannerisms = buildMannerisms(ml);
  }
  if (bro) {
    GS.oneHeartRelationCharacter = { id: bro.id, name: bro.name, role: '哥哥', isBrother: true };
    E.brother = E.brother || {};
    E.brother.stance = '参谋';
    E.brother.support = E.brother.support || 0;
    E.brother.name = bro.name;
    E.brother.id = bro.id;
    E.brother.pool = E.brother.pool || [];
    E.brother.testNudged = E.brother.testNudged || { 1: false, 2: false, 3: false };
    E.brother.rivalAware = E.brother.rivalAware || false;
    E.brother.talkPending = E.brother.talkPending || false;
  }
  if (suit && E.npcNetwork && E.npcNetwork.nodes) {
    E.npcNetwork.nodes.npc_suitor = {
      id: 'npc_suitor', type: 'suitor', name: suit.name, memberId: suit.id,
      intimacy: E.npcNetwork.nodes.npc_suitor ? E.npcNetwork.nodes.npc_suitor.intimacy : 0,
      stance: '暗恋你'
    };
  }
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function fmtMemberShort(m) {
  if (!m) return '未指定';
  var s = m.name + '（' + m.stageName + '）';
  if (m.personality) s += ' · ' + (m.personality.length > 20 ? m.personality.substring(0, 20) + '…' : m.personality);
  return s;
}

// ── 边框包装函数 ──
function wrapPool(title, body) {
  return '【池子数据】\n' + (title ? '▸ ' + title + '\n' : '') + body + '\n【/池子数据】';
}

function wrapAI(body) {
  return '【AI扩写区】\n' + body + '\n【/AI扩写区】';
}

// ── 辅助：格式化日程来源信息 ──
function getAgendaSource(E, slot) {
  var src = E.agenda && E.agenda[slot + 'Source'] ? E.agenda[slot + 'Source'] : '';
  if (src) return src;
  var isDebut = E.career && E.career.debutDay > 0;
  if (!isDebut) return 'TRAINEE_' + ['EARLY','MID','LATE'][(E.career.traineePhase || 1) - 1] + '_POOL';
  return 'CHAPTER' + (E.chapter.index || 1) + '_POOL / COMMON_POOL';
}

// ── 步骤1：日程抽取（真正调用 rollDailyAgenda，记录完整过程）──
function buildAgendaTrace(E) {
  var a = E.agenda || {};
  var isDebut = E.career && E.career.debutDay > 0;
  var chapterIdx = E.chapter && E.chapter.index || 1;
  var tp = E.career.traineePhase || 1;

  var lines = [];
  lines.push('── 抽取规则 ──');

  if (!isDebut) {
    // 练习生阶段
    var phasePoolName = tp === 1 ? 'TRAINEE_EARLY_POOL' : tp === 2 ? 'TRAINEE_MID_POOL' : 'TRAINEE_LATE_POOL';
    lines.push('当前阶段：练习生 · 第' + tp + '阶段');
    lines.push('主日程池：' + phasePoolName + '（按 require: traineePhase=' + tp + ' 过滤）');
    lines.push('过滤方式：filterByRequire() — 检查每个条目的 require 字段，只保留满足 traineePhase=' + tp + ' 的条目');
    lines.push('去重规则：pickFromPoolNoRepeat(pool, usedArr, 6) — 近 6 次抽取不重复，超出后清空历史全池随机');
    lines.push('关联日程池：同主日程池（练习生阶段 related 从同池抽取）');
    lines.push('男主/哥哥/情敌池：练习生阶段不单独抽（尚未出道，只有队友关系）');
  } else {
    // 出道后
    lines.push('当前阶段：已出道 · 章节' + chapterIdx + '（' + (E.chapter && E.chapter.name || '') + '）');
    var chapterPool = 'CHAPTER' + chapterIdx + '_POOL';
    lines.push('主日程抽取策略：70% 从 ' + chapterPool + ' 抽取 / 30% 从 COMMON_POOL 抽取');
    lines.push('COMMON_POOL 过滤：filterByRequire(COMMON_POOL, E) — 排除不满足当前条件的条目（如未出道时排除出道专属条目）');
    lines.push('去重规则：章节池近 10 次不重复 / COMMON_POOL 近 10 次不重复');
    lines.push('关联日程池：RELATED_POOL（近 10 次不重复）');
    lines.push('男主档池：MALE_LEAD_POOL（= BOYGROUP_POOL 过滤掉「海外行程」「机场出发」，近 10 次不重复）');
    lines.push('哥哥档池：BROTHER_POOL（= BOYGROUP_POOL，近 10 次不重复）');
    lines.push('情敌档池：RIVAL_POOL（= BOYGROUP_POOL，近 10 次不重复）');
  }

  // 已用去重列表
  var up = E._usedPools || {};
  if (!isDebut) {
    if (up.traineeMain && up.traineeMain.length) lines.push('已用主日程（去重中）：' + up.traineeMain.join(' / '));
  } else {
    if (up.main && up.main.length) lines.push('已用主日程（去重中）：' + up.main.join(' / '));
    if (up.common && up.common.length) lines.push('已用通用日程（去重中）：' + up.common.join(' / '));
  }

  lines.push('');
  lines.push('── 本次抽取结果 ──');
  if (a.main) lines.push('主日程：' + a.main + (a.mainLoc ? ' · ' + a.mainLoc : '') + '  ← ' + getAgendaSource(E, 'main'));
  if (a.related) lines.push('关联日程：' + a.related + (a.relatedLoc ? ' · ' + a.relatedLoc : '') + '  ← ' + getAgendaSource(E, 'related'));
  if (a.maleLead) lines.push('男主档：' + a.maleLead + (a.maleLeadLoc ? ' · ' + a.maleLeadLoc : '') + '  ← ' + getAgendaSource(E, 'maleLead'));
  if (a.brother) lines.push('哥哥档：' + a.brother + (a.brotherLoc ? ' · ' + a.brotherLoc : '') + '  ← ' + getAgendaSource(E, 'brother'));
  if (a.rival) lines.push('情敌档：' + a.rival + (a.rivalLoc ? ' · ' + a.rivalLoc : '') + '  ← ' + getAgendaSource(E, 'rival'));
  if (!lines[lines.length - 1].match(/主日程/)) lines.push('（无日程 — 首次初始化）');

  return wrapPool('步骤1：日程抽取（rollDailyAgenda）', lines.join('\n'));
}

// ── 步骤2：事件触发（真正调用 checkOneHeartEvents，记录检测过程）──
function buildEventTrace(E) {
  var evText = GS._entSimPendingEvent || '';
  var lines = [];

  lines.push('── 事件检测规则 ──');
  lines.push('检测顺序（优先级从高到低，先命中即停止）：');
  lines.push('1. 男主小动作：每 10-15 回合自然出现一次（' + (E._lastMannerismRound || 0) + ' 回合前上次触发）');
  lines.push('2. 哥哥递进考验：按好感度阶段 + 递进次数（已触发 ' + (E.brother && E.brother.testNudged ? Object.values(E.brother.testNudged).filter(Boolean).length : 0) + ' 次）');
  lines.push('3. 情敌主动：按 rival intimacy 阈值（当前 ' + (E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes.npc_suitor ? E.npcNetwork.nodes.npc_suitor.intimacy || 0 : 0) + '）');
  lines.push('4. 女主秘密被撞破：15% 概率（含 SECRET_DISCOVERY_EVENTS 池）');
  lines.push('5. 狗仔偷拍：绯闻热度 ≥ 5 时 20% 概率');
  lines.push('6. 嫉妒事件：9% 概率（好感 ≥ 20 时过滤 JEALOUSY_EVENTS_POOL）');
  lines.push('7. 哥哥支线：12% 概率（BROTHER_SIDE_PLOTS 池）');
  lines.push('8. 女团/行业事件：15% 概率（出道后，含 GIRLGROUP_EVENTS + INDUSTRY_EVENTS）');

  lines.push('');
  if (evText) {
    lines.push('── 本轮触发 ──');
    lines.push(evText);
  } else {
    lines.push('── 本轮结果 ──');
    lines.push('（未触发任何事件 — 所有检测条件不满足或概率未命中）');
  }

  return wrapPool('步骤2：事件触发（checkOneHeartEvents）', lines.join('\n'));
}

// ── 步骤3：选项生成规则 ──
function buildOptionTrace(E) {
  var lines = [];
  var mlName = (E.romance && E.romance.maleLead && E.romance.maleLead.name) || '男主';
  var broName = (E.brother && E.brother.name) || '哥哥';
  var rivalName = (E.rival && E.rival.name) || '情敌';
  lines.push('── 选项生成逻辑（测试版固定三轴）──');
  lines.push('测试版每轮固定 3 个选项：');
  lines.push('· 选项A：+' + mlName + '好感度 +3（affection delta=3）');
  lines.push('· 选项B：+' + broName + '支持度 +2（brother.support delta=2）');
  lines.push('· 选项C：+' + rivalName + '倾向 +2（rivalDelta=2 → _jealousLevel）');
  lines.push('');
  lines.push('── 选项效果映射（选择后真正影响数值）──');
  lines.push('· 好感度（affection）：delta 直接加减，范围 [0, 100]');
  lines.push('· 人气（popularity）：隔天换天时基础+1（测试版保底）');
  lines.push('· 哥哥支持度（brother.support）：broDelta 直接加减，范围 [-100, 100]');
  lines.push('· 情敌倾向（_jealousLevel）：rivalDelta 直接加减，范围 [0, 10]');

  return wrapPool('步骤3：选项生成规则（测试版·三轴固定）', lines.join('\n'));
}

// ── 步骤4：AI 扩写区（说明 AI 会收到什么、遵守什么、生成什么）──
function buildAIExpandTrace(E, type, extra) {
  var lines = [];
  var isDebut = E.career && E.career.debutDay > 0;
  var ml = E.romance && E.romance.maleLead ? E.romance.maleLead.name : '全圆佑';
  var bro = E.brother && E.brother.name ? E.brother.name : '李硕珉';
  var suit = E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes.npc_suitor ? E.npcNetwork.nodes.npc_suitor.name : '尹净汉';
  var aff = E.affection || 0;

  lines.push('── AI 收到的 System Prompt（核心约束摘要）──');
  lines.push('1. 世界观：韩国女团爱豆/练习生 × SEVENTEEN 队友妹妹，地下恋背景');
  lines.push('2. 写作风格：现实向、第三人称女主视角、每段 500-700 字、禁止滥用脸红/心跳');
  lines.push('3. 场景锁定：必须在今日主日程场景（' + (E.agenda && E.agenda.mainLoc || '练习室') + '）内展开');
  lines.push('4. 群聊规则：女主在女团姐妹群、不在 SVT 内部群，只能通过哥哥转述获知 SVT 群消息');
  lines.push('5. SEVENTEEN 辈分：95line(最年长) → 96line → 97line → 98line → 99line(忙内)，称呼按辈分');
  lines.push('6. 食物禁忌：各成员食物禁忌表已注入，用餐/做饭场景必须遵守');
  lines.push('7. 恋爱阶段：好感度 0-100 映射 8 阶段（陌生人→灵魂伴侣），行为按阶段递进');
  lines.push('8. 告白门槛：好感≥60+哥哥非protective+未冷战 → 可触发告白');

  lines.push('');
  lines.push('── AI 收到的 User Message（每轮动态注入）──');
  lines.push('1. 叙事风格锚：第三人称、感官细节代替情绪词、对话少而精、分段');
  lines.push('2. 硬事实块（Hard Facts）：');
  lines.push('   · 日期：第 ' + (E.cycle._gameDayCount || 1) + ' 天 · ' + (GS.season || '春季') + ' · ' + (GS.weather || '晴'));
  lines.push('   · 人气：' + (E.career.popularity || 0) + ' · 好感度：' + aff + '（' + stageLabel(aff) + '）');
  lines.push('   · 曝光累积：' + (E.misc.exposureAccum || 0) + ' · 绯闻热度：' + (E.misc.scandalHeat || 0));
  lines.push('   · 男主：' + ml + ' · 哥哥：' + bro + ' · 情敌：' + suit);
  lines.push('   · 今日日程：' + (E.agenda && E.agenda.main || '未定'));
  lines.push('   · 已出道：' + (isDebut ? '是（章节' + (E.chapter.index || 1) + '）' : '否（练习生阶段' + (E.career.traineePhase || 1) + '）'));
  if (E.brother) lines.push('   · 哥哥支持度：' + (E.brother.support || 0) + ' · 立场：' + (E.brother.stance || '参谋'));
  if (E.romance && E.romance.mannerisms && E.romance.mannerisms.length) lines.push('   · 男主小动作：' + E.romance.mannerisms.join(' / '));
  if (GS.todayHoliday) lines.push('   · 今日节日：' + GS.todayHoliday);
  lines.push('3. 软氛围块（Soft Flavor）：每日随机 mood + 日历氛围 + 场景细节提示');
  lines.push('4. 动态状态块：心理状态、队友状态、回归周期、吃醋值、亲密阶梯');
  lines.push('5. 阶段行为禁制卡（Stage Ban Card）：按好感阶段列出禁止行为清单 + 允许行为范例');
  lines.push('6. 主线进度锚定：当前剧情节点 + 下一节点目标');
  lines.push('7. 同天上下文：最近 1200 字已发生剧情（防止重复/断裂）');
  if (GS._entSimPendingEvent) lines.push('8. 待触发事件：' + GS._entSimPendingEvent + '（AI 需将其自然织入场景）');
  if (!isDebut) lines.push('9. 练习生规则：3 个选项至少 1 个与男主相关，互动温和符合前后辈');

  lines.push('');
  lines.push('── AI 需要生成的内容 ──');
  lines.push('1. narrative：800-1800 字沉浸式剧情正文（场景+对话+心理+互动）');
  lines.push('2. options：3 个选项，每个含 text + 隐含的 affectionDelta/popularityDelta/exposureEvent');
  lines.push('3. extras（entSimExtras JSON）：affectionDelta、popularityDelta、exposureEvent、romanceBeat 等');
  lines.push('4. 输出格式：JSON { narrative, options, entSimExtras }');

  lines.push('');
  lines.push('── AI 需要记忆并遵守的规则 ──');
  lines.push('· 禁止跳阶段行为（好感<20 不能有暧昧肢体接触）');
  lines.push('· 禁止编造"你在 SVT 群看到"（你不在那个群）');
  lines.push('· 禁止连续多天用同一个场景描写模板（去重规则）');
  lines.push('· 禁止在男主未出场时返回 affectionDelta（必须为 0）');
  lines.push('· 必须遵守场景锁定（不能突然跳到无关地点）');
  lines.push('· 必须遵守成员食物禁忌（用餐场景）');
  lines.push('· 必须遵守 SEVENTEEN 辈分称呼（不能叫错哥/直呼名字）');
  lines.push('· 情敌不能比男主更主动（好感度系统驱动，非 prompt 驱动）');

  return wrapAI(lines.join('\n'));
}

// ── 阶段标签 ──
function stageLabel(aff) {
  return affectionStageLabel(aff);
}

// ── 状态快照 ──
function stateSnapshot(E) {
  var lines = [];
  lines.push('章节：' + (E.chapter && E.chapter.name || '-') + '（Ch' + (E.chapter && E.chapter.index || 0) + '）');
  lines.push('职业：' + (E.career.profession || E.career.careerKey || '-') + (E.career.debutDay > 0 ? ' · 已出道' : ' · 练习生阶段' + (E.career.traineePhase || 1)));
  lines.push('人气：' + (E.career.popularity || 0) + ' · 好感度：' + (E.affection || 0) + '（' + stageLabel(E.affection || 0) + '）');
  lines.push('曝光累积：' + (E.misc.exposureAccum || 0) + ' · 绯闻热度：' + (E.misc.scandalHeat || 0) + ' · 怀疑值：' + (E.misc.suspicion || 0));
  lines.push('合约剩余：' + (E.career.contractRemaining || 7) + ' 年 · 吃醋值：' + (E._jealousLevel || 0));
  if (E.brother) lines.push('哥哥支持度：' + (E.brother.support || 0) + ' · 立场：' + (E.brother.stance || '参谋'));
  return lines.join('\n');
}

// ── 固定角色 ──
function roleBlock(E) {
  var ml = E.romance && E.romance.maleLead ? findMember(E.romance.maleLead.memberId || E.romance.maleLead.id) : null;
  var bro = E.brother && E.brother.id ? findMember(E.brother.id) : null;
  var suit = E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes.npc_suitor ? findMember(E.npcNetwork.nodes.npc_suitor.memberId) : null;
  var lines = [];
  lines.push('男主：' + fmtMemberShort(ml));
  lines.push('哥哥：' + fmtMemberShort(bro));
  lines.push('情敌：' + fmtMemberShort(suit));
  if (ml && ml.catchphrases) lines.push('男主小动作（已选）：' + (E.romance.mannerisms || []).join(' / '));
  return wrapPool('固定角色（测试模式锁定）', lines.join('\n'));
}

// ═══════════════════════════════════════════════
// 主函数：构建测试模式叙事（完整链路透明展示）
// ═══════════════════════════════════════════════
export function buildTestNarrative(type, extra) {
  var E = GS.entSim;
  if (!E) return '（测试模式：entSim 未初始化）';
  extra = extra || {};
  var day = E.cycle._gameDayCount || E.cycle.dayCount || 1;
  var phase = E.cycle.timeOfDay || 0;
  var phaseLabels = ['上午', '下午', '夜晚'];
  var weather = GS.weather || '-';
  var season = GS.season || '-';

  var parts = [];

  // 换天链路追踪：如果 goEntSimNextDay 刚刚执行过，先展示换天步骤
  if (GS._entSimNextDayTrace) {
    var nt = GS._entSimNextDayTrace;
    parts.push('【测试模式】═══ 换天完成 ═══');
    parts.push(wrapPool('换天链路（goEntSimNextDay 已真正执行）',
      '── 昨日状态 ──\n' +
      '人气：' + (nt.lastPop || 0) + ' · 好感度：' + (nt.lastAff || 0) + ' · 绯闻热度：' + (nt.lastExp || 0) + '\n\n' +
      '── 换天执行步骤 ──\n' +
      '1. saveDailySnapshot：保存昨日快照到 careerHistory\n' +
      '2. advanceEntSimDay：dayCount+1 / roundTotal+1 / 更新 season+weather\n' +
      '3. 秘密信箱检测：每 7-10 天概率触发\n' +
      '4. 朋友圈检测：出道后每 3-6 天概率触发\n' +
      '5. advanceSvtComeback：SEVENTEEN 回归周期推进\n' +
      '6. tickRomanceTimers：恋爱计时器推进\n' +
      '7. applyDailyDecay：曝光热度每日衰减 / 人气自然波动\n' +
      '8. advanceTraineeStage：练习生阶段推进（出道判定在此）\n' +
      '9. rollDailyAgenda：抽取新一天日程（见下方步骤1）\n' +
      '10. generateDailyBuzz：生成今日圈内热点\n' +
      '11. triggerDailyEventPools：每日事件池（回归周期/热搜/粉丝来信/品牌代言）\n' +
      '12. applySubscriberDrop：泡泡订阅掉粉检测\n' +
      '13. checkChapterAdvance：章节跨越检测\n' +
      '14. tickJealousy(0)：吃醋值每日自然衰减\n' +
      (nt.chapterCrossed ? '15. ★ 章节跨越已触发！进入新章节\n' : '15. 未触发章节跨越\n') +
      '16. 颁奖典礼/狗仔跟拍/公司事件检测\n' +
      '17. compressEntSimMemory：压缩昨日记忆（AI 提取摘要）\n' +
      '18. finalizeDailyCycle：同步状态 + 保存'
    ));
    // 消费标记（只展示一次）
    GS._entSimNextDayTrace = null;
  }

  // 标题行
  parts.push('【测试模式】第 ' + day + ' 天 · ' + phaseLabels[phase] + ' · ' + weather + ' · ' + season);

  // 分支标签（选择/输入/事件）
  if (type === 'choice' && extra.choiceText) {
    parts.push('── 你的选择：' + extra.choiceText + ' ──');
  } else if (type === 'free' && extra.freeText) {
    parts.push('── 你输入：' + extra.freeText + ' ──');
  } else if (type === 'event' && extra.eventText) {
    parts.push('── 触发事件：' + extra.eventText + ' ──');
  }

  // 状态快照
  parts.push(wrapPool('当前状态快照', stateSnapshot(E)));
  parts.push(roleBlock(E));

  // 步骤1：日程抽取（真正调用了 rollDailyAgenda 的结果）
  parts.push(buildAgendaTrace(E));

  // 步骤2：事件触发（真正调用了 checkOneHeartEvents 的结果）
  parts.push(buildEventTrace(E));

  // 步骤3：选项生成规则
  parts.push(buildOptionTrace(E));

  // 步骤4：AI 扩写区
  parts.push(buildAIExpandTrace(E, type, extra));

  return parts.join('\n\n');
}

// ═══════════════════════════════════════════════
// 选项生成：基于真实状态 + 池子逻辑
// ═══════════════════════════════════════════════
export function buildTestOptions() {
  var E = GS.entSim;
  var aff = E.affection || 0;
  var agenda = E.agenda || {};
  var isDebut = E.career && E.career.debutDay > 0;
  var main = agenda.main || (isDebut ? '今日行程' : '练习');
  var mlName = (E.romance && E.romance.maleLead && E.romance.maleLead.name) || '男主';
  var broName = (E.brother && E.brother.name) || '哥哥';
  var rivalName = (E.rival && E.rival.name) || '情敌';
  // 测试版固定三轴选项：+男主好感 / +哥哥支持度 / +情敌倾向
  return [
    { text: '借着「' + main + '」的机会，和他多聊几句', type: 'good', delta: 3, popDelta: 0, label: '+' + mlName + '好感' },
    { text: '和' + broName + '聊两句，听听他的看法', type: 'brother', delta: 0, broDelta: 2, popDelta: 0, label: '+' + broName + '支持' },
    { text: '感觉到' + rivalName + '的视线——你迎了上去', type: 'rival', delta: 0, rivalDelta: 2, popDelta: 0, label: '+' + rivalName + '倾向' }
  ];
}

// 记录上次生成的选项，供 applyTestOptionEffect 查找
var _lastTestOptions = [];

export function getLastTestOptions() { return _lastTestOptions; }

export function setLastTestOptions(opts) { _lastTestOptions = opts || []; }

// 应用选项数值效果（真正修改 GS.entSim 字段）
export function applyTestOptionEffect(choiceText) {
  var E = GS.entSim;
  if (!E) return;
  for (var i = 0; i < _lastTestOptions.length; i++) {
    var o = _lastTestOptions[i];
    if (o.text === choiceText) {
      if (typeof o.delta === 'number' && o.delta !== 0) {
        E.affection = Math.max(0, Math.min(100, (E.affection || 0) + o.delta));
        traceLog('effect', '好感度 ' + (o.delta > 0 ? '+' : '') + o.delta + ' → ' + E.affection);
      }
      if (typeof o.popDelta === 'number' && o.popDelta !== 0) {
        E.career.popularity = Math.max(0, (E.career.popularity || 0) + o.popDelta);
        traceLog('effect', '人气 ' + (o.popDelta > 0 ? '+' : '') + o.popDelta + ' → ' + E.career.popularity);
      }
      if (typeof o.broDelta === 'number' && o.broDelta !== 0 && E.brother) {
        E.brother.support = Math.max(-100, Math.min(100, (E.brother.support || 0) + o.broDelta));
        traceLog('effect', '哥哥支持度 ' + (o.broDelta > 0 ? '+' : '') + o.broDelta + ' → ' + E.brother.support);
      }
      if (typeof o.rivalDelta === 'number' && o.rivalDelta !== 0) {
        E._jealousLevel = Math.max(0, Math.min(10, (E._jealousLevel || 0) + o.rivalDelta));
        traceLog('effect', '情敌嫉妒 ' + (o.rivalDelta > 0 ? '+' : '') + o.rivalDelta + ' → ' + E._jealousLevel);
      }
      if (typeof o.exposure === 'number' && o.exposure !== 0) {
        E.misc.exposureAccum = (E.misc.exposureAccum || 0) + o.exposure;
        E.misc.scandalHeat = (E.misc.scandalHeat || 0) + o.exposure;
        traceLog('effect', '曝光累积 +' + o.exposure + ' → 累积=' + E.misc.exposureAccum + ' 绯闻热度=' + E.misc.scandalHeat);
      }
      break;
    }
  }
}

// ═══════════════════════════════════════════════
// 聊天/朋友圈/剧场测试回复
// ═══════════════════════════════════════════════
function poolReply(type, msg, channel) {
  var E = GS.entSim;
  var aff = E.affection || 0;
  var ml = E.romance && E.romance.maleLead ? E.romance.maleLead.name : '全圆佑';
  var bro = E.brother ? E.brother.name : '哥哥';
  var suit = E.rival ? E.rival.name : '情敌';
  channel = channel || 'maleLead';

  var snippetsByChannel = {
    maleLead: {
      low: [ml + '：……嗯。', ml + '：注意身体。', ml + '：早点休息。'],
      mid: [ml + '：看到你今天的练习视频了，跳得不错。', ml + '：哥哥又唠叨你了吗？', ml + '：下次带你去那家店。'],
      high: [ml + '：想你了。', ml + '：今晚能出来吗？', ml + '：哥哥今天问了我好多问题。']
    },
    brother: {
      low: [bro + '：回家吃饭。', bro + '：别练太晚。', bro + '：钱够吗？'],
      mid: [bro + '：今天又在练习室看到他，你们没怎样吧？', bro + '：妈问你周末回不回来。', bro + '：我帮你挡了记者。'],
      high: [bro + '：你们俩的事我不管了，但别让他欺负你。', bro + '：要是他对你不好，告诉我。', bro + '：家庭聚会带他吗？']
    },
    broker: {
      low: ['经纪人：明天上午彩排别迟到。', '经纪人：公司通知下午开会。', '经纪人：最近少发朋友圈。'],
      mid: ['经纪人：那个综艺邀约我帮你推了，最近不适合。', '经纪人：狗仔拍到你们同车，我先压下来了。', '经纪人：下个月回归，注意身材管理。'],
      high: ['经纪人：恋情曝光的话，公关方案你选一个。', '经纪人：粉丝那边我安排人去引导了。', '经纪人：颁奖典礼的座位安排好了，别乱跑。']
    },
    rival: {
      low: [suit + '：练习室空调有点冷。', suit + '：你今天妆画得不错。', suit + '：哥又说起你。'],
      mid: [suit + '：他对你好吗？我怎么看不出。', suit + '：下一场打歌，我们要同台了。', suit + '：你看起来很累。'],
      high: [suit + '：如果先遇到你的是我，结局会不会不一样。', suit + '：你真的选择他？', suit + '：我不会放弃的。']
    }
  };

  var snippets = snippetsByChannel[channel] || snippetsByChannel.maleLead;
  var bucket = aff < 10 ? 'low' : aff < 40 ? 'mid' : 'high';
  var arr = snippets[bucket] || snippets.low;
  var roleName = channel === 'maleLead' ? ml : channel === 'brother' ? bro : channel === 'broker' ? '经纪人' : suit;

  var lines = [];
  lines.push('── AI 收到的聊天 Prompt ──');
  lines.push('· 聊天对象：' + roleName);
  lines.push('· 最近 15 条对话上下文已注入');
  lines.push('· 女主消息：' + (msg || '（无）'));
  lines.push('· 好感阶段：' + stageLabel(aff) + ' → 回复语气按阶段递进');
  lines.push('· 约束：保持人设连贯、语气自然、' + (aff < 20 ? '不可越界暧昧' : aff < 50 ? '可带含蓄好感' : '可主动表达'));
  lines.push('');
  lines.push('── AI 生成结果（示例）──');
  lines.push(arr[randInt(0, arr.length - 1)]);

  return wrapAI(lines.join('\n'));
}

export function buildTestChatReply(msg, channel) {
  return poolReply('chat', msg, channel);
}

export function buildTestMoment() {
  var E = GS.entSim;
  var ml = E.romance && E.romance.maleLead ? E.romance.maleLead.name : '全圆佑';
  var lines = [];
  lines.push('── AI 收到的朋友圈 Prompt ──');
  lines.push('· 类型：momentDual（女主 + 男主各发一条）');
  lines.push('· 格式要求：{ mine: {post, reply, replyBack}, his: {post, reply} }');
  lines.push('· 语气带 emoji，两条不重复');
  lines.push('· 好感阶段：' + stageLabel(E.affection || 0));
  if (E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes.npc_suitor) {
    lines.push('· 暗斗彩蛋：情敌在评论区留暗戳戳较劲发言（20字内）');
  }
  lines.push('');
  lines.push('── AI 生成结果（示例）──');
  lines.push('女主：练习结束🔚 今天的编舞比昨天顺了一点点✨');
  lines.push('' + ml + ' 回复：进步很快，明天继续加油');
  lines.push('情敌（尹净汉）回复：你也在练习室啊？我怎么没看到你😏');
  return wrapAI(lines.join('\n'));
}

export function buildTestTheater(theme) {
  var E = GS.entSim;
  var ml = E.romance && E.romance.maleLead ? E.romance.maleLead.name : '全圆佑';
  var lines = [];
  lines.push('── AI 收到的剧场 Prompt ──');
  lines.push('· 主题：' + (theme || '婚后IF / 校园IF / 男主视角 / 结局回忆录'));
  lines.push('· 主角：' + ml + ' 与 女主');
  lines.push('· 当前好感：' + (E.affection || 0) + '（' + stageLabel(E.affection || 0) + '）');
  lines.push('· 字数要求：约 800 字');
  lines.push('· 约束：按主题切换世界观（IF线不受主线状态约束）、保持人设核心不变');
  lines.push('');
  lines.push('── AI 生成结果（示例摘要）──');
  lines.push('（正式版会按当前好感度 + 主题生成完整 800 字番外，此处为占位）');
  return wrapAI(lines.join('\n'));
}

// ═══════════════════════════════════════════════
// 换天链路追踪（goEntSimNextDay 真正执行后展示）
// ═══════════════════════════════════════════════
// 注意：goEntSimNextDay 在正式版 engine.js 中无条件执行所有逻辑，
// 测试模式不需要额外拦截。此函数仅用于换天后展示发生了什么。
export function buildNextDayTrace() {
  var E = GS.entSim;
  if (!E) return '';

  var parts = [];
  parts.push('【测试模式】换天完成 · 进入第 ' + (E.cycle._gameDayCount || 1) + ' 天');

  // 换天执行的步骤
  var lines = [];
  lines.push('── 换天执行步骤（goEntSimNextDay 完整链路）──');
  lines.push('1. saveDailySnapshot：保存昨日人气/好感度快照到 careerHistory');
  lines.push('2. advanceEntSimDay：dayCount+1 / roundTotal+1 / 更新 season+weather');
  lines.push('3. 秘密信箱检测：每 7-10 天概率触发 generateEntSimLetter');
  lines.push('4. 朋友圈检测：出道后每 3-6 天概率触发 generateEntSimMoment');
  lines.push('5. advanceSvtComeback：SEVENTEEN 回归周期推进');
  lines.push('6. tickRomanceTimers：恋爱计时器（告白冷却/拖延倒计时）');
  lines.push('7. applyDailyDecay：曝光热度每日衰减 / 人气自然波动');
  lines.push('8. advanceTraineeStage：练习生阶段推进（出道判定在此）');
  lines.push('9. rollDailyAgenda：抽取新一天日程（见上方步骤1）');
  lines.push('10. generateDailyBuzz：生成今日圈内热点');
  lines.push('11. pushDailyChats：推送今日聊天消息');
  lines.push('12. applyDebutDailyChecks：出道后每日检测（合约/掉粉/品牌）');
  lines.push('13. applySubscriberDrop：泡泡订阅掉粉检测（累计>20%触发危机）');
  lines.push('14. checkChapterAdvance：章节跨越检测（人气达标→升级）');
  lines.push('15. tickJealousy(0)：吃醋值每日自然衰减');
  lines.push('16. triggerDailyEventPools：每日事件池（回归周期/热搜/粉丝来信/品牌代言）');
  lines.push('17. 颁奖典礼检测 / 狗仔跟拍风险 / 公司事件检测');
  lines.push('18. finalizeDailyCycle：同步状态 + 章节首次进入提示 + 保存');
  parts.push(wrapPool('换天链路（goEntSimNextDay 已真正执行）', lines.join('\n')));

  // 换天后状态
  parts.push(wrapPool('换天后状态', stateSnapshot(E)));

  return parts.join('\n\n');
}

// ═══════════════════════════════════════════════
// 控制台开关
// ═══════════════════════════════════════════════
window.__toggleTestMode = function(on) {
  if (on === undefined) on = !window.__ENT_SIM_TEST;
  window.__ENT_SIM_TEST = on;
  console.log('测试模式 ' + (on ? '🟢 ON' : '⚫ OFF'));
  if (on) {
    applyTestFixedRoles();
    console.log('  已固定角色：男主=全圆佑，哥哥=李硕珉，情敌=尹净汉');
    console.log('  绿色边框 = 池子数据展示（来源池名 + 抽取规则 + 过滤条件 + 抽取结果）');
    console.log('  金色边框 = AI 扩写位置标注（AI 会收到什么 prompt、遵守什么约束、生成什么、记忆什么）');
    console.log('  全链路透明可追踪：日程抽取 → 事件触发 → 选项 → 换天');
    console.log('  下次 generateEntSimRound / goEntSimNextDay 将跳过 AI，展示完整链路');
  }
  return on;
};

// 默认开启测试模式（无需 API Key，线上可直接玩）
// 控制台 __toggleTestMode(false) 可手动关闭
window.__ENT_SIM_TEST = true;
