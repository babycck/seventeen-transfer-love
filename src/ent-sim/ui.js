// ============================================================
// 娱乐圈模拟器（entSim）· UI 驾驶舱
// 三栏布局：左=事业 / 中=剧情·选项·自由输入·快捷指令 / 右=舆论驾驶舱
// 不依赖 oneHeart UI（完全独立路径）
// ============================================================
import { GS, saveGame } from '../state.js';
import { escHtml, showToast } from '../utils.js';
import { showApiSettingsModal, showConfirmModal } from '../modals.js';
import {
  initEntSimState,
  popularity, careerLevel, resourcesLevel, chapterName, chapterIndex,
  cyclePhaseIndex, romanceDepth, romanceDepthLabel, maleLead, brotherNode,
  onAirWorkCount, isStageProfession
} from './state.js';
import { CYCLE_PHASES, CYCLE_STAGE_META, ROMANCE_DEPTH_LABELS, OPINION_DIMS, PR_ACTIONS, NPC_TYPES, COVER_MECHANISMS, FAN_SERVICE_TYPES, COLLAB_TYPES, WORK_TYPES, AWARDS_POOL, WORK_TITLE_SUGGEST, romanceIcon } from './data.js';
import { getCyclePhaseLabel, getCyclePhaseIcon, getCycleStageLabel, getCyclePhaseMeaning, getRomanceRiskMultiplier } from './cycle.js';
import { getOpinionTier, getOpinionForRadar, executePR, executePRDim, applyOpinionImpact } from './public-opinion.js';
import { getNpcNodes, tickPaparazzi, interactNpc, getNpcInteractions } from './npc-network.js';
import { getRomanceDepthLabel, getRomanceEmotion, getRomanceRisk, tryConfession, applyConfessionResult, applyCover, getCoverMechanisms, assessRomanceRisk, advanceRomance } from './romance.js';
import { getWorks, startWork } from './works.js';
import { getChapterMeta, checkChapterAdvance, enterChapter } from './chapter.js';
import { doFanService } from './fan-service.js';
import { awardsNom, awardsActive, enterAwardsCeremony, resolveAwards } from './awards.js';
import { collabProposal, acceptCollab, rejectCollab, maybeOfferCollab } from './collab.js';
import { getDailyBuzz } from './immersion.js';
import { getEndingHint } from './endings.js';
import {
  getEntSimCurrent, handleEntSimChoice, handleEntSimFreeInput,
  continueEntSimMain, triggerEntSimEvent, enterEntSimEnding
} from './engine.js';

// 供 renderAll 调用：返回 HTML 字符串（与 oneHeart/transfer 一致，绑定由 bindEntSimEvents 负责）
export function renderEntSimGameScreen() {
  window.__renderEntSim = function() {
    var app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = renderHtml();
    bindEntSimEvents();
  };
  return renderHtml();
}

function renderHtml() {
  var cur = getEntSimCurrent();
  return '' +
    '<div id="entsim-root" class="entsim-mode">' +
      renderHeader() +
      '<div class="es-grid">' +
        '<div class="es-col es-left">' + renderLeft() + '</div>' +
        '<div class="es-col es-center">' + renderCenter(cur) + '</div>' +
        '<div class="es-col es-right">' + renderRight() + '</div>' +
      '</div>' +
      renderFooter() +
    '</div>';
}

// ---------- Header ----------
function renderHeader() {
  var E = GS.entSim;
  var pap = E.npcNetwork.paparazzi;
  var papBadge = (pap.armed) ? '<span class="es-badge es-pap" id="es-pap-badge" style="cursor:pointer" title="点击进入狗仔危机公关">⏰倒计时' + (pap.nextRound - E.cycle.roundTotal) + '</span>' : '';
  var awBadge = (awardsActive()) ? '<span class="es-badge es-award" id="es-award-badge" title="颁奖礼">🏆颁奖季</span>' : '';
  var nomBadge = (awardsNom() && !awardsNom().resolved && !awardsActive()) ? '<span class="es-badge es-nom" id="es-award-badge" title="入围奖项">🏆' + escHtml(awardsNom().name) + '</span>' : '';
  return '' +
    '<div class="es-header">' +
      '<div class="es-h-left">' +
        '<span class="es-cycle-tag">' + getCyclePhaseIcon() + ' ' + getCycleStageLabel() + ' · ' + getCyclePhaseLabel() + ' Day' + E.cycle.roundTotal + '</span>' +
        '<span class="es-chip">' + chapterIconHtml() + ' ' + chapterName() + '</span>' +
      '</div>' +
      '<div class="es-h-right">' +
        '<button class="es-btn es-settings-btn" id="es-settings-btn" title="设置">⚙️</button>' +
        '<button class="es-btn es-romance-btn" id="es-romance-btn">' + romanceIcon(romanceDepth()) + ' 男主</button>' +
        (brotherNode() ? '<button class="es-btn" id="es-brother-btn">👨 哥哥(' + stanceShort(E.brother.stance) + ')</button>' : '') +
        '<button class="es-btn es-end-btn" id="es-end-btn">🔚 结局</button>' +
        papBadge + awBadge + nomBadge +
      '</div>' +
    '</div>';
}
function stanceShort(s) { return ({ '参谋': '参谋', '认可掩护': '挺你', '试探': '试探', '反对公开': '反对' })[s] || s; }
function chapterIconHtml() { return ['🌱', '🚀', '👑', '🏆'][chapterIndex() - 1] || '🌱'; }
function esEveningBtn(kind, label) {
  var chosen = GS.entSim.evening || '';
  var locked = chosen && chosen !== kind;
  return '<button class="es-evening-btn' + (chosen === kind ? ' active' : '') + '" data-evening="' + kind + '"' + (locked ? ' disabled' : '') + '>' + label + '</button>';
}

