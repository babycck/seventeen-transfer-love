// ==================== AI 输出结构化 Schema ====================
// 本文件定义 AI 必须返回的 JSON 结构。本地用此 schema 做字段约束和兜底校验，
// 让 AI 把全部注意力放到剧情质量上，不再为标记/穿插节奏分心。

// ---- 块类型枚举 ----
// narrative      正文段（第二人称「你」视角）
// interview      🎙 女主采访间
// xInterview     🎙️💔 X 采访间
// memberInterview 🎤 成员采访间（必须带 member 字段）
// directorOS     🎬 导演 OS
// observerOS     💭 观察员 OS（保留兼容，推荐改用 observers 数组）

export var BLOCK_TYPES = [
  'narrative',
  'interview',
  'xInterview',
  'memberInterview',
  'directorOS',
  'observerOS'
];

// ---- 主 Schema（描述给 AI 看，亦做兜底校验） ----
export var SCENE_SCHEMA = {
  type: 'object',
  required: ['blocks'],
  properties: {
    // 段落数组，按输出顺序保留穿插节奏
    blocks: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['type', 'content'],
        properties: {
          type: { enum: BLOCK_TYPES },
          member: { type: 'string', description: '仅 memberInterview / xInterview 必填：成员中文名（如「尹净汉」）' },
          content: { type: 'string', description: '段落正文。narrative 用第二人称「你」；采访间为该角色的内心独白' }
        }
      }
    },
    // 观察员多人对话——结构化，每位一行
    observers: {
      type: 'array',
      description: '观察员 OS，每一位观察员说一段话，不超过 50 字，严格每人一段',
      items: {
        type: 'object',
        required: ['name', 'line'],
        properties: {
          name: { type: 'string', description: '观察员中文名：李龙真 / 金叡园 / 郑基锡 / 特约嘉宾（如 夫胜宽）' },
          line: { type: 'string', description: '该观察员的发言，≤50字，不重复' }
        }
      }
    },
    // 选项数组（深夜短信剧情 / 最终结局可省略）
    options: {
      type: 'array',
      description: '玩家可选行动。约会日只给 1 个：「▶ 进入约会场景」；通常 3 个',
      items: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', description: '选项行动描述，禁止括号备注（除非明确扣好感度）' },
          affName: { type: 'string', description: '本选项选了之后主要加好感的成员中文名' },
          affDelta: { type: 'integer', description: '好感度变化数值，正数加分' },
          affReason: { type: 'string', description: '加好感度的简短原因，10-20字' },
          riskMember: { type: 'string', description: '明确扣好感度的成员中文名（仅明确扣分选项必填）' },
          riskDelta: { type: 'integer', description: '明确扣分值（负数），UI 会以风险标签展示' }
        }
      }
    },
    // 深夜短信草稿（仅深夜 phaseIndex===3 且 type=phase/stay 时输出）
    smsDrafts: {
      type: 'array',
      description: '3 条深夜心动短信草稿，每条≤25字，不直白表白，与当天剧情强关联',
      items: { type: 'string' }
    },
    // 喝酒记录（真心话/提问箱由 AI 把每轮喝酒累加后报告）
    drinks: {
      type: 'array',
      description: '仅真心话/提问箱环节：本轮新喝了一杯的成员名单',
      items: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', description: '喝了一杯的人的中文名（女主用「女主」）' },
          count: { type: 'integer', description: '本次喝了多少杯（一般为 1，提问箱女主拒绝 = 2）' }
        }
      }
    },
    // 秘密任务完成标记
    secretMissionDone: { type: 'boolean', description: '若本段剧情中女主完成了秘密任务目标，置 true' }
  }
};

// ---- 各场景的额外规则（按 type 注入到 user message） ----
export var TYPE_RULES = {
  // 普通时段剧情
  phase: {
    requiredBlocks: ['narrative', 'interview', 'memberInterview'],
    requireOptions: true,
    requireObservers: true,
    smsDrafts: 'onlyNight'   // 仅 phaseIndex===3 输出 smsDrafts
  },
  // 选项后续剧情
  consequence: {
    requiredBlocks: ['narrative', 'interview', 'memberInterview'],
    requireOptions: true,
    requireObservers: true
  },
  // 自由行动后续剧情
  freeAction: {
    requiredBlocks: ['narrative', 'interview', 'memberInterview'],
    requireOptions: true,
    requireObservers: true
  },
  // 继续今天
  stay: {
    requiredBlocks: ['narrative', 'interview', 'memberInterview'],
    requireOptions: true,
    requireObservers: true
  },
  // 短信发送后剧情
  sms: {
    requiredBlocks: ['narrative', 'interview', 'memberInterview'],
    requireOptions: false,   // 短信剧情不加选项
    requireObservers: true
  },
  // 真心话单轮
  truth: {
    requiredBlocks: ['narrative', 'interview'],
    requireOptions: false,   // AI 嘉宾回合不需要选项；女主回合选项是本地硬编码
    requireObservers: true,
    drinks: 'whenDrink'
  },
  // 提问箱后续
  questionBox: {
    requiredBlocks: ['narrative', 'interview'],
    requireOptions: false,
    requireObservers: true,
    drinks: 'whenDrink'
  },
  // Day 12 最终结局
  finalResult: {
    requiredBlocks: ['narrative', 'directorOS'],
    requireOptions: false,
    requireObservers: true
  }
};

