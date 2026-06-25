import { MEMBERS, GS, PHASES, PHASE_LABELS, PHASE_ACTION_LIMIT, MAX_STAY_COUNT, escHtml } from '../core.js';
import { createModal } from './modal-factory.js';

export function showHelpMergedModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '200';

  var inner = '<div class="modal-content" style="width:520px;max-width:98vw;display:flex;flex-direction:column;max-height:90vh">' +
    '<div style="display:flex;gap:4px;margin-bottom:10px;flex-shrink:0">' +
    '<button class="tab-btn active" id="helpTabRules">❓ 规则速览</button>' +
    '<button class="tab-btn" id="helpTabManual">📖 使用说明</button>' +
    '</div>' +

    // Tab 1：规则速览
    '<div id="helpRulesContent">' +
    buildRulesContent() +
    '</div>' +

    // Tab 2：使用说明
    '<div id="helpManualContent" style="display:none;flex:1;overflow-y:auto;padding-right:4px">' +
    buildManualContent() +
    '</div>' +

    '<button class="modal-close-x" id="helpMergedClose">✕</button></div>';

  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.querySelector('#helpTabRules').addEventListener('click', function() {
    this.classList.add('active');
    overlay.querySelector('#helpTabManual').classList.remove('active');
    document.getElementById('helpRulesContent').style.display = '';
    document.getElementById('helpManualContent').style.display = 'none';
  });
  overlay.querySelector('#helpTabManual').addEventListener('click', function() {
    this.classList.add('active');
    overlay.querySelector('#helpTabRules').classList.remove('active');
    document.getElementById('helpRulesContent').style.display = 'none';
    document.getElementById('helpManualContent').style.display = '';
  });
  overlay.querySelector('#helpMergedClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
}

function buildRulesContent() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var xMember = members.find(function(m) { return m.id === GS.secretX; });

  return '<div style="font-size:12px;line-height:1.8;color:var(--text-secondary)">' +
    '<p><strong>📅 当前：Day ' + GS.day + ' · ' + PHASE_LABELS[PHASES[GS.phaseIndex]] + '</strong></p>' +
    '<p><strong>💔 你的X：</strong>' + (xMember ? xMember.emoji + ' ' + escHtml(xMember.name) + '（秘密恋爱2年，分手1年，团内无人知晓）' : '未设定') + '</p>' +
    '<p><strong>📨 短信规则：</strong>' + (GS.day <= 7 ? 'Day 1-7 不能发给X，可选另外2位成员' : 'Day 8-11 可以发给X，可选全部3位成员') + '</p>' +
    '<p><strong>🎲 约会配对：</strong>Day 4/5/8 由你投骰子决定约会对象；Day 9 强制X约会；Day 10 由你指定</p>' +
    '<p><strong>📋 关键日程：</strong></p>' +
    '<p style="margin-left:12px">Day 1：入住 + 傍晚读X介绍信</p>' +
    '<p style="margin-left:12px">Day 3：每人说一个故事</p>' +
    '<p style="margin-left:12px">Day 4：第一次约会配对 + 第一批X记忆公开</p>' +
    '<p style="margin-left:12px">Day 6：第二批X记忆公开</p>' +
    '<p style="margin-left:12px">Day 9：X约会日（情感高潮）</p>' +
    '<p style="margin-left:12px">Day 11：真心话环节</p>' +
    '<p style="margin-left:12px">Day 12：最终选择（复合 or 换乘）</p>' +
    '<p><strong>✍️ 行动规则：</strong>每时段共有' + PHASE_ACTION_LIMIT + '次行动机会（选选项或自由输入均可），行动次数用完后自动进入下一时段。Day 11 不限制。</p>' +
    '<p><strong>🌙 继续今天：</strong>深夜短信后可继续' + MAX_STAY_COUNT + '次（含自由输入）</p>' +
    (GS.heroineProfile && GS.heroineProfile.privateTraits && GS.heroineProfile.privateTraits.length > 0 ? '<p><strong>⚠️ 私密体质：</strong>' + GS.heroineProfile.privateTraits.join('、') + '</p>' : '') +
    '</div>';
}