// ---------- Left：事业面板 ----------
function renderLeft() {
  var E = GS.entSim;
  var works = getWorks();
  var worksHtml = works.length ? works.map(workCardHtml).join('') : '<div class="es-empty">暂无作品，去事业面板开新作</div>';
  var agendaHtml = (
    '<div class="es-agenda">' +
      '<button class="es-ag-btn" data-agenda="main"><span class="es-ic">🎯</span>' + escHtml(E.agenda.main || '主档') + '</button>' +
      '<button class="es-ag-btn" data-agenda="related"><span class="es-ic">🔗</span>' + escHtml(E.agenda.related || '相关') + '</button>' +
      '<button class="es-ag-btn" data-agenda="rival"><span class="es-ic">💢</span>' + escHtml(E.agenda.rival || '情敌') + '</button>' +
    '</div>'
  );
  return '' +
    '<div class="es-panel">' +
      '<div class="es-panel-title">🎬 事业</div>' +
      '<div class="es-row"><span>在播作品</span><b>' + onAirWorkCount() + '</b></div>' +
      '<div class="es-row"><span>人气</span><b>' + popularity() + ' <i style="font-style:normal;color:#9D8BFF">(' + careerLevel() + ')</i></b></div>' +
      '<button class="es-btn es-wide" id="es-work-btn">🎬 开新作品</button>' +
      '<div class="es-subtitle">作品槽</div>' + worksHtml +
      '<div class="es-subtitle">今日日程</div>' + agendaHtml +
      '<div class="es-subtitle">🌙 晚档（与日程互斥）</div>' +
      '<div class="es-evening">' +
        esEveningBtn('date', '💞 约会') +
        esEveningBtn('visit', '👀 探班') +
        esEveningBtn('rest', '🛌 休息') +
      '</div>' +
      '<div class="es-subtitle">⭐ 资源等级</div>' +
      '<div class="es-res">' + resourceStars() + '</div>' +
      '<div class="es-row"><span>资源值</span><b>' + resourcesLevel() + '</b></div>' +
    '</div>';
}
function stanceClass(s) {
  if (s === '回踩' || s === '撤资' || s === '黑' || s === '反对公开') return 'bad';
  if (s === '护你' || s === '捧' || s === '提携' || s === '想续约' || s === '退出祝福' || s === '认可掩护') return 'good';
  return 'mid';
}
function isIntimateOption(text) {
  return /牵手|亲(吻|他|密)|抱|吻|约(会|见|他)|拥抱|亲密|表白|告白|同床|摸|贴|靠|十指|手牵|心动|暧昧|私会|想他/.test(text);
}
function optionRiskBadge(text) {
  if (!isIntimateOption(text)) return '';
  var score = assessRomanceRisk(0).score;
  var lvl, fan, cls;
  if (score >= 60) { lvl = '高'; fan = '-10'; cls = 'high'; }
  else if (score >= 40) { lvl = '中'; fan = '-5'; cls = 'mid'; }
  else if (score >= 20) { lvl = '低'; fan = '-2'; cls = 'low'; }
  else { lvl = '安全'; fan = '0'; cls = 'safe'; }
  return '<span class="es-risk-badge es-risk-' + cls + '" title="恋爱曝光风险预估">风险:' + lvl + '·粉丝' + fan + '</span>';
}

// ---------- Center：剧情 + 选项 + 输入 + 快捷指令 ----------
function renderCenter(cur) {
  var optionsHtml = (cur.options && cur.options.length) ?
    cur.options.map(function(o, i) {
      var rb = optionRiskBadge(o);
      return '<button class="es-option' + (rb ? ' es-opt-risk' : '') + '" data-idx="' + i + '"' + (rb ? ' data-risk="1"' : '') + '>' + escHtml(o) + (rb ? ' ' + rb : '') + '</button>';
    }).join('') : '<div class="es-empty">（等待剧情推进…）</div>';
  return '' +
    '<div class="es-panel es-center-panel">' +
      '<div class="es-panel-title">📖 剧情 · Day ' + GS.entSim.cycle.roundTotal + '</div>' +
      '<div class="es-narrative" id="es-narrative">' + (cur.narrative ? escHtml(cur.narrative).replace(/\n/g, '<br>') : '') + '</div>' +
      '<div class="es-options" id="es-options">' + optionsHtml + '</div>' +
      '<div class="es-inputbar">' +
        '<input type="text" id="es-free-input" placeholder="自由行动 / 想做什么…" />' +
        '<button class="es-btn es-romance-btn" id="es-free-send">发送</button>' +
      '</div>' +
      '<div class="es-quick">' +
        '<button class="es-qbtn" id="es-q-main">🔄 拉回主线</button>' +
        '<button class="es-qbtn" id="es-q-event">🎲 随机事件</button>' +
        '<button class="es-qbtn" id="es-q-fanservice">📣 营业</button>' +
        '<button class="es-qbtn" id="es-q-collab">🤝 合作企划</button>' +
        '<button class="es-qbtn" id="es-q-cover">🛡 掩护</button>' +
      '</div>' +
    '</div>';
}

