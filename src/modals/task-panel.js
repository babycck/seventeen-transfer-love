import { GS } from '../state.js';
import { MEMBERS } from '../data.js';
import { escHtml, showToast } from '../utils.js';
import { showConfirmModal } from './confirm-modal.js';
import { completeTaskInput, completeMissionCard } from '../game-engine.js';
import { completeSecretMission } from '../parser.js';

// 统一任务面板：任务卡 + 秘密任务
export function showTaskPanel() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '200';

  var inner = '<div class="modal-content" style="display:flex;flex-direction:column;max-width:520px">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-shrink:0">' +
    '<span style="font-size:16px;font-weight:700;color:var(--text-primary)">🎴 任务面板</span>' +
    '<button class="modal-close-x" id="taskPanelClose">✕</button></div>' +
    '<div style="flex:1;overflow-y:auto;padding-right:4px">' +
    buildMissionCardContent() +
    buildSecretMissionContent() +
    '</div></div>';

  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  // 输入类任务：完成按钮
  var taskInputBtn = overlay.querySelector('#taskInputBtn');
  if (taskInputBtn) {
    taskInputBtn.addEventListener('click', function() {
      var textarea = overlay.querySelector('#taskInputArea');
      var val = textarea ? textarea.value.trim() : '';
      if (!val) {
        showToast('⚠️ 请先输入任务内容');
        return;
      }
      completeTaskInput(val);
      overlay.remove();
    });
  }

  // 行动类任务：已完成按钮
  var taskDoneBtn = overlay.querySelector('#taskDoneBtn');
  if (taskDoneBtn) {
    taskDoneBtn.addEventListener('click', async function() {
      if (GS.todayMissionCard && await showConfirmModal('确认已完成「' + GS.todayMissionCard.name + '」任务？\n（行动类任务请通过剧情或底部"做任务"按钮执行）')) {
        completeMissionCard();
        overlay.remove();
      }
    });
  }

  // 行动类任务：引导做任务
  var taskDoBtn = overlay.querySelector('#taskDoBtn');
  if (taskDoBtn) {
    taskDoBtn.addEventListener('click', function() {
      overlay.remove();
      if (window.doActionTask) window.doActionTask();
    });
  }

  // 秘密任务：完成按钮
  var smDoneBtn = overlay.querySelector('#smDoneBtn');
  if (smDoneBtn) {
    smDoneBtn.addEventListener('click', async function() {
      if (GS.secretMission && await showConfirmModal('确认已完成「' + GS.secretMission.title + '」秘密任务？')) {
        completeSecretMission();
        if (window.__renderAll) window.__renderAll();
        overlay.remove();
      }
    });
  }

  overlay.querySelector('#taskPanelClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
}

