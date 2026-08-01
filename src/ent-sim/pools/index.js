// ============================================================
// entSim pools · 统一导出入口
// 105个池子全部 re-export，按20类分组
// ============================================================

export { pickFromPool, pickFromPoolMulti, pickFanReactions, pickFromPoolRotate } from './_utils.js';
export { canTrigger, filterByRequire, pickWeighted, pickWeightedNoRepeat, dedupByKey } from './_utils.js';

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

// ── 三、练习生三阶段 (3个) ──
export { TRAINEE_EARLY_POOL } from './trainee-early.js';
export { TRAINEE_MID_POOL } from './trainee-mid.js';
export { TRAINEE_LATE_POOL } from './trainee-late.js';

// ── 四、章节日程 (10个) ──
export { COMMON_POOL, RELATED_POOL, TRAINEE_POOL, CHAPTER1_NOVICE, CHAPTER2_SPROUTING, CHAPTER2_RISING, CHAPTER3_PEAK, CHAPTER5_TOPSTAR, CHAPTER4_LEGEND, BOYGROUP_POOL } from './ent-schedules.js';

// ── 五、聊天系统 (8个) ──
export { CHAT_MALE_LEAD, CHAT_BROTHER, CHAT_RIVAL, CHAT_MANAGER, GROUP_CHAT, CHAT_SASAENG, CHAT_ML_DAILY_STARTERS } from './chat-male-lead.js';
export { getChatPresetsByChannel, getChatAckByChannel, getMaleLeadPresetsForChat } from './chat-stage/index.js';

// ── 六、男主/感情线 (6个) ──
export { MALE_LEAD_INITIATIVE_POOL } from './male-lead-init.js';
export { CONTACT_TYPE_POOL } from './male-contact.js';
export { CONTACT_PROGRESSION } from './contact-progression.js';
export { JEALOUSY_EVENTS_POOL, ROMANCE_JEALOUSY_POOL } from './jealousy-pool.js';
export { RUMOR_POOL, DATING_SCANDAL_CHAIN, DRAMA_DATING_RUMOR, NEWS_TEMPLATES } from './dating-rumor-pool.js';
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

// ── 十、媒体/舆论 (5个) ──
export { DAILY_BUZZ, DAILY_BUZZ_TEMPLATES } from './daily-buzz-pool.js';
export { HOT_SEARCH_REPLY_POOL } from './hot-search-replies.js';
export { DISPATCH_POOL } from './dispatch-news.js';
export { EXTERNAL_HOT } from './external-hot.js';
// NEWS_TEMPLATES 已合并至 dating-rumor-pool.js（六、男主/感情线）

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

// ── 十五、恋爱场景 (5个) NEW ──
export { ROMANCE_BACKSTAGE } from './romance-backstage.js';
export { ROMANCE_LATENIGHT } from './romance-latenight.js';
export { ROMANCE_PUBLIC } from './romance-public.js';
export { ROMANCE_CRISIS } from './romance-crisis.js';
export { ROMANCE_CONFESSION } from './romance-confession.js';
// ROMANCE_JEALOUSY_POOL 已合并至 jealousy-pool.js（六、男主/感情线）

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

// ── 日历氛围 + 日常插曲 (2个) NEW ──
export { CALENDAR_ATMO_POOL, getCalendarAtmo } from './calendar-atmo.js';
export { DAILY_DETAIL_POOL, filterDailyDetail, pickDailyDetail } from './daily-detail.js';

// ── 十九、偶遇场景 (4个) NEW ──
export { ENCOUNTER_ML } from './encounter-ml.js';
export { ENCOUNTER_RIVAL } from './encounter-rival.js';
export { ENCOUNTER_BROTHER } from './encounter-brother.js';
export { ENCOUNTER_OTHERS } from './encounter-others.js';

// ── 二十、剧情节奏 (4个) NEW ──
export { DRAMA_ALMOST } from './drama-almost.js';
export { DRAMA_MISUNDERSTAND } from './drama-misunderstand.js';
export { DRAMA_COLDWAR } from './drama-coldwar.js';
export { DRAMA_DILEMMA } from './drama-dilemma.js';
// DRAMA_DATING_RUMOR 已合并至 dating-rumor-pool.js（六、男主/感情线）

// ── 二十一、新增池子 (12个) 2026-07-26 ──
export { CHEER_CULTURE_POOL } from './cheer-culture.js';
export { SASAENG_ESCALATION_POOL } from './sasaeng-escalation.js';
export { HEALTH_INJURY_POOL } from './health-injury.js';
export { TEAMMATE_BOND_POOL } from './teammate-bond.js';
export { TOXIC_FAN_WAR_POOL } from './toxic-fan-war.js';
export { HIATUS_ANXIETY_POOL } from './hiatus-anxiety.js';
export { HIATUS_DAILY_POOL } from './hiatus-daily-pool.js';
export { VARIETY_MOMENT_POOL } from './variety-moment.js';
export { JOB_GRADE_POOL } from './job-grade.js';
export { YEAR_END_REVIEW_POOL } from './year-end-review.js';
export { MV_FILMING_POOL } from './mv-filming.js';
export { PRESS_INTERVIEW_POOL } from './press-interview.js';
export { HIDDEN_ROUTE_POOL } from './hidden-route.js';
// DATING_SCANDAL_CHAIN 已合并至 dating-rumor-pool.js（六、男主/感情线）

// ── 二十二、公司/经纪人 (1个) ──
export { COMPANY_EVENT_POOL } from './company-events.js';

// ── 二十三、chat-ack 按成员人设兜底回复 (1个) ──
export { getChatAckByChannel as getChatAckByMember } from './chat-ack/index.js';

// ── 二十四、v5新增池子 (17个) ──
export { MAINLINE_ROMANCE, MAINLINE_RIVAL } from './mainline-beats.js';
export { INSECURITY_POOL } from './insecurity-pool.js';
export { FAME_PRESSURE_POOL } from './fame-pressure-pool.js';
export { FAN_REACTIONS_POOL } from './fan-reactions-pool.js';
export { FAMILY_ENCOUNTER_POOL } from './family-encounter-pool.js';
export { JUNIOR_INDUSTRY_POOL } from './junior-industry-pool.js';
export { SEASON_ROMANCE_POOL } from './season-romance-pool.js';
export { CAREER_MILESTONE_SCENES } from './career-milestone-scenes.js';
export { RIVAL_PSYCHOLOGY_POOL } from './rival-psychology.js';
export { MALE_LEAD_PERSPECTIVE_POOL } from './male-lead-perspective.js';
export { TIME_SKIP_TRANSITION } from './time-skip-transition.js';
export { ENDING_PRELUDE_POOL, pickEndingPrelude } from './ending-prelude.js';
export { MAINLINE_ANCHORS, MAINLINE_BAN_LISTS, getMainlineAnchor, getMainlineBanList } from './mainline-anchor-text.js';
export { TRAINEE_ROMANCE_POOL } from './trainee-romance-pool.js';
export { DEBUT_TRANSITION_POOL } from './debut-transition.js';
export { SISTER_DAILY_POOL } from './sister-daily-pool.js';
export { FAN_NPC_POOL } from './fan-npc-pool.js';