// ---------- Right：舆论驾驶舱 ----------
function renderRight() {
  var E = GS.entSim;
  var pap = E.npcNetwork.paparazzi;
  var papHot = (pap.armed) ? '<div class="es-hot-item es-pap-hot es-hot-click" data-pap="1"><span class="es-hot-rank">⏰</span>狗仔预告：' + (pap.nextRound - E.cycle.roundTotal) + ' 回合后放料<span class="es-hot-fire">🔴</span></div>' : '';
  var tier = getOpinionTier();
  var buzz = getDailyBuzz();
  var hpName = (GS.heroineProfile && GS.heroineProfile.name) || '';
  var romanceKw = /恋|绯闻|同框|同款|吻|约(会|见|他|CP)|CP|cp|私会|暧昧|恋情/;
  var hot = (buzz.hotSearch || []).map(function(h, i) {
    var fire = i < 3 ? ['🔥🔥🔥', '🔥🔥', '🔥'][i] : '';
    var me = (hpName && h.indexOf(hpName) >= 0) ? ' me' : '';
    var rel = romanceKw.test(h) ? ' rel' : '';
    var clickable = rel ? ' es-hot-click' : '';
    return '<div class="es-hot-item' + me + clickable + '"' + (rel ? ' data-rel="' + i + '"' : '') + '><span class="es-hot-rank">' + (i + 1) + '</span>' + escHtml(h) + '<span class="es-hot-fire">' + fire + '</span></div>';
  }).join('');
  var fan = (buzz.fanDiscussion || []).map(function(f) {
    var cat = classifyFan(f);
    return '<div class="es-fan-bubble ' + cat + '"><b>' + fanLabel(cat) + '</b>｜' + escHtml(f) + '</div>';
  }).join('');
  var media = (buzz.mediaTitle || []).map(function(m) {
    return '<div class="es-media">📰 ' + escHtml(m) + '<span class="es-media-tag"> · 定调:' + tier.tier + '</span></div>';
  }).join('');
  var npcs = getNpcNodes().map(function(n) {
    var warn = (stanceClass(n.stance) === 'bad') ? ' warn' : '';
    return '<div class="es-npc-node es-npc-click' + warn + '" data-npc="' + n.type + '" title="点击主动互动"><div class="es-npc-avatar">' + (n.icon || '👤') + '</div><div class="es-npc-name">' + escHtml(n.name) + '</div></div>';
  }).join('');
  var risk = getRomanceRisk();
  return '' +
    '<div class="es-panel">' +
      '<div class="es-panel-title">📊 今日舆论态势 <span class="es-tier" style="color:' + tier.color + '">' + tier.icon + ' ' + tier.tier + '</span></div>' +
      '<div class="es-hot">' + papHot + (hot || '<div class="es-empty">暂无热搜</div>') + '</div>' +
      '<div class="es-subtitle">💬 粉丝讨论</div>' +
      '<div class="es-fan">' + (fan || '<div class="es-empty">暂无讨论</div>') + '</div>' +
      (media || '') +
      '<div class="es-radar-wrap">' + bigRadar() + '</div>' +
      '<div class="es-legend"><span><i style="background:var(--es-green)"></i>稳</span><span><i style="background:var(--es-yellow)"></i>注意</span><span><i style="background:var(--es-red)"></i>塌</span></div>' +
      '<div class="es-subtitle">💞 地下恋风险 <b style="color:' + riskColor(risk.score) + '">' + risk.score + ' ' + risk.level + '</b></div>' +
      '<div class="es-romance-mini">' + romanceIcon(romanceDepth()) + ' ' + getRomanceDepthLabel() + ' · 男主' + getRomanceEmotion() + '</div>' +
      '<div class="es-subtitle">🕸️ 关系网</div>' +
      '<div class="es-npc-grid">' + npcs + '</div>' +
      '<button class="es-btn es-wide" id="es-pr-btn">🛡 危机公关（剩' + E.misc.prRemaining + '）</button>' +
    '</div>';
}
// ---------- preview 风格辅助 ----------
function classifyFan(text) {
  if (/绝|美|神颜|圈粉|独美|封神|绝了|心动|配得上/.test(text)) return 'topfan';
  if (/翻车|无语|黑|崩|买热搜|糊|假|油腻|脱粉/.test(text)) return 'hater';
  return 'passerby';
}
function fanLabel(c) { return c === 'topfan' ? '大粉' : c === 'hater' ? '黑粉' : '路人'; }
function radarSvg(size) {
  var data = getOpinionForRadar();
  var cx = size / 2, cy = size / 2, R = size / 2 - 14;
  var off = 16; // 标签外推偏移，避免压在雷达圈边缘
  var ang0 = -Math.PI / 2;
  var grid = '';
  [1, 0.66, 0.33].forEach(function(r) {
    var poly = data.map(function(d, i) {
      var ang = ang0 + i * Math.PI / 2;
      return (cx + Math.cos(ang) * R * r) + ',' + (cy + Math.sin(ang) * R * r);
    }).join(' ');
    grid += '<polygon points="' + poly + '" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="1"/>';
  });
  var axes = '';
  for (var i = 0; i < 4; i++) {
    var a = ang0 + i * Math.PI / 2;
    axes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(a) * R) + '" y2="' + (cy + Math.sin(a) * R) + '" stroke="rgba(255,255,255,.1)"/>';
  }
  var poly = data.map(function(d, i) {
    var ang = ang0 + i * Math.PI / 2;
    return (cx + Math.cos(ang) * R * (d.value / 100)) + ',' + (cy + Math.sin(ang) * R * (d.value / 100));
  }).join(' ');
  var polyEl = '<polygon points="' + poly + '" fill="rgba(124,111,240,.35)" stroke="#9D8BFF" stroke-width="1.5"/>';
  var labels = data.map(function(d, i) {
    var a = ang0 + i * Math.PI / 2;
    var lx = cx + Math.cos(a) * (R + off), ly = cy + Math.sin(a) * (R + off);
    var clickable = (size > 100) ? ' class="es-radar-dim" data-dim="' + d.key + '" style="cursor:pointer"' : '';
    return '<text x="' + lx + '" y="' + ly + '" text-anchor="middle" fill="#b9aee0" font-size="' + (size > 100 ? 9 : 7) + '"' + clickable + '>' + d.label + '</text>';
  }).join('');
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '"><g>' + grid + axes + polyEl + labels + '</g></svg>';
}
function miniRadar() { return '<span class="es-mini-radar">' + radarSvg(40) + '</span>'; }
function bigRadar() { return radarSvg(150); }
function workCardHtml(w) {
  var dots = '';
  for (var s = 0; s < 4; s++) {
    var d = 'es-stage-dot';
    if (s < w.stage) d += ' done';
    else if (s === w.stage) d += ' active';
    dots += '<span class="' + d + '"></span>';
    if (s < 3) dots += '<span class="es-stage-line' + (s < w.stage ? ' done' : '') + '"></span>';
  }
  var warn = (w.stage === 2) ? '<div class="es-warn">⚠️ 作品在播 · 曝光损失×2</div>' : '';
  var ended = (w.stage >= 3) ? '<div class="es-ok">✅ 已完结 · 已下档</div>' : '';
  var c = GS.entSim.romance.collabActive;
  var tag = (c && c.workId === w.id) ? '<span class="es-chip es-colla-tag">💞合作中</span>' : '';
  return '<div class="es-work-card" data-work="' + escHtml(w.id) + '" style="cursor:pointer">' +
    '<div class="es-work-name">' + w.icon + ' 《' + escHtml(w.title) + '》' + tag + '</div>' +
    '<div class="es-work-stages">' + dots + '</div>' +
    '<div class="es-work-sub">' + w.stageLabel + (w.needsBuzz ? ' ｜ 待反响' : '') + '</div>' +
    warn + ended + '</div>';
}
function resourceStars() { return (typeof getEntSimResourceStars === 'function') ? getEntSimResourceStars() : resourcesLevel(); }
function renderFooter() {
  var d = romanceDepth();
  var lbl = ROMANCE_DEPTH_LABELS[d] || { label: '初遇', risk: '常规' };
  var cells = '';
  for (var i = 0; i < 5; i++) cells += '<span class="es-depth-cell' + (i < d ? ' on' : '') + '"></span>';
  return '<div class="es-footer"><div class="es-depth">💗<div class="es-depth-bar">' + cells + '</div><span class="es-depth-label">' + escHtml(lbl.label) + ' · 风险' + escHtml(lbl.risk || '常规') + '</span></div></div>';
}
function riskColor(s) { return s >= 60 ? '#ff6b6b' : (s >= 40 ? '#ffb347' : '#7ed957'); }

