// ============================================================
// 系统6 每日舆论被动生成：每日热搜 / 粉丝讨论 / 媒体热议
// 模板 + 随机，避免每轮都打 API。男主名/女主名注入。
// ============================================================
import { GS, saveGame } from '../state.js';
import { randInt } from '../utils.js';
import { DAILY_BUZZ_TEMPLATES } from './data.js';
import { popularity, maleLead, chapterName } from './state.js';
import { buildEntSimSystemPrompt } from './prompts.js';
import { generateWithRetry } from '../ai-generator.js';
import { buildMemorySnapshot } from './memory.js';

function fill(t) {
  var name = (GS.heroineProfile && GS.heroineProfile.name) || '你';
  var ml = maleLead().name || '他';
  // {t,c} 对象：替换两个字段中的占位符
  if (typeof t === 'object' && t.t) {
    return { t: t.t.replace(/\{name\}/g, name).replace(/\{ml\}/g, ml), c: (t.c || '').replace(/\{name\}/g, name).replace(/\{ml\}/g, ml) };
  }
  return t.replace(/\{name\}/g, name).replace(/\{ml\}/g, ml);
}
function pickN(arr, n) {
  var copy = arr.slice();
  var out = [];
  for (var i = 0; i < n && copy.length; i++) {
    out.push(fill(copy.splice(randInt(0, copy.length - 1), 1)[0]));
  }
  return out;
}

