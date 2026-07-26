# 池子全满扩充清单

> **数据来源**: 章节6模拟 — 多轮200轮测试（Seed: 381/559/764/977等）
> **状态**: ✅ 全部扩充已完成 (2026-07-26)
> **最终验证**: 0系统性耗尽池，偶发单次事件已补量，零bug

---

## 一、场景注入池 — 各轮累进

| 池子 | 中文 | 原始 | R1 | R2一 | R2二 | R3重跑 | R4流残 | R5清残 | 最终 |
|------|------|------|------|------|------|------|------|------|------|
| `ROMANCE_PUBLIC` | 公共场合 | 17 | 36 | 50 | | 56 | | | **56** |
| `ROMANCE_LATENIGHT` | 深夜联系 | 17 | 28 | 50 | | 60 | | 70 | **70** |
| `ROMANCE_BACKSTAGE` | 后台相遇 | 22 | 34 | 45 | | 55 | | 63 | **63** |
| `ROMANCE_CRISIS` | 危机守护 | 12 | 24 | 44 | | 52 | | | **52** |
| `ROMANCE_JEALOUSY` | 吃醋触发 | 12 | 16 | 24 | | 29 | | | **29** |
| `ROMANCE_CONFESSION` | 告白节点 | 11 | — | 22 | | 32 | | | **32** |
| `ENCOUNTER_BROTHER` | 哥哥撞见 | 5 | 31 | | | | 42 | | **42** |
| `ENCOUNTER_ML` | 偶遇男主 | 14 | 32 | 48 | | 58 | | 66 | **66** |
| `ENCOUNTER_RIVAL` | 偶遇情敌 | 5 | 24 | | | 34 | 40 | | **40** |
| `ENCOUNTER_OTHERS` | 旁人起哄 | 9 | 21 | 32 | | | | | **32** |
| `DRAMA_MISUNDERSTAND` | 误会 | 10 | 20 | 32 | | | | | **32** |
| `DRAMA_COLDWAR` | 冷战和解 | 10 | 19 | | 32 | | | | **32** |
| `DRAMA_DATING_RUMOR` | 绯闻危机 | 10 | 18 | 21 | | 31 | | | **31** |
| `DRAMA_DILEMMA` | 二选一 | 9 | 17 | 23 | | | 31 | | **31** |
| `DRAMA_ALMOST` | 差点告白 | 11 | 14 | | | | | | **14** |
| `SECRET_COMMS` | 秘密通讯 | 10 | 23 | 22 | | | | 30 | **30** |
| `SECRET_NEARMISS` | 差点暴露 | 11 | 22 | 21 | | 28 | | | **28** |
| `SECRET_COMPANY` | 公司警告 | 8 | 14 | 31 | | | | | **31** |
| `SECRET_FAN_CLUES` | 粉丝线索 | 10 | 13 | 30 | | | | | **30** |
| `ATMOSPHERE_WEATHER` | 天气氛围 | 12 | 44 | 50 | | | | | **50** |
| `ATMOSPHERE_MOOD` | 心情基调 | 12 | 39 | 54 | | | | | **54** |
| `ATMOSPHERE_HIS_STATE` | 男主状态 | 12 | 37 | 55 | | | 62 | | **62** |
| `MILESTONE_FIRST_WIN` | 一位场景 | 9 | 14 | 31 | | | | | **31** |
| `MILESTONE_AWARDS` | 颁奖场景 | 12 | 13 | 21 | | | 34 | | **34** |
| `MILESTONE_DEBUT` | 出道场景 | 10 | 10 | | | | | | **10** |

> 注：R1=第一轮（场景注入批量扩充）, R2一/二=第二轮（跑模拟→补耗尽+高温池）, R3=重跑5遍→修4反复池, R4=流残偶发池, R5=清尾残

---

## 二、事件/行程/特殊池

