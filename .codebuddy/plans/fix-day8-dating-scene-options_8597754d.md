---
name: fix-day8-dating-scene-options
overview: 在骨架选项引擎 option-engine.js 中增加约会场景（phaseIndex>=1 且 currentDatingPartner 存在）的识别，生成只涉及约会对象的 3 个约会专属选项，替代当前错误生成的普通多人互动选项。
todos:
  - id: add-dating-options
    content: 在 option-engine.js 添加约会场景检测分支和 generateDatingOptions 函数
    status: completed
---

## 用户需求

Day 8 点击"进入约会场景"后，选项变成了默认的多人互动选项（如"和XX散步""找XX看书"），而非约会专属选项。期望约会场景中选项只涉及约会对象。

## 问题根因

1. 点击"进入约会场景"后 `phaseIndex` 跳到 1（下午）
2. `option-engine.js` 的 `generateOptions()` 只在 `phase === 0` 识别约会日上午，`phase >= 1` 不匹配任何特殊条件
3. 直接走 `generateStandardOptions()` 生成涉及全员的多成员选项，不符合约会场景约束
4. `GS.currentDatingPartner` 在整个约会日中持续存在（`resetPhaseState()` 不清理），可作为约会场景判断依据

## 核心修复

在 `option-engine.js` 的 `generateOptions()` 中增加约会场景检测：当 `GS.currentDatingPartner` 已设定 + 约会日 + `phase >= 1`（Day 10 含 phase 0）时，生成 3 个只涉及约会对象的选项。

## 技术栈

- Vanilla JS (ES Modules), 无新依赖
- 遵循项目约定：`var` 声明、`+` 字符串拼接、伪随机选词

## 实现方案

### 修改目标：`src/skeleton/option-engine.js`

在 `generateOptions()` 函数中，紧接现有的"约会日上午"检查（第 11 行）之后，增加约会场景检测分支：

```javascript
// 约会场景中（currentDatingPartner 已设定，已进入约会阶段）
if (GS.currentDatingPartner && [4, 6, 8, 9, 10].indexOf(day) >= 0 && (phase >= 1 || day === 10)) {
    return generateDatingOptions();
}
```

覆盖范围：

- Day 4/6/8/9：phase 0 显示"进入约会场景"按钮（现有逻辑），phase 1+ 显示约会选项（新增）
- Day 10：modal 直接设定 `currentDatingPartner`，phase 0+ 全部显示约会选项（新增，因为 Day 10 不走"进入约会场景"流程）
- Day 9：phase 0 设定 `currentDatingPartner = secretX` 后显示"进入约会场景"，phase 1+ 显示约会选项

### 新增 `generateDatingOptions()` 函数

- 从 `GS.currentDatingPartner` 获取约会对象 member 对象
- 生成 3 个选项，每个选项文本包含约会对象名字（确保 `triggerAffectionFromChoice` 的文本匹配 fallback 能正确识别目标成员加分）
- 使用伪随机选词（同一 day+phase 固定，与现有 `randomActivity` 模式一致）
- 约会活动词库区分时段（下午/傍晚），内容偏向二人独处互动

### 不需要修改的文件

- `game-engine.js`：Step 2 的 skeleton 分支已正确委托给 option-engine，无需改动
- `prompts.js`：consequence 流程中 AI 选项已受 `currentDatingPartner` 约束（第 352-360 行），无需改动
- `store.js` / `state.js`：无新增状态字段

## 实现注意事项

- `triggerAffectionFromChoice`（game-engine.js:967-973）通过文本匹配成员名识别目标，约会选项必须包含约会对象全名
- `currentDatingPartner` 在跨天后由 `skeleton/scheduler.js:46` 清理为 null，不会泄漏到非约会日
- 伪随机函数用 `day * 系数 + phase * 系数` 取模，保证刷新后选项不变