function buildManualContent() {
  return manualHTML();
}

function manualHTML() {
  return '' +
    section('一、快速开始',
      '<ol style="margin:4px 0;padding-left:20px">' +
      '<li>打开游戏：浏览器访问游戏地址</li>' +
      '<li>输入 API Key：点击 ⚙️ 按钮填写 DeepSeek API Key（sk-...）</li>' +
      '<li>设定女主：输入名字、年龄、职业，选择外貌和性格</li>' +
      '<li>选择成员：从 13 人中选 3 位参加节目</li>' +
      '<li>标记前任 X：3 人中选 1 位作为你的秘密前任（恋爱 2 年，分手 1 年）</li>' +
      '<li>开始游戏：点击「开始游戏！」</li>' +
      '</ol>'
    ) +

    section('二、核心玩法',
      '<p style="margin:4px 0"><strong>12 天节目流程</strong></p>' +
      '<p style="margin:4px 0">每天分 4 个时段：</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:4px 0;font-size:12px">' +
      '<tr style="background:var(--bg-soft)"><th style="padding:3px 6px;border:1px solid var(--border-primary);text-align:left">时段</th><th style="padding:3px 6px;border:1px solid var(--border-primary);text-align:left">内容</th></tr>' +
      '<tr><td style="padding:3px 6px;border:1px solid var(--border-primary)">☀️ 上午</td><td style="padding:3px 6px;border:1px solid var(--border-primary)">早餐、日常互动、约会配对日</td></tr>' +
      '<tr><td style="padding:3px 6px;border:1px solid var(--border-primary)">🌤 下午</td><td style="padding:3px 6px;border:1px solid var(--border-primary)">约会场景、延续上午剧情</td></tr>' +
      '<tr><td style="padding:3px 6px;border:1px solid var(--border-primary)">🌅 傍晚</td><td style="padding:3px 6px;border:1px solid var(--border-primary)">晚餐、强制任务（读信 / 真心话 / 提问箱）</td></tr>' +
      '<tr><td style="padding:3px 6px;border:1px solid var(--border-primary)">🌙 深夜</td><td style="padding:3px 6px;border:1px solid var(--border-primary)">发短信、继续今天、进入下一天</td></tr>' +
      '</table>' +
      '<p style="margin:4px 0">每个时段 AI 自动生成剧情，选择或操作后推进到下一段。</p>' +
      '<p style="margin:4px 0"><strong>三大互动方式</strong></p>' +
      '<ol style="margin:4px 0;padding-left:20px">' +
      '<li><strong>点击选项</strong>：剧情下方出现 A/B/C 选项，点击选择后 AI 生成后续剧情</li>' +
      '<li><strong>自由输入</strong>：在底部输入框写下你的行动或想法，点击「✍️ 生成剧情」提交</li>' +
      '<li><strong>发短信</strong>：深夜时段点击「📨 发送心动短信」发给指定成员</li>' +
      '</ol>' +
      '<p style="color:var(--text-secondary);margin:4px 0">每时段最多可选 3 次（选项 + 自由输入合计），Day 11 真心话环节不限次数。</p>'
    ) +

    section('三、顶部 Header 功能按钮',
      '<p style="margin:4px 0"><strong>好感度区域（左侧）</strong></p>' +
      '<ul style="margin:4px 0;padding-left:20px">' +
      '<li>成员头像 + 当前好感度数值/描述</li>' +
      '<li>❤️ 点击打开好感度详细面板</li>' +
      '<li>⏳ Day ≥ 10 显示倒计时</li>' +
      '</ul>' +
      '<p style="margin:4px 0"><strong>功能按钮（右侧）</strong></p>' +
      '<table style="width:100%;border-collapse:collapse;margin:4px 0;font-size:12px">' +
      '<tr style="background:var(--bg-soft)"><th style="padding:2px 6px;border:1px solid var(--border-primary);text-align:left">按钮</th><th style="padding:2px 6px;border:1px solid var(--border-primary);text-align:left">功能</th></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">⚙️</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">设置面板（API/主题/速度/存档/重置）</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">❓</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">帮助（规则速览 + 使用说明）</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">📚</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">回顾（历史剧情 + 短信历史）</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">📋</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">档案（X档案 + 记忆物品 + 心动笔记 + 秘密任务）</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">🎁</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">送礼面板</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">📞</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">午夜电话记录（Day 7）</td></tr>' +
      '</table>'
    ) +

    section('四、底部操作栏',
      '<table style="width:100%;border-collapse:collapse;margin:4px 0;font-size:12px">' +
      '<tr style="background:var(--bg-soft)"><th style="padding:2px 6px;border:1px solid var(--border-primary);text-align:left">按钮</th><th style="padding:2px 6px;border:1px solid var(--border-primary);text-align:left">功能</th></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">🔄 重新生成本段</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">重新调用 AI 生成当前时段剧情</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">▶ 跳过进入下一时段</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">推进到下一时段</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">▶ 进入下一天</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">深夜剧情结束后进入下一天</td></tr>' +
      '</table>' +
      '<p style="margin:4px 0"><strong>深夜专属：</strong></p>' +
      '<ul style="margin:4px 0;padding-left:20px">' +
      '<li>📞 午夜电话亭（Day 6 深夜）</li>' +
      '<li>📨 发送心动短信</li>' +
      '<li>✅ 确认进入下一天</li>' +
      '<li>✍️ 继续今天（额外 2 段剧情，最多续 2 次）</li>' +
      '</ul>'
    ) +

    section('五、好感度与特效',
      '<p style="margin:4px 0"><strong>好感度 5 档：</strong></p>' +
      '<p style="margin:4px 0">💔(&lt;0) → 💙(0-14) → 😐(15-39) → 💚(40-59) → ❤️(60-79) → ❤️🔥(80+)</p>' +
      '<p style="margin:4px 0"><strong>全屏特效：</strong></p>' +
      '<ul style="margin:4px 0;padding-left:20px">' +
      '<li>💔 心碎粒子（好感大跌）</li>' +
      '<li>⚡ 白色闪屏（关键真相）</li>' +
      '<li>✨ 金色光环（好感达 80）</li>' +
      '</ul>'
    ) +

    section('六、最终选择（Day 12）',
      '<ul style="margin:4px 0;padding-left:20px">' +
      '<li><strong>复合</strong>：回到 X 身边</li>' +
      '<li><strong>换乘</strong>：选择新的成员</li>' +
      '</ul>' +
      '<p style="margin:4px 0">双向奔赴才是圆满结局。结局展示好感度变化折线图。</p>'
    ) +

    section('七、注意事项',
      '<ul style="margin:4px 0;padding-left:20px">' +
      '<li>首次进入 Day 4/6/8/10 等特殊节点时，AI 生成可能需要 10-30 秒</li>' +
      '<li>短信每晚只能发 1 条，Day 1-7 不能发给 X</li>' +
      '<li>每个时段上限 3 次操作，Day 11 不限</li>' +
      '<li>AI 生成失败时点击「🔄 重新生成本段」重试</li>' +
      '<li>建议 Chrome / Edge 浏览器</li>' +
      '</ul>' +
      '<hr style="margin:8px 0;border:none;border-top:1px solid var(--border-primary)">' +
      '<p style="text-align:center;color:var(--text-secondary)">本游戏由 AI 实时生成剧情，每次选择走向不同的故事线。<br>尽情享受这段 12 天的换乘恋爱之旅 ♡</p>'
    );
}

function section(title, content) {
  return '<div style="margin:10px 0"><h4 style="margin:0 0 4px 0;font-size:13px;color:var(--text-primary)">' + title + '</h4>' + content + '</div>';
}
