import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcFile = join(__dirname, '..', '换乘恋爱_剧情记录.txt');
const outDir = join(__dirname, '..', 'public', 'test-mocks');

const text = readFileSync(srcFile, 'utf-8');
const lines = text.split('\n');

// 收集各类内容
let currentPhase = [];
let currentConsequence = [];
let currentSms = [];
let currentXArchive = [];
let currentMemory = [];
let currentStay = [];
let currentFreeAction = [];
let currentDrunk = [];
let currentTruth = [];

let inPhase = false;
let inConsequence = false;
let inSms = false;
let inXArchive = false;
let inMemory = false;
let inStay = false;
let inFreeAction = false;
let inDrunk = false;
let inTruth = false;

let currentDay = '';
let currentTime = '';

function flushAll() {
  if (currentPhase.length > 0) {
    phaseBlocks.push(currentPhase.join('\n').trim());
    currentPhase = [];
  }
  if (currentConsequence.length > 0) {
    consequenceBlocks.push(currentConsequence.join('\n').trim());
    currentConsequence = [];
  }
  if (currentSms.length > 0) {
    smsBlocks.push(currentSms.join('\n').trim());
    currentSms = [];
  }
}

const phaseBlocks = [];
const consequenceBlocks = [];
const smsBlocks = [];
const xArchiveBlocks = [];
const memoryBlocks = [];
const stayBlocks = [];
const freeActionBlocks = [];
const drunkBlocks = [];
const truthBlocks = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Day marker
  if (trimmed.startsWith('========== Day')) {
    flushAll();
    currentDay = trimmed;
    inPhase = true;
    continue;
  }

  // Time marker
  if (trimmed === '【上午】' || trimmed === '【下午】' || trimmed === '【傍晚】' || trimmed === '【深夜】') {
    flushAll();
    currentTime = trimmed;
    inPhase = true;
    inConsequence = false;
    inSms = false;
    continue;
  }

  // SMS marker
  if (trimmed === '【短信】' || trimmed.startsWith('【短信草稿】')) {
    flushAll();
    inSms = true;
    inPhase = false;
    inConsequence = false;
  }

  // 选项标记 - 后面的内容可能是 consequence
  if (trimmed === '【选项】') {
    // 选项本身归入 phase
    if (inPhase) currentPhase.push(line);
    continue;
  }

  // 判断是否是 consequent（有 "你选择了" 或 "选项后续" 等关键词）
  if (trimmed.includes('你选择了') || trimmed.includes('选择之后') || trimmed.includes('后续剧情')) {
    inConsequence = true;
    inPhase = false;
  }

  // 收集
  if (inSms) {
    currentSms.push(line);
  } else if (inConsequence) {
    currentConsequence.push(line);
  } else if (inPhase) {
    currentPhase.push(line);
  }
}

flushAll();

// 构建输出文件
function buildMock(blocks, fallback) {
  if (blocks.length === 0) return fallback;
  // 只取第一个完整块，避免拼接导致解析错误
  return blocks[0];
}

const phaseFallback = `你推开心动小屋的门，阳光从落地窗洒进来，客厅里已经有人了。

"你来啦。"一个声音从厨房方向传来。

你放下行李，环顾四周。这就是接下来12天要住的地方。

🎙【采访间】说实话，我现在心跳很快。不知道X是谁，也不知道其他人会怎么看我。

🎤他靠在门框上看着你，眼神里带着好奇。

🎬【导演OS】第一位嘉宾到达。摄像机开始记录。

💭李龙真：哦？有点紧张啊。

【选项】
1. 主动打招呼并自我介绍
2. 点点头，安静地整理行李
3. 去厨房看看有什么吃的`;

const phaseContent = buildMock(phaseBlocks, phaseFallback);
writeFileSync(join(outDir, 'phase.txt'), phaseContent, 'utf-8');

const consequenceContent = buildMock(consequenceBlocks, phaseFallback);
writeFileSync(join(outDir, 'consequence.txt'), consequenceContent, 'utf-8');

const smsContent = buildMock(smsBlocks, `深夜，你躺在床上，手机屏幕亮着。

你给【成员名】发了一条短信：「今天谢谢你。」

🎬【导演OS】深夜的短信，是这一天最后的秘密。

💭李龙真：哦？发给谁了呢？`);
writeFileSync(join(outDir, 'sms.txt'), smsContent, 'utf-8');