| 池子 | 中文 | 原始 | 最终 | 关键变化 |
|------|------|------|------|----------|
| `BROTHER_EVENT_POOL` | 哥哥事件 | 50 | 50 | 够用 |
| `BROTHER_SIDE_PLOTS` | 哥哥支线 | 3 | **22** | R4: +10 |
| `BROTHER_ADVANCE_TESTS` | 哥哥考验 | 3 | **30** | R2二: +9, R4补 |
| `RIVAL_ADVANCE_EVENTS` | 情敌主动 | 4 | **28** | R2一: +9 |
| `SECRET_DISCOVERY_EVENTS` | 秘密发现 | 8 | 13 | R1 |
| `INDUSTRY_EVENTS` | 行业事件 | 6 | 9 | R1 |
| `CALENDAR_EVENTS` | 日历节日 | 52 | **72** | R3: +10 |
| `TOXIC_FAN_WAR_POOL` | 毒唯互撕 | 10 | **20** | R3: +8 |
| `CHEER_CULTURE_POOL` | 应援文化 | 10 | **18** | R4: +8 |
| `HEALTH_INJURY_POOL` | 健康伤病 | 10 | 15 | R1 |
| `TEAMMATE_BOND_POOL` | 队友关系 | 10 | 15 | R1 |

### 够用未扩充
`JOB_GRADE_POOL`(12), `VARIETY_MOMENT_POOL`(12), `MV_FILMING_POOL`(10), `SASAENG_ESCALATION`(10), `PRESS_INTERVIEW`(10), `DATING_SCANDAL_CHAIN`(10), `HIATUS_ANXIETY_POOL`(10), `HIDDEN_ROUTE_POOL`(10), `YEAR_END_REVIEW`(10)

---

## 三、各轮详情

### 第一轮扩充 (Round 1) — 场景注入批量扩充
**起始**: ~3,885 → **最终**: ~4,483 (+~598条), 覆盖44池

### 第二轮扩充 (Round 2) — 跑模拟→补耗尽
**起始**: 4,483 → **验证后**: 4,599 (+116条)

#### 扩充前模拟 (Seed:977, 200轮)
```
好感90 | 人气100 | Ch6 | 201轮(~67天)
🔴 真实耗尽: 6个 | 🟡 高温: 12个
```

#### 第一波 (6耗尽 + 6高温≥90%)

| 池子 | 扩充前 | 扩充后 | 新增 | 原因 |
|------|--------|--------|------|------|
| ATMOSPHERE_HIS_STATE | 44 | 55 | +11 | 100%耗尽 |
| ENCOUNTER_OTHERS | 22 | 32 | +10 | 100%耗尽 |
| MILESTONE_FIRST_WIN | 22 | 31 | +9 | 100%耗尽 |
| RIVAL_ADVANCE_EVENTS | 19 | 28 | +9 | 100%耗尽 |
| ROMANCE_PUBLIC | 40 | 50 | +10 | 100%耗尽 |
| SECRET_FAN_CLUES | 22 | 30 | +8 | 100%耗尽 |
| ATMOSPHERE_MOOD | 48 | 54 | +6 | 98%高温 |
| ROMANCE_CRISIS | 34 | 44 | +10 | 97%高温 |
| DRAMA_MISUNDERSTAND | 24 | 32 | +8 | 96%高温 |
| ROMANCE_LATENIGHT | 41 | 50 | +9 | 91%高温 |
| ENCOUNTER_ML | 40 | 48 | +8 | 90%高温 |
| SECRET_COMPANY | 23 | 31 | +8 | 90%高温 |

#### 验证 (Seed:764)
```
好感90 | 人气100 | Ch6 | 201轮
6原耗尽池→全部修复 ✅
新耗：BROTHER_ADVANCE_TESTS(190轮) + DRAMA_COLDWAR(201轮)
```

#### 第二波补刀

| 池子 | 扩充前 | 扩充后 | 新增 |
|------|--------|--------|------|
| BROTHER_ADVANCE_TESTS | 21 | 30 | +9 |
| DRAMA_COLDWAR | 24 | 32 | +8 |

