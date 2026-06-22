import {
  MEMBERS, TOKEN_CONFIG, GS, saveGame,
  showLoading, hideLoading, showToast, callDeepSeek
} from './core.js';
import { parseNarrative } from './parser.js';
import { updateAffection, addAffectionLog } from './affection.js';
import { buildSystemPrompt, buildUserMessage } from './prompts.js';
import { compressTodayForInjection } from './memory.js';
import { validateNarrative } from './validator.js';
import { checkMissionInteract } from './utils.js';

export async function sendSms(targetId, smsContent) {
  var targetMember = MEMBERS.find(function(m) { return m.id === targetId; });
  GS.smsSentToday = true;
  GS.smsTarget = targetId;
  GS.smsDrafts = [];
  GS.smsHistory.push({
    day: GS.day,
    target: targetId,
    name: targetMember.name,
    content: smsContent
  });

  updateAffection(targetId, 5);
  addAffectionLog(targetId, 5, '你发送了心动短信给' + targetMember.name);

  var otherIds = GS.selectedMembers.filter(function(id) { return id !== targetId; });
  for (var i = 0; i < otherIds.length; i++) {
    updateAffection(otherIds[i], -1);
    addAffectionLog(otherIds[i], -1, '未收到短信');
  }

  checkMissionInteract(targetMember.name + ' ' + smsContent);

  if (!GS.aiEnabled) {
    saveGame();
    if (window.__renderAll) window.__renderAll();
    return;
  }

  showLoading('正在发送短信...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('sms', {
      targetName: targetMember.name,
      smsContent: smsContent
    });
    var rawText = await callDeepSeek(sysPrompt, userMsg, TOKEN_CONFIG.sms, true, 0.4);
    var parsed = parseNarrative(rawText);
    var corrections = validateNarrative(rawText, parsed);
    if (corrections.length > 0) { if (!GS.aiCorrections) GS.aiCorrections = []; GS.aiCorrections = GS.aiCorrections.concat(corrections); }
    parsed.options = [];
    GS.consequenceNarratives.push({ rawText: rawText, parsed: parsed, choiceText: '📨 发送短信给' + targetMember.name + '：' + smsContent });
    GS.currentOptions = [];
    GS.todayFullText.push(rawText);
    saveGame();
    if (window.__renderAll) window.__renderAll();
  } catch (e) {
    alert('⚠️ 短信生成失败：' + e.message + '\n请点击刷新按钮重试。');
    saveGame();
    if (window.__renderAll) window.__renderAll();
  }
  hideLoading();
}
