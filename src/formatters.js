import {
  MEMBERS, PHASE_LABELS, BEHAVIOR_MAP, WEATHER_POOLS, DATING_LOCATIONS, GS, randInt
} from './core.js';

// [改造] getFormatReminder 已删除——JSON 输出无需再追加重复格式提醒。
// 格式约束已统一在 prompts.js buildSystemPrompt 中的 [SYSTEM] 输出结构 + [RULE] 全局写作规则说明。

// ==================== 女主性格行为映射 ====================
export function getHeroineBehaviorText() {
  var hp = GS.heroineProfile;
  var lines = [];
  lines.push('[SYSTEM] 女主性格行为映射（AI必须据此生成剧情）');
  lines.push('- 职业：' + hp.job + '——自然地穿插在剧情中，对话中可能被问起，场景中可能涉及相关工作。');
  lines.push('- MBTI：' + hp.mbti + '——' + (hp.mbti.charAt(0) === 'I' ? '内心活动丰富但表达含蓄' : '更主动表达但可能不够深入') + '；' + (hp.mbti.charAt(2) === 'F' ? '情感驱动决策' : '理性分析后再行动') + '。');
  if (hp.zodiac) lines.push('- 星座：' + hp.zodiac + '——偶尔作为轻松话题提及，不深度分析。');
  lines.push('- 外貌特征：' + hp.appearance.join('、') + '——在场景中自然地出现，不强制频率。');
  if (hp.privateTraits.length > 0) lines.push('- 私密体质：' + hp.privateTraits.join('、') + '——在相关场景中自然触发。⚠️ 私密体质是女主专属设定，绝对禁止映射到任何成员身上。');
  lines.push('');
  for (var i = 0; i < hp.personality.length; i++) {
    var trait = hp.personality[i];
    var mapping = BEHAVIOR_MAP[trait];
    if (mapping) lines.push('【' + trait + '】' + mapping);
  }
  return lines.join('\n');
}

// ==================== 约会骰子 ====================
export function rollDatingDice() {
  var members = GS.selectedMembers;
  var roll = randInt(1, 6);
  var partner;
  if (roll <= 2) partner = members[0];
  else if (roll <= 4) partner = members[1];
  else partner = members[2];
  return { roll: roll, partner: partner };
}

// ==================== 观察员特邀嘉宾选取 ====================
export function pickObserverGuest() {
  var participating = GS.selectedMembers;
  var allIds = MEMBERS.map(function(m) { return m.id; });
  var available = allIds.filter(function(id) {
    return participating.indexOf(id) < 0 && id !== GS.observerGuestPrevious;
  });
  if (available.length === 0) {
    available = allIds.filter(function(id) {
      return participating.indexOf(id) < 0;
    });
  }
  if (available.length === 0) return null;
  var pick = available[Math.floor(Math.random() * available.length)];
  return MEMBERS.find(function(m) { return m.id === pick; });
}

// ==================== 称呼规则 ====================
export function getAddressRules() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var lines = [];
  lines.push('[RULE] 称呼规则（全局适用·正文/采访间/观察员OS均须遵守·违规视为严重错误）');
  lines.push('- 所有角色之间一律直呼名字（如"圆佑""珉奎""胜澈""沈也"）');
  lines.push('- 绝对禁止："胜澈哥""净汉哥""珉奎哥""圆佑哥"等任何"xx哥"称呼');
  lines.push('- 绝对禁止："欧巴""前辈""哥"等任何辈分称谓');
  lines.push('- 禁止使用韩式敬语后缀"-xi"（如"全圆佑xi""沈也xi"）');
  lines.push('- 成员之间只用名字互相称呼，体现多年队友的随意感');
  lines.push('- ⚠️ 观察室特约嘉宾（同为SEVENTEEN成员）在 observers 数组中提及其他成员时，必须用英文名，不加姓，绝对不能用中文名。英文名严格对应：' + MEMBERS.map(function(m){return m.name+'='+m.stageName}).join('、') + '。');
  return lines.join('\n');
}

