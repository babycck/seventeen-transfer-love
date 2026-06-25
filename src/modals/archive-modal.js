import { MEMBERS, GS, HEART_NOTE_TEMPLATES, escHtml } from '../core.js';
import { createModal } from './modal-factory.js';

export function showArchiveModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '200';

  var inner = '<div class="modal-content" style="width:520px;max-width:98vw;display:flex;flex-direction:column;max-height:90vh">' +
    '<div style="display:flex;gap:4px;margin-bottom:10px;flex-shrink:0;flex-wrap:wrap">' +
    '<button class="tab-btn active" id="archiveTabX">📋 X 档案</button>' +
    '<button class="tab-btn" id="archiveTabItems">📦 记忆物品</button>' +
    '<button class="tab-btn" id="archiveTabNotes">📝 心动笔记</button>' +
    '<button class="tab-btn" id="archiveTabMissions">🎯 秘密任务</button>' +
    '</div>' +

    // Tab 1：X 档案
    '<div id="archiveXContent" style="flex:1;overflow-y:auto;padding-right:4px">' +
    buildXArchiveContent() +
    '</div>' +

    // Tab 2：X 记忆物品
    '<div id="archiveItemsContent" style="display:none;flex:1;overflow-y:auto;padding-right:4px">' +
    buildXItemsContent() +
    '</div>' +

    // Tab 3：心动笔记
    '<div id="archiveNotesContent" style="display:none;flex:1;overflow-y:auto;padding-right:4px">' +
    buildHeartNotesContent() +
    '</div>' +

    // Tab 4：秘密任务历史
    '<div id="archiveMissionsContent" style="display:none;flex:1;overflow-y:auto;padding-right:4px">' +
    buildSecretMissionContent() +
    '</div>' +

    '<button class="modal-close-x" id="archiveClose">✕</button></div>';

  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.querySelector('#archiveTabX').addEventListener('click', function() { switchArchiveTab(overlay, 'X'); });
  overlay.querySelector('#archiveTabItems').addEventListener('click', function() { switchArchiveTab(overlay, 'Items'); });
  overlay.querySelector('#archiveTabNotes').addEventListener('click', function() { switchArchiveTab(overlay, 'Notes'); });
  overlay.querySelector('#archiveTabMissions').addEventListener('click', function() { switchArchiveTab(overlay, 'Missions'); });
  overlay.querySelector('#archiveClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
}

function switchArchiveTab(overlay, tab) {
  var tabs = ['X', 'Items', 'Notes', 'Missions'];
  var ids = ['archiveTabX', 'archiveTabItems', 'archiveTabNotes', 'archiveTabMissions'];
  var contentIds = ['archiveXContent', 'archiveItemsContent', 'archiveNotesContent', 'archiveMissionsContent'];
  for (var i = 0; i < tabs.length; i++) {
    overlay.querySelector('#' + ids[i]).classList.toggle('active', tabs[i] === tab);
    document.getElementById(contentIds[i]).style.display = tabs[i] === tab ? '' : 'none';
  }
}

function buildXArchiveContent() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var xMember = members.find(function(m) { return m.id === GS.secretX; });
  var otherMembers = members.filter(function(m) { return m.id !== GS.secretX; });

  var html = '';
  if (!xMember) { return '<p style="color:var(--text-muted);text-align:center;padding:20px 0">尚未设定 X 关系</p>'; }

  html += '<p><span class="x-member-name">💔 ' + escHtml(GS.heroineProfile.name) + ' ↔ ' +
    escHtml(xMember.name) + '（' + escHtml(xMember.stageName) + '）· 场内X</span></p>';
  if (GS.xItems && GS.xItems[xMember.id]) {
    html += '<p style="font-size:11px;color:var(--text-muted);background:var(--bg-soft);padding:6px;border-radius:6px">📦 记忆物品：' + filterItemsByReveal(xMember.id, GS.xItems[xMember.id]) + '</p>';
  }
  html += formatXStory(GS.xBackstory) +
    '<hr style="border-color:var(--border-primary);margin:10px 0">';

  for (var i = 0; i < otherMembers.length; i++) {
    var om = otherMembers[i];
    html += '<p><span class="x-member-name">' + om.emoji + ' ' +
      escHtml(om.name) + '（' + escHtml(om.stageName) + '）↔ 场外X（女性）</span></p>';
    if (GS.xItems && GS.xItems[om.id]) {
      html += '<p style="font-size:11px;color:var(--text-muted);background:var(--bg-soft);padding:6px;border-radius:6px">📦 记忆物品：' + filterItemsByReveal(om.id, GS.xItems[om.id]) + '</p>';
    }
    html += formatXStory(GS.memberXBackstories && GS.memberXBackstories[om.id] || '') +
      '<hr style="border-color:var(--border-primary);margin:10px 0">';
  }
  return html;
}