// 生成当日舆论素材：1-2 条女主相关 + 其余用娱乐圈通用八卦填充
// 外部话题池（不带 {name}，纯虚构娱乐圈八卦/风向/数据）
var EXTERNAL_HOT = [
  '#BTS十周年企划公开#','#BLACKPINK世巡加场#','#IVE新歌MV破亿#',
  '#NewJeans代言官宣#','#aespa回归概念照#','#LE_SSERAFIM练习室公开#',
  '#某男团成员深夜出入Club#','#新人女团出道即百万销量#',
  '#音源榜单争霸战再燃#','#KBS年末颁奖礼选址争议#',
  '#SM新男团即将出道#','#YG新女团预告引热议#',
  '#JYP股价连续上涨#','#HYBE收购新厂牌#',
  '#打歌节目改革投票制#','#粉丝抗议应援棒涨价#','#音银MC换人#',
  '#SEVENTEEN完整体回归#','#夫胜宽综艺名场面#','#金珉奎画报公开#',
  '#全圆佑作曲室日常#','#崔胜哲退伍倒计时#','#文俊辉中国行程#',
  '#权顺荣舞蹈challenge#','#李知勋写给后辈的歌#','#李硕珉音乐剧首演#',
  '#徐明浩时尚周#','#崔瀚率混血美貌#','#DK高音合集#','#Dino成年的成长#',
  '#IU新剧收视破表#','#林允儿新电影定档#','#车银优新剧路透#',
  '#金泰亨solo专辑预告#','#田柾国直播破纪录#','#LISA新单曲MV#',
  '#JENNIE时装周造型#','#张元英主持争议#','#安宥真综艺表现#',
  '#柳智敏AI翻唱爆火#','#宁艺卓微博热搜#','#宫脇咲良日本活动#',
  '#ZB1一位安可#','#RIIZE回归预告#','#TWS新人奖提名#',
  '#ENHYPEN世巡#','#TXT概念照#','#StrayKids美国行#',
  '#NCT分队重组传闻#','#Kep1er续约#','#fromis_9回归#','#THEBOYZ主打曲#',
  '#ATEEZ一位#','#GIDLE自作曲#','#ITZY新舞#','#TWICE日本行程#',
  '#RedVelvetWendy电台#','#EXO冬季专辑#','#SHINEE15周年#',
  '#泰民solo巡演#','#SuperJunior综艺#','#GD新歌预告#','#太阳演唱会#',
  '#ZICO制作曲霸榜#','#Jessi综艺#','#华莎大胆舞台#',
  '#MAMAMOO团魂#','#Apink续约#','#STAYC音源逆行#','#NMIXX实力舞台#',
  '#KISS_OF_LIFE新人#','#tripleS宿舍公开#','#BOYNEXTDOOR回归#','#xikers世巡#',
  '#PLAVE虚拟一位#','#李茂珍服务区#','#罗英锡新综艺#','#刘在石新节目#',
  '#安普贤新剧#','#李到晛退伍#','#宋江新作#','#金裕贞画报#',
  '#韩素希争议#','#任时完电影#','#朴炯植新剧#','#都暻秀演技#',
  '#李俊昊获奖#','#AI女团出道引热议#','#虚拟偶像粉丝超真人#',
  '#香港MAMA红毯#','#巴黎K-POP拼盘#','#日本巨蛋连演#','#雅加达演唱售罄#',
  '#某爱豆恋爱实锤#','#偶像疑似整容#','#经纪公司股票暴跌#',
  '#官咖回答泄露#','#泡泡消息被截图#','#合约到期不续#',
  '#SM时隔六年推新女团#','#YG旗下制作人跳槽#','#新人男团首日销量破百万#',
  '#某女团MV播放量造假争议#','#周子瑜生日应援登纽约时报#','#王嘉尔内地综艺回归#',
  '#金智秀新剧路透#','#ROSÉ新专辑制作中#','#朴彩英与欧美制作人合作#',
  '#崔叡娜solo回归#','#曺柔理新OST#','#金采源舞蹈挑战#',
  '#中村一叶综艺首秀#','#许允真自作曲#','#洪恩採可爱新发型#',
  '#赵美延演技挑战#','#Minnie新单曲#','#舒华个人活动#','#雨琦综艺',
  '#Wendy音乐剧#','#IRENE新代言#','#涩琪solo巡演#','#JOY个人频道#',
  '#YERI新综艺#','#颂乐演唱会#','#玟星rap新曲#','#丁辉人OST#',
  '#朴初珑新剧#','#孙娜恩画报#','#李旼赫退伍#','#陆星材音乐剧#',
  '#林娜琏solo#','#平井桃舞蹈#','#凑崎纱夏日本行#','#朴志效OST#',
  '#金多贤综艺#','#孙彩瑛画报#','#周子瑜港台行程#',
  '#崔秀彬MC#','#然竣时尚周#','#休宁凯新发色#',
  '#元弼作曲#','#成韩彬一位#','#章昊中国综艺#',
  '#金山芋新综#','#ERIC新剧#','#宋银硕MC挑战#',
  '#金廷祐入伍#','#李马克solo#','#李楷灿新Station#','#罗渽民画报#',
  '#中本悠太日本剧#','#董思成中国行程#','#金道英新OST#',
  '#方灿制作#','#铉辰新舞#','#HAN新曲#','#Felix时尚周#',
  '#梁祯元综艺#','#朴成训画报#','#金善禹Vlog#',
  '#K-POP中国销量占比#','#直拍时代的得与失#','#音乐节目停播通知#',
  '#虚拟偶像出道#','#偶像减肥法#','#初代偶像现状#',
  '#苏里南韩流节#','#伦敦韩流博览会#','#吉隆坡快闪#','#迪拜韩流音乐节#',
  '#练习生月支出#','#偶像宿舍公开#','#应援棒涨价风波#',
  '#釜山海云台拼盘#','#光州演唱会取消#','#男团入伍潮#',
  '#青龙电影节#','#百想艺术大赏#','#金唱片提名#','#MMA投票出包#',
  '#韩流日本萎缩#','#BillboardK-POP专栏#','#Coachella韩国阵容#'
];