// ==================== 强制任务 ====================
export function getMandatoryTask(day, phase) {
  var tasks = {
    1: {
      morning: '入住心动小屋。成员们第一次见面——但对成员来说彼此是多年队友，只有女主是新人。一起收拾行李、熟悉环境。注意：读信环节在傍晚，现在不要写。',
      afternoon: '继续互相熟悉。一起逛逛小屋、准备晚餐食材，自由互动，自然地了解彼此。成员之间互动体现多年队友的默契。',
      evening: '⚠️【强制环节·不可跳过】晚餐后，制作组通过扩音器宣布——每人朗读各自前任X写给自己的介绍信。全员参与：每人拿到信封→轮流朗读→其他人倾听并猜测。详细描写每个人的表情、语气、停顿、读完后的沉默。信的内容约200字。',
      night: '深夜睡前。今天不能发短信给X。'
    },
    2: { morning: '互相熟悉、一起做饭、自由互动。' },
    3: {
      morning: '⚠️ 每人说一个关于自己的故事或秘密（制作组安排）。故事必须由人物性格驱动：X的故事可能隐约涉及过去但不暴露身份；攻略对象的故事反映他们的第二职业或性格特质。',
      afternoon: '故事环节结束后，自由互动。成员之间可能继续讨论上午的故事，或开始日常活动。',
      evening: '准备晚餐，自由互动。故事环节的余波仍在，某些成员可能表现出微妙的情绪变化。',
      night: '深夜睡前。今天不能发短信给X。'
    },
    4: { morning: '⚠️ 第一次约会配对（骰子）。制作组公开第一批X记忆（4人各自的物品分批公开）。下午：约会。' },
    5: { morning: '制作组公开第二批X记忆（更明显），有人开始确认猜测。' },
    6: { morning: '第二次约会配对。下午：约会。' },
    7: { morning: '集体外出活动（制作组安排），全员参与。' },
    8: { morning: '第三次约会配对。今晚起短信可以发给X。' },
    9: { morning: 'X约会日！强制与X约会。X当面读分手后写的信。这是情感高潮。' },
    10: { morning: '自由约会——由你指定跟谁约会。' },
    11: { 
      morning: '最终约会。', 
      evening: '⚠️【强制环节·不可跳过】真心话环节！18张问题卡（轻度6/中度6/深度6），4人轮流抽卡回答，3轮=共12人次。每轮选项仅2个：①如实回答（自由输入框）②拒绝回答并喝酒（+1杯）。AI嘉宾60%概率拒绝。⚠️核心规则：谁最先喝到≥2杯即触发醉酒剧情——仅触发1位！后续任何人再喝到2杯也不再判定。12轮全部完成后进入深夜。' 
    },
    12: { morning: '最终选择日。决定复合还是换乘。' }
  };
  var dayTasks = tasks[day] || {};
  return dayTasks[phase] || dayTasks['morning'] || '继续节目录制。';
}

// ==================== 生日与星座 ====================
export function getZodiacFromBirthday(month, day) {
  var dates = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
  var signs = ['水瓶座♒','双鱼座♓','白羊座♈','金牛座♉','双子座♊','巨蟹座♋','狮子座♌','处女座♍','天秤座♎','天蝎座♏','射手座♐','摩羯座♑'];
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  var idx = month - 1;
  if (day < dates[idx]) idx = (idx + 11) % 12;
  return signs[idx];
}

// ==================== 季节与日期系统 ====================
export function generateSeasonAndDates() {
  var seasons = ['spring', 'summer', 'autumn', 'winter'];
  var seasonMonthRanges = {
    spring: [3, 5],
    summer: [6, 8],
    autumn: [9, 11],
    winter: [12, 2]
  };
  var seasonLabels = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };
  var season = seasons[Math.floor(Math.random() * seasons.length)];
  var range = seasonMonthRanges[season];
  var month;
  if (range[0] <= range[1]) {
    month = randInt(range[0], range[1]);
  } else {
    // winter跨12-2月
    var pick = Math.random();
    month = pick < 0.5 ? 12 : randInt(1, 2);
  }
  var maxDay = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  var startDay = randInt(1, maxDay - 11);
  var dates = [];
  var d = startDay;
  var m = month;
  for (var i = 0; i < 12; i++) {
    dates.push({ month: m, day: d });
    d++;
    var md = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
    if (d > md) { d = 1; m++; if (m > 12) m = 1; }
  }
  return { season: season, seasonLabel: seasonLabels[season], month: month, dates: dates };
}

// ==================== 天气系统 ====================
export function generateDailyWeather(prevWeather, season) {
  var pool = WEATHER_POOLS[season] || WEATHER_POOLS.spring;
  if (!prevWeather || Math.random() < 0.2) {
    // 20%概率突变
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // 80%概率关联前一天：优先选择与前一天相同或相邻的
  var sameIdx = pool.indexOf(prevWeather);
  if (sameIdx >= 0) {
    var nearby = [];
    for (var i = 0; i < pool.length; i++) {
      if (Math.abs(i - sameIdx) <= 1) nearby.push(pool[i]);
    }
    if (nearby.length > 0) return nearby[Math.floor(Math.random() * nearby.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ==================== 约会地点抽取 ====================
export function pickDatingLocation(season, weather) {
  var allLocs = [];
  for (var cat in DATING_LOCATIONS) {
    allLocs = allLocs.concat(DATING_LOCATIONS[cat]);
  }
  // 雨天偏向室内
  var isRainy = (weather || '').indexOf('雨') >= 0;
  var candidates = allLocs.filter(function(loc) {
    if (isRainy) return loc.season === 'any' || loc.season === 'winter';
    return loc.season === season || loc.season === 'any';
  });
  if (candidates.length === 0) candidates = allLocs;
  return candidates[Math.floor(Math.random() * candidates.length)];
}