// ---------- 事件绑定 ----------
export function bindEntSimEvents() {
  // 防御：上一会话异常残留的生成锁/重试计数会导致自动生成被守卫挡掉、叙事区永久空白。
  // 进入时强制解除（bind 时机不存在真正在途的生成，可安全清除）。
  if (GS._entSimGenerating) GS._entSimGenerating = false;
  if (GS._entSimAutoTries && GS._entSimAutoTries >= 2) GS._entSimAutoTries = 0;
  // 惰性初始化：迁移的旧 entertainment 存档从未调用过 initEntSimState，男主/哥哥/NPC 为空时补齐
  if (!GS.entSim || !GS.entSim.romance || !GS.entSim.romance.maleLead || !GS.entSim.romance.maleLead.memberId) {
    initEntSimState();
  }
  // 首回合生成：narrative 为空且未在生成中时自动拉起（最多 2 次，避免 AI 漏返回叙事时无限递归）
  var cur = getEntSimCurrent();
  var autoTries = GS._entSimAutoTries || 0;
  if (!cur.narrative && !GS._entSimGenerating) {
    if (autoTries >= 2) {
      // 已多次尝试仍无叙事：停止自动循环，给出手动重试提示，防止死循环
      // 注意：不能直接 return，否则下方按钮绑定逻辑不执行，用户彻底卡死无法自救
      GS._entSimCurrent = { narrative: '（剧情生成较慢，请点击「拉回主线」重试）', options: ['拉回主线'], extras: {}, failed: true };
    } else {
    GS._entSimAutoTries = autoTries + 1;
    var loading = document.getElementById('es-narrative');
    if (loading) loading.innerHTML = '<div class="es-loading">✨ 娱乐圈大幕拉开，剧情生成中…</div>';
    continueEntSimMain().then(function() {
      if (window.__renderEntSim) window.__renderEntSim();
    });
    }
  }

  var optWrap = document.getElementById('es-options');
  if (optWrap) {
    optWrap.querySelectorAll('.es-option').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
        var idx = parseInt(btn.dataset.idx, 10);
        var text = getEntSimCurrent().options[idx] || btn.textContent;
        if (btn.dataset.risk === '1') { onOptionRisk(idx, text, btn); return; }
        btn.disabled = true;
        handleEntSimChoice(idx, text).then(function() { rerender(); });
      });
    });
  }
  var send = document.getElementById('es-free-send');
  if (send) send.addEventListener('click', onFreeSend);
  var fi = document.getElementById('es-free-input');
  if (fi) fi.addEventListener('keydown', function(e) { if (e.key === 'Enter') onFreeSend(); });

  bind('#es-q-main', function() {
    if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
    continueEntSimMain().then(rerender);
  });
  bind('#es-q-event', onRandomEvent);
  bind('#es-q-fanservice', onFanService);
  bind('#es-q-collab', onCollab);
  bind('#es-q-cover', onCover);
  bind('#es-romance-btn', onRomance);
  bind('#es-brother-btn', onBrother);
  bind('#es-end-btn', onEnding);
  bind('#es-work-btn', onWork);
  // 今日日程可点击推进
  document.querySelectorAll('.es-ag-btn[data-agenda]').forEach(function(b) {
    b.addEventListener('click', function() { onAgendaClick(b.dataset.agenda); });
  });
  // 作品卡片可点击推进
  document.querySelectorAll('.es-work-card[data-work]').forEach(function(b) {
    b.addEventListener('click', function() { onWorkCard(b.dataset.work); });
  });
  bind('#es-pr-btn', onPR);
  bind('#es-award-badge', onAwards);
  bind('#es-pap-badge', onPaparazziCrisis);
  document.querySelectorAll('.es-hot-item[data-pap]').forEach(function(el) {
    el.addEventListener('click', function() { onPaparazziCrisis(); });
  });
  // —— 新增交互入口：返回 / 设置 / 晚档 / 热搜应对 / NPC互动 / 雷达公关 ——
  bind('#es-settings-btn', function() { showApiSettingsModal(); });
  var evBox = document.getElementById('es-evening');
  if (evBox) evBox.addEventListener('click', function(e) {
    var b = e.target.closest('[data-evening]');
    if (b && !b.disabled) onEveningChoice(b.dataset.evening);
  });
  document.querySelectorAll('.es-hot-item[data-rel]').forEach(function(el) {
    el.addEventListener('click', function() { onHotSearchResponse(parseInt(el.dataset.rel, 10)); });
  });
  document.querySelectorAll('.es-npc-node[data-npc]').forEach(function(el) {
    el.addEventListener('click', function() { onNpcInteract(el.dataset.npc); });
  });
  document.querySelectorAll('svg text.es-radar-dim[data-dim]').forEach(function(el) {
    el.addEventListener('click', function() { onRadarPR(el.dataset.dim); });
  });
}
function bind(sel, fn) { var el = document.getElementById(sel.replace('#', '')); if (el) el.addEventListener('click', fn); }
function rerender() {
  if (window.__renderEntSim) { window.__renderEntSim(); return; }
  var app = document.getElementById('app');
  if (app) { app.innerHTML = renderHtml(); bindEntSimEvents(); }
}