function filterItemsByReveal(memberId, items) {
  if (!items) return '';
  var reveal = GS.xItemsRevealState && GS.xItemsRevealState[memberId];
  if (!reveal) return '';
  if (reveal === 'first') {
    return items.split('\n').filter(function(l) { return l.indexOf('故事：') !== 0; }).map(function(l) { return escHtml(l); }).join('<br>');
  }
  return escHtml(items).replace(/\n/g, '<br>');
}

function formatXStory(text) {
  if (!text) return '';
  var lines = text.split('\n').filter(function(l) { return l.trim(); });
  var html = '';
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf('## ') === 0) {
      html += '<div style="font-weight:700;font-size:14px;color:var(--accent-primary-dark);margin:10px 0 4px 0">' + escHtml(line.replace(/^##\s*/, '')) + '</div>';
    } else {
      html += '<p style="margin-bottom:4px;line-height:1.6">' + escHtml(line) + '</p>';
    }
  }
  return html;
}

function buildXItemsContent() {
  var html = '<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">制作组公开了以下与X相关的记忆物品：</p>';
  var hasItems = false;
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    if (!m) continue;
    var items = GS.xItems && GS.xItems[m.id];
    if (!items) continue;
    hasItems = true;
    var reveal = GS.xItemsRevealState && GS.xItemsRevealState[m.id] || 'first';
    var lines = items.split('\n');
    var filtered = [];
    for (var j = 0; j < lines.length; j++) {
      var line = lines[j].trim();
      if (!line) continue;
      if (reveal === 'first' && line.indexOf('故事：') === 0) continue;
      filtered.push(line);
    }
    html += '<div style="background:var(--bg-soft);border-radius:10px;padding:10px;margin-bottom:8px">' +
      '<p style="font-weight:700;font-size:14px;margin-bottom:4px;color:var(--text-primary)">' + m.emoji + ' ' + escHtml(m.name) + '</p>' +
      '<p style="font-size:12px;white-space:pre-wrap;color:var(--text-secondary)">' + escHtml(filtered.join('\n')).replace(/\n/g, '<br>') + '</p>' +
      (reveal === 'first' ? '<p style="font-size:11px;color:var(--accent-primary);margin-top:6px">⚠️ 故事将在下次公开时解锁</p>' : '') +
      '</div>';
  }
  if (!hasItems) html += '<p style="color:var(--text-muted);text-align:center;padding:20px 0">暂无记忆物品</p>';
  return html;
}

