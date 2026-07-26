// job-offers.js | 通告选择池 | 试镜/CF/综艺/OST/杂志MC含需求标签 | 40条
export var JOB_OFFER_POOL = [].concat(
  // 电视剧试镜 (8条)
  [{ key:'drama_audition_support', text:'新剧女二试镜——角色是主角的妹妹。经纪人觉得跟你本人的气质很契合。', require:'debut' },
   { key:'drama_audition_lead', text:'网络剧女主角试镜——校园题材，片酬不高但角色讨喜。', require:'debut' },
   { key:'drama_cameo', text:'大势剧客串邀约——只有三场戏，但同组有影帝前辈。', require:'chapter>=2' },
   { key:'drama_melo', text:'迷你剧女一邀约——浪漫喜剧，台词量很大但人设是爱豆，几乎本色出演。', require:'chapter>=3' },
   { key:'drama_action', text:'动作片女配试镜——需要武术训练两周。你看了剧本觉得角色很有挑战性。', require:'chapter>=3' },
   { key:'drama_historical', text:'古装剧试镜——虽然是配角，但造型设计非常精致。经纪人觉得你的五官适合古装。', require:'chapter>=2' },
   { key:'drama_indie', text:'独立电影女主角试镜——新人导演、小成本，但剧本非常有深度。', require:'debut' },
   { key:'drama_blockbuster', text:'年度大制作电影客串——只有一场戏，但跟三大主演都有对手戏。', require:'chapter>=4' }],
  // CF广告 (8条)
  [{ key:'cf_cosmetic', text:'彩妆品牌代言邀约——新系列主打"清纯初恋"，概念照片已经送到你手上了。', require:'debut' },
   { key:'cf_uniform', text:'校服品牌广告——你是代言人候选之一。需要去棚里试拍一组概念照。', require:'debut' },
   { key:'cf_drink', text:'饮料品牌CF——运动饮料系列，拍摄需要实际跑一段路。经纪人问你体力行不行。', require:'debut' },
   { key:'cf_phone', text:'手机品牌代言——旗舰系列，广告概念是"捕捉每一个闪耀瞬间"。', require:'chapter>=3' },
   { key:'cf_ramen', text:'拉面品牌CF——需要吃得特别香。经纪人笑着说"这个不用演，你本来就很会吃"。', require:'chapter>=2' },
   { key:'cf_sports', text:'运动品牌代言——全球线，需要去海外拍摄。如果能拿下对你的人气提升很大。', require:'chapter>=4' },
   { key:'cf_chicken', text:'炸鸡品牌代言——国民级的广告。如果能拿下，以后走街上可能被叫"炸鸡少女"了。', require:'chapter>=2' },
   { key:'cf_earphone', text:'耳机品牌合作——系列概念是"安静的聆听"。需要拍摄一段听歌的画面。', require:'debut' }],
  // 综艺通告 (8条)
  [{ key:'variety_fixed', text:'综艺固定嘉宾邀约——每周一次棚内录制，需要和其他五位艺人组队。', require:'chapter>=2' },
   { key:'variety_flight', text:'热门综艺飞行嘉宾——本周录制，主题是"偶像运动大会"。', require:'debut' },
   { key:'variety_idol_sports', text:'偶像运动会——田径项目。你不是最擅长运动的，但经纪人说你"跑起来的样子很有综艺感"。', require:'debut' },
   { key:'variety_masked_singer', text:'蒙面歌王邀请——需要保持绝对秘密。如果被认出会很尴尬——但也被认出也是一种证明。', require:'chapter>=2' },
   { key:'variety_knowing_bros', text:'认识的哥哥录制邀请——需要豁得出去搞笑。你在镜子前练习了半小时即兴段子。', require:'chapter>=2' },
   { key:'variety_business_trip', text:'出差十五夜——需要和公司前后辈一起出游两天一夜。互动和游戏密度非常高。', require:'chapter>=3' },
   { key:'variety_reality', text:'个人真人秀提案——拍你的日常训练和生活。播出后粉丝会更了解真实的你。', require:'chapter>=3' },
   { key:'variety_cooking', text:'料理综艺嘉宾——你不会做饭，但经纪人觉得"不会做饭的认真感"很有看点。', require:'debut' }],
  // OST/合作曲 (6条)
  [{ key:'ost_drama', text:'大势剧OST邀约——抒情曲，需要很细腻的情感表达。你听demo的时候眼眶有点湿润。', require:'chapter>=2' },
   { key:'ost_movie', text:'电影片尾曲提案——制作人点名想要你的声音。你觉得是一种认可。', require:'chapter>=2' },
   { key:'collab_cross', text:'跨团合作曲邀约——和一位男团主唱feat。粉丝圈已经开始替你们组合名了。', require:'chapter>=2' },
   { key:'collab_senior', text:'前辈邀约合唱——一位你从小听的歌手想和你合作。你在练习室对着镜子确认了好几次这不是梦。', require:'chapter>=3' },
   { key:'ost_self_written', text:'公司问你有没有自己写的曲子——如果有，可以考虑作为下一张专辑的收录曲。', require:'chapter>=3' },
   { key:'ost_animation', text:'动画电影OST配音——给女主角配音三句台词。你想起了小时候最爱看的动画片。', require:'debut' }],
  // 杂志/站台 (5条)
  [{ key:'mag_cover_solo', text:'单人杂志封面——入选"年度值得关注新人"专题。第一次由自己占了整个封面。', require:'debut' },
   { key:'mag_brand_event', text:'品牌发布会站台——需要穿赞助的高定，但走路的时候总觉得裙摆太长了。', require:'debut' },
   { key:'mag_charity', text:'慈善晚宴邀请——红毯环节需要签名。你对着镜子练了一周的"自然笑容"。', require:'chapter>=3' },
   { key:'mag_fashion_week', text:'时装周邀请——作为品牌大使，需要飞米兰看秀。第一次出国出席时尚活动。', require:'chapter>=4' },
   { key:'mag_year_issue', text:'年度画报拍摄——12位艺人12个月封面。你是3月号。', require:'chapter>=2' }],
  // MC/主持 (5条)
  [{ key:'mc_music_show', text:'音乐节目特别MC邀约——搭档一位前辈。需要提前背十页台本。', require:'chapter>=2' },
   { key:'mc_awards', text:'年末颁奖礼MC邀约——三人主持。你每天都在对着镜子练台词卡。', require:'chapter>=4' },
   { key:'mc_radio', text:'电台DJ代班——今晚两小时。可以放任何你想放的歌。', require:'debut' },
   { key:'mc_live_stream', text:'线上直播活动主持——和粉丝实时互动。你准备了很多想聊的话题。', require:'debut' },
   { key:'mc_year_end', text:'年末歌谣大战MC——和另一位新人爱豆搭档。全韩国的偶像都在台下。', require:'chapter>=3' }]
);
