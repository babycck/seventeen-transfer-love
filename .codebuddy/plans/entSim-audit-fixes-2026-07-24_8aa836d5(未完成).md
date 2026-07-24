---
name: entSim-audit-fixes-2026-07-24
overview: 修复娱乐圈模拟器（entSim）审计中发现的 P0-P2 级问题：世界观锁定、章节计数重置、女团背景注入门控、日程失败消耗、曝光阈值、队友具象化等。
todos:
  - id: fix-step3-world-lock
    content: 修复 ui-renderer.js Step3 使 entSim 强制锁定 entertainment 世界观
    status: pending
  - id: fix-chapter-round-reset
    content: 修复 game-engine.js 切章时重置 entSimChapterRound 并校验事业面板显示
    status: pending
    dependencies:
      - fix-step3-world-lock
  - id: fix-girlgroup-prompt-gate
    content: 修复 prompts.js 女团背景判断改用 isIdolProfession()
    status: pending
  - id: fix-agenda-failure-consume
    content: 修复 doAgendaActivity AI 失败时不消耗活动次数并给保底提示
    status: pending
  - id: align-exposure-threshold
    content: 统一 exposureRisk 彻底曝光阈值为 >=76
    status: pending
    dependencies:
      - fix-step3-world-lock
  - id: add-ai-chapter-transition
    content: 为 showEntSimChapterTransition 增加 AI 过渡剧情生成
    status: pending
    dependencies:
      - fix-chapter-round-reset
  - id: concretize-girlgroup-members
    content: 重构 buildHeroineGirlGroup 给 5 位姐姐加名/性格/关系标签
    status: pending
    dependencies:
      - fix-girlgroup-prompt-gate
  - id: cleanup-worlds-narrative
    content: 移除 worlds/index.js entertainment 入口并让 narrative-box 包含 entSim
    status: pending
    dependencies:
      - fix-step3-world-lock
  - id: cleanup-dead-fields-css
    content: 清理 entSim 死字段、冗余条件表达式并补 style.css 专属样式
    status: pending
    dependencies:
      - fix-agenda-failure-consume
  - id: verify-build-regression
    content: 构建验证与关键路径回归测试
    status: pending
    dependencies:
      - cleanup-dead-fields-css
---

## 产品概述

基于 2026-07-24 entSim 审计结果，针对已落地的「娱乐圈模拟器」(gameMode='entSim') 进行一轮 bug 修复与 Plan 对齐。本轮不改新功能大框架，只修复会导致流程卡死/错位的 P0 问题、补齐与 Plan 不符的 P1 缺口，并清理 P2 代码债务，确保 entSim 可正常跑通。

## 核心修复点

- **P0-1** Step 3 世界观锁定失效：entSim 当前会进入普通 oneHeart 世界选择，worldSetting 可被改为非 entertainment，导致后续娱乐圈 UI/日程/探班全部消失。
- **P0-2** 章节回合计数未跨章重置：`checkEntSimChapterAdvance` 切章后没有 `entSimChapterRound = 0`，章节计数变成累计值，与 Plan 的「练习生期 0-7 / 出道期 0-14」不符。
- **P0-3** 女团背景 prompt 门控未兼容 entSim：prompts.js:1039 仍用 `hp.profession === '女团爱豆'`，entSim 职业为 `'爱豆'` 时注入不到详细女团设定。
- **P0-4** 日程活动失败仍消耗次数：`doAgendaActivity` catch 块把活动标记为完成，玩家 AI 失败时无收益却损失一次活动。
- **P1-5** 曝光阈值与 Plan 对齐：代码用 `>=90`，Plan 规定彻底曝光抉择 `>=76`。
- **P1-6** 章节过场追加 AI 过渡剧情：当前 `showEntSimChapterTransition` 只有静态文案，需按 Plan 注入过渡 prompt 并调用 AI 生成过渡段。
- **P1-7** 女团队友具象化：`buildHeroineGirlGroup` 队友名仍是 `姐姐1~5` 占位符，需补充化名/性格标签/与女主关系标签。
- **P1-8** `worlds/index.js` 仍把 `entertainment` 导出到 `_all`，未按 Plan 移除。
- **P1-9** `narrative-box.js:158` 剧情压缩索引未包含 entSim，长期游玩会显示过多冗余。
- **P1-10** 多个 entSim 专属状态字段（`entSimExposurePublic` / `entSimCoverUsed` / `entSimManualPRUsed` / `entSimSecret` / `_brotherTestPhase` / `_mainConfessionDone`）定义了但未被使用，代码复用 oneHeart 旧字段。
- **P2-11** 多处冗余的 `(oneHeart || entSim) || entSim` 条件表达式。
- **P2-12** `style.css` 缺少 entSim 专属样式（`.entsim-mode`、日程卡片、事业面板、切章动画等）。
- **P2-13** 未按 Plan 创建 `src/ent-sim/` 独立模块，全部逻辑内联在旧文件中（可选本轮处理或延后）。
- **P2-14** `doAgendaActivity` user message 与 system prompt 输出格式冲突。
- **P2-15** 日程按钮图标仅按 `type` 分 team/solo，未按 `cat` 映射（📺 录节目 / 🎤 练习 / ✍️ 签售 / 📷 拍摄 / 🌙 休息）。

