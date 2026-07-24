---
name: entSim交互修复合集v3
overview: 七部分合并：①skipValidate 修复 ②日程纯展示 ③加载保留原剧情+自动滚动 ④探班 3 选 1 ⑤下一个行程按钮 ⑥DAILY_BUZZ_TEMPLATES 三池各扩到 100 条 ⑦构建验证。
todos:
  - id: fix-skipvalidate
    content: "修改 ai-generator.js:51 加 || opts.plainText；immersion.js:69 和 engine.js:274 各追加 skipValidate: true"
    status: pending
  - id: agenda-display-only
    content: ui.js renderAgenda 非队友项改 div.es-ag-tag；style.css 加 .es-ag-tag 静态样式
    status: pending
  - id: fix-loading-scroll
    content: engine.js:42 innerHTML 改 insertAdjacentHTML 追加+滚动；ui.js __renderEntSim 和 rerender 末尾加自动滚动；style.css 加 .es-loading-inline
    status: pending
    dependencies:
      - agenda-display-only
  - id: visit-3choice
    content: ui.js import 追加 showVisitChoiceModal；新增 showEntSimVisitChoice()；onQuick visit 分支改为调用它
    status: pending
    dependencies:
      - fix-loading-scroll
  - id: next-agenda-btn
    content: ui.js renderQuickActions 加 nextagenda 按钮；onQuick 加 nextagenda 分支调 continueEntSimMain
    status: pending
    dependencies:
      - visit-3choice
  - id: expand-buzz-pool
    content: data.js DAILY_BUZZ_TEMPLATES 三池各从 16 条扩到 100 条，新增条目覆盖舞台/签售/综艺/绯闻/商业/粉丝文化等多维度场景
    status: pending
  - id: build-verify
    content: 运行 Vite 构建确认无语法错误
    status: pending
    dependencies:
      - fix-skipvalidate
      - agenda-display-only
      - fix-loading-scroll
      - visit-3choice
      - next-agenda-btn
      - expand-buzz-pool
---

## 用户需求

用户要求将 `DAILY_BUZZ_TEMPLATES` 池子从每池 16 条扩展到每池 100 条（hotSearch/fanDiscussion/mediaTitle 各 100 条），降低几十回合游戏中的重复率。同时执行之前确认的 6 项 entSim 交互修复。

## 产品概述

扩展每日舆论素材池至 300 条（3 池 x 100 条），覆盖女团爱豆日常的丰富场景（舞台/签售/综艺/社交/舆论/商业/粉丝文化等），确保长时间游戏不重复。同时修复 skipValidate bug、日程按钮改纯展示、加载保留原剧情+自动滚动、探班 3 选 1、新增下一个行程按钮。

## 核心功能

- 舆论池扩展：hotSearch/fanDiscussion/mediaTitle 各从 16 条扩到 100 条，新增条目覆盖回归期/打歌/签售/Vlive/综艺/画报/社交/舆论/商业/粉丝文化/危机公关等多维度场景
- skipValidate 根治：plainText 调用自动跳过 JSON 校验
- 日程纯展示：非队友项改信息标签不可点击
- 加载保留原剧情：engine 层 innerHTML 改 append 追加
- 自动滚动：render 后滚到底部
- 探班 3 选 1：复用 showVisitChoiceModal
- 新增「下一个行程」按钮

## Tech Stack

- JavaScript (ES Modules), Vanilla JS + Vite, 无新增依赖
- 复用现有 `showVisitChoiceModal`（modals/visit-choice-modal.js）和 `showActionInfoModal`（modals/confirm-modal.js）

## Implementation Approach

### Part F: DAILY_BUZZ_TEMPLATES 扩池（data.js）

当前每池 16 条，需扩展到 100 条。保留原 16 条，新增 84 条/池。

**hotSearch（100 条）**：`#{name} xxx#` 格式，覆盖：

- 舞台/直拍/打歌（20 条）：一位安可、ending pose 出圈、直拍百万、舞台事故救场、群舞同步率、solo 段落、高音直拍、表情管理、走位失误、应援棒变色等
- 回归/音源/销量（15 条）：预告片破纪录、专辑预售、音源空降、收听量、销量趋势、海外榜单、主打歌反响、B-side 逆袭、概念预告、track video 等
- 签售/粉丝/营业（15 条）：签售会名场面、粉丝应援、生日项目、官咖更新、bubble 回复、粉丝站子产出、应援广告、生日咖啡车、手写信等
- 综艺/画报/媒体（15 条）：综艺名场面、画报花絮、采访金句、Vlive 破纪录、YouTube 短片、电台出演、杂志内页、封面女孩等
- 绯闻/争议/危机（15 条）：同款被扒、同框实锤、恋爱猜测、站位争议、part 分配争议、歌词解读、争议发言、删帖、取关、深夜点赞等
- 商业/海外/行业（10 条）：品牌代言、海外行程、时装周邀请、商业价值排行、CEO 点赞等
- 团队/队友/关系（10 条）：队友互动、团魂名场面、队内 CP、前辈称赞、后辈翻唱等