function onFreeSend() {
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  var fi = document.getElementById('es-free-input');
  if (!fi) return;
  var t = fi.value.trim();
  if (!t) return;
  fi.value = '';
  handleEntSimFreeInput(t).then(rerender);
}
function onRandomEvent() {
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  var pool = ['机场被粉丝围堵', '采访被问理想型', '男主生日你卡点祝福', '突然爆出旧照', '你入围年度奖项'];
  var ev = pool[Math.floor(Math.random() * pool.length)];
  triggerEntSimEvent(ev).then(rerender);
}
function onFanService() {
  var html = Object.keys(FAN_SERVICE_TYPES).map(function(k) {
    var d = FAN_SERVICE_TYPES[k];
    return '<button class="es-modal-btn" data-fs="' + k + '">' + d.icon + ' ' + d.label + '</button>';
  }).join('');
  showEntSimModal('📺 营业', '<p>选择营业类型（越营业越被当工具人，高光期反噬更狠）：</p>' + html, []);
  document.querySelectorAll('[data-fs]').forEach(function(b) {
    b.addEventListener('click', function() {
      var t = b.dataset.fs;
      closeEntSimModal();
      if (t === 'cp') {
        pickCpSubject(function(subject) {
          var r = doFanService(t, subject);
          closeEntSimModal();
          showToast(r.realCp ? '营业CP与男主假戏真做，感情升温' : (r.smoke ? '营业完成，CP 烟雾弹已抛向情敌' : '营业完成'));
          rerender();
        });
      } else {
        var r = doFanService(t);
        showToast(r.smoke ? '营业完成，CP 烟雾弹已抛向情敌' : '营业完成');
        rerender();
      }
    });
  });
}
function pickCpSubject(cb) {
  var opts = [
    { k: '男主', label: '💑 与男主（假戏真做→真CP）' },
    { k: '情敌', label: '💢 与情敌（掩护／制造绯闻）' },
    { k: '其他男艺人', label: '🎭 与其他男艺人（烟雾弹）' }
  ];
  var html = opts.map(function(o) { return '<button class="es-modal-btn" data-cp="' + o.k + '">' + o.label + '</button>'; }).join('');
  showEntSimModal('💏 营业CP对象', '<p>选择营业CP对象：</p>' + html, []);
  document.querySelectorAll('[data-cp]').forEach(function(b) {
    b.addEventListener('click', function() { cb(b.dataset.cp); });
  });
}
function onCollab() {
  var E = GS.entSim;
  if (E.romance.collabActive) {
    var c = E.romance.collabActive;
    var round = E.cycle.roundTotal - c.startedRound + 1;
    var w = E.works.slots[c.workId];
    var html = '💞 你正与<b>' + escHtml(c.subject) + '</b>合作《' + escHtml(c.title) + '》<br><br>' +
      '合作期第 ' + round + ' 回合<br>作品进度：' + (w ? ['筹备', '制作', '在播', '收官'][w.stage] : '?') + '<br>' +
      '甜度累计 ' + E.romance.collabSweetAccum + '<br><br>合作收官时会自然推进你们的感情。';
    showEntSimModal('🤝 合作企划·进行中', html, [{ id: 'close', label: '知道了' }]).then(rerender);
    return;
  }
  var prop = collabProposal() || maybeOfferCollab('主动争取');
  var html2 = '合作企划：<b>' + escHtml(prop.title) + '</b><br>对象：' + escHtml(prop.subject) + '｜风险：' + prop.risk + '｜甜度：' + prop.sweetness;
  showEntSimModal('🤝 合作企划', '<p>' + html2 + '</p>', [
    { id: 'accept', label: '接下', primary: true },
    { id: 'reject', label: '拒绝' }
  ]).then(function(res) {
    closeEntSimModal();
    if (res === 'accept') {
      acceptCollab(prop);
      var a = E.romance.collabActive;
      showToast('已接下《' + prop.title + '》' + ((a && a.subject === '男主') ? '（合作期已开启）' : ''));
    } else if (res === 'reject') { rejectCollab(); showToast('已拒绝'); }
    rerender();
  });
}
function onCover() {
  var mechs = getCoverMechanisms();
  var html = Object.keys(mechs).map(function(k) {
    var m = mechs[k];
    return '<button class="es-modal-btn" data-cover="' + k + '">' + m.icon + ' ' + m.label + '<br><small>' + m.cost + '</small></button>';
  }).join('');
  showEntSimModal('🛡 掩护手段（累计 ' + GS.entSim.romance.coverUsed + ' 次，≥3 粉丝起疑）', '<p>选择掩护方式：</p>' + html, []);
  document.querySelectorAll('[data-cover]').forEach(function(b) {
    b.addEventListener('click', function() {
      var r = applyCover(b.dataset.cover);
      closeEntSimModal();
      showToast('已使用掩护：' + mechs[b.dataset.cover].label);
      rerender();
    });
  });
}
function onRomance() {
  var E = GS.entSim;
  var conf = tryConfession();
  var html = '' +
    '<div class="es-romance-card">' +
    '<p>男主：<b>' + escHtml(maleLead().name) + '</b></p>' +
    '<p>情绪：' + getRomanceEmotion() + '｜深度：' + getRomanceDepthLabel() + '</p>' +
    '<p>最近主动：' + escHtml(E.romance.seedEvent || '（暂未记录）') + '</p>' +
    '<p>风险：' + getRomanceRisk().score + ' ' + getRomanceRisk().level + '</p>' +
    '</div>';
  var buttons = [{ id: 'close', label: '知道了' }];
  if (conf.canConfess) buttons.unshift({ id: 'confess', label: '💌 告白', primary: true });
  showEntSimModal('💗 男主状态', html, buttons).then(function(res) {
    if (res === 'confess') {
      applyConfessionResult('accepted');
      showToast('告白成功，恋情明朗！');
    }
    rerender();
  });
}
function onBrother() {
  var E = GS.entSim;
  var html = '<p>哥哥立场：<b>' + E.brother.stance + '</b></p><p>支持度：' + E.brother.support + '</p>';
  if (E.brother.talkPending) html += '<p class="es-warn">哥哥想找你谈谈…</p>';
  showEntSimModal('👨 哥哥', html, [{ id: 'close', label: '关闭' }]).then(rerender);
}
function onEnding() {
  var ending = enterEntSimEnding();
  var html = '<p>根据当前状态，最可能的结局：</p><h3>' + ending.icon + ' ' + escHtml(ending.label) + '</h3><p>' + escHtml(ending.text) + '</p>';
  showEntSimModal('🔚 结局预览', html, [{ id: 'close', label: '返回' }]).then(rerender);
}
function onWork() {
  var html = Object.keys(WORK_TYPES).map(function(k) {
    var d = WORK_TYPES[k];
    return '<button class="es-modal-btn es-work-type" data-wt="' + k + '">' + d.icon + ' ' + d.label + '</button>';
  }).join('');
  showEntSimModal('🎬 开新作品', '<p>选择作品类型：</p>' + html, [{ id: 'cancel', label: '取消' }]);
  bind('.es-work-type', function(b) {
    promptWorkTitle(b.dataset.wt);
  });
}