## 技术栈

沿用项目当前栈：JavaScript(ES Modules) + Vite 5.4 + Vanilla JS，不引入新依赖，不破坏 oneHeart/换乘恋爱。

## 实现方案

本轮采用「内联补丁 + 最小改动」策略，所有修复集中在已审计到的具体文件/行号，优先保证 entSim 主流程可跑通，再补体验缺口。

### P0 修复策略

1. **Step 3 世界观锁定**：调整 `src/ui-renderer.js:442`，将 `if (oneHeart || entSim)` 改为仅 `oneHeart`，使 entSim 走 `:488-504` 的专属锁定分支，确保 `worldSetting = 'entertainment'` 不可被玩家修改。
2. **章节回合计数重置**：在 `src/game-engine.js:2597` 切章逻辑中增加 `GS.entSimChapterRound = 0;`，并在事业面板 `_nextRoundNeed` 计算处同步校验非负。
3. **女团背景 prompt 门控**：将 `src/prompts.js:1039` 的 `hp.profession === '女团爱豆'` 改为 `isIdolProfession(hp.profession)`，兼容 entSim 的 `'爱豆'` 与旧存档的 `'女团爱豆'`。
4. **日程失败不消耗**：修改 `src/game-engine.js:2488-2491`，AI 失败时不再 push 到 `entSimAgendaDone`，改为 toast 提示「活动生成失败，未消耗档期」并给出保底人气/剧情。

### P1 修复策略

5. **曝光阈值统一**：将 `src/game-engine.js` 中所有 `exposureRisk >= 90` 的判断统一改为 `>= 76`，与 Plan 的 `EXPOSURE_TIERS.explosive[76,100]` 对齐。若产品侧确认保留 90，则需回改 Plan；默认按 Plan 执行。
6. **AI 过渡剧情**：将 `src/ui-renderer.js:2524-2543` 的 `showEntSimChapterTransition` 改为 async，先显示静态过场，再调用 `generateWithRetry` 生成约 200 字过渡剧情并插入 `GS.todayFullText`，最后渲染。
7. **队友具象化**：扩展 `src/data.js:1284-1289` 的 `buildHeroineGirlGroup`，为 5 位姐姐从预置池中抽取：化名（韩式女爱豆风格）、性格标签（2 个）、与女主关系标签（如「最疼你的大姐」「总抢 part 的」「想退团的」「争门面的」「默默努力的老三」），并注入 prompts。
8. **worlds/index.js 清理**：移除 `entertainment` 的 import 与 `_all` 项，保留文件本身供 `ENT_SCHEDULE_POOL`/`BROTHER_EVENTS` 引用。
9. **narrative-box 包含 entSim**：将 `src/ui/narrative-box.js:158` 的条件扩展为 `GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim'`。
10. **死字段处理**：评估 `entSimExposurePublic` 等 6 个字段，二选一：a) 全部删除并改用现有 oneHeart 字段；b) 保留并在对应逻辑中替换旧字段。建议先删除死字段减少混乱，后续如需 entSim 独立再重建。

### P2 清理策略

11. **冗余条件清理**：批量将 `(A || B) || B` 简化为 `A || B`。
12. **补 entSim CSS**：在 `src/style.css` 新增 `.entsim-mode`、`.entSimAgendaBtn`、`.entSimCareerBtn`、`.entSim-chapter-overlay` 等基础样式，替换当前大量内联 style。
13. **模块化评估**：本轮若时间允许，将 entSim 相关函数从 `game-engine.js`/`ui-renderer.js` 拆入 `src/ent-sim/`；否则在 Plan 中标记为后续专项。
14. **prompt 格式对齐**：调整 `doAgendaActivity` user message，去掉「不要写 JSON」的冲突描述，改为明确要求 JSON 输出或统一走 narrative 解析。
15. **图标 cat 映射**：在 `src/ui-renderer.js:2633` 增加按 `cat` 的图标映射表。

### 回归验证

- 每处修改后运行 `vite build`。
- 关键路径手动验证：首页选 entSim → Step 3 不可改世界观 → 开局人气按职业正确 → 日程按钮可点 → 8 回合后进出道期且 round 重置 → 女团背景在 prompt 中可见。