**最终**: 0真实耗尽，11个高温(均<100%)

---

### 第三轮扩充 (Round 3) — 重跑5遍→修4反复池+2新耗尽池
**起始**: 4,599 → **验证后**: ~4,654 (+55条)

#### 5轮模拟暴露问题 (不同Seed)

| 池子 | 问题频率 | 表现 |
|------|---------|------|
| `ROMANCE_CONFESSION`(22) | **3/5轮** | 2耗尽+1高温 |
| `DRAMA_DATING_RUMOR`(21) | **3/5轮** | 1耗尽+2高温 |
| `ENCOUNTER_ML`(48) | **3/5轮** | 1耗尽+2高温 |
| `ROMANCE_LATENIGHT`(50) | **3/5轮** | 3高温 |
| `ENCOUNTER_RIVAL`(24) | 1/5轮 | 1耗尽(191) |
| `TOXIC_FAN_WAR_POOL`(12) | 1/5轮 | 1耗尽(199) |

#### 第一波 (5个反复/耗尽池)

| 池子 | 扩充前 | 扩充后 | 新增 |
|------|--------|--------|------|
| ROMANCE_CONFESSION | 22 | 32 | +10 |
| DRAMA_DATING_RUMOR | 21 | 31 | +10 |
| ENCOUNTER_ML | 48 | 58 | +10 |
| ROMANCE_LATENIGHT | 50 | 60 | +10 |
| CALENDAR_EVENTS | 62 | 72 | +10 |
| ENCOUNTER_RIVAL | 24 | 34 | +10 |
| TOXIC_FAN_WAR_POOL | 12 | 20 | +8 |
| ROMANCE_PUBLIC | 50 | 56 | +6 |

**验证**: 4个反复池(各3/5出问题)→全部清零 ✅

---

### 第四轮扩充 (Round 4) — 流残偶发池
**起始**: ~4,654 → **补充**: +59条

#### 5轮验证发现的偶发单次问题

| 池子 | 扩充前 | 扩充后 | 新增 | 问题 |
|------|--------|--------|------|------|
| MILESTONE_AWARDS | 24 | 34 | +10 | 1/5耗尽(172) |
| BROTHER_SIDE_PLOTS | 12 | 22 | +10 | 1/5耗尽(199) |
| ENCOUNTER_BROTHER | 32 | 42 | +10 | 1/5耗尽(201) |
| ENCOUNTER_RIVAL | 34 | 40 | +6 | 1/5高温(91%) |
| ATMOSPHERE_HIS_STATE | 55 | 62 | +7 | 1/5高温(98%) |
| CHEER_CULTURE_POOL | 10 | 18 | +8 | 1/5高温(90%) |
| DRAMA_DILEMMA | 24 | 31 | +7 | 1/5高温(91%) |

---

### 第五轮扩充 (Round 5) — 清尾残
**验证**: 4个偶发单次耗尽池

| 池子 | 扩充前 | 扩充后 | 新增 | 问题 |
|------|--------|--------|------|------|
| ROMANCE_LATENIGHT | 60 | 70 | +10 | 1/5耗尽(182) |
| ENCOUNTER_ML | 58 | 66 | +8 | 1/5耗尽(193) |
| ROMANCE_BACKSTAGE | 55 | 63 | +8 | 1/5耗尽(196) |
| SECRET_COMMS | 22 | 30 | +8 | 1/5耗尽(184) |

---

## 总结

| 指标 | 起始 | 最终 | 变化 |
|------|------|------|------|
| 总条目 | ~3,885 | **~4,733** | **+~848** |
| 扩充轮次 | — | **5轮** | — |
| 系统性耗尽池(3/5+) | 6 | **0** | -6 |
| 偶发耗尽池(1/5) | — | **0** | 已补 |

### 扩充池统计

