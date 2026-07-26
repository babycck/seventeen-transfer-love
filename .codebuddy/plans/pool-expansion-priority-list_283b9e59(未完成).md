---
name: pool-expansion-priority-list
overview: 梳理 ent-sim/pools/ 下 48 个池子，按消耗频率和当前条数列出"值得增加条数"的优先级清单，过滤掉已确认无需增加的 19 个池子。
todos:
  - id: tier1-daily-engagement
    content: 扩展 DAILY_ENGAGEMENT_POOL（31→60条，+29条），覆盖 SNS/Live/舞台/时尚/综艺/粉丝 6 类
    status: pending
  - id: tier1-incident-events
    content: 扩展 INCIDENT_EVENTS_POOL（40→60条，+20条），补齐 surprise/scandal/sick/teammate/industry 等短板类别
    status: pending
  - id: tier2-male-init-jealousy-contact
    content: 扩展 MALE_LEAD_INITIATIVE_POOL(+15)、JEALOUSY_EVENTS_POOL(+13)、CONTACT_PROGRESSION(+10)，共38条
    status: pending
    dependencies:
      - tier1-daily-engagement
      - tier1-incident-events
  - id: tier3-chat-series
    content: 扩展 CHAT 系列 7 个池子（CHAT_MALE_LEAD/BROTHER/RIVAL/MANAGER/GROUP/SASAENG + CONTACT_TYPE_POOL），共63条
    status: pending
    dependencies:
      - tier2-male-init-jealousy-contact
  - id: tier4-schedule-exposure
    content: 扩展日程/曝光类 8 个池子（RUMOR/DISPATCH/CONCERT/FANSIGN/COMEBACK/MUSIC_SHOW/MAGAZINE/CHART），共82条
    status: pending
    dependencies:
      - tier3-chat-series
---

## 需求

对 ent-sim 的 48 个池子进行扩展优先级评估：排除已确认无需增加的 19 个池子，对剩余池子按消耗频率和当前条数，输出分梯度的"值得扩展"清单，标注建议目标条数和理由。

## 评估维度

- **消耗频率**：该池子每游戏日/每局被触发的概率
- **当前条数**：已有条目是否足够支撑不重复体验
- **可感知度**：重复内容对玩家体验的影响程度

## 扩展优先级清单

### Tier 1 — 高频消耗，当前条数明显不足（最优先）

| 池子 | 当前 | 目标 | 增加 | 理由 |
| --- | --- | --- | --- | --- |
| `DAILY_ENGAGEMENT_POOL` | 31条 | 60条 | +29条 | 每天40%触发，一局50天约触发20次，31条高频重复非常明显 |
| `INCIDENT_EVENTS_POOL` | 40条 | 60条 | +20条 | 每天~25%触发，12个子类别均分后每类仅3-4条，特定场景极易重复 |


**共计约 49 条新增。**

---

### Tier 2 — 中高频消耗，条数偏低

| 池子 | 当前 | 目标 | 增加 | 理由 |
| --- | --- | --- | --- | --- |
| `MALE_LEAD_INITIATIVE_POOL` | 30条 | 45条 | +15条 | 每天10%独立触发，是男主主动示好的核心体验，重复会显得男主"词穷" |
| `JEALOUSY_EVENTS_POOL` | 32条 | 45条 | +13条 | 每天~15%触发，吃醋事件是张力核心，重复导致修罗场降级为"又是这句" |
| `CONTACT_PROGRESSION` | 30条 | 40条 | +10条 | 每天~10-20%触发，好感铺垫事件的重复会让感情升温显得机械化 |


**共计约 38 条新增。**

---

### Tier 3 — 玩家主动高频触发，CHAT系列条数过少