var EXTERNAL_FAN = [
  '看了今天音银，某男团的开麦稳得吓人','有没有人觉得最近的妆造水平参差不齐',
  '刚入坑问问这家应援棒哪里买','谁告诉我哪家没在吵，我去哪家待着',
  '今天的舞台运镜真是服了，全程看不清脸','上周那个合作舞台我可以看一百遍',
  '这个编舞老师是疯了吗，难度也太高了','饭拍比官拍好太多公司能不能换个摄影师',
  '现在小孩出道年龄越来越小了，真的没问题吗','年末舞台的阵容泄露了有大惊喜',
  '买专抽到本命小卡是什么体验','听说这家公司的练习生合同很坑',
  '今天逛弘大看到街头翻跳的孩子们好拼','K-POP要凉？本土音源榜上全是英文歌',
  '我觉得新一代女团颜值真的太高了','某团的门面太能打了生图比精修还好看',
  '今天直播时有个弹幕太好笑了','最近SEVENTEEN的团综笑死我了',
  '圆佑的新自拍太好看了收藏了','Hoshi跳舞真的不一样眼神都带杀气',
  'DK的高音太顶了耳朵要怀孕了','The8今天的打歌服超好看',
  '净汉长发是什么人间仙子啊','珉奎今天的上班路透绝了',
  '胜宽的综艺感是真的强每期都好笑','Joshua今天的状态也太好了',
  'Woozi这么小一只怎么写出那么炸的歌','Vernon的英文rap太苏了',
  'Dino越长越帅姐姐粉转女友粉','SCOUPS要退伍了期待完整体',
  'Jun在中国综艺里太圈粉了','觉得NewJeans的歌好洗脑无限循环',
  'IVE的歌每次都很快上头','LE_SSERAFIM的舞台表现力太强了',
  'aespa这次回归真的杀疯了','BTS的成员SOLO一个比一个好听',
  'IU的新剧看哭我了演技进步好多','车银优那张脸是真实存在的吗',
  '允儿新电影的预告片看了十遍','Kai跳舞时的线条真的太美了',
  '泰妍新歌又在榜一了音源女王','NCT人太多了我认了三年还没认全',
  'StrayKids的歌运动的时候听绝了','TXT这次的concept太对我胃口了',
  'ENHYPEN的编舞是艺术品吧','ZB1的新歌也好听选秀团的奇迹',
  'RIIZE出道曲真的很清爽','TWICE的巡演现场太稳了',
  'RedVelvet的概念永远超前','Blackpink的全球影响力真的厉害',
  'GIDLE的自作曲质量太高了','ITZY的舞台力度绝了姐姐们不累吗',
  'IVE的Rei今天超可爱的','这个直拍封面选得太好了不是粉也点进去',
  '我觉得偶像也是人恋爱怎么了','看打歌舞台发现耳朵听不出谁是假唱了',
  '谁家今天又没有ending镜头','这家公司到底懂不懂什么叫宣传',
  '新回归的mv烧了好多钱吧肉眼可见的有钱','他的音色太独特了一听就知道是他',
  '老粉回来看看还是那个味道','舞蹈动作那么大还能稳得住训练量得多大',
  '每次看到他们鞠躬谢幕都好心疼','新团出道概念照和实物差距有点大',
  '有人看那个vlog了吗好接地气','为什么每次回归都能撞型',
  '偶遇爱豆是什么体验我今天居然在地铁站看到了','看团体直播的时候感觉他们关系真好',
  '谁懂啊今天签售会见到本人了比镜头里好看一百倍','这个舞我学了三天还是跟不上',
  '下次回归能不能换换发型','演唱会的应援声把我震聋了',
  '抢不到票的有没有人一起骂','去年的曲今年突然翻红是什么情况',
  '新歌前奏一出来就起鸡皮疙瘩了','MV最后那个反转我没看懂',
  '其实我觉得先行曲比主打更好听','韩网热帖在讨论谁是第四代第一主唱',
  '这个团的平均身高也太高了','有没有老粉科普一下这个团的出道历程',
  '最近追星太累了休息一段时间','好怀念二代团的时代啊那时候是真开麦',
  '希望公司对他们好一点别太累了','今天舞台事故但处理得很好反而更圈粉',
  '原来他们是自己写了这么多歌','看练习室的时候发现他们一直在互相鼓励',
  '新歌歌词是不是有点太直白了','这个应援色真的太好看了',
  '韩国人少但爱豆真的多','东南亚粉丝的购买力也太强了',
  '刷到一段没看过的旧舞台发现以前也很厉害','出道这么多年还这么努力真的respect',
  '他眼睛里有光当偶像是真的快乐吧','其实这个团的副主唱也不差',
  '副歌的编舞太洗脑了脑子里一直重复','演唱会没去成看饭拍哭了一晚上',
  '新专辑的pb拍得好好看','听说他们连觉都睡不够就去打歌了',
  '想给他发泡泡但是怕已读不回','这家粉圈的氛围真的不错路人待得舒服',
  '为什么我追的团还没回归通知','第一次追星就是他们出不去了',
  '日本的巨蛋公演太壮观了','欧美粉最近怎么也这么多',
  '这波中输真的很给力','官咖有新通知大家快去看',
  '站姐的图每一帧都绝美','今天又有粉丝吵架上趋势了累了',
  '深夜刷到出道舞台泪目了','买三本专才抽到本命我太难了',
  '新团服的设计是谁加鸡腿','rap line这次真的杀疯了',
  '好奇大家是怎么入坑的','打歌期结束后的空虚感谁懂',
  '有没有人和我一样觉得他越来越帅','今天在电台听到他们被点了好激动',
  '凌晨三点还在排队等签售的粉丝值得尊敬','票务平台又崩了能不能升级服务器',
  '这张专辑的概念真的好喜欢','谁发明的直拍太神了',
  '第一次去韩国看演唱会发现他们能唱三个小时','最近翻跳圈也开始卷起来了',
  '其实vocal line也很好但大家只关注舞担','练习室永远比正式舞台好看是什么定律',
  '应援词背了两周发现根本喊不出来','这个编舞老师一定要留住',
  '入坑之后才发现他们物料多得看不完','他今天的手势好可爱看了十遍',
  '长得帅又努力的人真的让人无法脱粉','为什么我的本命总是后排',
  '今天下班去看他们排练被保安赶走了','他们是真的把粉丝放在心上',
  '每一个好爱豆背后都有练到凌晨的日子','感觉最近舞台服装预算变多了',
  '其实我是男的也喜欢他们正常吗','每周一早上都会被抓去开会太惨了'
];

