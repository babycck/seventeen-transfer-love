import { MEMBERS, GS, PHASES, PHASE_LABELS, PHASE_ACTION_LIMIT, MAX_STAY_COUNT, escHtml } from '../core.js';
import { createModal } from './modal-factory.js';

export function showHelpModal() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var xMember = members.find(function(m) { return m.id === GS.secretX; });

  var inner = '<div class="modal-content" style="width:500px;max-width:98vw"><h3>❓ 规则速览</h3>' +
    '<div style="font-size:12px;line-height:1.8;color:#5d3a3a">' +
    '<p><strong>📅 当前：Day ' + GS.day + ' · ' + PHASE_LABELS[PHASES[GS.phaseIndex]] + '</strong></p>' +
    '<p><strong>💔 你的X：</strong>' + xMember.emoji + ' ' + xMember.name + '（秘密恋爱2年，分手1年，团内无人知晓）</p>' +
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
    (GS.heroineProfile.privateTraits.length > 0 ? '<p><strong>⚠️ 私密体质：</strong>' + GS.heroineProfile.privateTraits.join('、') + '</p>' : '') +
    '</div>' +
    '<button class="modal-close-x" id="helpClose">✕</button></div>';
  var overlay = createModal(inner);
  overlay.querySelector('#helpClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
}
