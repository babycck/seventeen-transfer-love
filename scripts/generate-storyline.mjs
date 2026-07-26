// ============================================================
// 生成200轮轻量剧情文本 — 用于快速浏览游戏流程
// 包含：每日日程 + 触发事件 + 场景注入素材摘要
// 不调用AI，纯结构输出
// ============================================================

import * as allPools from '../src/ent-sim/pools/index.js';

var SEED = Date.now() % 1000;
var E = null;

// 初始化状态
function init() {
  E = {
    affection: 0, popularity: 0, exposure: 0, chapter: 1,
    _isDebut: false, _debutDay: 0, _traineeDayCount: 0, _traineePhase: 1,
    _gameDayCount: 0, dayCount: 1, slotInDay: 0, roundNum: 0,
    career: { debutDay: 0, popularity: 0, traineePhase: 1 },
    _month: 6 + (SEED % 6), season: ['春','夏','秋','冬'][SEED % 4],
    _romanceStage: 0,
    _lastContactDay: 0, _lastFanLetterDay: 0, _lastBrandOfferDay: 0,
    _lastAwardDay: 0, _lastVarietyDay: 0, _lastDispatchDay: 0,
    _lastMagazineDay: 0, _lastRumorDay: 0, _lastSasaengDay: 0,
    _lastFansignDay: 0, _lastConcertDay: 0, _lastComebackDay: 0,
    _lastMusicShowDay: 0, _lastSetbackDay: 0, _lastReleaseDay: 0,
    _lastJobOfferDay: 0, _lastJobGradeDay: 0, _lastYearEndDay: 0,
    _lastMVDay: 0, _lastPressDay: 0, _lastHiddenDay: 0,
    _lastCheerDay: 0, _lastSasaengEscDay: 0, _lastVarietyMomDay: 0,
    _lastScandalDay: 0, _lastHiatusDay: 0,
    _chatBrotherIdx: 0, _chatRivalIdx: 0, _chatManagerIdx: 0,
    _chatGroupIdx: 0, _chatSasaengIdx: 0, _pushChatDayCounter: 0,
  };
}

function pick(items, n) {
  if (!items || !items.length) return n > 0 ? ['(池子为空)'] : [];
  var arr = items.slice(); var res = []; n = Math.min(n, arr.length);
  for (var i = 0; i < n; i++) { var idx = Math.floor(Math.random()*arr.length); res.push(arr.splice(idx,1)[0]); }
  return res;
}

function shortText(text, maxLen) {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen-3) + '...' : text;
}

// 时间段标签
var PHASES = ['☀ 上午', '☀ 下午', '🌙 夜晚'];
var CHAPTER_NAMES = {1:'新人出道',2:'崭露头角',3:'稳步上升',4:'人气偶像',5:'顶流巨星',6:'传奇殿堂'};
var TRAINEE_LABELS = {1:'练习生前期',2:'练习生中期',3:'练习生后期'};

