---
name: 修复真心话喝酒计数与提前结束问题
overview: 修复 Day 11 真心话环节两个 bug:1) 喝酒计数重复累加(本地兜底 +1 与 AI 返回 drinks 重复叠加);2) 真心话提前收束结束(prompt 收束指令无条件注入每一轮,导致 AI 在前两轮就提前收束,玩家感觉只玩两轮就结束)。顺带修复 prompt 中问题卡取值不一致问题。
todos:
  - id: fix-drink-double-count
    content: 修复 game-engine.js handleTruthRound 中女主喝酒计数重复累加：本地兜底加酒后从 parsed.drinks 移除女主条目
    status: pending
  - id: fix-truth-premature-end
    content: 修复 prompts.js 真心话收束指令无条件注入：仅第3轮第4人注入收束，其余轮次注入延续指令
    status: pending
  - id: fix-card-inconsistency
    content: 修复 prompts.js 第394行问题卡取值：ts.levelMap[currentLevel][0] 改为 ts.currentCard
    status: pending
---

## 用户需求

修复真心话系统中的两个 bug：

### 问题一：喝酒计数重复累加

真心话面板选项框下方的喝酒计数显示数量翻倍。女主每选一次"拒绝回答并喝酒(+1杯)"，实际计数 +2 而非 +1。

**根因**：`handleTruthRound()` 中存在双重累加 —— 本地兜底先给女主 +1（第514-519行），随后 `applyParsedSideEffects(parsed)` 又从 AI 返回的 `parsed.drinks` 中再次给女主 +1（第578行）。而 prompt 明确告知 AI 女主选择了喝酒，AI 会在 drinks 中重复输出。

### 问题二：真心话只两轮就提前结束

玩家感觉真心话只经历两轮就被告知结束，未正常进入第三轮（深度）。

**根因**：`prompts.js` 第559行的收束指令"第3轮第4人剧情要自然收束，准备进入深夜"被**无条件注入每一轮每一人**，导致 AI 在前两轮就提前收束剧情。推进逻辑本身（3轮×4人=12人次）经验证正确，无需修改。

### 附带修复1：问题卡取值不一致

`prompts.js` 第394行用 `ts.levelMap[currentLevel][0]` 取问题卡，而 `game-engine.js` 用 `ts.currentCard`，两者不一致导致开场注入的问题卡与实际显示不符。

### 附带修复2：Day 11/12 选项字数过长

用户之前规定选项 text 10-15 字,但 Day 11 后面及 Day 12 的选项仍然过长。

**根因**：10-15 字限制只在 `generateOptions` 分支(prompts.js 第654行)注入。但 Day 11/12 的选项实际来自其他分支,均未注入字数限制:

- `consequence` 类型(第607-611行):Day 11 真心话后剧情、Day 12 选项后续 —— 无字数限制
- `phase` 类型(第665-667行):Day 11/12 时段剧情自带 options —— 无字数限制
- `stay` 类型(第630行):继续今天 —— 无字数限制

而 `generateOptions` 分支在 Day 11 真心话模式不触发(骨架 `option-engine.js` 第26-28行返回 `[]`),所以 10-15 字限制对 Day 11 真心话后的选项根本没生效。

另外 Day 12 第662行"每个选项的文本要体现女主的内心纠结,不要直接只写名字"可能诱导 AI 写长句。

### 附带修复3：成员 drinks 语义不明导致重复累加

成员喝酒虽然没有本地兜底（不会像女主那样确定性翻倍），但 prompt 中 `drinks` 的语义存在矛盾：

- 第80行示例 `"count": 1` 暗示是单次增量
- 第412行 / 第559行"导演OS体现当前每人已喝酒杯数"暗示累计值

而 `applyDrinksFromParsed` 是把 `count` 当**增量**累加的（`drinkCounts[id] += count`）。若 AI 理解成"体现当前每人已喝酒杯数"而每轮返回所有人的累计值，会导致历史值被重复累加。例如第2轮返回 `{A:1, B:1}`（体现"当前杯数"），A 就会被错误地从 1 累加到 2。轮次越靠后偏差越大。

**根因**：prompt 措辞与 `drinks` 实际语义（增量）不一致。

## 涉及范围

- `src/game-engine.js` — `handleTruthRound()` 中去重女主喝酒计数
- `src/prompts.js` — 收束指令条件化 + 问题卡取值修正 + drinks 语义澄清 + 选项字数限制全分支注入

## 技术栈

- Vanilla JS (ES Modules) + Vite，无新依赖
- 使用 `var`（非 let/const），字符串用 `+` 拼接，保持现有代码风格

## 实现方案

### 修复1：喝酒计数去重（game-engine.js `handleTruthRound`）

在 `handleTruthRound` 中，本地兜底给女主加酒后（第514-519行），在调用 `applyParsedSideEffects(parsed)` 之前（第578行），从 `parsed.drinks` 中移除女主(heroine)条目，避免重复累加。

**设计考量**：

