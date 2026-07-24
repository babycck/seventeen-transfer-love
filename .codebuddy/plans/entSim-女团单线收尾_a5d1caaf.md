---
name: entSim-女团单线收尾
overview: 放弃多职业分支，将 entSim 限定为「女主是女团爱豆」单线；setup UI 锁定职业为女团爱豆，避免玩家误选；验证并收尾已有的结局叙事、营业反馈、场景锁定、队友支线、阶段仪式感、字数校验等功能。
todos:
  - id: fix-entsim-profession
    content: 修正 entSim setup 职业选择为仅「女团爱豆」
    status: completed
  - id: verify-girlgroup-line
    content: 验证女团单线已落地的增强路径完整
    status: completed
    dependencies:
      - fix-entsim-profession
  - id: build-verify
    content: 运行 npm run build 完成构建与回归验证
    status: completed
    dependencies:
      - verify-girlgroup-line
---

## 产品概述

只保留「女团爱豆」单线，不做多职业分支。在已落地的女团单线增强基础上，收尾 setup 阶段的职业选择歧义，并做一次完整构建验证。

## 核心功能

- entSim 模式下女主职业固定为「女团爱豆」，setup 界面不再展示其他职业选项。
- 保留已落地的女团单线增强：AI 结局叙事与结局卡片、营业反馈、舆论池扩容、场景锁定、女团队友支线、阶段仪式感、正文 1500-2000 字硬校验。
- 运行构建验证，确保无语法与循环依赖错误。

## 技术栈

- 语言：JavaScript（ES Modules），Node.js 18+
- 构建：Vite
- 状态：localStorage + GS 全局状态
- AI：DeepSeek

## 实现策略

1. **修正 setup 职业选择**：修改 `src/ui-renderer.js` 中 entSim Step2 的 `buildSisterProfHtml` 调用，传入固定职业列表 `['女团爱豆']` 或直接隐藏下拉，改为只读文本，避免玩家误选其他职业导致剧情与设定不一致。
2. **保持现有增强不变**：`src/ent-sim/data.js` 的舆论池/队友文案/结局基调/阶段仪式感、`src/ent-sim/prompts.js` 的场景强制锁定、`src/ent-sim/engine.js` 与 `ui.js` 的 AI 结局叙事/营业反馈/阶段仪式感/掩护闭环、`src/validator.js` 的字数校验均保持不变。
3. **构建验证**：运行 `npm run build` 检查所有模块正常打包，无语法错误、循环依赖或缺失导出。

## 涉及文件

- `src/ui-renderer.js` [MODIFY]
- 其他文件以验证为主，必要时做最小补漏