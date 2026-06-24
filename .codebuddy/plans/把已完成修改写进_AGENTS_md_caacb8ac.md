---
name: 把已完成修改写进 AGENTS.md
overview: 将本次已完成的 7 项修改（API 超时、phaseFreeCount 重置、X 档案物品格式统一、Day4/5 记忆物品轮转、选项多样性约束、Day3 真心话澄清）更新到 AGENTS.md，涉及历史记录表、v22 字段表、第 9 节 X 档案、第 15 节 Prompt 规则清单 4 处。
todos:
  - id: update-state-fields
    content: v22 状态字段表追加 xItemsRevealRound 行
    status: completed
  - id: update-x-archive-section
    content: 第 9 节 X 档案补充物品格式统一 + 轮转说明
    status: completed
  - id: update-prompt-rules
    content: 第 15 节 Prompt 规则表追加 3 条新规则
    status: completed
  - id: update-typewriter-section
    content: 打字机速度章节更新档位数值映射
    status: completed
  - id: update-history-table
    content: 历史修改记录表追加 8 行本次修复记录
    status: completed
---

## 用户需求

将本次会话已完成的修复项写入 `d:\SEVENTEEN\AGENTS.md`，保持项目文档与代码同步。

## 本次已完成并需记录的修改（8 项）

1. 打字机速度 BUG 修复 — 档位数值反转（慢=100/中=50/快=20/极快=10）+ `|| 30` 改为 `== null ? 30 : x`
2. API 超时 30s→60s — 修复 `AbortError: signal is aborted without reason`
3. 叙事分段约束删除 — 删除 rule 9（每段不超过300字/换段）+ styleNote 变量及 5 处注入
4. Day 3 真心话误触发 — prompt 明确"不是真心话游戏，没有抽卡"
5. Day 4/5 记忆物品轮转公开 — 新增 `xItemsRevealRound`，每次只注入 1 位成员
6. 自由输入次数未刷新 — `RESET_PHASE_STATE` 补充 `phaseFreeCount = 0`
7. X 档案物品格式统一 — `buildXArchiveItemsMemberPrompt` 统一为名称/样式/故事格式
8. 选项多样性约束 — `noRepeatNote` 增加避免通用模板重复的要求

## 技术方案

纯文档更新任务，仅修改 `d:\SEVENTEEN\AGENTS.md` 一个文件，不涉及任何源代码变更。

## 更新位置（5 处，已精确探查确认）

### 位置 1：v22 新增状态字段表（line 140 之后）

在 `| nextEpisodePreview | string | 下集预告文本 |` 后追加：

```
| `xItemsRevealRound` | `number` | X记忆物品轮转索引（Day 4/5 每次公开 1 位成员），默认 0 |
```

### 位置 2：第 9 节 X 档案系统（line 265 之后）

在 `- 展示面板：showXArchiveModal() / showXItemsModal()` 后追加：

```
- `buildXArchiveItemsPrompt` 与 `buildXArchiveItemsMemberPrompt` 输出格式已统一为「名称/样式/故事」，`x-items-modal.js` 按「故事：」前缀解析
- Day 4/5 记忆物品公开使用 `GS.xItemsRevealRound` 轮转，每次只注入 1 位成员的物品
```

### 位置 3：第 15 节 Prompt 规则清单表（line 319 之后）

在 `| X 约会双向读信 | buildUserMessage | Day 9 |` 后追加 3 行：

```
| Day4/5 记忆物品轮转 | buildUserMessage | 每次只注入 1 位成员，`GS.xItemsRevealRound` 轮转 |
| Day3 故事环节澄清 | buildUserMessage | 明确"不是真心话游戏，没有抽卡/强制规则" |
| 选项多样性约束 | noRepeatNote | 避免"主动搭话""保持距离"等通用模板重复 |
```

### 位置 4：打字机速度可调章节（line 355）

更新速度档位数值，反映修复后的正确映射：

```
- `GS.typewriterSpeed`：0=即时 / 100=慢 / 50=中 / 20=快 / 10=极快，默认 50
```

### 位置 5：历史修改记录表格（line 471 之后）

在 `| store.js 生产日志 | 已完成 | store.js | import.meta.env.DEV 守卫 |` 后追加 8 行：

```
| 打字机速度档位反转 | 已完成 | header-bar.js, narrative-box.js, ui-renderer.js | 慢=100/中=50/快=20/极快=10 + `||30`修复 |
| API 超时 30s→60s | 已完成 | api.js | 修复 AbortError |
| 叙事分段约束删除 | 已完成 | prompts.js | 删除 rule 9 + styleNote 变量及 5 处注入 |
| Day3 真心话误触发 | 已完成 | prompts.js | 明确"不是真心话游戏" |
| Day4/5 记忆物品轮转 | 已完成 | prompts.js, state.js | xItemsRevealRound 每次公开 1 位 |
| phaseFreeCount 重置 | 已完成 | store.js | RESET_PHASE_STATE 补充重置 |
| X档案物品格式统一 | 已完成 | x-archive.js | 名称/样式/故事 格式统一 |
| 选项多样性约束 | 已完成 | prompts.js | noRepeatNote 增加约束 |
```

## 实现注意事项

- 使用 `replace_in_file` 精确替换，每处基于已确认的 old_str 锚点
- 保持表格格式一致（`|` 分隔、对齐）
- 不修改任何源代码文件
- 修改后检查 lints 确认无格式问题