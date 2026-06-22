import { API_PROVIDERS } from './data.js';
import { GS } from './state.js';

function getProviderConfig(providerKey) {
  var key = providerKey || GS.apiProvider || 'deepseek';
  return API_PROVIDERS[key] || API_PROVIDERS.deepseek;
}

// ==================== 测试模式：加载剧情记录文件 ====================
var _archiveCache = null;

export function resetTestSegmentIndex(idx) {
  // stub: 保持 import 兼容（ui-renderer.js 仍然 import 此函数）
}

export function getTestSegmentIndex() {
  return 0;
}

// 加载 换乘恋爱_剧情记录.txt 并切片
async function _loadStoryArchive() {
  if (_archiveCache) return _archiveCache;
  try {
    var resp = await fetch('/story-archive.txt?t=' + Date.now());
    if (!resp.ok) return null;
    var text = await resp.text();

    var archive = {};
    // dayBlocks[0]=前置文本, [1]=Day数字, [2]=该Day内容, [3]=Day数字, [4]=内容...
    var dayBlocks = text.split(/^========== Day (\d+) ==========$/m);
    for (var i = 1; i < dayBlocks.length; i += 2) {
      var dayNum = parseInt(dayBlocks[i]);
      var dayContent = dayBlocks[i + 1];
      if (isNaN(dayNum) || !dayContent) continue;

      // phaseBlocks[0]=前置文本, [1]=阶段名, [2]=该阶段内容...
      // 在跨行模式下 ^ 匹配每行开头，所以 m flag 是必须的
      var phaseBlocks = dayContent.split(/^【(上午|下午|傍晚|深夜)】/m);
      var dayData = {};
      for (var j = 1; j < phaseBlocks.length; j += 2) {
        var phaseKey = phaseBlocks[j];
        var phaseContent = (phaseBlocks[j + 1] || '').trim();
        if (phaseContent) {
          dayData[phaseKey] = _convertPhaseToJson(phaseContent);
        }
      }
      archive[dayNum] = dayData;
    }

    _archiveCache = archive;
    return archive;
  } catch (e) {
    console.warn('[test mode] 加载存档失败:', e);
    return null;
  }
}

// 将一段剧本文本（如 Day 1 上午的全部内容）转换为 JSON scene 对象
function _convertPhaseToJson(text) {
  var lines = text.split('\n');
  var blocks = [];
  var observers = [];
  var options = [];
  var smsDrafts = [];

  var currentType = 'narrative';
  var currentMember = '';
  var currentContent = [];

  function flushBlock() {
    var content = currentContent.join('\n').trim();
    if (!content) return;
    currentContent = [];

    if (currentType === 'narrative') {
      blocks.push({ type: 'narrative', content: content });
    } else if (currentType === 'interview') {
      blocks.push({ type: 'interview', content: content });
    } else if (currentType === 'xInterview') {
      blocks.push({ type: 'xInterview', content: content });
    } else if (currentType === 'memberInterview') {
      blocks.push({ type: 'memberInterview', member: currentMember, content: content });
    } else if (currentType === 'directorOS') {
      blocks.push({ type: 'directorOS', content: content });
    } else if (currentType === 'observerOS') {
      _parseObserverLines(content, observers, blocks);
    } else if (currentType === 'options') {
      _parseOptionLines(content, options);
    } else if (currentType === 'sms') {
      _parseSmsLines(content, smsDrafts);
    }
  }

  for (var li = 0; li < lines.length; li++) {
    var raw = lines[li];
    var trimmed = raw.trim();
    if (!trimmed) continue;

    // 🎙【采访间】或 🎙️【采访间】（带 emoji 变体选择符）
    if (/^🎙️?💔?【X?采访间】/.test(trimmed) && trimmed.indexOf('采访间') >= 0 && trimmed.indexOf('X') >= 0) {
      flushBlock();
      currentType = 'xInterview';
      continue;
    }
    if (/^🎙️?【采访间】/.test(trimmed)) {
      flushBlock();
      currentType = 'interview';
      continue;
    }

    // 🎤【成员名采访间】
    var memberMatch = trimmed.match(/^🎤【(.+?)采访间】/);
    if (memberMatch) {
      flushBlock();
      currentType = 'memberInterview';
      currentMember = memberMatch[1];
      continue;
    }

    // 🎬【导演OS】
    if (trimmed.indexOf('🎬【导演OS】') === 0) {
      flushBlock();
      currentType = 'directorOS';
      continue;
    }

    // 💭【观察员OS】
    if (trimmed.indexOf('💭【观察员OS】') === 0) {
      flushBlock();
      currentType = 'observerOS';
      continue;
    }

    // 【选项】
    if (trimmed === '【选项】') {
      flushBlock();
      currentType = 'options';
      continue;
    }

    // 【短信草稿】
    if (trimmed === '【短信草稿】' || trimmed === '【短信草稿】') {
      flushBlock();
      currentType = 'sms';
      continue;
    }

    // 跳过阶段标题（理论上不会到达这里，因为上层已按 phase 切分）
    if (/^【(上午|下午|傍晚|深夜)】$/.test(trimmed)) continue;

    currentContent.push(raw);
  }

  flushBlock();

  // 兜底：至少有一条 narrative
  if (blocks.length === 0) {
    blocks.push({ type: 'narrative', content: '(测试模式：该场景无对应剧情记录)' });
  }

  return {
    blocks: blocks,
    observers: observers,
    options: options,
    smsDrafts: smsDrafts,
    drinks: [],
    secretMissionDone: false
  };
}

