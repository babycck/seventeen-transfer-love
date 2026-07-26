// ============================================================
// entSim pools · 统一导出入口
// 46 个池子全部 re-export，外部只需 import from './pools/index.js'
// ============================================================

export { pickFromPool, pickFromPoolMulti, pickFanReactions, pickFromPoolRotate } from './_utils.js';

// ── 旧池拆分 ──
export { FAN_LETTER_POOL } from './fan-letters.js';
export { BRAND_OFFER_POOL } from './brand-offers.js';
export { CONTACT_TYPE_POOL } from './male-contact.js';
export { RELEASE_POOL } from './releases.js';
export { AWARD_POOL } from './awards.js';
export { DAILY_BUZZ } from './daily-buzz.js';
export { NEWS_TEMPLATES } from './news-templates.js';
export { DAILY_ENGAGEMENT_POOL } from './daily-engagement.js';
export { GIRLGROUP_EVENTS } from './girlgroup-events.js';
export { ONEHEART_RANDOM_EVENTS } from './oneheart-events.js';
export { SVT_TEAMMATE_EVENT_POOL } from './svt-teammate.js';
export { ENT_SCHEDULE_POOL } from './ent-schedule.js';
export { BROTHER_EVENT_POOL } from './brother-events.js';
export { MALE_LEAD_INITIATIVE_POOL } from './male-lead-init.js';
export { SPECIAL_EVENTS } from './special-events.js';
export { JEALOUSY_EVENTS_POOL } from './jealousy-events.js';
export { INCIDENT_EVENTS_POOL } from './incident-events.js';

// ── 新迁移池（从 data.js 迁出） ──
export { INDUSTRY_EVENTS } from './industry-events.js';
export { RIVAL_ADVANCE_EVENTS } from './rival-advance-events.js';
export { SECRET_DISCOVERY_EVENTS } from './secret-discovery-events.js';
export { BROTHER_ADVANCE_TESTS } from './brother-tests.js';
export { BROTHER_SIDE_PLOTS } from './brother-side-plots.js';
export { TEAMMATE_FLAVOR } from './teammate-flavor.js';
export { SVT_TEAMMATE_PROFILES } from './svt-teammate-profiles.js';
export { DAILY_BUZZ_TEMPLATES } from './daily-buzz-templates.js';

// ── AI 替代池 ──
export { HOT_SEARCH_REPLY_POOL } from './hot-search-replies.js';
export { DIARY_TEMPLATES } from './diary-templates.js';

// ── 增强模块 ──
export { VARIETY_SHOW_POOL } from './variety-shows.js';
export { DISPATCH_POOL } from './dispatch-news.js';
export { MAGAZINE_POOL } from './magazine-shoots.js';
export { CHART_POOL } from './music-charts.js';
export { RUMOR_POOL } from './dating-rumors.js';

// ── 真实化模块 ──
export { COMEBACK_CYCLE_POOL } from './comeback-cycle.js';
export { CONCERT_POOL } from './concert-pool.js';
export { MUSIC_SHOW_POOL } from './music-show-pool.js';
export { FANSIGN_POOL } from './fansign-pool.js';

// ── 女团身份池 ──
export { GROUP_NAMES } from './group-names.js';
export { COMPANY_NAMES } from './company-names.js';
export { GROUP_CONCEPTS } from './group-concepts.js';
export { HIT_SONGS } from './hit-songs.js';
export { TEAMMATE_NAMES } from './teammate-names.js';
export { SISTER_ROLES } from './sister-roles.js';

// ── 逆境池 ──
export { CAREER_SETBACKS } from './career-setbacks.js';

// ── 聊天池 ──
export { CHAT_MALE_LEAD, CHAT_BROTHER, CHAT_RIVAL, CHAT_MANAGER, GROUP_CHAT, CHAT_SASAENG } from './chat-male-lead.js';

// ── 成员行为池 ──
export { MEMBER_SCOUPS, MEMBER_JEONGHAN, MEMBER_JOSHUA, MEMBER_JUN, MEMBER_HOSHI, MEMBER_WONWOO, MEMBER_WOOZI, MEMBER_DK, MEMBER_MINGYU, MEMBER_THE8, MEMBER_SEUNGKWAN, MEMBER_VERNON, MEMBER_DINO } from './members.js';

// ── 好感铺垫 ──
export { CONTACT_PROGRESSION } from './contact-progression.js';

// ── 日程池（练习生 → 章节分阶段） ──
export { COMMON_POOL, RELATED_POOL, TRAINEE_POOL, CHAPTER1_NOVICE, CHAPTER2_RISING, CHAPTER3_PEAK, CHAPTER4_LEGEND, BOYGROUP_POOL } from './ent-schedules.js';

// ── 外部热搜池 ──
export { EXTERNAL_HOT } from './external-hot.js';
