---
name: random-start-day-calendar
overview: 恢复 dayCount 随机初始化（1-365），统一从 dayCount 推导所有日历信息（季节/月份/天气/日期），删除 generateOneHeartDates 独立随机路径。
todos:
  - id: restore-random-daycount
    content: state.js 第56行：dayCount 从固定 1 恢复为 Math.floor(Math.random() * 365) + 1，修改注释
    status: pending
  - id: update-init-comment
    content: ui-renderer.js 第1153行：注释从"从 2024-01-01 开始"改为"从随机起始日开始，季节/天气由 dayCount 推导"
    status: pending
  - id: build-verify
    content: 编译验证并推送
    status: pending
    dependencies:
      - restore-random-daycount
      - update-init-comment
---

## 产品概述

恢复 entSim 模式的随机起始日期。上次修复"5月过冬天"bug 时将 dayCount 锁死为 1（2024-01-01），导致每次新开档都从 1 月 1 日开始，永远覆盖不到圣诞节、夏天等季节剧情。现有日历基础设施已经完备，季节/天气强制同步机制已在 generateEntSimRound 和 goEntSimNextDay 中生效，恢复随机起始日不会复现旧 bug。

## 核心功能

- dayCount 从固定 1 恢复为 `Math.floor(Math.random() * 365) + 1`（1~365 均匀分布）
- 季节/天气/月份/currentDate 全部从 dayCount 通过真实日历函数推导，不再使用 generateOneHeartDates 随机季节
- 每次文本生成前（generateEntSimRound）强制同步 GS.season/GS.weather，确保旧存档和新存档季节天气始终与 dayCount 对齐

## 技术方案

### 修改范围（2 个文件）

| 文件 | 操作 | 内容 |
| --- | --- | --- |
| `src/ent-sim/state.js` | 1 行回退 | `dayCount: 1` → `dayCount: Math.floor(Math.random() * 365) + 1`，注释改为"随机起始日" |
| `src/ui-renderer.js` | 1 行注释 | 注释从"从 2024-01-01 开始"改为"从随机起始日开始，季节/天气由 dayCount 推导" |


### 不变部分

- `generateEntSimRound` 的季节/天气同步：保持不变，每次生成前用 `gameSeasonOf(dayCount)` 刷新
- `goEntSimNextDay` 的季节/天气同步：保持不变
- `DAYS_IN_MONTH`、`_isLeapYear`、`_yearMonthDay`、`gameMonthOf`、`gameSeasonOf`、`gameDayOf` 全部不动
- `generateOneHeartDates` 不恢复使用（entSim 从 dayCount 推，不依赖随机季节表）

### 为什么安全

之前 5 月过冬天是因为 season 由 `generateOneHeartDates` 随机抽取（独立于 dayCount），两套随机值互相打架。现在所有季节/天气/月份/日期都统一从 dayCount 经真实日历函数推导，startEntSim 初始化、generateEntSimRound、goEntSimNextDay 三条路径全覆盖，不会出现 dayCount=140 但 season=winter 的情况。