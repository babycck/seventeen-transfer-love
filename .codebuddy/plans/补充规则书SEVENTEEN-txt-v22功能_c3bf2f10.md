---
name: 补充规则书SEVENTEEN-txt-v22功能
overview: 基于代码实际实现，将 SEVENTEEN.txt 中缺失的约 15 个功能/系统补充到规则书中，使文档与代码一致。不做代码修改，只更新文档。
todos:
  - id: add-mission-gift-return-truth
    content: 补充 7.6 任务卡系统、8.6 约会礼物+8.7 成员回礼、9.6 真心话惩罚版到SEVENTEEN.txt
    status: completed
  - id: add-affection-defer-fatigue
    content: 补充 16.9 好感度延迟结算(pendingAffChanges)、16.10 疲劳递减、16.11 行为历史到SEVENTEEN.txt
    status: completed
  - id: add-heartnotes-events-detail
    content: 补充 20.12 心动笔记系统，扩展 20.1-20.6 补充秘密任务/嫉妒/吃醋/前任来电状态字段
    status: completed
  - id: add-modals-ai-tech
    content: 补充 22.5 弹窗完整列表(19个)、Header按钮清单；扩展31章加入AI多模型/一致性校验/测试模式
    status: completed
  - id: add-season-chapter-and-changelog
    content: 新增三十四章 季节/日期/天气/节日系统；更新文档标题v3.2；追加v3.2变更清单
    status: completed
---

## 需求描述

补充规则书 `SEVENTEEN.txt`（v3.1，33 章 1630 行），将代码中已实现但文档缺失的功能完整记录到规则书中。

### 缺失功能总览

**① 完全未记录的系统（10 项）**：约会礼物 AI 生成池、成员回礼系统、任务卡系统、心动笔记系统、好感度疲劳与递减机制、AI 多模型切换（DeepSeek + SiliconFlow）、AI 一致性校验（validateNarrative + aiCorrections）、季节/日期/天气/节日系统、好感度延迟结算（pendingAffChanges）、测试模式（testMode）

**② 有概念但缺实现细节的章节（7 项）**：秘密任务完整状态字段、嫉妒任务触发机制、吃醋事件冷却机制、前任来电状态字段、真心话惩罚版（carry/darkroom/reverse）、弹窗列表（实际 19 个 vs 文档 11 个）、Header 按钮布局

**③ 版本更新**：文档标题从 v3.0 升级为 v3.2，追加 v3.2 变更清单

## 技术方案

### 实施策略

采用**原地插入 + 尾部追加**策略，不对现有章节编号造成连锁影响：

- **已有章节**：在对应章节末尾追加新的子节（如 7.6, 8.6, 9.6 等），不影响原有编号
- **全新系统**：在第三十三章后新增第三十四~三十六章
- **弹窗列表**：直接替换 22.5 表格内容

### 文件名

`d:\SEVENTEEN\SEVENTEEN.txt`（单文件更新）

### 内容组织

| 任务 | 更新位置 | 新增内容 |
| --- | --- | --- |
| 1 | 七章 7.6 / 八章 8.6-8.7 / 九章 9.6 | 任务卡、约会礼物、成员回礼、真心话惩罚版 |
| 2 | 十七章 16.9-16.11 | pendingAffChanges、疲劳递减、行为历史 |
| 3 | 二十章 20.12 + 扩展 20.1-20.6 | 心动笔记、秘密任务/嫉妒/吃醋状态字段 |
| 4 | 二十二章 22.5 + 三十一章 | 弹窗完整列表、Header按钮、AI多模型/校验/测试模式 |
| 5 | 新增三十四章 + 更新标题 + v3.2 changelog | 季节/天气/节日系统 |


### 数据来源

所有内容均来自以下源文件的实机实现，不杜撰：

- `src/game-engine.js` — 回礼系统、下集预告
- `src/skeleton/scheduler.js` — 约会礼物生成、任务卡、天气/节日推进
- `src/skeleton/affection-engine.js` — pendingAffChanges 结算、疲劳递减
- `src/skeleton/event-triggers.js` — 嫉妒任务、吃醋事件、前任来电触发
- `src/api.js` + `src/data.js(API_PROVIDERS)` — 多模型切换
- `src/validator.js` + `src/parser.js` — AI 一致性校验
- `src/data.js`(HEART_NOTE_TEMPLATES + RETURN_GIFTS + MISSION_CARDS + WEATHER_POOLS + HOLIDAYS) — 各类数据
- `src/modals/` 全部 19 个弹窗文件

## Agent 扩展

### SubAgent

- **code-explorer**
- 用途：在规划阶段探查代码中未记录功能的实现细节（已使用完毕）
- 产出：代码中 10 项完全未记录功能 + 7 项细节缺失的章节清单