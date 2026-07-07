---
name: 补充SEVENTEEN.txt现有功能文档
overview: 在 SEVENTEEN.txt（换乘恋爱规则书 v3.2）中追加新章节，补充代码已实现但文档缺失的核心功能：1v1「只为你心动」模式（设定向导/世界观/风格/4 Tab UI/快捷指令/聊天·朋友圈·剧场/结局）、好感度情绪引擎（mood-engine.js）、世界观系统（worlds/），并新增 v3.3 变更清单。
todos:
  - id: verify-code-facts
    content: 核对 game-engine.js、mood-engine.js、worlds/entertainment.js、data.js 中 1v1/情绪/世界观的真实字段与函数
    status: completed
  - id: write-ch35-1v1-mode
    content: 编写第三十五章 1v1 模式（向导/世界观/风格/4Tab界面/快捷指令/结局判定/聊天规则）
    status: completed
    dependencies:
      - verify-code-facts
  - id: write-ch36-mood-engine
    content: 编写第三十六章 好感度情绪引擎（心境状态/函数/与修罗场联动/prompt注入）
    status: completed
    dependencies:
      - verify-code-facts
  - id: write-ch37-world-system
    content: 编写第三十七章 世界观系统（WORLD_CONFIG 结构与娱乐圈地下恋专属配置）
    status: completed
    dependencies:
      - verify-code-facts
  - id: add-v33-changelog
    content: 追加三十八章 v3.3 变更清单并修改结尾章数/版本签名
    status: completed
    dependencies:
      - write-ch35-1v1-mode
      - write-ch36-mood-engine
      - write-ch37-world-system
---

## 用户需求

将代码已实现、但《SEVENTEEN.txt》（换乘恋爱完整规则书 v3.2，共三十四章约 1940 行）中尚未记载的功能补充进该文档。

## 产品概述

SEVENTEEN.txt 是「换乘恋爱」模式的完整规则书。代码库在 v22 / 1v1 / 后续迭代中已实现大量功能但规则书未同步，本次仅更新这一个文档（不改动代码、不提交 git），保持原有表格 + 代码块 + ⚠️ 强制标记的文档风格。

## 核心需补充功能

- **三十五章 1v1「只为你心动」模式**：与换乘恋爱共用向导但按 GS.gameMode 分叉；Step2 选 1 人 → Step3 世界观 + 风格 → Step4 确认 → Step5 游戏；11 个内置世界观（含自定义）+ 4 种写作风格；底部 4 Tab（剧情/聊天/朋友圈/剧场）+ 自由输入框 + 快捷指令抽屉（自由推演/设定·拉回主线/随机事件/走向大结局）；实时聊天、朋友圈、剧场番外三个 1v1 弹窗；结局判定 rollEnding 与多档结局模板；聊天好感度规则（每 5 条 +1，每日上限）。
- **三十六章 好感度情绪引擎（mood-engine.js）**：7 种离散心境（calm/happy/touched/jealous/cold/angry/moved）；setMood/setMoodByEvent/driftMood/decayMoodDaily/syncRivalryFromMood/updateMoodFromAffChange/buildMoodInstruction；与修罗场联动；prompt 注入「当前心境」强制块。
- **三十七章 世界观系统（worlds/）**：WORLD_CONFIG 结构（memberRole/memberDesc/secondCareerNote/userRoles/userFallback/coreTension）；娱乐圈地下恋专属 ENT_SCHEDULE_POOL 活动池。
- **三十八章 v3.3 变更清单**：汇总本次文档新增项，并更新结尾「共三十四章」为「共三十八章」与版本签名。