// 解析观察员 OS 行，每行格式为 "姓名：内容"
function _parseObserverLines(content, observers, blocks) {
  var obsLines = content.split('\n');
  for (var i = 0; i < obsLines.length; i++) {
    var line = obsLines[i].trim();
    if (!line) continue;
    // 尝试匹配 "姓名："（中文全角冒号或英文冒号）
    var colonIdx = line.indexOf('：');
    if (colonIdx < 0) colonIdx = line.indexOf(':');
    if (colonIdx > 0 && colonIdx < 20) {
      var name = line.slice(0, colonIdx).trim();
      var text2 = line.slice(colonIdx + 1).trim();
      if (name && text2) {
        observers.push({ name: name, line: text2 });
        continue;
      }
    }
    // 没有冒号的行作为普通 observerOS block
    blocks.push({ type: 'observerOS', content: line });
  }
}

// 解析选项：数字序号的行 + [好感度: ...] 行
function _parseOptionLines(content, options) {
  var optLines = content.split('\n');
  var tempOpts = [];
  var affMatches = [];

  for (var i = 0; i < optLines.length; i++) {
    var line = optLines[i].trim();
    if (!line) continue;

    // 匹配 "1. 文本" 或 "1）文本"
    var optMatch = line.match(/^\d+[.)、]\s*(.+)/);
    if (optMatch) {
      tempOpts.push({ text: optMatch[1] });
      continue;
    }

    // 匹配 [好感度: 姓名+delta, 原因: ...] 或 [好感度: 姓名+delta]
    var affMatch = line.match(/^\[好感度:\s*(.+?)(?:,\s*原因:\s*(.+))?\]$/);
    if (affMatch) {
      var affStr = affMatch[1];
      var reason = (affMatch[2] || '').trim();
      var parts = affStr.match(/^(.+?)([+-]\d+)$/);
      if (parts) {
        affMatches.push({
          name: parts[1].trim(),
          delta: parseInt(parts[2]),
          reason: reason
        });
      }
      continue;
    }
  }

  // 把好感度数据分配到选项上
  // 如果好感度行数与选项数一致：一一对应
  // 如果只有一条好感度：分配给第一个选项
  if (tempOpts.length > 0) {
    if (affMatches.length === 1) {
      tempOpts[0].affName = affMatches[0].name;
      tempOpts[0].affDelta = affMatches[0].delta;
      tempOpts[0].affReason = affMatches[0].reason;
    } else {
      for (var j = 0; j < tempOpts.length && j < affMatches.length; j++) {
        tempOpts[j].affName = affMatches[j].name;
        tempOpts[j].affDelta = affMatches[j].delta;
        tempOpts[j].affReason = affMatches[j].reason;
      }
    }
  }

  for (var k = 0; k < tempOpts.length; k++) {
    options.push(tempOpts[k]);
  }
}

// 解析短信草稿：以 - 或 • 开头的行
function _parseSmsLines(content, smsDrafts) {
  var smsLines = content.split('\n');
  for (var i = 0; i < smsLines.length; i++) {
    var line = smsLines[i].trim();
    if (!line) continue;
    var draft = line.replace(/^[-•]\s*/, '').trim();
    if (draft) smsDrafts.push(draft);
  }
}