**fanDiscussion（100 条）**：粉丝视角讨论文本，覆盖：

- 大粉/死忠视角（20 条）：数据打投、直拍循环、应援项目、安利贴、控评、反黑等
- 路人/吃瓜视角（20 条）：路人粉转化、舞台惊艳、直拍出圈、综艺感、颜值讨论等
- 毒唯/争端（15 条）：part 争议、站位争议、队友对比、资源分配、公司偏心等
- CP/嗑糖（15 条）：营业 CP、同款解读、同框微表情、粉丝剪辑、RPS 讨论等
- 焦虑/心疼（15 条）：行程过劳、体重变化、舞台受伤、表情疲惫、休息不足等
- 行业/对比（15 条）：同代女团对比、音源成绩、销量排行、海外人气、综艺出演等

**mediaTitle（100 条）**：媒体标题格式，覆盖：

- 商业/价值（20 条）：代言、商业价值、品牌合作、销量、时尚资源等
- 深度/分析（20 条）：女团生存、偶像经济、粉丝文化、人设分析、行业趋势等
- 绯闻/八卦（15 条）：恋情、同款、同框、CP、绯闻管控等
- 舞台/作品（15 条）：打歌复盘、舞台分析、音源评价、MV 解读等
- 社交/圈内（15 条）：待机室、签售会、合宿、综艺幕后、偶像社交等
- 危机/争议（15 条）：塌房、争议、人设崩塌、粉丝流失、公关危机等

### Part A-E: 交互修复（同之前计划，不变）

1. `ai-generator.js:51` — `if (skipValidate)` -> `if (skipValidate || opts.plainText)`
2. `immersion.js:69` + `engine.js:274` — opts 追加 `skipValidate: true`
3. `ui.js renderAgenda` — 非队友改 `div.es-ag-tag`；`style.css` 加 `.es-ag-tag`
4. `engine.js:42` — `innerHTML` 改 `insertAdjacentHTML` 追加+滚动；`ui.js` `__renderEntSim`/`rerender` 末尾加自动滚动；`style.css` 加 `.es-loading-inline`
5. `ui.js` — import `showVisitChoiceModal`；新增 `showEntSimVisitChoice()`；`onQuick('visit')` 改调它
6. `ui.js` — `renderQuickActions` 加 `nextagenda` 按钮；`onQuick` 加分支调 `continueEntSimMain`

## Implementation Notes

- 抽取逻辑 `immersion.js:pickN` 随机抽取不查重，扩池即可降低重复率，无需改逻辑
- `{name}` = 女主名，由 `fill()` 函数替换；`{ml}` = 男主名（模板中可选择性使用）
- 新增条目需保持与现有条目一致的语气风格（饭圈用语、网络感、真实感）
- `pickN` 使用 `splice` 抽取（已抽出的不放回），但每次 `generateDailyBuzz` 重新调 `pickN`，所以跨天仍可能重复——扩池到 100 条可显著降低概率
- `es-narrative` 有 `max-height: 56vh; overflow-y: auto`，`scrollTop = scrollHeight` 可正确滚动
- `__renderEntSim` 是主渲染路径，两个路径都需加滚动

## Directory Structure

```
src/
├── ai-generator.js          # [MODIFY] 第51行 if (skipValidate) -> if (skipValidate || opts.plainText)
├── style.css                # [MODIFY] 加 .es-ag-tag；加 .es-loading-inline + @keyframes
├── ent-sim/
│   ├── data.js              # [MODIFY] DAILY_BUZZ_TEMPLATES 三池各从 16 条扩到 100 条
│   ├── immersion.js         # [MODIFY] 第69行 opts 追加 skipValidate: true
│   ├── engine.js            # [MODIFY] 第42行 innerHTML 改 insertAdjacentHTML 追加+滚动；第274行 opts 追加 skipValidate: true
│   └── ui.js                # [MODIFY] 6处：import showVisitChoiceModal；renderAgenda 非队友改 div；__renderEntSim/rerender 加滚动；renderQuickActions 加 nextagenda；onQuick 加分支+visit 改调；新增 showEntSimVisitChoice()
```