| 轮次 | 池子数 | 新增条数 | 核心方法 |
|------|--------|---------|---------|
| R1 场景注入 | 44 | ~598 | 规划批量扩 |
| R2 跑模拟补耗尽 | 14 | ~116 | 模拟→耗尽→补 |
| R3 5跑修反复 | 8 | ~55 | 多Seed验证 |
| R4 流残 | 7 | ~59 | 单次耗尽清零 |
| R5 清尾 | 4 | ~34 | 收尾清零 |
| **合计** | **77** | **~862** | — |

### 改动文件完整清单

```
R1 场景注入批量扩充:
  encounter-brother.js        (5→31)    +26
  encounter-rival.js          (5→24)    +19
  encounter-ml.js             (14→32)   +18
  encounter-others.js         (9→21)    +12
  romance-public.js           (17→36)   +19
  romance-latenight.js        (17→28)   +11
  romance-backstage.js        (22→34)   +12
  romance-crisis.js           (12→24)   +12
  romance-jealousy.js         (12→16)   +4
  drama-misunderstand.js      (10→20)   +10
  drama-coldwar.js            (10→19)   +9
  drama-dating-rumor.js       (10→18)   +8
  drama-dilemma.js            (9→17)    +8
  drama-almost.js             (11→14)   +3
  secret-comms.js             (10→23)   +13
  secret-nearmiss.js          (11→22)   +11
  secret-company-warning.js   (8→14)    +6
  secret-fan-clues.js         (10→13)   +3
  atmosphere-weather.js       (12→44)   +32
  atmosphere-mood.js          (12→39)   +27
  atmosphere-his-state.js     (12→37)   +25
  milestone-first-win.js      (9→14)    +5
  milestone-awards.js         (12→13)   +1
  secret-discovery-events.js  (8→13)    +5
  industry-events.js          (6→9)     +3
  health-injury.js            (10→15)   +5
  teammate-bond.js            (10→15)   +5
  toxic-fan-war.js            (10→12)   +2
  variety-moment.js           (10→12)   +2
  job-grade.js                (10→12)   +2

R2 跑模拟→补耗尽 (14池):
  atmosphere-his-state.js     (37→55)   +18
  atmosphere-mood.js          (39→54)   +15
  encounter-others.js         (21→32)   +11
  milestone-first-win.js      (14→31)   +17
  rival-advance-events.js     (→28)     +9
  romance-public.js           (36→50)   +14
  secret-fan-clues.js         (13→30)   +17
  romance-crisis.js           (24→44)   +20
  drama-misunderstand.js      (20→32)   +12
  romance-latenight.js        (28→50)   +22
  encounter-ml.js             (32→48)   +16
  secret-company-warning.js   (14→31)   +17
  brother-advance-tests.js    (→30)     +9
  drama-coldwar.js            (19→32)   +13

R3 5跑修反复 (8池):
  romance-confession.js       (22→32)   +10
  drama-dating-rumor.js       (18→31)   +13
  encounter-ml.js             (48→58)   +10
  romance-latenight.js        (50→60)   +10
  calendar-events.js          (62→72)   +10
  encounter-rival.js          (24→34)   +10
  toxic-fan-war.js            (12→20)   +8
  romance-public.js           (50→56)   +6

R4 流残 (7池):
  milestone-awards.js         (13→34)   +21
  brother-side-plots.js       (12→22)   +10
  encounter-brother.js        (31→42)   +11
  encounter-rival.js          (34→40)   +6
  atmosphere-his-state.js     (55→62)   +7
  cheer-culture.js            (10→18)   +8
  drama-dilemma.js            (17→31)   +14

R5 清尾 (4池):
  romance-latenight.js        (60→70)   +10
  encounter-ml.js             (58→66)   +8
  romance-backstage.js        (34→63)   +29
  secret-comms.js             (23→30)   +7
```

**零系统性耗尽 | 多Seed零问题 | 200轮全通关**