// 根据当前 GS.day/phaseIndex 选取对应场景，返回 JSON.stringify 后的字符串
function _pickTestScene(type) {
  var archive = _archiveCache;
  if (!archive) return null;

  var phaseKeys = ['上午', '下午', '傍晚', '深夜'];
  var phaseKey = phaseKeys[GS.phaseIndex] || '上午';

  // 特殊场景映射到特定日期
  if (type === 'truth' || type === 'drunk') {
    var day11 = archive[11];
    if (day11) {
      var s = day11[phaseKey];
      if (s) return JSON.stringify(s);
      for (var k in day11) { if (day11[k]) return JSON.stringify(day11[k]); }
    }
    // 没有 Day 11 则尝试最近的日期
  }

  if (type === 'questionBox') {
    var day7 = archive[7];
    if (day7) {
      var s = day7['傍晚'] || day7['深夜'];
      if (s) return JSON.stringify(s);
      for (var k in day7) { if (day7[k]) return JSON.stringify(day7[k]); }
    }
  }

  if (type === 'finalResult') {
    return null; // 上层 fallback 硬编码 finalResult JSON
  }

  // 常规场景：按当前 day+phase 选取
  var dayData = archive[GS.day];
  if (!dayData) {
    // 回退到最近的一天
    var days = Object.keys(archive).map(Number).sort(function(a, b) { return a - b; });
    var nearest = null;
    for (var di = 0; di < days.length; di++) {
      if (days[di] >= GS.day) { nearest = days[di]; break; }
    }
    if (nearest === null && days.length > 0) nearest = days[days.length - 1];
    if (nearest) dayData = archive[nearest];
  }

  if (dayData) {
    var scene = dayData[phaseKey];
    if (scene) return JSON.stringify(scene);
    // fallback：该天的任意阶段
    for (var pk in dayData) {
      if (dayData[pk]) return JSON.stringify(dayData[pk]);
    }
  }

  return null;
}

// ==================== API 调用 ====================
function pickModel(sceneType) {
  var cfg = getProviderConfig();
  if (GS.apiModel) return GS.apiModel;
  var heavy = ['phase', 'consequence', 'finalResult', 'truth'];
  var light = ['sms', 'gift', 'midnightCall', 'freeAction', 'stay'];
  var cheap = ['compress', 'xItems', 'dailySummary'];
  if (sceneType && cfg.sceneModels) {
    if (heavy.indexOf(sceneType) >= 0) return cfg.sceneModels.heavy || cfg.model;
    if (light.indexOf(sceneType) >= 0) return cfg.sceneModels.light || cfg.model;
    if (cheap.indexOf(sceneType) >= 0) return cfg.sceneModels.cheap || cfg.model;
  }
  return cfg.model;
}