// 命名弹窗：提供自动建议，允许玩家改名
function promptWorkTitle(type) {
  var def = WORK_TYPES[type];
  var suggest = WORK_TITLE_SUGGEST[type] || ['新作品'];
  var defaultTitle = suggest[Math.floor(Math.random() * suggest.length)];
  var body = '<p>类型：' + def.icon + ' ' + def.label + '</p>' +
    '<label style="display:block;margin:8px 0 4px;opacity:.7">给作品起个名字（留空则随机选用建议名）</label>' +
    '<input id="es-work-title" type="text" maxlength="20" value="' + escHtml(defaultTitle) + '" ' +
    'style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--es-border,#2a2f3a);background:var(--es-input,#15181f);color:inherit">' +
    '<div style="margin-top:8px;font-size:12px;opacity:.6">备选：' +
    suggest.map(function(s) { return '<span class="es-title-chip" style="cursor:pointer;margin:2px;display:inline-block;padding:2px 6px;border-radius:6px;background:var(--es-chip,#1d2230)">' + escHtml(s) + '</span>'; }).join('') +
    '</div>';
  showEntSimModal('🎬 命名作品', body, [{ id: 'ok', label: '确认立项', primary: true }, { id: 'cancel', label: '取消' }])
    .then(function(res) {
      if (res !== 'ok') { rerender(); return; }
      var inp = document.getElementById('es-work-title');
      var title = (inp && inp.value ? inp.value.trim() : '') || defaultTitle;
      startWork(type, '', title);
      showToast('新作品《' + title + '》已立项，进入筹备期');
      rerender();
    });
  // 备选名点击填入输入框
  bind('.es-title-chip', function(chip) {
    var inp = document.getElementById('es-work-title');
    if (inp) inp.value = chip.textContent;
  });
}
// 今日日程：点开看安排并可推进剧情
var AGENDA_META = {
  main: { label: '主档', icon: '🎯' },
  related: { label: '相关档', icon: '🔗' },
  rival: { label: '情敌', icon: '💢' }
};
function onAgendaClick(kind) {
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  var meta = AGENDA_META[kind] || { label: kind, icon: '📌' };
  var text = (GS.entSim.agenda && GS.entSim.agenda[kind]) || meta.label;
  var flavor = {
    main: '今天的主档行程，专注在自己的事业上。',
    related: '今天的相关档，与团队/经纪侧的协调。',
    rival: '情敌今天的动向，可能会和你产生交集或对比。'
  }[kind] || '';
  var body = '<p>' + meta.icon + ' <b>' + escHtml(text) + '</b></p>' +
    '<p style="opacity:.75">' + flavor + '</p>' +
    '<p style="opacity:.6;font-size:12px">點下「推进」将以该日程为引子生成一段剧情。</p>';
  showEntSimModal('📅 今日日程 · ' + meta.label, body,
    [{ id: 'go', label: '推进剧情', primary: true }, { id: 'cancel', label: '关闭' }])
    .then(function(res) {
      if (res !== 'go') { rerender(); return; }
      triggerEntSimEvent('今日行程·' + meta.label + '：' + text).then(rerender);
    });
}
// 作品卡片：点击查看详情并主动推进相关剧情
function onWorkCard(id) {
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  var w = GS.entSim.works.slots[id];
  if (!w) { rerender(); return; }
  var def = WORK_TYPES[w.type] || { icon: '🎬', label: w.type };
  var c = GS.entSim.romance.collabActive;
  var collab = (c && c.workId === id) ? '<br>💞 与 <b>' + escHtml(c.subject) + '</b> 合作中（甜度累计 ' + (GS.entSim.romance.collabSweetAccum || 0) + '）' : '';
  var buzzNote = w.needsBuzz ? '<br><span style="color:#ffb347">⚠️ 在播待反响：推进剧情即可触发作品反响</span>' : '';
  var body = '<p>' + def.icon + ' <b>《' + escHtml(w.title) + '》</b></p>' +
    '<p style="opacity:.8">类型：' + escHtml(def.label) + '<br>' +
    '阶段：' + escHtml(['筹备期', '拍摄/制作期', '宣发/在播期', '已完结/收官期'][w.stage]) + '<br>' +
    '热度(buzz)：' + Math.round(w.buzz) + '/100' + buzzNote + collab + '</p>';
  showEntSimModal('🎬 作品 · ' + escHtml(w.title), body,
    [{ id: 'go', label: '推进相关剧情', primary: true }, { id: 'close', label: '关闭' }])
    .then(function(res) {
      if (res !== 'go') { rerender(); return; }
      var ctx = '作品推进：《' + w.title + '》处于' + ['筹备期', '拍摄/制作期', '宣发/在播期', '已完结/收官期'][w.stage] +
        (w.needsBuzz ? '，需要描写其在播反响与观众讨论' : '') + '，请围绕这部作品生成一段剧情';
      triggerEntSimEvent(ctx).then(rerender);
    });
}
function onPR() {
  if (GS.entSim.misc.prRemaining <= 0) { showToast('本周公关额度已用尽'); return; }
  var html = Object.keys(PR_ACTIONS).map(function(k) {
    var a = PR_ACTIONS[k];
    return '<button class="es-modal-btn" data-pr="' + k + '">' + a.icon + ' ' + a.label + '<br><small>' + a.note + '</small></button>';
  }).join('');
  showEntSimModal('🛡 危机公关（每次 -哥哥支持度 3，剩 ' + GS.entSim.misc.prRemaining + '）', '<p>' + html + '</p>', []);
  document.querySelectorAll('[data-pr]').forEach(function(b) {
    b.addEventListener('click', function() {
      var r = executePR(b.dataset.pr);
      closeEntSimModal();
      if (r.success) showToast('已应对：' + r.note);
      else showToast(r.note);
      rerender();
    });
  });
}
function onAwards() {
  var aw = awardsActive();
  if (!aw) { var entered = enterAwardsCeremony(); if (!entered) { showToast('暂无可进行的颁奖礼'); return; } aw = awardsActive(); }
  var html = '<p>颁奖礼：<b>' + escHtml(aw.name) + '</b></p><p>选择你的策略：</p>';
  var buttons = [
    { id: 'avoid_red_carpet', label: '🚫 避开红毯同台', primary: true },
    { id: 'red_carpet_together', label: '🌟 同走红毯' },
    { id: 'mention_him', label: '💌 感言谢他' },
    { id: 'no_mention', label: '🤐 滴水不漏' }
  ];
  showEntSimModal('🏆 颁奖礼', html, buttons).then(function(res) {
    if (res) { var r = resolveAwards(res); showToast(r.note); }
    rerender();
  });
}

