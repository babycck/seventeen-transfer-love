// ============================================================
// 娱乐圈模拟器（entSim）· 响应解析
// AI 以 JSON 返回 { narrative, options, entSimExtras }；兜底回退到 markdown 解析。
// ============================================================
import { safeParseJson, parseNarrative } from '../parser.js';

// 解析整段 AI 返回：优先 JSON，否则用 narrative markdown 解析
export function parseEntSimResponse(rawText) {
  if (!rawText) return { narrative: '', options: [], extras: {} };
  var json = safeParseJson(rawText);
  if (json && typeof json === 'object') {
    if (typeof json.narrative === 'string' || Array.isArray(json.options) || json.entSimExtras) {
      return {
        narrative: typeof json.narrative === 'string' ? json.narrative : '',
        options: Array.isArray(json.options) ? json.options : [],
        extras: json.entSimExtras && typeof json.entSimExtras === 'object' ? json.entSimExtras : {}
      };
    }
  }
  // 兜底：作为 markdown 叙事处理
  var parsed = parseNarrative(rawText);
  return { narrative: parsed.narrative || '', options: parsed.options || [], extras: {} };
}

// 规范化 entSimExtras 字段（防脏数据）
export function parseEntSimExtras(extras) {
  if (!extras || typeof extras !== 'object') return {};
  function num(v) { return typeof v === 'number' ? v : 0; }
  var out = {};
  if (extras.romanceBeat) {
    out.romanceBeat = {
      depthDelta: num(extras.romanceBeat.depthDelta),
      emotion: typeof extras.romanceBeat.emotion === 'string' ? extras.romanceBeat.emotion : '',
      note: typeof extras.romanceBeat.note === 'string' ? extras.romanceBeat.note : '',
      event: typeof extras.romanceBeat.event === 'string' ? extras.romanceBeat.event : ''
    };
  }
  if (extras.npcEncounter && extras.npcEncounter.type) {
    out.npcEncounter = {
      type: extras.npcEncounter.type,
      name: typeof extras.npcEncounter.name === 'string' ? extras.npcEncounter.name : '',
      intimacyDelta: num(extras.npcEncounter.intimacyDelta),
      stance: typeof extras.npcEncounter.stance === 'string' ? extras.npcEncounter.stance : '',
      event: typeof extras.npcEncounter.event === 'string' ? extras.npcEncounter.event : '',
      exposure: num(extras.npcEncounter.exposure)
    };
  }
  if (extras.opinionDelta) {
    out.opinionDelta = {
      fan: num(extras.opinionDelta.fan),
      media: num(extras.opinionDelta.media),
      professional: num(extras.opinionDelta.professional),
      anti: num(extras.opinionDelta.anti)
    };
  }
  if (extras.workProgress) {
    out.workProgress = {
      buzzDelta: num(extras.workProgress.buzzDelta),
      note: typeof extras.workProgress.note === 'string' ? extras.workProgress.note : ''
    };
  }
  if (extras.exposureEvent) {
    out.exposureEvent = {
      magnitude: num(extras.exposureEvent.magnitude),
      note: typeof extras.exposureEvent.note === 'string' ? extras.exposureEvent.note : ''
    };
  }
  if (typeof extras.chapterHint === 'number') out.chapterHint = extras.chapterHint;
  if (extras.awardsNomination) out.awardsNomination = true;
  if (extras.collabProposal) {
    out.collabProposal = {
      type: typeof extras.collabProposal.type === 'string' ? extras.collabProposal.type : '',
      subject: typeof extras.collabProposal.subject === 'string' ? extras.collabProposal.subject : '',
      risk: num(extras.collabProposal.risk),
      sweetness: num(extras.collabProposal.sweetness),
      source: typeof extras.collabProposal.source === 'string' ? extras.collabProposal.source : '经纪人'
    };
  }
  if (extras.fanServiceNote && extras.fanServiceNote.type) out.fanServiceNote = { type: extras.fanServiceNote.type };
  if (typeof extras.endingsHint === 'string') out.endingsHint = extras.endingsHint;
  if (extras.brother) {
    out.brother = {
      stance: typeof extras.brother.stance === 'string' ? extras.brother.stance : '',
      supportDelta: num(extras.brother.supportDelta),
      note: typeof extras.brother.note === 'string' ? extras.brother.note : ''
    };
  }
  if (extras.secret) {
    out.secret = {
      item: typeof extras.secret.item === 'string' ? extras.secret.item : '',
      foundByRival: !!extras.secret.foundByRival
    };
  }
  return out;
}
