// ============================================================
// entSim pools · 统一导出入口
// 105个池子全部 re-export，按20类分组
// ============================================================

export { pickFromPool, pickFromPoolMulti, pickFanReactions, pickFromPoolRotate } from './_utils.js';
export { canTrigger, filterByRequire } from './_utils.js';

// ── 一、世界设定 (6个) ──
export { GROUP_NAMES } from './group-names.js';
export { COMPANY_NAMES } from './company-names.js';
export { GROUP_CONCEPTS } from './group-concepts.js';
export { HIT_SONGS } from './hit-songs.js';
export { TEAMMATE_NAMES } from './teammate-names.js';
export { SISTER_ROLES } from './sister-roles.js';

// ── 二、SEVENTEEN成员 (14个) ──
export { SVT_TEAMMATE_PROFILES } from './svt-teammate-profiles.js';
export { SVT_TEAMMATE_EVENT_POOL } from './svt-teammate.js';
export { TEAMMATE_FLAVOR } from './teammate-flavor.js';
export { MEMBER_SCOUPS, MEMBER_JEONGHAN, MEMBER_JOSHUA, MEMBER_JUN, MEMBER_HOSHI, MEMBER_WONWOO, MEMBER_WOOZI, MEMBER_DK, MEMBER_MINGYU, MEMBER_THE8, MEMBER_SEUNGKWAN, MEMBER_VERNON, MEMBER_DINO } from './members.js';

// ── 三、练习生三阶段 (5个) ──
export { TRAINEE_EARLY_POOL } from './trainee-early.js';
export { TRAINEE_MID_POOL } from './trainee-mid.js';
export { TRAINEE_LATE_POOL } from './trainee-late.js';
export { TRAINEE_EVENTS } from './trainee-events.js';
export { TRAINEE_CHAT } from './trainee-chat.js';

// ── 四、章节日程 (10个) ──
export { COMMON_POOL, RELATED_POOL, TRAINEE_POOL, CHAPTER1_NOVICE, CHAPTER2_SPROUTING, CHAPTER2_RISING, CHAPTER3_PEAK, CHAPTER5_TOPSTAR, CHAPTER4_LEGEND, BOYGROUP_POOL } from './ent-schedules.js';

// ── 五、聊天系统 (8个) ──
export { CHAT_MALE_LEAD, CHAT_BROTHER, CHAT_RIVAL, CHAT_MANAGER, GROUP_CHAT, CHAT_SASAENG, CHAT_ACK_BROTHER, CHAT_ACK_RIVAL, CHAT_ACK_MALE_LEAD, CHAT_ML_DAILY_STARTERS } from './chat-male-lead.js';

// ── 六、男主/感情线 (6个) ──
export { MALE_LEAD_INITIATIVE_POOL } from './male-lead-init.js';
export { CONTACT_TYPE_POOL } from './male-contact.js';
export { CONTACT_PROGRESSION } from './contact-progression.js';
export { JEALOUSY_EVENTS_POOL } from './jealousy-events.js';
export { RUMOR_POOL } from './dating-rumors.js';
export { ONEHEART_RANDOM_EVENTS } from './oneheart-events.js';

// ── 七、哥哥线 (3个) ──
export { BROTHER_EVENT_POOL } from './brother-events.js';
export { BROTHER_SIDE_PLOTS } from './brother-side-plots.js';
export { BROTHER_ADVANCE_TESTS } from './brother-tests.js';

// ── 八、情敌/秘密 (4个) ──
export { RIVAL_ADVANCE_EVENTS } from './rival-advance-events.js';
export { SECRET_DISCOVERY_EVENTS } from './secret-discovery-events.js';
export { INDUSTRY_EVENTS } from './industry-events.js';
export { SPECIAL_EVENTS } from './special-events.js';

// ── 九、事业/女团 (4个) ──
export { CAREER_SETBACKS } from './career-setbacks.js';
export { GIRLGROUP_EVENTS } from './girlgroup-events.js';
export { INCIDENT_EVENTS_POOL } from './incident-events.js';
export { DAILY_ENGAGEMENT_POOL } from './daily-engagement.js';

// ── 十、媒体/舆论 (7个) ──
export { DAILY_BUZZ } from './daily-buzz.js';
export { DAILY_BUZZ_TEMPLATES } from './daily-buzz-templates.js';
export { HOT_SEARCH_REPLY_POOL } from './hot-search-replies.js';
export { DISPATCH_POOL } from './dispatch-news.js';
export { EXTERNAL_HOT } from './external-hot.js';
export { NEWS_TEMPLATES } from './news-templates.js';