var EXTERNAL_MEDIA = [
  'K-POP全球化遭遇瓶颈：Q3海外音源营收下降',
  '音乐放送改革：取消直播投票制或影响粉丝经济',
  '深度：偶像与粉丝关系正在从单向崇拜变为双向博弈',
  '数据：2026年度偶像品牌评价排行榜出炉',
  '趋势：小公司女团的生存之道——差异化与出海',
  '热议：AI编曲进入K-POP，制作人会失业吗',
  '分析：韩国偶像产业为何需要中国市场',
  '快讯：多家娱乐公司发布下半年回归计划',
  '盘点：今年最圈粉的十大编舞',
  '观察：粉丝公益从应援杯到建学校',
  '追踪：音源造假调查波及多公司',
  '评论：偶像恋爱报道的尺度边界在哪',
  '专题：练习生保护法为何迟迟未能落地',
  '深度：从厂牌独立看偶像产业去中心化',
  '数据：海外粉丝最多的K-POP团体是哪个',
  '报道：光州电竞馆改建为偶像演出场馆',
  '行业：演唱会票价连涨，粉丝承受力到极限',
  '分析：社交媒体如何重塑偶像与粉丝的距离',
  '关注：偶像心理健康被忽视的角落',
  '快评：一位爱豆公开发表抑郁声明后的行业反思',
  'SEVENTEEN完整体回归日程引发业界关注',
  '深度报道：夫胜宽的艺能感如何从被嘲到全网夸',
  '专访：徐明浩谈中国与韩国偶像体系的差异',
  '数据：全圆佑粉丝群体画像与消费力分析',
  '评论：BTS成员SOLO时代谁是最强solo',
  '分析：BLACKPINK的时尚帝国如何建立',
  '观察：IVE音源接连霸榜新一代音源女王诞生',
  '追踪：第四代女团的竞争格局与差异化路线',
  '评论：演唱会票价上涨谁是最后的赢家',
  '报道：SM娱乐新大楼即将竣工',
  '资讯：HYBE上半年营收再创历史新高',
  '分析：JYP旗下乐团的本土化策略成功了吗',
  '数据：YG新女团出道数据大起底',
  '盘点：歌谣大战历届名场面回顾',
  '趋势：短剧时代下偶像的自我营销新方式',
  '观察：海外K-POP翻跳赛如何带动韩流输出',
  '热议：粉丝应援车事件是否过度',
  '评论：偶像代言人与品牌形象的互相成就',
  '聚焦：年轻偶像们如何应对网络暴力',
  '深度：从娱乐圈看韩国社会的变化',
  '报道：济州岛将举办首届K-POP音乐节',
  '数据：全球韩流粉丝数量已突破两亿',
  '快讯：多家公司联合成立偶像权益保护协会',
  '分析：选秀节目退潮偶像培养回归练习生体系',
  '观察：偶像个人品牌的长期价值与风险',
  '评论：打歌节目收视率新低偶像生态在变',
  '盘点：年度最成功的偶像转型之路',
  '聚焦：偶像产业如何吸引欧美投资',
  '深度：虚拟偶像会取代真人偶像吗',
  '分析：韩流偶像在日本市场的本土化',
  '专题：K-POP编舞师的年薪与行业地位',
  '数据：粉丝购买周边产品的年均花费',
  '报道：韩国国会讨论偶像合约公平性',
  '趋势：直播打赏对偶像收入的贡献逐年上升',
  '评论：跨团合作舞台为何越来越少见',
  '观察：粉丝经济中的隐私边界问题',
  '快讯：多家经纪公司推出低碳环保专辑',
  '分析：AI音源对真人歌手的冲击有多大',
  '聚焦：偶像们的第二人生——退役后的转行路',
  '深度：为什么韩国偶像的收入差距如此大',
  '盘点：曾经大势但现在被遗忘的组合',
  '报道：K-POP偶像训练体系正在被东南亚复制',
  '数据：中国粉丝为韩团贡献的销量占比',
  '评论：偶像文化中的消费主义陷阱',
  '观察：从饭圈到同人圈——粉丝创作力有多强',
  '专题：偶像纪录片的叙事策略与真实性',
  '分析：韩国娱乐公司为何纷纷成立厂牌',
  '趋势：中韩娱乐圈合作新模式',
  '快讯：偶像代言品牌频翻车背后的风险评估',
  '报道：SM历史上最具争议的艺人离开事件',
  '数据：韩国偶像训练生退训率高达80%',
  '深度：K-POP偶像的国际化选角趋势',
  '评论：韩流对韩国经济的贡献不应被低估',
  '观察：偶像的后台生活——不为人知的辛苦',
  '盘点：偶像入伍前后的变化与粉丝流失',
  '聚焦：偶像人权——工作强度与健康问题',
  'SEVENTEEN全球巡演动员力连续三年进入前十',
  '透视：为什么男团音源越来越难进榜',
  '数据：小公司团出道存活率不足三成',
  '分析：偶像恋爱禁令的松动与粉丝容忍度',
  '深挖：一位退圈爱豆讲述的行业潜规则',
  '趋势：练习生家长也成了社交网络话题',
  '评论：韩剧OST产业背后的偶像力量',
  '报道：地方城市兴建偶像专用场馆潮',
  '盘点：出道后更名前后的爱豆们',
  '观察：女性偶像的舞台服装设计演变',
  '聚焦：退伍回归的爱豆如何重新吸粉',
  '分析：为什么有些团解散后反而口碑更好',
  '数据：偶像在综艺中的出场费差距有多大',
  '快评：AI作曲进入音源市场音乐人何去何从',
  '评论：为什么韩流偶像都想去日本发展'
];
// 辅助：从 {t,c} 对象或字符串中提取标题文本
export function buzzTitle(item) { return (typeof item === 'object' && item.t) ? item.t : item; }
export function buzzContent(item) { return (typeof item === 'object' && item.c) ? item.c : ''; }
function buzzByTitle(list, title) {
  for (var i = 0; i < list.length; i++) { if (buzzTitle(list[i]) === title) return true; }
  return false;
}