// 每天事件判定
function dailyEvents() {
  var gd = E._gameDayCount, isD = E._isDebut;
  var events = [];

  // 日程
  if (!isD) {
    var pools = {1:'TRAINEE_EARLY_POOL',2:'TRAINEE_MID_POOL',3:'TRAINEE_LATE_POOL'};
    var pn = pools[E._traineePhase] || 'TRAINEE_EARLY_POOL';
    var p = allPools[pn]; if (p && p.length) events.push({type:'日程', text:shortText(pick(p,1)[0].text||'',80), pool:pn});
  } else {
    var chMap = {1:'CHAPTER1_NOVICE',2:'CHAPTER2_SPROUTING',3:'CHAPTER2_RISING',4:'CHAPTER3_PEAK',5:'CHAPTER5_TOPSTAR',6:'CHAPTER4_LEGEND'};
    var chP = allPools[chMap[E.chapter]] || allPools.CHAPTER1_NOVICE;
    var mainP = Math.random()<0.7 ? chP : allPools.COMMON_POOL;
    if (mainP && mainP.length) events.push({type:'日程', text:shortText(pick(mainP,1)[0].text||'',80), pool:'schedule'});
    if (allPools.RELATED_POOL && allPools.RELATED_POOL.length) events.push({type:'关联', text:shortText(pick(allPools.RELATED_POOL,1)[0].text||'',70), pool:'RELATED'});
  }

  // 粉丝来信
  if (isD && gd > E._lastFanLetterDay) { E._lastFanLetterDay=gd; if (allPools.FAN_LETTER_POOL && allPools.FAN_LETTER_POOL.length) events.push({type:'粉丝来信', text:shortText(pick(allPools.FAN_LETTER_POOL,1)[0].text||'',70), pool:'FAN_LETTER'}); }

  // 随机事件
  var eventChecks = [
    {cond: isD && E.popularity>=20 && gd-E._lastBrandOfferDay>=2 && Math.random()<0.5, pool:'BRAND_OFFER_POOL', last:'_lastBrandOfferDay', label:'代言'},
    {cond: isD && E.popularity>=15 && gd-(E._lastJobOfferDay||0)>=3 && Math.random()<0.3, pool:'JOB_OFFER_POOL', last:'_lastJobOfferDay', label:'通告邀约'},
    {cond: isD && E.popularity>=15 && gd-(E._lastJobGradeDay||0)>=4 && Math.random()<0.4, pool:'JOB_GRADE_POOL', last:'_lastJobGradeDay', label:'通告分级'},
    {cond: isD && gd>=8 && gd-E._lastAwardDay>=4 && Math.random()<0.5, pool:'AWARD_POOL', last:'_lastAwardDay', label:'颁奖'},
    {cond: isD && E.popularity>=25 && gd-E._lastVarietyDay>=2 && Math.random()<0.5, pool:'VARIETY_SHOW_POOL', last:'_lastVarietyDay', label:'综艺'},
    {cond: isD && E.popularity>=40 && gd-E._lastMagazineDay>=3 && Math.random()<0.4, pool:'MAGAZINE_POOL', last:'_lastMagazineDay', label:'画报'},
    {cond: isD && E.popularity>=15 && gd-E._lastFansignDay>=4 && Math.random()<0.45, pool:'FANSIGN_POOL', last:'_lastFansignDay', label:'签售'},
    {cond: isD && E.popularity>=20 && gd-E._lastMusicShowDay>=3 && Math.random()<0.4, pool:'MUSIC_SHOW_POOL', last:'_lastMusicShowDay', label:'打歌'},
    {cond: isD && E.popularity>=35 && gd-E._lastComebackDay>=5 && Math.random()<0.35, pool:'COMEBACK_CYCLE_POOL', last:'_lastComebackDay', label:'回归'},
    {cond: isD && E.popularity>=50 && gd-E._lastConcertDay>=6 && Math.random()<0.35, pool:'CONCERT_POOL', last:'_lastConcertDay', label:'演唱会'},
    {cond: isD && E.exposure>=30 && gd-E._lastDispatchDay>=3 && Math.random()<0.4, pool:'DISPATCH_POOL', last:'_lastDispatchDay', label:'Dispatch'},
    {cond: isD && E.affection>=50 && E.exposure>=40 && gd-E._lastRumorDay>=3 && Math.random()<0.4, pool:'RUMOR_POOL', last:'_lastRumorDay', label:'绯闻'},
    {cond: isD && E.popularity>=25 && gd-E._lastSasaengDay>=5 && Math.random()<0.08, pool:'CHAT_SASAENG', last:'_lastSasaengDay', label:'⚠私生'},
    {cond: gd>=10 && gd-E._lastSetbackDay>=5 && Math.random()<0.3, pool:'CAREER_SETBACKS', last:'_lastSetbackDay', label:'挫折'},
    // 新增池子
    {cond: isD && E.popularity>=15 && gd-(E._lastCheerDay||0)>=3 && Math.random()<0.4, pool:'CHEER_CULTURE_POOL', last:'_lastCheerDay', label:'应援'},
    {cond: isD && E.popularity>=25 && gd-(E._lastSasaengEscDay||0)>=5 && Math.random()<0.25, pool:'SASAENG_ESCALATION_POOL', last:'_lastSasaengEscDay', label:'私生升级'},
    {cond: isD && E.popularity>=20 && gd-(E._lastVarietyMomDay||0)>=3 && Math.random()<0.35, pool:'VARIETY_MOMENT_POOL', last:'_lastVarietyMomDay', label:'综艺名场面'},
    {cond: isD && E.affection>=40 && gd-(E._lastScandalDay||0)>=5 && Math.random()<0.25, pool:'DATING_SCANDAL_CHAIN', last:'_lastScandalDay', label:'绯闻演化'},
    {cond: isD && gd-(E._lastHiatusDay||0)>=4 && Math.random()<0.3, pool:'HIATUS_ANXIETY_POOL', last:'_lastHiatusDay', label:'空白期'},
    {cond: isD && E.popularity>=25 && gd-(E._lastMVDay||0)>=5 && Math.random()<0.3, pool:'MV_FILMING_POOL', last:'_lastMVDay', label:'MV拍摄'},
    {cond: isD && E.popularity>=20 && gd-(E._lastPressDay||0)>=5 && Math.random()<0.35, pool:'PRESS_INTERVIEW_POOL', last:'_lastPressDay', label:'记者采访'},
    {cond: isD && E.popularity>=25 && gd-(E._lastHiddenDay||0)>=8 && Math.random()<0.2, pool:'HIDDEN_ROUTE_POOL', last:'_lastHiddenDay', label:'隐藏路线'},
    {cond: isD && gd-(E._lastYearEndDay||0)>=50 && Math.random()<0.3, pool:'YEAR_END_REVIEW_POOL', last:'_lastYearEndDay', label:'年末结算'},
  ];
  for (var ei=0; ei<eventChecks.length; ei++) {
    var ec = eventChecks[ei];
    if (ec.cond) {
      E[ec.last] = gd;
      var pp = allPools[ec.pool];
      if (pp && pp.length) {
        var txt = typeof pp[0] === 'string' ? pp[0] : (pp[0].text||'');
        events.push({type:ec.label, text:shortText(txt,70), pool:ec.pool});
      }
    }
  }

  // 随机事件调度
  if (Math.random()<0.15 && allPools.BROTHER_EVENT_POOL && allPools.BROTHER_EVENT_POOL.length) events.push({type:'👦哥哥', text:shortText(pick(allPools.BROTHER_EVENT_POOL,1)[0].text||'',70), pool:'BROTHER'});
  if (Math.random()<0.10 && allPools.MALE_LEAD_INITIATIVE_POOL && allPools.MALE_LEAD_INITIATIVE_POOL.length) events.push({type:'💙男主', text:shortText(pick(allPools.MALE_LEAD_INITIATIVE_POOL,1)[0].text||'',70), pool:'ML_INIT'});
  if (E.affection>=20 && Math.random()<0.15 && allPools.JEALOUSY_EVENTS_POOL && allPools.JEALOUSY_EVENTS_POOL.length) events.push({type:'😤吃醋', text:shortText(pick(allPools.JEALOUSY_EVENTS_POOL,1)[0].text||'',70), pool:'JEALOUSY'});
  if (E.affection>=10 && Math.random()<0.20 && allPools.RIVAL_ADVANCE_EVENTS && allPools.RIVAL_ADVANCE_EVENTS.length) events.push({type:'🦹情敌', text:shortText(pick(allPools.RIVAL_ADVANCE_EVENTS,1)[0].text||'',70), pool:'RIVAL'});
  if (Math.random()<0.12 && allPools.HEALTH_INJURY_POOL && allPools.HEALTH_INJURY_POOL.length) events.push({type:'🏥伤病', text:shortText(pick(allPools.HEALTH_INJURY_POOL,1)[0].text||'',70), pool:'HEALTH'});
  if (Math.random()<0.15 && allPools.TEAMMATE_BOND_POOL && allPools.TEAMMATE_BOND_POOL.length) events.push({type:'👭队友', text:shortText(pick(allPools.TEAMMATE_BOND_POOL,1)[0].text||'',70), pool:'BOND'});
  if (E.popularity>=20 && Math.random()<0.20 && allPools.TOXIC_FAN_WAR_POOL && allPools.TOXIC_FAN_WAR_POOL.length) events.push({type:'🔥毒唯', text:shortText(pick(allPools.TOXIC_FAN_WAR_POOL,1)[0].text||'',70), pool:'TOXIC'});
  if (isD && Math.random()<0.25 && allPools.GIRLGROUP_EVENTS && allPools.GIRLGROUP_EVENTS.length) events.push({type:'👗女团', text:shortText(pick(allPools.GIRLGROUP_EVENTS,1)[0].text||'',70), pool:'GG'});
  if (isD && Math.random()<0.18 && allPools.INDUSTRY_EVENTS && allPools.INDUSTRY_EVENTS.length) events.push({type:'🏭行业', text:shortText(pick(allPools.INDUSTRY_EVENTS,1)[0].text||'',70), pool:'IND'});

  return events;
}