export async function callDeepSeek(systemPrompt, userMessage, maxTokens, useJson, temperature, sceneType) {
  useJson = (useJson !== false);
  // 测试模式：从剧情记录文件选取场景
  if (GS.testMode) {
    if (useJson) {
      // 先确保存档已加载
      var archive = await _loadStoryArchive();
      if (!archive) {
        // 加载失败则返回 fallback JSON
        return JSON.stringify({
          blocks: [{ type: 'narrative', content: '（测试模式：无法加载剧情记录文件）' }],
          observers: [],
          options: [{ text: '继续' }, { text: '继续' }, { text: '继续' }],
          smsDrafts: [],
          drinks: [],
          secretMissionDone: false
        });
      }

      // 从 userMessage 推断场景类型
      var um = (userMessage || '').toLowerCase();
      var sceneType = 'phase';
      if (um.indexOf('真心话') >= 0 || um.indexOf('truth') >= 0) sceneType = 'truth';
      else if (um.indexOf('醉酒') >= 0 || um.indexOf('drunk') >= 0) sceneType = 'drunk';
      else if (um.indexOf('提问箱') >= 0 || um.indexOf('question') >= 0) sceneType = 'questionBox';
      else if (um.indexOf('后续') >= 0 || um.indexOf('consequence') >= 0) sceneType = 'consequence';
      else if (um.indexOf('自由行动') >= 0 || um.indexOf('free') >= 0) sceneType = 'freeAction';
      else if (um.indexOf('继续今天') >= 0 || um.indexOf('stay') >= 0) sceneType = 'stay';
      else if (um.indexOf('短信') >= 0 || um.indexOf('sms') >= 0) sceneType = 'sms';
      else if (um.indexOf('最终选择') >= 0 || um.indexOf('final') >= 0) sceneType = 'finalResult';

      var sceneJson = _pickTestScene(sceneType);
      if (sceneJson) return sceneJson;

      // finalResult 没有对应数据时返回硬编码 fallback
      if (sceneType === 'finalResult') {
        return JSON.stringify({
          blocks: [
            { type: 'narrative', content: '十二天的心动旅程走到了终点。你站在心动小屋的门前，回头看了一眼这栋承载了无数回忆的房子。阳光依旧从落地窗洒进来，厨房里仿佛还能听到他们三个人的笑声。你闭上眼睛，深吸一口气——无论结局如何，这段旅程已经改变了你。' },
            { type: 'directorOS', content: '摄像机缓缓拉远。心动小屋的轮廓在暮色中渐渐模糊，像一段即将封存的记忆。三个人的身影在门廊下一字排开——有人低下头，有人望着你的方向，有人抬手遮住了眼睛。风把他们的衣角吹起来，又放下。没有人说话。画外音响起：「十二天很短，短到只够爱上一个人。十二天很长，长到需要用余生去忘记。你做出了选择。但真正的答案，也许要等到很久以后才会浮现。」' }
          ],
          observers: [
            { name: '李龙真', line: '这个结局让我想起了一句话——有些路，走下去会很累；不走，会后悔。' },
            { name: '金叡园', line: '不管她选了谁，我都支持她。这十二天她已经足够勇敢了。' }
          ],
          options: [],
          smsDrafts: [],
          drinks: [],
          secretMissionDone: false
        });
      }

      // 兜底 fallback
      return JSON.stringify({
        blocks: [{ type: 'narrative', content: '（测试模式：该场景暂无对应剧情记录）' }],
        observers: [],
        options: [{ text: '继续' }, { text: '继续' }, { text: '继续' }],
        smsDrafts: [],
        drinks: [],
        secretMissionDone: false
      });
    } else {
      // 非 JSON 调用（记忆压缩、送礼反应、午夜间电话亭等）：返回占位文本
      return '（测试模式：此功能使用 fallback 文本，无 AI 生成内容）';
    }
  }

  maxTokens = maxTokens || 6000;
  var cfg = getProviderConfig();

  var model = GS.apiModel || cfg.model;
  var requestBody = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: maxTokens,
    temperature: (typeof temperature === 'number' ? temperature : 1)
  };
  // 剧情生成（JSON 模式）强制结构化，记忆压缩/送礼等自定义 prompt 仍用自然文本
  if (useJson && cfg.supportsJson !== false) requestBody.response_format = { type: 'json_object' };

  var resp = await fetch(cfg.endpoint + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GS.apiKey
    },
    body: JSON.stringify(requestBody)
  });
  if (!resp.ok) {
    var err = await resp.text();
    throw new Error('API ' + resp.status + ': ' + err);
  }
  var data = await resp.json();
  var msg = data.choices && data.choices[0] && data.choices[0].message;
  var content = (msg && msg.content && msg.content.trim()) ? msg.content : (msg && msg.reasoning_content || '');
  if (!content || content.trim().length === 0) {
    throw new Error('API 返回了空内容，请检查模型名称和 API Key 权限');
  }
  // 兜底：模型偶尔会在 JSON 外围包 ```json 代码块——strip 掉再返回
  content = stripJsonFence(content).trim();
  return content;
}

// 去除 ```json / ``` 围栏，提取最外层 { ... } 子串
function stripJsonFence(text) {
  if (!text) return text;
  var t = text.trim();
  // 去代码围栏
  if (t.indexOf('```') === 0) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  // 提取最外层 { ... } 子串（应付模型前后偶尔的解释文字）
  if (t.charAt(0) !== '{') {
    var start = t.indexOf('{');
    var end = t.lastIndexOf('}');
    if (start >= 0 && end > start) {
      t = t.slice(start, end + 1);
    }
  }
  return t;
}

// 测试模式入口：按类型加载对应剧情记录场景
export async function loadTestScene(type) {
  var archive = await _loadStoryArchive();
  if (!archive) return null;
  return _pickTestScene(type);
}

export async function testAPIConnection(apiKey, providerKey) {
  try {
    var cfg = getProviderConfig(providerKey);
    var model = GS.apiModel || cfg.model;
    var requestBody = {
      model: model,
      messages: [{ role: 'user', content: '请回复"连接成功"' }],
      max_tokens: 10,
      temperature: 1
    };
    var resp = await fetch(cfg.endpoint + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(requestBody)
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}