| 池子 | 当前 | 目标 | 增加 | 理由 |
| --- | --- | --- | --- | --- |
| `CHAT_MALE_LEAD` | ~13条 | 25条 | +12条 | 5个子类别均分后每类2-3条，玩家频繁聊天时重复率极高 |
| `CHAT_BROTHER` | 10条 | 20条 | +10条 | 哥哥聊天场景覆盖面太窄 |
| `CHAT_RIVAL` | 7条 | 15条 | +8条 | 7条在情敌存在感增强后严重不足 |
| `GROUP_CHAT` | ~11条 | 20条 | +9条 | 群聊是玩家高频关注区域 |
| `CHAT_SASAENG` | 8条 | 15条 | +7条 | 私生饭话题需要更多变体 |
| `CHAT_MANAGER` | 5条 | 12条 | +7条 | 经纪人消息仅5条，极快重复 |
| `CONTACT_TYPE_POOL` | 18条 | 28条 | +10条 | 男主联络电话/私信，18条在游戏后期重复明显 |


**共计约 63 条新增。**

---

### Tier 4 — 关键场景池，低频但内容重复影响体验

| 池子 | 当前 | 目标 | 增加 | 理由 |
| --- | --- | --- | --- | --- |
| `RUMOR_POOL` | 22条 | 35条 | +13条 | 绯闻是高光时刻，22条在多次触发后会撞车 |
| `DISPATCH_POOL` | 22条 | 35条 | +13条 | Dispatch爆料同理，重复会削弱"被拍"的紧张感 |
| `CONCERT_POOL` | 20条 | 30条 | +10条 | 演唱会全流程20条偏少 |
| `FANSIGN_POOL` | 22条 | 30条 | +8条 | 签售场景丰富但22条不够 |
| `COMEBACK_CYCLE_POOL` | 25条 | 35条 | +10条 | 回归全周期25条尚可补充 |
| `MUSIC_SHOW_POOL` | 22条 | 30条 | +8条 | 打歌节目6大台+特别舞台 |
| `MAGAZINE_POOL` | 25条 | 35条 | +10条 | 10个品类均分每品2-3条 |
| `CHART_POOL` | 25条 | 35条 | +10条 | 音源排名波动场景可扩展 |


**共计约 82 条新增。**

---

### 不做扩展的池子（当前条数已足够或触发极低频）

| 池子 | 当前条数 | 理由 |
| --- | --- | --- |
| `AWARD_POOL` | 40条 | 每4天触发一次，40条覆盖4种奖项类型充足 |
| `BRAND_OFFER_POOL` | 40条 | 10品类×4条配置已够 |
| `RELEASE_POOL` | 50条 | 6大类50条丰富度够 |
| `ENT_SCHEDULE_POOL` | 40条 | 双职业各20条预设日程足 |
| `GIRLGROUP_EVENTS` | 42条 | 仅女团爱豆分支触发，42条够用 |
| `ONEHEART_RANDOM_EVENTS` | 42条 | 触发频率~5-10%，42条充足 |
| `CAREER_SETBACKS` | 40条 | 每5天触发，8阶段各5条 |
| `SPECIAL_EVENTS` | 30条 | 触发频率极低(~3-8%) |
| `VARIETY_SHOW_POOL` | 30条 | 综艺类型多，30条中等偏上 |
| `HOT_SEARCH_REPLY_POOL` | 25条 | 热搜-评论关联模板，低频 |
| `SVT_TEAMMATE_EVENT_POOL` | 35条 | 队友偶遇事件35条足够 |
| `DAILY_BUZZ` + `DAILY_BUZZ_TEMPLATES` | 75+307=382条 | 总量382条非常充足 |


---

### 汇总

| 层级 | 池子数 | 新增总条数 | 实施优先级 |
| --- | --- | --- | --- |
| Tier 1 | 2 | ~49条 | 最优先 |
| Tier 2 | 3 | ~38条 | 高 |
| Tier 3 | 7 | ~63条 | 中高 |
| Tier 4 | 8 | ~82条 | 中 |
| **合计** | **20** | **~232条** | - |
| 不做扩展 | 9 | 0条 | - |


### 实施顺序建议

1. **先做 Tier 1**（2个池子，49条），投入产出比最高，玩家可立即感知差异
2. **Tier 2**（3个池子，38条），增强核心恋爱线体验
3. **Tier 3 + Tier 4 可拆分**，按开发时间分批推进（共15个池子，145条）