- 保留本地兜底逻辑（AI 可能漏返 drinks，本地兜底确保计数不丢）
- 成员喝酒仍由 AI 通过 `parsed.drinks` 返回（成员无本地兜底，不受影响）
- 仅去重 AI 返回中的女主记录，最小改动，不影响其他流程

```javascript
// 伪代码：在 applyParsedSideEffects(parsed) 之前插入
if (parsed && parsed.drinks && drankThisRound) {
  parsed.drinks = parsed.drinks.filter(function(d) {
    return !(d && (d.name === '女主' || d.name === '你'));
  });
}
```

### 修复2：收束指令条件化（prompts.js 第559行）

将第559行"生成步骤"第4点改为条件注入：

- 当 `extra.truthRound === 3 && extra.truthSubRound === 4`（最后一轮最后一人）时：注入"剧情自然收束，准备进入深夜"
- 其余轮次：注入"剧情自然延续，不要提前收束，不要提及进入深夜或结束"

**设计考量**：

- 推进逻辑（`handleTruthRound` 第526-543行）已验证正确，不修改
- 仅通过 prompt 引导 AI 行为，确保前两轮剧情正常展开
- 条件判断使用已有的 `extra.truthRound` 和 `extra.truthSubRound` 参数

### 修复3：问题卡取值一致（prompts.js 第394行）

将 `ts.levelMap[currentLevel][0]` 改为 `ts.currentCard`，与 `game-engine.js` 保持一致。

**原因**：`levelMap[currentLevel][0]` 是下一张未使用的卡（已被 shift 出的 currentCard 才是当前正在使用的卡），导致 phase 类型首次开场注入的问题卡与 UI 显示不符。

### 修复4：drinks 语义澄清（prompts.js 多处）

明确 `drinks` 数组为"本轮新增增量"，禁止 AI 输出累计值，并调整"导演OS体现当前每人已喝酒杯数"的措辞为"导演OS体现本轮新增喝酒情况"。

**具体改动**：

1. **第80行** JSON 示例注释明确为增量：
`"drinks": [ { "name": "成员名或\"女主\"", "count": 1 } ]` → 补充说明 `// count 为本轮新增杯数，不是累计值，只列出本轮实际喝酒的人`

2. **第87行** 规则强化：
`⚠️ smsDrafts 只在深夜(phaseIndex===3)输出；drinks 只在真心话/提问箱环节输出。` → 追加 `drinks 只填写本轮新增喝酒的人（增量），禁止重复输出之前已喝的人的累计杯数。累计值由系统自动维护。`

3. **第404行**（phase 类型真心话注入）"当前喝酒计数"措辞保留（此处是注入给 AI 的上下文，正确），但删除"导演OS体现当前每人已喝酒杯数"中可能引发误解的部分。

4. **第412行 / 第559行**："导演OS体现当前每人已喝酒杯数" → "导演OS体现本轮新增喝酒情况（不要重复累加历史杯数）"

**设计考量**：

- 累计值已由前端 `GS.drinkCounts` 自行维护并作为上下文注入 prompt（第395-404行的 `drinkLines`），AI 无需也不应在 drinks 中重复输出
- 仅改 prompt 措辞，不改 `applyDrinksFromParsed` 逻辑（其增量累加语义本身正确）
- 与修复1（女主去重）正交，共同保证喝酒计数准确

## 实现注意事项

- **性能**：修改仅涉及条件判断和数组过滤，无额外开销
- **向后兼容**：旧存档不受影响，truthState 结构不变
- **blast radius**：仅修改 2 个文件的局部逻辑，不影响真心话推进状态机和醉酒触发逻辑

### 修复5：选项字数限制全分支注入（prompts.js）

将 10-15 字限制提取为公共变量，在所有生成 options 的分支注入。

**具体改动**：

1. **提取公共字数规则**（在 `noRepeatNote` 附近定义）：

```javascript
var optionLengthRule = '⚠️ 每个选项 text 控制在 10-15 字以内，简洁明了，不要写成长句。\n';
```

2. **注入到 `consequence` 分支**（第607-611行）：在 `noRepeatNote` 后追加 `optionLengthRule`

3. **注入到 `phase` 分支**（第665-667行）：在 options 数组要求后追加 `optionLengthRule`

4. **注入到 `stay` 分支**（第630行）：在 options 要求后追加 `optionLengthRule`

5. **`generateOptions` 分支**（第654行）：保留现有 10-15 字限制（或改用公共变量，保持一致）

6. **Day 12 最终选择措辞调整**（第662行）：
`每个选项的文本要体现女主的内心纠结，不要直接只写名字。` → `每个选项用 10-15 字体现选择倾向，可含成员名+一个动作/情感词，不要写成完整长句。`

**设计考量**：

- 公共变量避免重复，保持单一事实来源
- 不改变各分支原有选项质量要求（affName/affDelta/affReason 等），仅补充字数约束
- Day 12 措辞调整在保留"体现纠结"意图的同时约束长度