// ── 十一、作品/品牌/奖项 (4个) ──
export { RELEASE_POOL } from './releases.js';
export { BRAND_OFFER_POOL } from './brand-offers.js';
export { AWARD_POOL } from './awards.js';
export { CHART_POOL } from './music-charts.js';

// ── 十二、打歌/演唱会/签售/回归/杂志 (5个) ──
export { MUSIC_SHOW_POOL } from './music-show-pool.js';
export { CONCERT_POOL } from './concert-pool.js';
export { FANSIGN_POOL } from './fansign-pool.js';
export { COMEBACK_CYCLE_POOL } from './comeback-cycle.js';
export { MAGAZINE_POOL } from './magazine-shoots.js';

// ── 十三、综艺/粉丝/日记 (3个) ──
export { VARIETY_SHOW_POOL } from './variety-shows.js';
export { FAN_LETTER_POOL } from './fan-letters.js';
export { DIARY_TEMPLATES } from './diary-templates.js';

// ── 十四、日历+通告 (2个) NEW ──
export { CALENDAR_EVENTS } from './calendar-events.js';
export { JOB_OFFER_POOL } from './job-offers.js';

// ── 十五、恋爱场景 (6个) NEW ──
export { ROMANCE_BACKSTAGE } from './romance-backstage.js';
export { ROMANCE_LATENIGHT } from './romance-latenight.js';
export { ROMANCE_PUBLIC } from './romance-public.js';
export { ROMANCE_CRISIS } from './romance-crisis.js';
export { ROMANCE_JEALOUSY_POOL } from './romance-jealousy.js';
export { ROMANCE_CONFESSION } from './romance-confession.js';

// ── 十六~二十 待续（新建池子持续追加） ──

// ── 十六、地下恋专属 (4个) NEW ──
export { SECRET_COMMS } from './secret-comms.js';
export { SECRET_NEARMISS } from './secret-nearmiss.js';
export { SECRET_FAN_CLUES } from './secret-fan-clues.js';
export { SECRET_COMPANY } from './secret-company-warning.js';

// ── 十七、氛围情绪 (3个) NEW ──
export { ATMOSPHERE_WEATHER } from './atmosphere-weather.js';
export { ATMOSPHERE_MOOD } from './atmosphere-mood.js';
export { ATMOSPHERE_HIS_STATE } from './atmosphere-his-state.js';

// ── 十八、里程碑高光 (3个) NEW ──
export { MILESTONE_DEBUT } from './milestone-debut.js';
export { MILESTONE_FIRST_WIN } from './milestone-first-win.js';
export { MILESTONE_AWARDS } from './milestone-awards.js';

// ── 十九、偶遇场景 (4个) NEW ──
export { ENCOUNTER_ML } from './encounter-ml.js';
export { ENCOUNTER_RIVAL } from './encounter-rival.js';
export { ENCOUNTER_BROTHER } from './encounter-brother.js';
export { ENCOUNTER_OTHERS } from './encounter-others.js';

// ── 二十、剧情节奏 (5个) NEW ──
export { DRAMA_ALMOST } from './drama-almost.js';
export { DRAMA_MISUNDERSTAND } from './drama-misunderstand.js';
export { DRAMA_COLDWAR } from './drama-coldwar.js';
export { DRAMA_DATING_RUMOR } from './drama-dating-rumor.js';
export { DRAMA_DILEMMA } from './drama-dilemma.js';

export { ENT_SCHEDULE_POOL } from './ent-schedule.js';

// ── 二十一、新增池子 (13个) 2026-07-26 ──
export { CHEER_CULTURE_POOL } from './cheer-culture.js';
export { SASAENG_ESCALATION_POOL } from './sasaeng-escalation.js';
export { HEALTH_INJURY_POOL } from './health-injury.js';
export { TEAMMATE_BOND_POOL } from './teammate-bond.js';
export { TOXIC_FAN_WAR_POOL } from './toxic-fan-war.js';
export { DATING_SCANDAL_CHAIN } from './dating-scandal-chain.js';
export { HIATUS_ANXIETY_POOL } from './hiatus-anxiety.js';
export { VARIETY_MOMENT_POOL } from './variety-moment.js';
export { JOB_GRADE_POOL } from './job-grade.js';
export { YEAR_END_REVIEW_POOL } from './year-end-review.js';
export { MV_FILMING_POOL } from './mv-filming.js';
export { PRESS_INTERVIEW_POOL } from './press-interview.js';
export { HIDDEN_ROUTE_POOL } from './hidden-route.js';