export function generateDailyBuzz() {
  var E = GS.entSim;
  var pop = popularity();
  var hsCount = Math.max(2, Math.round(pop / 20));
  // 热搜：1 条女主模板（立即 fill 占位符）+ 其余外部（不跟上一天重复）
  var hotSearch = pickN(DAILY_BUZZ_TEMPLATES.hotSearch, 1).map(function(it) {
    return { t: fill(it.t), c: fill(it.c || it.t) };
  });
  E._lastHotTitles = E._lastHotTitles || [];
  while (hotSearch.length < Math.min(6, hsCount)) {
    var ext = EXTERNAL_HOT[randInt(0, EXTERNAL_HOT.length - 1)];
    var extTitle = buzzTitle(ext);
    if (!buzzByTitle(hotSearch, extTitle) && E._lastHotTitles.indexOf(extTitle) < 0) hotSearch.push(ext);
  }
  E._lastHotTitles = hotSearch.map(buzzTitle);
  // 粉丝讨论：全部外部（不包含女主）
  E._lastFanTitles = E._lastFanTitles || [];
  var fanDiscussion = [];
  while (fanDiscussion.length < 3) {
    var fe = EXTERNAL_FAN[randInt(0, EXTERNAL_FAN.length - 1)];
    var feTitle = buzzTitle(fe);
    if (!buzzByTitle(fanDiscussion, feTitle) && E._lastFanTitles.indexOf(feTitle) < 0) fanDiscussion.push(fe);
  }
  E._lastFanTitles = fanDiscussion.map(buzzTitle);
  // 媒体标题：全部外部（不包含女主）
  E._lastMediaTitles = E._lastMediaTitles || [];
  var mediaTitle = [];
  while (mediaTitle.length < 2) {
    var me = EXTERNAL_MEDIA[randInt(0, EXTERNAL_MEDIA.length - 1)];
    var meTitle = buzzTitle(me);
    if (!buzzByTitle(mediaTitle, meTitle) && E._lastMediaTitles.indexOf(meTitle) < 0) mediaTitle.push(me);
  }
  E._lastMediaTitles = mediaTitle.map(buzzTitle);
  // 清除旧日的网友热议缓存，避免新条目显示昨天的评论
  E.buzzReplies = {};
  E.dailyBuzz = {
    hotSearch: hotSearch,
    fanDiscussion: fanDiscussion,
    mediaTitle: mediaTitle,
    lastGenDay: E.cycle.dayCount
  };
  saveGame();
  return E.dailyBuzz;
}