function chapterByPop(pop) {
  if (pop>=90) return 6; if (pop>=75) return 5; if (pop>=55) return 4; if (pop>=35) return 3; if (pop>=15) return 2; return 1;
}

var CHAPTER_SKIP = {2:30,3:45,4:60,5:75,6:90};

// ══════════════════════════════════ 主循环 ══════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════════');
console.log('  娱乐圈模拟器 · 200轮轻量剧情流');
console.log('  「女团爱豆 × SEVENTEEN 男主」非最优路线');
console.log('═══════════════════════════════════════════════════════════════════\n');

init();
var round = 0, slot = 0;
var affStage = 0; // 0=初识 1=暧昧(20) 2=明确(60)

for (var r = 0; r < 200; r++) {
  if (slot >= 3) {
    slot = 0;
    E.dayCount++; E._gameDayCount++;
    
    // 练习生推进
    if (!E._isDebut) {
      E._traineeDayCount = (E._traineeDayCount||0)+1;
      var tp = E._traineeDayCount<=4 ? 1 : E._traineeDayCount<=10 ? 2 : 3;
      if (tp !== E._traineePhase) {
        E._traineePhase = tp; E.career.traineePhase = tp;
        console.log('  🌱 ' + TRAINEE_LABELS[tp] + ' (第'+E._traineeDayCount+'天)');
      }
      if (tp===3) { E._debutC = (E._debutC||0)+1; if (E._debutC>=2+Math.floor(Math.random()*3)) { E._isDebut=true; E.career.debutDay=E.dayCount; E._debutDay=E.dayCount; E.popularity=0; E.career.popularity=0; console.log('\n  ╔══════════════════════════════════════╗');
        console.log('  ║  🎀 恭喜出道！'+'                            ║');
        console.log('  ║  成为新人女团成员  人气=0 从零开始   ║');
        console.log('  ╚══════════════════════════════════════╝\n'); } }
    }

    // 日结算事件
    var devts = dailyEvents();
    if (devts.length) {
      console.log('  ── Day ' + E.dayCount + ' 日结算 ──');
      for (var di=0; di<devts.length && di<5; di++) {
        console.log('    ' + devts[di].type + ': ' + devts[di].text);
      }
    }
  }

  round++; slot++; E.roundNum = round;

  // 好感度
  var ar = Math.random();
  var ad = 0;
  if (ar<0.55) ad=1+Math.floor(Math.random()*3); else if (ar<0.82) ad=0; else if (ar<0.92) ad=-(Math.floor(Math.random()*2)); else ad=-(2+Math.floor(Math.random()*2));
  if (E.affection>=80) ad=Math.max(-1,ad-1);
  E.affection = Math.max(0,Math.min(100,E.affection+ad));
  var nas = E.affection>=60?2:E.affection>=20?1:0;
  if (nas>affStage) { affStage=nas; if (nas===1) console.log('    💚 进入暧昧期 (aff='+E.affection+')'); if (nas===2) console.log('    💗 进入明确期 (aff='+E.affection+')'); }

  // 人气
  if (E._isDebut && Math.random()<0.5) { E.popularity=Math.min(100,E.popularity+1); E.career.popularity=E.popularity; }

  // 章节
  var tCh = chapterByPop(E.popularity);
  if (tCh>E.chapter) {
    var oCh=E.chapter; E.chapter=tCh; var sk=CHAPTER_SKIP[tCh]||0; if (sk>0) E.dayCount+=sk;
    console.log('    ⬆ 进入 ' + CHAPTER_NAMES[E.chapter] + ' (人气='+E.popularity+')');
  }

  // 曝光
  if (E._isDebut && E.affection>=15) E.exposure=Math.min(100,E.exposure+0.3+Math.random()*0.7);
}

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('  200轮完成');
console.log('  最终好感: ' + E.affection + ' | 人气: ' + E.popularity + ' | 章节: ' + E.chapter);
console.log('  日历天数: ' + E.dayCount + ' | 游戏天: ' + E._gameDayCount);
console.log('═══════════════════════════════════════════════════════════════════');
