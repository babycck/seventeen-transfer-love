---
name: remove-livestream-gift-secret
overview: 删除所有"直播间刷礼物"相关秘密条目（共4处），确保女主秘密池完全围绕EXO（签售会/周边/同人文/直拍），并在prompt注入中明确禁止AI生成涉及SEVENTEEN成员的秘密。
todos:
  - id: remove-pool-entries
    content: 删除4个文件中的直播间刷礼物秘密条目：secret-discovery-events.js、ui-renderer.js、ent-sim/state.js、special-events.js
    status: pending
  - id: strengthen-prompt
    content: 更新prompts.js第1139行，加强EXO限定约束并显式禁止涉及SEVENTEEN成员直播间刷礼物行为
    status: pending
    dependencies:
      - remove-pool-entries
  - id: validate-syntax
    content: 全量语法验证：node -c 检查全部5个修改文件
    status: pending
    dependencies:
      - strengthen-prompt
---

## 用户需求

女主秘密池中存在"在成员直播间刷礼物"类条目，AI容易将该行为误判为SEVENTEEN成员直播间，而非EXO。要求删除所有涉及"直播间刷礼物"的秘密条目，使秘密严格围绕EXO（金珉锡签售会/周边/直拍/同人文），并在prompt中加强约束防止AI误读。

## 修改范围

涉及5个文件、共删除4条秘密条目、修改1处prompt描述：

### 删除的4条秘密

- `secret-discovery-events.js`：`secret_live_gift` — "你在SEVENTEEN成员直播间刷礼物的记录被男主看到"
- `ui-renderer.js` `_secPool`：— "你会在SEVENTEEN某位成员的直播间悄悄刷礼物，假装是路人粉丝"
- `ent-sim/state.js` `defaultSecrets()`：— "练习生时期在男主直播间刷过半年礼物，从没敢说"
- `special-events.js`：`secret_rival` — "某女团成员练习生时期为某男团成员刷过礼物"

### 保留的秘密（全部EXO向）

- 粉金珉锡/存直拍
- 瞒哥哥去EXO签售会
- 买EXO小卡/专辑/海报
- 写金珉锡同人文
- EXO粉丝+photo card/应援棒

## 技术方案

### 修改方式

纯数据层删除，不改动任何函数逻辑或数据结构。每条删除都是移除数组中的一个元素，操作简单且无副作用。

### 修改文件清单

**1. `src/ent-sim/pools/secret-discovery-events.js`** — 删除第8行 `secret_live_gift` 条目，保留前3条EXO向秘密事件。

**2. `src/ui-renderer.js`** — 删除第1334行 `_secPool` 中的直播间刷礼物条目，该行明确写了"SEVENTEEN"字眼，是AI误判的主要来源。

**3. `src/ent-sim/state.js`** — 删除第174行 `defaultSecrets()` 中的"练习生时期在男主直播间刷过半年礼物"，该条虽写"男主"但AI可能映射到SEVENTEEN成员。

**4. `src/ent-sim/pools/special-events.js`** — 删除第24行 `secret_rival` 条目，该条写"某男团成员"泛化表述，与EXO限定冲突。

**5. `src/prompts.js`** — 第1139行prompt描述从"都是EXO追星向的小秘密"加强为显式禁止：明确限定秘密对象必须是EXO（金珉锡/签售/周边/直拍/同人文），严禁涉及SEVENTEEN成员直播间或任何男团成员的刷礼物行为。

### 验证方案

- 所有修改后用 `node -c` 逐个语法检查
- 确认 `defaultSecrets()` 删除后池子仍≥2条（确保 `randInt(0, copy.length-1)` 不越界）
- 确认 `_secPool` 删除后仍有5条，`randInt(2,3)` 切片不受影响