// 构建任务卡区域
function buildMissionCardContent() {
  var html = '<p style="font-size:13px;font-weight:700;color:var(--accent-primary-dark);margin-bottom:8px">🎴 制作组任务卡</p>';

  if (!GS.todayMissionCard) {
    html += '<div style="background:var(--bg-soft);border-radius:10px;padding:16px;text-align:center;margin-bottom:16px">' +
      '<p style="color:var(--text-muted);font-size:13px">今天没有制作组任务卡</p></div>';
    return html;
  }

  var card = GS.todayMissionCard;
  var isCompleted = card.completed;
  var typeLabel = card.type === 'input' ? '✍️ 输入类' : '🏃 行动类';
  var typeColor = card.type === 'input' ? '#1565c0' : '#e65100';

  html += '<div style="background:linear-gradient(135deg,#fce4ec,#fff3e0);border-radius:12px;padding:14px;margin-bottom:16px;border:1.5px solid ' + (isCompleted ? 'var(--accent-success)' : '#c62828') + '">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
    '<span style="font-size:15px;font-weight:700;color:#c62828">' + escHtml(card.name) + '</span>' +
    '<span style="font-size:11px;font-weight:600;color:' + typeColor + ';background:rgba(255,255,255,0.7);padding:2px 8px;border-radius:10px">' + typeLabel + '</span>' +
    '</div>' +
    '<p style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:10px">' + escHtml(card.desc) + '</p>';

  if (isCompleted) {
    if (card.userInput) {
      html += '<div style="background:rgba(255,255,255,0.6);border-radius:8px;padding:8px;margin-top:8px">' +
        '<p style="font-size:11px;color:var(--text-muted);margin-bottom:4px">你提交的内容：</p>' +
        '<p style="font-size:12px;color:var(--text-primary);white-space:pre-wrap">' + escHtml(card.userInput) + '</p></div>';
    }
    html += '<p style="font-size:12px;color:var(--accent-success);font-weight:700;margin-top:8px">✅ 任务已完成</p>';
  } else if (card.type === 'input') {
    var inputLabel = card.inputLabel || '输入任务内容';
    html += '<p style="font-size:11px;color:var(--text-muted);margin-bottom:4px">' + escHtml(inputLabel) + '：</p>' +
      '<textarea id="taskInputArea" style="width:100%;min-height:80px;border:1px solid var(--border-primary);border-radius:8px;padding:8px;font-size:13px;background:var(--bg-card);color:var(--text-primary);resize:vertical;box-sizing:border-box" placeholder="在此输入..."></textarea>' +
      '<button id="taskInputBtn" style="margin-top:8px;padding:8px 20px;background:#c62828;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">✅ 完成任务</button>';
  } else {
    html += '<div style="background:rgba(255,255,255,0.6);border-radius:8px;padding:10px;margin-top:8px">' +
      '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">💡 行动类任务：在剧情中执行任务，或点击下方按钮立即生成任务执行剧情。</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button id="taskDoBtn" style="padding:7px 16px;background:linear-gradient(135deg,#c62828,#e53935);color:#fff;border:none;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600">🎴 做任务（生成剧情）</button>' +
      '<button id="taskDoneBtn" style="padding:7px 16px;background:transparent;color:var(--accent-success);border:1px solid var(--accent-success);border-radius:8px;font-size:12px;cursor:pointer;font-weight:600">✅ 我已完成</button>' +
      '</div></div>';
  }

  html += '</div>';
  return html;
}

// 构建秘密任务区域
function buildSecretMissionContent() {
  var html = '<p style="font-size:13px;font-weight:700;color:var(--accent-primary-dark);margin-bottom:8px">🎯 秘密任务</p>';

  if (!GS.secretMission || GS.secretMission.status !== 'active') {
    html += '<div style="background:var(--bg-soft);border-radius:10px;padding:16px;text-align:center;margin-bottom:16px">' +
      '<p style="color:var(--text-muted);font-size:13px">当前没有进行中的秘密任务</p></div>';
    return html;
  }

  var sm = GS.secretMission;
  var smTargetName = sm.targetMemberId ? (MEMBERS.find(function(m) { return m.id === sm.targetMemberId; }) || {}).name : '';

  html += '<div style="background:linear-gradient(135deg,#fff8e1,#fff3e0);border-radius:12px;padding:14px;margin-bottom:16px;border-left:3px solid #ff9800">' +
    '<p style="font-size:15px;font-weight:700;color:#e65100;margin-bottom:6px">' + escHtml(sm.title) + '</p>' +
    (smTargetName ? '<p style="font-size:11px;color:#8b6b6b;margin-bottom:4px">目标成员：' + escHtml(smTargetName) + '</p>' : '') +
    '<p style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:4px">' + escHtml(sm.description) + '</p>' +
    '<p style="font-size:11px;color:#8b6b6b">💡 提示：' + escHtml(sm.hint) + '</p>' +
    '<p style="font-size:11px;color:var(--text-muted);margin-top:6px">通过剧情选择或自由输入完成秘密任务，完成后点击下方按钮。</p>' +
    '<button id="smDoneBtn" style="margin-top:8px;padding:7px 16px;border:1px solid #e65100;border-radius:8px;background:transparent;color:#e65100;font-size:12px;cursor:pointer;font-weight:600">✅ 我已完成任务</button>' +
    '</div>';

  return html;
}
