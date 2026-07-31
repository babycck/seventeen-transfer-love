---
name: pool-expand-anti-repeat-random-start
overview: 三件事：1）所有日程池从30~50条扩充到60+条防止早期重复；2）新增pickFromPoolNoRepeat函数追踪近N轮已用条目防重复；3）恢复dayCount随机起始日1~366
todos:
  - id: add-norepeat-func
    content: 在_utils.js新增pickFromPoolNoRepeat函数：排除usedArr中近N条已用key，候选不足时fallback全池
    status: completed
  - id: expand-schedule-pools
    content: 扩充ent-schedules.js中8个池子：COMMON_POOL/RELATED_POOL/CHAPTER1~5各+10或+30条，共+120条
    status: completed
  - id: expand-trainee-pools
    content: 扩充trainee-early/mid/late.js三个练习生池各+30条，新增自然练习生日常条目
    status: completed
  - id: integrate-cycle
    content: cycle.js集成pickFromPoolNoRepeat：为每个池独立维护usedArr，替换原有pick/pickFromPoolRotate调用
    status: completed
    dependencies:
      - add-norepeat-func
      - expand-schedule-pools
      - expand-trainee-pools
  - id: random-daycount
    content: state.js第56行dayCount从固定1改为randInt(1,366)，实现开局日期随机
    status: completed
---

## 用户需求

1. 所有池子扩充到至少60条，防止200轮游戏中隔两天就重复同一个场景
2. 新增防重复机制：pickFromPool时排除近N轮已用条目，避免短期同场景反复出现
3. dayCount从固定1恢复为随机Math.floor(Math.random()*366)+1，否则永远从1月1日开始

## 当前池子与缺口

| 池名 | 当前 | 目标 | 缺口 |
| --- | --- | --- | --- |
| TRAINEE_EARLY_POOL | 30 | 60 | +30 |
| TRAINEE_MID_POOL | 30 | 60 | +30 |
| TRAINEE_LATE_POOL | 30 | 60 | +30 |
| COMMON_POOL | 50 | 60 | +10 |
| RELATED_POOL | 50 | 60 | +10 |
| CHAPTER1_NOVICE | 50 | 60 | +10 |
| CHAPTER2_SPROUTING | 30 | 60 | +30 |
| CHAPTER2_RISING | 50 | 60 | +10 |
| CHAPTER3_PEAK | 50 | 60 | +10 |
| CHAPTER4_LEGEND | 50 | 60 | +10 |
| CHAPTER5_TOPSTAR | 30 | 60 | +30 |
| BOYGROUP_POOL | 92 | -- | 已够 |


## 核心功能

- pickFromPoolNoRepeat：从池子中随机抽取但排除近期usedArr中已用条目，maxAvoid可配
- cycle.js中为每个pool维护独立usedArr数组，调用新函数
- 练习生/出道后所有日程从池子抽且不短期重复
- 开局日期随机，季节/天气/节日自动同步

## 技术方案

### 1. 新增去重函数（_utils.js）

在`pickFromPoolRotate`后面新增`pickFromPoolNoRepeat`函数：

```
pickFromPoolNoRepeat(pool, usedArr, maxAvoid, cat)
  - pool: 候选池子
  - usedArr: 引用型数组，存储近N个已用key，由调用方维护
  - maxAvoid: 最大回避数（默认10），当pool.length<maxAvoid*2时自动降为floor(pool.length/3)
  - cat: 可选过滤，同pickFromPoolRotate
  - 逻辑：candidates=pool过滤掉usedArr中的key → 随机选1条 → push到usedArr → 若usedArr超过maxAvoid则shift出头元素
  - fallback：候选池为空时清空usedArr，全池随机重选
```

### 2. 池子扩充（4个文件）

- `ent-schedules.js`：COMMON_POOL(+10)、RELATED_POOL(+10)、CHAPTER1_NOVICE(+10)、CHAPTER2_RISING(+10)、CHAPTER3_PEAK(+10)、CHAPTER4_LEGEND(+10)、CHAPTER2_SPROUTING(+30)、CHAPTER5_TOPSTAR(+30)
- `trainee-early.js`：TRAINEE_EARLY_POOL(+30)，新增条目如"会社走廊偶遇前辈""第一次听到自己录音""食堂排队""宿舍整理"等自然练习生日常
- `trainee-mid.js`：TRAINEE_MID_POOL(+30)，新增如"月末评价候场""编舞笔记被前辈看到""团队被训话""偷看哥哥练习"等
- `trainee-late.js`：TRAINEE_LATE_POOL(+30)，新增如"最后一次月末评价""出道组宿舍分配""签名练习""试穿打歌服"等

### 3. cycle.js集成

在`rollDailyAgenda`中：

- 模块级声明各池usedArr数组：`var _usedMain={}, _usedRelated={}, _usedTrainee={}, _usedCommon={}`
- 练习生main抽取：`pickFromPoolNoRepeat(validPool, _usedTrainee, 4)`
- 练习生related抽取：`pickFromPoolNoRepeat(validPool, _usedTrainee, 6)`
- 出道后main抽取(70%)：`pickFromPoolNoRepeat(chapterPool, _usedMain, 10)`
- 出道后main抽取(30%)：`pickFromPoolNoRepeat(COMMON_POOL, _usedCommon, 10)`
- 出道后related/maleLead/rival/brother：同样用pickFromPoolNoRepeat，各池独立usedArr
- import新函数：`import { filterByRequire, pickFromPoolRotate, pickFromPoolNoRepeat } from './pools/_utils.js'`

### 4. state.js随机起始日

`E.cycle.dayCount: 1` → `E.cycle.dayCount: randInt(1, 366)`

engine.js中`generateEntSimRound`已有季节/天气同步逻辑（第65-71行），随机dayCount会自动触发正确的季节初始化。

### 修改文件清单（7个）

| 文件 | 操作 | 说明 |
| --- | --- | --- |
| `pools/_utils.js` | 新增函数 | pickFromPoolNoRepeat |
| `pools/ent-schedules.js` | 扩充条目 | 8个池子共+120条 |
| `pools/trainee-early.js` | 扩充条目 | +30条 |
| `pools/trainee-mid.js` | 扩充条目 | +30条 |
| `pools/trainee-late.js` | 扩充条目 | +30条 |
| `cycle.js` | 集成+import | 用pickFromPoolNoRepeat替换pick/pickFromPoolRotate |
| `state.js` | 修改 | dayCount随机化 |