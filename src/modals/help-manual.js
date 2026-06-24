import { createModal } from './modal-factory.js';

export function showHelpManual() {
  var inner = '<div class="modal-content" style="width:580px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column">' +
    '<h3 style="margin:0 0 8px 0">📖 完整使用说明</h3>' +
    '<div style="flex:1;overflow-y:auto;padding-right:6px;font-size:12px;line-height:1.7;color:var(--text-primary)">' +
    manualContent() +
    '</div>' +
    '<button class="modal-close-x" id="helpManualClose">✕</button></div>';

  var overlay = createModal(inner);
  overlay.querySelector('#helpManualClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
}

function manualContent() {
  return '' +
    section('一、快速开始', '' +
      '<ol style="margin:4px 0;padding-left:20px">' +
      '<li>打开游戏：浏览器访问游戏地址</li>' +
      '<li>输入 API Key：点击 ⚙️ 按钮填写 DeepSeek API Key（sk-...）</li>' +
      '<li>设定女主：输入名字、年龄、职业，选择外貌和性格</li>' +
      '<li>选择成员：从 13 人中选 3 位参加节目</li>' +
      '<li>标记前任 X：3 人中选 1 位作为你的秘密前任（恋爱 2 年，分手 1 年）</li>' +
      '<li>开始游戏：点击「开始游戏！」</li>' +
      '</ol>'
    ) +

    section('二、核心玩法', '' +
      sub('12 天节目流程', '每天分 4 个时段：') +
      '<table style="width:100%;border-collapse:collapse;margin:4px 0;font-size:12px">' +
      '<tr style="background:var(--bg-soft)"><th style="padding:3px 6px;border:1px solid var(--border-primary);text-align:left">时段</th><th style="padding:3px 6px;border:1px solid var(--border-primary);text-align:left">内容</th></tr>' +
      '<tr><td style="padding:3px 6px;border:1px solid var(--border-primary)">☀️ 上午</td><td style="padding:3px 6px;border:1px solid var(--border-primary)">早餐、日常互动、约会配对日</td></tr>' +
      '<tr><td style="padding:3px 6px;border:1px solid var(--border-primary)">🌤 下午</td><td style="padding:3px 6px;border:1px solid var(--border-primary)">约会场景、延续上午剧情</td></tr>' +
      '<tr><td style="padding:3px 6px;border:1px solid var(--border-primary)">🌅 傍晚</td><td style="padding:3px 6px;border:1px solid var(--border-primary)">晚餐、强制任务（读信 / 真心话 / 提问箱）</td></tr>' +
      '<tr><td style="padding:3px 6px;border:1px solid var(--border-primary)">🌙 深夜</td><td style="padding:3px 6px;border:1px solid var(--border-primary)">发短信、继续今天、进入下一天</td></tr>' +
      '</table>' +
      '<p style="margin:4px 0">每个时段 AI 自动生成剧情，选择或操作后推进到下一段。</p>' +
      sub('三大互动方式', '' +
        '<ol style="margin:4px 0;padding-left:20px">' +
        '<li><strong>点击选项</strong>：剧情下方出现 A/B/C 选项，点击选择后 AI 生成后续剧情</li>' +
        '<li><strong>自由输入</strong>：在底部输入框写下你的行动或想法，点击「✍️ 生成剧情」提交</li>' +
        '<li><strong>发短信</strong>：深夜时段点击「📨 发送心动短信」发给指定成员</li>' +
        '</ol>' +
        '<p style="color:var(--text-secondary);margin:4px 0">每时段最多可选 3 次（选项 + 自由输入合计），Day 11 真心话环节不限次数。</p>'
      )
    ) +

    section('三、顶部 Header 功能按钮', '' +
      '<p style="margin:4px 0"><strong>好感度区域（左侧）</strong></p>' +
      '<ul style="margin:4px 0;padding-left:20px">' +
      '<li>成员头像 + 当前好感度数值/描述</li>' +
      '<li>❤️ 点击打开好感度详细面板</li>' +
      '<li>⏳ Day ≥ 10 显示倒计时</li>' +
      '</ul>' +
      '<p style="margin:4px 0"><strong>功能按钮（右侧）</strong></p>' +
      '<table style="width:100%;border-collapse:collapse;margin:4px 0;font-size:12px">' +
      '<tr style="background:var(--bg-soft)"><th style="padding:2px 6px;border:1px solid var(--border-primary);text-align:left">按钮</th><th style="padding:2px 6px;border:1px solid var(--border-primary);text-align:left">功能</th></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">⚙️</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">API 设置（Key、模型）</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">❓</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">规则速览</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">📖</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">完整使用说明（即本文）</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">📖（历史）</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">历史剧情回顾</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">📋</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">X 档案</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">📜</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">短信历史</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">📝</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">心动笔记</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">🎁</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">送礼面板</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">📥</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">导出剧情记录 .txt</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">💾</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">导出存档 .json</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">📂</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">导入存档 .json</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">📞</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">午夜电话记录</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">🔄</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">重置游戏</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">🌙/☀️</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">切换深色/浅色主题</td></tr>' +
      '</table>'
    ) +

    section('四、打字机速度', '' +
      '<p style="margin:4px 0">Header 右侧下拉框，5 档可选：</p>' +
      '<ul style="margin:4px 0;padding-left:20px">' +
      '<li><strong>即时</strong>：跳过逐字动画，直接显示完整文本</li>' +
      '<li><strong>慢</strong>：每字约 100ms</li>' +
      '<li><strong>中（默认）</strong>：每字约 50ms</li>' +
      '<li><strong>快</strong>：每字约 20ms</li>' +
      '<li><strong>极快</strong>：每字约 10ms</li>' +
      '</ul>'
    ) +

    section('五、底部操作栏', '' +
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

    section('六、弹窗与面板一览', '' +
      '<table style="width:100%;border-collapse:collapse;margin:4px 0;font-size:12px">' +
      '<tr style="background:var(--bg-soft)"><th style="padding:2px 6px;border:1px solid var(--border-primary);text-align:left">弹窗</th><th style="padding:2px 6px;border:1px solid var(--border-primary);text-align:left">入口</th></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">好感度面板</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Header ❤️ 文字</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">心动短信</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">深夜 📨 按钮</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">短信历史</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Header 📜</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">X 档案</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Header 📋</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">送礼面板</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Header 🎁</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">心动笔记</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Header 📝</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">历史回顾</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Header 📖（历史）</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">规则速览</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Header ❓</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">API 设置</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Header ⚙️</td></tr>' +
      '</table>' +
      '<p style="margin:6px 0"><strong>自动弹出：</strong>约会骰子、回礼弹窗、秘密任务卡、匿名提问箱、真心话回答、午夜电话亭、醉酒选人</p>'
    ) +

    section('七、特殊事件', '' +
      '<table style="width:100%;border-collapse:collapse;margin:4px 0;font-size:12px">' +
      '<tr style="background:var(--bg-soft)"><th style="padding:2px 6px;border:1px solid var(--border-primary);text-align:left">事件</th><th style="padding:2px 6px;border:1px solid var(--border-primary);text-align:left">触发</th></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">前任来电/来信</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Day 5-9 傍晚/深夜，15% 概率</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">午夜匿名电话</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Day 6 深夜</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">匿名提问箱</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Day 7 傍晚</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">真心话惩罚</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Day 11 深夜喝酒 ≥ 2 杯</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">X 幽灵事件</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">Day 3-5，15% 概率</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">修罗场</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">≥ 2 位成员好感 ≥ 60</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">记忆闪回</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">好感度突破 80，20% 概率</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">秘密任务</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">每日随机触发</td></tr>' +
      '<tr><td style="padding:2px 6px;border:1px solid var(--border-primary)">嫉妒任务</td><td style="padding:2px 6px;border:1px solid var(--border-primary)">特定条件触发</td></tr>' +
      '</table>'
    ) +

    section('八、好感度与特效', '' +
      '<p style="margin:4px 0"><strong>好感度 5 档：</strong></p>' +
      '<p style="margin:4px 0">💔(&lt;0) → 💙(0-14) → 😐(15-39) → 💚(40-59) → ❤️(60-79) → ❤️🔥(80+)</p>' +
      '<p style="margin:4px 0"><strong>全屏特效：</strong></p>' +
      '<ul style="margin:4px 0;padding-left:20px">' +
      '<li>💔 心碎粒子（好感大跌）</li>' +
      '<li>⚡ 白色闪屏（关键真相）</li>' +
      '<li>✨ 金色光环（好感达 80）</li>' +
      '</ul>'
    ) +

    section('九、最终选择（Day 12）', '' +
      '<ul style="margin:4px 0;padding-left:20px">' +
      '<li><strong>复合</strong>：回到 X 身边</li>' +
      '<li><strong>换乘</strong>：选择新的成员</li>' +
      '</ul>' +
      '<p style="margin:4px 0">双向奔赴才是圆满结局。结局展示好感度变化折线图。</p>'
    ) +

    section('十、存档与数据', '' +
      '<ul style="margin:4px 0;padding-left:20px">' +
      '<li>自动存档到浏览器 localStorage</li>' +
      '<li>💾 导出存档（JSON）</li>' +
      '<li>📂 导入存档（JSON）</li>' +
      '<li>🔄 重置游戏（保留 API 设置/主题/速度）</li>' +
      '<li>📥 导出剧情记录（.txt）</li>' +
      '</ul>' +
      '<p style="margin:4px 0"><strong>深色模式：</strong>Header 🌙 按钮循环切换，自动保存偏好</p>'
    ) +

    section('十一、注意事项', '' +
      '<ul style="margin:4px 0;padding-left:20px">' +
      '<li>首次进入 Day 4/6/8/10 等特殊节点时，AI 生成可能需要 10-30 秒</li>' +
      '<li>短信每晚只能发 1 条，Day 1-7 不能发给 X</li>' +
      '<li>每个时段上限 3 次操作，Day 11 不限</li>' +
      '<li>AI 生成失败时点击「🔄 重新生成本段」重试</li>' +
      '<li>建议 Chrome / Edge 浏览器</li>' +
      '</ul>' +
      '<hr style="margin:8px 0;border:none;border-top:1px solid var(--border-primary)">' +
      '<p style="text-align:center;color:var(--text-secondary)">本游戏由 AI 实时生成剧情，每次选择走向不同的故事线。<br>尽情享受这段 12 天的换乘恋爱之旅 ♡</p>')
    ;
}

function section(title, content) {
  return '<div style="margin:10px 0"><h4 style="margin:0 0 4px 0;font-size:13px;color:var(--text-primary)">' + title + '</h4>' + content + '</div>';
}

function sub(title, content) {
  return '<p style="margin:6px 0 2px 0"><strong>' + title + '</strong></p>' + content;
}
