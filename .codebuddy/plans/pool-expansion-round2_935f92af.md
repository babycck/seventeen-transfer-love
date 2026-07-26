---
name: pool-expansion-round2
overview: 运行200轮模拟→分析耗尽池→针对性扩充→再跑模拟验证，循环直到零耗尽或仅剩章节6后耗尽。
todos:
  - id: run-simulation
    content: 运行200轮模拟脚本，收集耗尽和接近耗尽（≥80%）的池子清单
    status: completed
  - id: expand-exhausted
    content: 对每个耗尽池扩充10-15条新内容，保持格式、风格和条件范围与现有条目一致
    status: completed
    dependencies:
      - run-simulation
  - id: verify-fix
    content: 重新运行模拟验证扩充效果，确认耗尽池数量显著减少
    status: completed
    dependencies:
      - expand-exhausted
  - id: update-plan-doc
    content: 更新 pool-expansion-plan.md 记录本轮扩充的池子、新增条数和最终验证结果
    status: completed
    dependencies:
      - verify-fix
---

## 用户需求

用户选择"跑模拟→补耗尽池"方案继续扩充池子。先运行200轮游戏模拟脚本，找出模拟中耗尽（使用率达到100%）的池子，然后对每个耗尽池进行针对性内容扩充以消除复用。

## 核心功能

- 执行200轮模拟运行，输出完整的池子消耗报表，识别所有耗尽和接近耗尽（≥80%）的池子
- 对每个耗尽池按需扩充10-15条新内容条目，保持与现有条目一致的格式（key + text + require条件）、叙事风格（韩娱场景中文叙事）和质量水准
- 扩充后重新运行模拟，验证所有耗尽池已被消除或显著改善
- 更新pool-expansion-plan.md记录本次扩充结果

## 技术栈

- Node.js 18+（模拟脚本执行环境）
- JavaScript ES Modules（池文件格式）
- 池文件位于 `src/ent-sim/pools/`，统一通过 `index.js` 导出

## 实现方案

### 三步循环流程

1. **模拟诊断**：运行 `node scripts/full-game-simulation.mjs`，脚本会模拟200轮游戏运行，结束时输出所有池子的消耗汇总表，标注耗尽（🔴）和警告（🟡≥80%）
2. **针对性扩充**：仅对耗尽池进行内容扩充，每个池子新增10-15条内容，使总条目数至少达到原有1.5倍
3. **回归验证**：重新运行模拟，确认耗尽池数量显著减少

### 池子条目格式

每个条目为对象，含三个字段：

- `key`：唯一标识符（小写英文，下划线分隔，如 `confess_rooftop_night`）
- `text`：中文叙事文本（80-200字，沉浸式韩娱场景）
- `require`（可选）：触发条件（如 `aff>=60`、`chapter>=2`），需与池子现有条件范围保持一致

### 扩充策略

- 新增条目风格需与现有条目统一（第一人称/第二人称叙事，情感细腻，场景具体）
- 条件范围参考现有条目分布（如某池子现有 `aff>=60` 到 `aff>=90`，新条目也在此区间分散）
- 使用 `key` 前缀与现有条目一致（如 `confess_`、`clue_`、`warn_`）
- 更新文件头部注释的条目数信息

### 模拟脚本关键参数

- 好感增速：55% +1~3 / 27%不变 / 10%小扣 / 8%大跌
- 人气增速：70%概率 +1~3
- 停止条件：满200轮
- 场景灵感注入每时段触发：所有活跃池出候选→随机选2-4条消耗