// ---------- 通用 modal ----------
var _modalEl = null;
export function showEntSimModal(title, bodyHtml, buttons) {
  return new Promise(function(resolve) {
    closeEntSimModal();
    var overlay = document.createElement('div');
    overlay.className = 'es-modal-overlay';
    var btns = (buttons && buttons.length) ? buttons.map(function(b) {
      return '<button class="es-modal-btn ' + (b.primary ? 'primary' : '') + '" data-res="' + b.id + '">' + escHtml(b.label) + '</button>';
    }).join('') : '';
    overlay.innerHTML = '<div class="es-modal"><div class="es-modal-title">' + escHtml(title) + '</div><div class="es-modal-body">' + bodyHtml + '</div><div class="es-modal-btns">' + btns + '</div></div>';
    document.body.appendChild(overlay);
    _modalEl = overlay;
    if (btns) {
      overlay.querySelectorAll('[data-res]').forEach(function(b) {
        b.addEventListener('click', function() { var r = b.dataset.res; closeEntSimModal(); resolve(r); });
      });
    }
    overlay.addEventListener('click', function(e) { if (e.target === overlay && !btns) { closeEntSimModal(); resolve(null); } });
  });
}
function closeEntSimModal() { if (_modalEl && _modalEl.parentNode) { _modalEl.parentNode.removeChild(_modalEl); _modalEl = null; } }