function buildHeartNotesContent() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var html = '<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">随着好感度提升和秘密任务完成，逐步解锁成员的隐藏细节。</p>';
  var hasAnyNote = false;

  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    if (!m) continue;
    var notes = GS.heartNotes && GS.heartNotes[m.id] || [];
    var allTemplates = HEART_NOTE_TEMPLATES && HEART_NOTE_TEMPLATES[m.id] || [];
    if (notes.length > 0) hasAnyNote = true;
    html += '<div style="background:var(--bg-soft);border-radius:12px;padding:12px;margin-bottom:10px">' +
      '<p style="font-weight:700;font-size:15px;margin-bottom:6px;color:var(--text-primary)">' + m.emoji + ' ' + m.name + ' <span style="font-size:12px;color:var(--text-muted)">（' + notes.length + '/' + allTemplates.length + '）</span></p>';
    if (notes.length === 0) {
      html += '<p style="font-size:12px;color:var(--text-muted)">（尚未解锁）</p>';
    } else {
      for (var j = 0; j < notes.length; j++) {
        var note = notes[j];
        var ua = note.unlockedAt || {};
        var source = ua.source || 'mission';
        var sourceLabel = source === 'affection' ? '💚 好感度解锁（阈值' + (ua.threshold || '?') + '）' : '🎯 秘密任务「' + (ua.mission || '?') + '」';
        var borderColor = source === 'affection' ? '#2e7d32' : '#e91e63';
        html += '<div style="background:var(--bg-card);border-radius:8px;padding:8px;margin-bottom:6px;border-left:3px solid ' + borderColor + '">' +
          '<p style="font-size:13px;color:var(--text-secondary);margin:0">' + escHtml(note.text) + '</p>' +
          '<p style="font-size:10px;color:var(--text-muted);margin-top:4px">解锁于 Day ' + (ua.day || '?') + ' · ' + sourceLabel + '</p></div>';
      }
    }
    html += '</div>';
  }

  if (!hasAnyNote) {
    html += '<p style="color:var(--text-muted);text-align:center;padding:20px 0">还没有解锁任何心动笔记。</p>';
  }

  if (GS.secretMissionUnlockFinal) {
    html += '<div style="background:linear-gradient(135deg,#fce4ec,#f8e8e8);border-radius:12px;padding:12px;margin-bottom:10px;border:2px solid #e91e63">' +
      '<p style="font-weight:700;font-size:14px;color:#c2185b;margin-bottom:6px">💌 特殊解锁：X 的未寄出的信</p>' +
      '<p style="font-size:12px;color:#5d3a3a;line-height:1.7">你在节目中完成了所有秘密任务，制作组在最后一天交给你一封信——是X在参加节目前写下的，从未寄出。<br><br>' +
      '「我以为我已经放下了。但当我签下那份参加节目的同意书时，我知道我在骗自己。<br>我不知道你会不会来。我不知道你会选谁。<br>我只知道，如果这是最后一次能和你共处一室的机会，我不想错过。」</p></div>';
  }

  return html;
}

function buildSecretMissionContent() {
  var html = '<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">已完成和当前的秘密任务记录。</p>';
  var history = GS.secretMissionHistory || [];
  var current = GS.secretMission;

  if (current && !current.completed) {
    html += '<div style="background:linear-gradient(135deg,#fff3e0,#ffe0b2);border-radius:10px;padding:12px;margin-bottom:10px;border:1.5px solid #ff9800">' +
      '<p style="font-weight:700;font-size:14px;color:#e65100;margin-bottom:4px">🏃 当前进行中的任务</p>' +
      '<p style="font-size:13px;color:#5d3a3a">' + escHtml(current.title || '未命名任务') + '</p>' +
      (current.targetId ? '<p style="font-size:11px;color:#8b6b6b;margin-top:2px">目标成员：' + escHtml(current.targetId) + '</p>' : '') +
      '</div>';
  }

  if (history.length === 0 && !current) {
    html += '<p style="color:var(--text-muted);text-align:center;padding:20px 0">暂无秘密任务历史</p>';
  } else {
    for (var i = history.length - 1; i >= 0; i--) {
      var mission = history[i];
      html += '<div style="background:var(--bg-soft);border-radius:10px;padding:10px;margin-bottom:8px">' +
        '<p style="font-weight:600;font-size:13px;color:var(--text-primary);margin-bottom:2px">' +
        escHtml(mission.title || '未命名任务') +
        (mission.completed ? ' <span style="color:var(--accent-success);font-weight:700">✅ 已完成</span>' : ' <span style="color:var(--accent-warning);font-weight:700">⏳ 未完成</span>') +
        '</p>' +
        (mission.description ? '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:2px">' + escHtml(mission.description) + '</p>' : '') +
        '<p style="font-size:11px;color:var(--text-muted)">触发于 Day ' + (mission.day || '?') +
        (mission.targetMember ? ' · 目标：' + escHtml(mission.targetMember) : '') + '</p>' +
        '</div>';
    }
  }
  return html;
}