export function getDailyBuzz() {
  var E = GS.entSim;
  if (!E.dailyBuzz || E.dailyBuzz.lastGenDay !== E.cycle.dayCount) return generateDailyBuzz();
  return E.dailyBuzz;
}

// 女主相关舆论条目 → AI 生成 2-3 条"网友热议"评论（路人/粉丝/黑粉三视角）
export async function generateBuzzRepliesAI(itemTitle, itemContent) {
  var sys = buildEntSimSystemPrompt('buzzreply');
  var user = [
    '【任务】为下面这条热搜/新闻生成 3 条"网友热议"评论（每条 40-80 字，不要 JSON）。',
    '【热点内容】标题：' + itemTitle + (itemContent ? '\n内容：' + itemContent : ''),
    '【要求】',
    '- 三条评论分别代表：路人视角（客观分析）、粉丝视角（维护辩解）、黑粉/对家视角（嘲讽踩一脚）',
    '- 每条评论前用 · 开头',
    '- 语气真实、带网络感，可用饭圈用语（直拍/舞台/塌房/对家/毒唯/控评等）',
    '- 直接输出三条评论，每行一条，不要编号、不要标签、不要其他文字'
  ].join('\n');
  try {
    var res = await generateWithRetry(sys, user, { plainText: true, skipValidate: true, maxTokens: 500, temperature: 0.9, sceneType: 'buzzreply' });
    var text = (res && res.raw) ? res.raw : '';
    var lines = text.split('\n').filter(function(l) { return l.trim(); }).map(function(l) { return l.trim(); });
    if (lines.length >= 2) return lines.slice(0, 3);
    if (lines.length === 1) return [lines[0], '· 等一个后续', '· 大家怎么看？'];
    return null; // 失败返回 null → 调用方用池子兜底
  } catch (e) {
    console.warn('[immersion] generateBuzzRepliesAI failed:', e);
    return null;
  }
}

// 营业/曝光后生成"粉丝圈反应"短文（大粉/路人/黑粉三视角），存入 E.fanReactions
// reason: 短标签（如「曝光」）；eventDetail: 长文本描述具体发生了什么（如「狗仔拍到你和男主深夜同车」）
export async function generateFanReaction(reason, eventDetail) {
  var E = GS.entSim;
  if (!E) return '';
  var sys = buildEntSimSystemPrompt('fanreaction');
  var buzz = E.dailyBuzz || {};
  var eventDesc = eventDetail || reason || '近期营业 / 曝光事件';
  var user = [
    '【任务】生成一段"粉丝圈反应"短文（纯文本，150-250 字，不要 JSON，不要标题）。',
    '【触发背景】' + eventDesc,
    '【要求】分三个视角：①大粉（死忠）如何解读 ②路人怎么看 ③黑粉/对家粉如何攻击。语气真实、带网络感，可用饭圈用语（直拍/舞台/塌房/对家/毒唯等）。',
    '【当前舆论面】热搜：' + (buzz.hotSearch || []).map(buzzTitle).join(' / ') + '；粉丝讨论：' + (buzz.fanDiscussion || []).map(buzzTitle).join(' / '),
    '【记忆摘要】\n' + buildMemorySnapshot(),
    '直接输出纯文本，按 "·大粉："、"·路人："、"·黑粉：" 三段开头。'
  ].join('\n');
  try {
    var res = await generateWithRetry(sys, user, { plainText: true, skipValidate: true, maxTokens: 800, temperature: 0.85, sceneType: 'fanreaction' });
    var text = res.raw || '';
    E.fanReactions = E.fanReactions || [];
    E.fanReactions.push({ round: E.cycle.roundTotal, reason: reason || '', event: eventDetail || '', text: text });
    if (E.fanReactions.length > 6) E.fanReactions = E.fanReactions.slice(-6);
    saveGame();
    return text;
  } catch (e) { return ''; }
}