// ---------- 新增交互：返回 / 晚档 / 热搜应对 / NPC互动 / 雷达公关 / 风险预估 ----------
function onEveningChoice(kind) {
  var E = GS.entSim;
  if (E.evening && E.evening !== kind) return; // 已选其它项则锁定
  E.evening = kind;
  var msg = '';
  if (kind === 'date') { advanceRomance(1); msg = '💞 晚档约会被安排，恋爱悄悄升温'; }
  else if (kind === 'visit') { msg = '👀 你决定晚档去探班，悄悄见他一面'; }
  else { msg = '🛌 今晚是独处日，做点自己的事（可能触发秘密/朋友圈）'; }
  saveGame();
  showToast(msg);
  rerender();
}
function onHotSearchResponse(idx) {
  var buzz = getDailyBuzz();
  var h = (buzz.hotSearch || [])[idx] || '热搜';
  var opts = [
    { key: 'silence', label: '🤐 沉默冷处理', desc: '媒体0 粉丝-2，赌它自然降温' },
    { key: 'clarify', label: '📝 发博澄清', desc: '粉丝+3 媒体-2，但实锤风险↑' },
    { key: 'divert', label: '🎯 转移焦点', desc: '发作品/营业盖过，消耗档期' },
    { key: 'ignore', label: '🙈 不回应', desc: '自然衰减，狗仔可能加码' }
  ];
  var html = '<p>热搜：<b>' + escHtml(h) + '</b></p>' + opts.map(function(o) {
    return '<button class="es-modal-btn" data-hr="' + o.key + '">' + o.label + '<span class="es-modal-sub">' + o.desc + '</span></button>';
  }).join('');
  showEntSimModal('🔥 应对热搜', html, []);
  document.querySelectorAll('[data-hr]').forEach(function(b) {
    b.addEventListener('click', function() {
      var k = b.dataset.hr, deltas, note;
      if (k === 'silence') { deltas = { fan: -2 }; note = '沉默冷处理：媒体无视，粉丝略掉'; }
      else if (k === 'clarify') { deltas = { fan: 3, media: -2 }; GS.entSim.misc.exposureAccum = (GS.entSim.misc.exposureAccum || 0) + 1; note = '发博澄清：粉丝+3 媒体-2，实锤风险↑'; }
      else if (k === 'divert') { deltas = { fan: 1, media: -1, professional: 1 }; note = '转移焦点：新话题盖过旧料'; }
      else { deltas = {}; note = '不回应：留给时间消化'; }
      applyOpinionImpact(deltas, '应对热搜·' + h);
      GS.entSim.careerHistory.push({ round: GS.entSim.cycle.roundTotal, type: 'hotsearch', text: note });
      saveGame();
      closeEntSimModal();
      showToast('已应对：' + note);
      rerender();
    });
  });
}
function onPaparazziCrisis() {
  var p = GS.entSim.npcNetwork.paparazzi;
  if (!p.armed) { showToast('狗仔暂无预告'); return; }
  var left = p.nextRound - GS.entSim.cycle.roundTotal;
  var opts = [
    { key: 'deny', label: '🙅 否认', desc: '媒体+2 黑粉+2，赌他手里没实锤' },
    { key: 'preempt', label: '💡 先发制人自曝', desc: '粉丝-2 媒体-3，主动叙事压低伤害，危机解除' },
    { key: 'buyout', label: '💰 买断料', desc: '花钱消灾，狗仔收手，媒体+3' },
    { key: 'divert', label: '🎯 转移焦点', desc: '用新作品/营业盖过，消耗档期' }
  ];
  var html = '<p>⏰ 狗仔预告：<b>' + left + ' 回合后放料</b></p>' + opts.map(function(o) {
    return '<button class="es-modal-btn" data-pc="' + o.key + '">' + o.label + '<span class="es-modal-sub">' + o.desc + '</span></button>';
  }).join('');
  showEntSimModal('🚨 狗仔危机公关', html, []);
  document.querySelectorAll('[data-pc]').forEach(function(b) {
    b.addEventListener('click', function() {
      var k = b.dataset.pc, deltas, note, cleared = false;
      if (k === 'deny') { deltas = { media: 2, anti: 2 }; note = '否认：媒体关注涨，黑粉咬住不放'; }
      else if (k === 'preempt') { deltas = { fan: -2, media: -3, anti: -3 }; p.armed = false; p.nextRound = GS.entSim.cycle.roundTotal + 99; cleared = true; note = '先发制人自曝：主动叙事压低伤害'; }
      else if (k === 'buyout') { deltas = { media: 3, anti: -2 }; p.armed = false; p.nextRound = GS.entSim.cycle.roundTotal + 99; cleared = true; note = '买断料：狗仔收手，危机解除'; }
      else { deltas = { fan: 1, media: -1, professional: 1 }; note = '转移焦点：新话题盖过旧料'; }
      applyOpinionImpact(deltas, '狗仔危机·' + note);
      GS.entSim.careerHistory.push({ round: GS.entSim.cycle.roundTotal, type: 'paparazzi', text: note });
      if (cleared) GS.entSim.careerHistory.push({ round: GS.entSim.cycle.roundTotal, type: 'paparazzi', text: '狗仔预告已化解' });
      saveGame();
      closeEntSimModal();
      showToast('已应对：' + note);
      rerender();
    });
  });
}
function onNpcInteract(type) {
  var acts = getNpcInteractions(type);
  var label = (NPC_TYPES[type] || {}).label || 'NPC';
  var html = '<p>主动互动 · <b>' + escHtml(label) + '</b></p>' + acts.map(function(a) {
    return '<button class="es-modal-btn" data-ni="' + a.key + '">' + a.icon + ' ' + a.label + '<span class="es-modal-sub">' + a.note + '</span></button>';
  }).join('');
  showEntSimModal('🕸️ 主动互动 · ' + label, html, []);
  document.querySelectorAll('[data-ni]').forEach(function(b) {
    b.addEventListener('click', function() {
      var r = interactNpc(type, b.dataset.ni);
      closeEntSimModal();
      if (r.success) showToast('已互动：' + r.note);
      rerender();
    });
  });
}
function onRadarPR(dim) {
  var dimMeta = OPINION_DIMS.filter(function(d) { return d.key === dim; })[0] || { label: dim };
  var acts = Object.keys(PR_ACTIONS).map(function(k) {
    var a = PR_ACTIONS[k];
    return { key: k, label: a.label, icon: a.icon, note: a.note };
  });
  var html = '<p>针对性公关 · <b>' + escHtml(dimMeta.label) + '</b>（消耗 1 次公关额度）</p>' + acts.map(function(a) {
    return '<button class="es-modal-btn" data-rp="' + a.key + '">' + a.icon + ' ' + a.label + '<span class="es-modal-sub">' + a.note + '</span></button>';
  }).join('');
  showEntSimModal('🛡 针对性公关', html, []);
  document.querySelectorAll('[data-rp]').forEach(function(b) {
    b.addEventListener('click', function() {
      var r = executePRDim(dim, b.dataset.rp);
      closeEntSimModal();
      if (r.success) showToast('已公关：' + r.note + '（' + dimMeta.label + '额外+' + (r.boosted || 0) + '）');
      else showToast(r.note);
      rerender();
    });
  });
}
function onOptionRisk(idx, text, btn) {
  var risk = assessRomanceRisk(0);
  var E = GS.entSim;
  var o = E.publicOpinion;
  var mult = getRomanceRiskMultiplier();
  var fanImpact = risk.score >= 60 ? 12 : risk.score >= 40 ? 7 : 3;
  var mediaImpact = risk.score >= 60 ? 5 : 3;
  var covers = getCoverMechanisms();
  var coverHtml = Object.keys(covers).map(function(k) {
    var c = covers[k];
    return '<button class="es-modal-btn" data-cover="' + k + '">' + c.icon + ' ' + c.label + '<span class="es-modal-sub">' + c.cost + '</span></button>';
  }).join('');
  var body = '<div class="es-risk-modal">' +
    '<div class="es-risk-line">当前舆论：粉丝 ' + o.fan + ' · 媒体 ' + o.media + ' · 周期倍率 ' + mult + '</div>' +
    '<div class="es-risk-line">周期：' + getCyclePhaseLabel() + '（代价×' + mult + '）</div>' +
    '<div class="es-risk-line">NPC视野：' + (E.npcNetwork.paparazzi.armed ? '狗仔跟踪中（高）' : '暂未被发现') + '</div>' +
    '<div class="es-risk-score">预估风险：' + risk.score + '/100 ' + risk.level + '</div>' +
    '<div class="es-risk-line">预估影响：粉丝-' + fanImpact + ' 媒体-' + mediaImpact + '</div>' +
    '</div>' +
    '<div class="es-risk-actions">' +
      '<button class="es-modal-btn primary" data-risk-act="confirm">确认推进</button>' +
      '<button class="es-modal-btn" data-risk-act="cover">换掩护</button>' +
      '<button class="es-modal-btn" data-risk-act="giveup">放弃</button>' +
    '</div>' +
    '<div id="es-risk-cover" style="display:none;margin-top:8px"><div class="es-subtitle">选择掩护手段（各有代价）</div>' + coverHtml + '</div>';
  showEntSimModal('⚠️ 风险预估 · ' + text, body, []);
  document.querySelectorAll('[data-risk-act]').forEach(function(b) {
    b.addEventListener('click', function() {
      var act = b.dataset.riskAct;
      if (act === 'confirm') { closeEntSimModal(); btn.disabled = true; handleEntSimChoice(idx, text).then(rerender); }
      else if (act === 'giveup') { closeEntSimModal(); }
      else if (act === 'cover') { var w = document.getElementById('es-risk-cover'); if (w) w.style.display = (w.style.display === 'none') ? 'block' : 'none'; }
    });
  });
  document.querySelectorAll('#es-risk-cover [data-cover]').forEach(function(b) {
    b.addEventListener('click', function() {
      var r = applyCover(b.dataset.cover);
      closeEntSimModal();
      if (r.ok) showToast('已换掩护：' + covers[b.dataset.cover].label + '（' + covers[b.dataset.cover].cost + '）');
      rerender();
    });
  });
}
