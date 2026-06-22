import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcFile = join(__dirname, '..', '换乘恋爱_剧情记录.txt');
const outDir = join(__dirname, '..', 'public', 'test-mocks');

const text = readFileSync(srcFile, 'utf-8');
const lines = text.split('\n');

// 分割策略：每段包含正文 + 【选项】 + 选项 + 好感度标记
// 以 【选项】 作为触发点，收集到好感度标记后的空行，结束当前段
var segments = [];
var currentSegment = [];
var inOptions = false;
var hasOptions = false;
var waitingForAffinityEnd = false;

for (var i = 0; i < lines.length; i++) {
  var line = lines[i];
  var trimmed = line.trim();

  // 遇到 【选项】 标记
  if (trimmed === '【选项】') {
    inOptions = true;
    hasOptions = true;
    waitingForAffinityEnd = false;
    currentSegment.push(line);
    continue;
  }

  // 如果在选项区域内
  if (inOptions) {
    currentSegment.push(line);
    // 好感度标记行 → 设置等待结束标志
    if (trimmed.startsWith('[好感度:')) {
      waitingForAffinityEnd = true;
      continue;
    }
    // 好感度标记后的第一个空行 → 结束当前段
    if (waitingForAffinityEnd && trimmed === '') {
      segments.push(currentSegment.join('\n').trim());
      currentSegment = [];
      inOptions = false;
      hasOptions = false;
      waitingForAffinityEnd = false;
      continue;
    }
    // 没有好感度标记时，收集到3个选项后的空行也结束
    if (trimmed === '' && hasOptions && !waitingForAffinityEnd) {
      var optCount = 0;
      for (var k = 0; k < currentSegment.length; k++) {
        if (/^\d+[\.．、]\s*/.test(currentSegment[k].trim())) optCount++;
      }
      if (optCount >= 3) {
        segments.push(currentSegment.join('\n').trim());
        currentSegment = [];
        inOptions = false;
        hasOptions = false;
        waitingForAffinityEnd = false;
        continue;
      }
    }
    continue;
  }

  // 普通正文行
  currentSegment.push(line);
}

if (currentSegment.length > 0) {
  segments.push(currentSegment.join('\n').trim());
}

console.log('Total segments found:', segments.length);

// 清理旧的 segment 文件
var existing = readdirSync(outDir);
for (var f = 0; f < existing.length; f++) {
  if (existing[f].match(/^segment_\d+\.txt$/)) {
    unlinkSync(join(outDir, existing[f]));
  }
}

// 写入 segment 文件
for (var s = 0; s < segments.length; s++) {
  writeFileSync(join(outDir, 'segment_' + s + '.txt'), segments[s], 'utf-8');
}

// 准备专用文件
if (segments.length > 0) {
  writeFileSync(join(outDir, 'phase.txt'), segments[0], 'utf-8');
}
if (segments.length > 1) {
  writeFileSync(join(outDir, 'consequence.txt'), segments[1], 'utf-8');
}
if (segments.length > 2) {
  var stayContent = segments.slice(2).join('\n\n');
  writeFileSync(join(outDir, 'stay.txt'), stayContent, 'utf-8');
}

// 找一个包含短信的段作为 sms.txt
var smsIdx = -1;
for (var si = 0; si < segments.length; si++) {
  if (segments[si].indexOf('【短信') >= 0 || (segments[si].indexOf('短信') >= 0 && segments[si].indexOf('📨') >= 0)) {
    smsIdx = si;
    break;
  }
}
if (smsIdx >= 0) {
  writeFileSync(join(outDir, 'sms.txt'), segments[smsIdx], 'utf-8');
}

console.log('Files written:');
console.log('- phase.txt (segment_0):', segments[0] ? segments[0].split('\n').length + ' lines' : 'N/A');
console.log('- consequence.txt (segment_1):', segments[1] ? segments[1].split('\n').length + ' lines' : 'N/A');
console.log('- stay.txt (segment_2+):', segments.length > 2 ? (segments.length - 2) + ' segments' : 'N/A');
console.log('- sms.txt (segment_' + smsIdx + '):', smsIdx >= 0 ? segments[smsIdx].split('\n').length + ' lines' : 'N/A');
console.log('- Total segment files:', segments.length);