// ---- 校验函数（供 parser / validator 调用） ----
// 仅做最小校验：保证渲染必需字段存在。深度内容校验仍在 validator.js 完成。
export function sanitizeScene(obj, type) {
  if (!obj || typeof obj !== 'object') {
    return { blocks: [], observers: [], options: [], smsDrafts: [], drinks: [], secretMissionDone: false };
  }
  var out = {
    blocks: Array.isArray(obj.blocks) ? obj.blocks.filter(function(b) {
      return b && typeof b === 'object' && typeof b.type === 'string' && typeof b.content === 'string' && b.content.trim();
    }).map(function(b) {
      // 兜底：禁止携带 emoji 标记进 content（防止 AI 误加）
      var c = (b.content || '').replace(/^[🎬💭🎙🎤🎙️💔\s【】]+/, '').trim();
      return {
        type: BLOCK_TYPES.indexOf(b.type) >= 0 ? b.type : 'narrative',
        member: typeof b.member === 'string' ? b.member : '',
        content: c
      };
    }) : [],
    observers: Array.isArray(obj.observers) ? obj.observers.filter(function(o) {
      return o && typeof o === 'object' && typeof o.name === 'string' && typeof o.line === 'string';
    }).map(function(o) {
      return { name: o.name.trim(), line: o.line.trim() };
    }) : [],
    options: Array.isArray(obj.options) ? obj.options.filter(function(o) {
      return o && typeof o === 'object' && typeof o.text === 'string' && o.text.trim();
    }).map(function(o) {
      return {
        text: o.text.trim(),
        affName: typeof o.affName === 'string' ? o.affName.trim() : '',
        affDelta: typeof o.affDelta === 'number' ? o.affDelta : 0,
        affReason: typeof o.affReason === 'string' ? o.affReason.trim() : '',
        riskMember: typeof o.riskMember === 'string' ? o.riskMember.trim() : '',
        riskDelta: typeof o.riskDelta === 'number' ? o.riskDelta : 0
      };
    }) : [],
    smsDrafts: Array.isArray(obj.smsDrafts) ? obj.smsDrafts.filter(function(s) {
      return typeof s === 'string' && s.trim();
    }).map(function(s) { return s.trim(); }) : [],
    drinks: Array.isArray(obj.drinks) ? obj.drinks.filter(function(d) {
      return d && typeof d === 'object' && typeof d.name === 'string';
    }).map(function(d) {
      return { name: d.name.trim(), count: typeof d.count === 'number' ? d.count : 1 };
    }) : [],
    secretMissionDone: !!obj.secretMissionDone
  };
  return out;
}

// ---- V2 Schema（Phase 4 骨架完全接管后用） ----
// AI 只输出 blocks + observers + smsDrafts，不再输出 options/drinks/affChanges
export var SCENE_SCHEMA_V2 = {
  type: 'object',
  required: ['blocks'],
  properties: {
    blocks: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['type', 'content'],
        properties: {
          type: { enum: BLOCK_TYPES },
          member: { type: 'string' },
          content: { type: 'string', minLength: 1 }
        }
      }
    },
    observers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'line'],
        properties: {
          name: { type: 'string' },
          line: { type: 'string', maxLength: 50 }
        }
      }
    },
    smsDrafts: {
      type: 'array',
      items: { type: 'string', maxLength: 25 }
    }
  }
};

// V2 严格校验：只保留 blocks + observers + smsDrafts，其他字段一律丢弃
export function sanitizeSceneV2(obj) {
  if (!obj || typeof obj !== 'object') {
    return { blocks: [], observers: [], smsDrafts: [] };
  }
  return {
    blocks: Array.isArray(obj.blocks) ? obj.blocks.filter(function(b) {
      return b && typeof b === 'object'
        && typeof b.type === 'string' && BLOCK_TYPES.indexOf(b.type) >= 0
        && typeof b.content === 'string' && b.content.trim().length > 0;
    }).map(function(b) {
      var c = (b.content || '').replace(/^[🎬💭🎙🎤🎙️💔\s【】]+/, '').trim();
      return {
        type: b.type,
        member: typeof b.member === 'string' ? b.member.trim() : '',
        content: c
      };
    }) : [],
    observers: Array.isArray(obj.observers) ? obj.observers.filter(function(o) {
      return o && typeof o.name === 'string' && typeof o.line === 'string'
        && o.line.trim().length > 0 && o.line.trim().length <= 80;
    }).map(function(o) {
      return { name: o.name.trim(), line: o.line.trim() };
    }) : [],
    smsDrafts: Array.isArray(obj.smsDrafts) ? obj.smsDrafts.filter(function(s) {
      return typeof s === 'string' && s.trim().length > 0 && s.trim().length <= 30;
    }).map(function(s) { return s.trim(); }) : []
  };
}