// 其他文件保持原样或用简单内容
const xArchiveContent = `【女主与X的恋爱档案】

相识经过：两人在一次朋友聚会上认识，因为都喜欢深夜便利店的氛围而开始聊天。

恋爱关键回忆：
- 第一次约会是在凌晨的便利店，他给她倒了一杯温水。
- 他记得她喝温水、不吃芒果、容易紧张时摸手腕。

分手原因：聚少离多，他太忙，她太安静。最后一次见面是在机场，他说"好"，她说"算了"。

【隐藏信息】
他其实下飞机后打车回了她家楼下，在车里坐了一小时，没上楼。他保留了所有聊天记录，包括她撤回的那条「我后悔了」。`;
writeFileSync(join(outDir, 'xArchive.txt'), xArchiveContent, 'utf-8');

const memoryContent = `Day 1 摘要：入住心动小屋，第一次见到三位成员。注意到X（全圆佑）的微妙反应。

Day 2 摘要：一起做饭、互相了解。尹净汉主动照顾，崔胜澈稳重可靠。

Day 3 摘要：每人讲了一个故事。X的故事隐约涉及过去。

Day 4 摘要：第一次约会配对，X记忆物品公开第一批。

Day 5 摘要：第二批X记忆公开，有人开始猜测X身份。

Day 6 摘要：集体外出活动，午夜匿名电话亭。

Day 7 摘要：匿名提问箱公开处刑。

Day 8 摘要：第三次约会配对，今晚起可以发短信给X。

Day 9 摘要：X约会日，双向读分手信。情感高潮。

Day 10 摘要：自由约会日。

Day 11 摘要：最终约会，真心话大冒险。

Day 12 摘要：最终选择日。`;
writeFileSync(join(outDir, 'memory.txt'), memoryContent, 'utf-8');

const stayContent = `你决定继续今天的故事。

阳光还很好，客厅里传来笑声。你走过去，发现他们正在讨论晚上吃什么。

🎙【采访间】我想多待一会儿。今天还没结束。

🎤他抬起头看你，眼神里带着询问。

🎬【导演OS】她选择了继续。这一天还没有写到尽头。

💭李龙真：继续？有意思。

【选项】
1. 加入讨论，提议做火锅
2. 静静听着，偶尔插一句
3. 说有点累，先回房间休息`;
writeFileSync(join(outDir, 'stay.txt'), stayContent, 'utf-8');

const freeActionContent = `你自由行动了。

房间里很安静，你走到阳台，发现有人已经坐在那里。

🎙【采访间】我只是想透透气，没想到会遇见他。

🎤他抬头看你，嘴角微微动了一下。

🎬【导演OS】阳台上的偶遇，是巧合还是必然？

💭李龙真：这个阳台真是风水宝地。

【选项】
1. 在他旁边坐下
2. 靠在栏杆上看风景
3. 说打扰了，转身回屋`;
writeFileSync(join(outDir, 'freeAction.txt'), freeActionContent, 'utf-8');

const drunkContent = `他已经喝醉了。

脸颊泛红，眼神比平时柔软得多。他靠在沙发上，手里还握着酒杯。

🎙【采访间】我第一次看到他这样。平时的克制全都卸下来了。

🎤他看着你，忽然笑了："你知道吗，我其实……"话说到一半停住了。

🎬【导演OS】醉酒后的真心话，比清醒时更危险。

💭李龙真：哦？要告白了？

【选项】
1. 问他"其实什么？"
2. 给他倒一杯水，说别喝了
3. 假装没听见，转移话题`;
writeFileSync(join(outDir, 'drunk.txt'), drunkContent, 'utf-8');

const truthContent = `真心话环节。

他抽出一张卡片，看了一眼，表情微妙地变了一下。

🎙【采访间】那个问题……他也愣住了。

🎤他把卡片放在桌上，深吸一口气。

🎬【导演OS】这个问题，没有人想回答。但规则就是规则。

💭李龙真：哇，这个问题太狠了。

【选项】
1. 如实回答
2. 拒绝回答并喝酒`;
writeFileSync(join(outDir, 'truth.txt'), truthContent, 'utf-8');

console.log('Test mocks generated successfully!');
console.log('phase blocks:', phaseBlocks.length);
console.log('consequence blocks:', consequenceBlocks.length);
console.log('sms blocks:', smsBlocks.length);
