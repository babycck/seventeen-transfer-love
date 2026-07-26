// 偶像日程池（50条，预设上午/下午/夜晚三段式组合）
// 按职业分池：trainee/idol/actress/singer/model/backstage
export var ENT_SCHEDULE_POOL = {
  trainee: [
    {morning:'月评练习',morningLoc:'练习室',afternoon:'声乐课',afternoonLoc:'声乐教室',evening:'自习加练',eveningLoc:'练习室'},
    {morning:'舞蹈测评',morningLoc:'评审室',afternoon:'语言课',afternoonLoc:'教室',evening:'队友合练',eveningLoc:'练习室'},
    {morning:'体能训练',morningLoc:'健身房',afternoon:'编舞学习',afternoonLoc:'练习室',evening:'月末评价准备',eveningLoc:'练习室'},
    {morning:'形象管理',morningLoc:'美容室',afternoon:'演技课',afternoonLoc:'演技教室',evening:'自主练习',eveningLoc:'练习室'},
    {morning:'出道组筛选',morningLoc:'评审室',afternoon:'录音demo',afternoonLoc:'录音室',evening:'心理辅导',eveningLoc:'咨询室'},
    {morning:'组合配合练习',morningLoc:'练习室',afternoon:'个人才艺开发',afternoonLoc:'多功能室',evening:'月末展示',eveningLoc:'小剧场'},
    {morning:'前辈观摩',morningLoc:'大练习室',afternoon:'小组测评',afternoonLoc:'评审室',evening:'队友夜谈',eveningLoc:'宿舍'},
    {morning:'出道曲排练',morningLoc:'练习室',afternoon:'概念会议',afternoonLoc:'会议室',evening:'自由练习',eveningLoc:'练习室'},
    {morning:'体力训练',morningLoc:'健身房',afternoon:'表情管理课',afternoonLoc:'镜前教室',evening:'月末评价',eveningLoc:'评审室'},
    {morning:'基本功训练',morningLoc:'练习室',afternoon:'团队游戏',afternoonLoc:'休息室',evening:'老师一对一',eveningLoc:'练习室'},
    {morning:'出道曲录音',morningLoc:'录音室',afternoon:'MV概念会议',afternoonLoc:'会议室',evening:'出道Showcase彩排',eveningLoc:'小剧场'},
    {morning:'媒体训练',morningLoc:'教室',afternoon:'写真拍摄',afternoonLoc:'摄影棚',evening:'出道倒计时团建',eveningLoc:'宿舍'},
    {morning:'月末评价结果发表',morningLoc:'评审室',afternoon:'针对性补课',afternoonLoc:'练习室',evening:'日记时间',eveningLoc:'宿舍'},
    {morning:'心态管理课程',morningLoc:'咨询室',afternoon:'队友关系建设',afternoonLoc:'休息室',evening:'自主创作时间',eveningLoc:'练习室'},
    {morning:'出道组最终名单公布',morningLoc:'会议室',afternoon:'出道准备启动',afternoonLoc:'练习室',evening:'庆祝与紧张并存',eveningLoc:'宿舍'}
  ],
  idol: [
    {morning:'打歌节目彩排',morningLoc:'放送局',afternoon:'打歌舞台',afternoonLoc:'放送局',evening:'Vlive直播',eveningLoc:'宿舍'},
    {morning:'新歌录音',morningLoc:'录音室',afternoon:'MV拍摄',afternoonLoc:'片场',evening:'群聊互动',eveningLoc:'待机室'},
    {morning:'杂志画报',morningLoc:'摄影棚',afternoon:'品牌活动',afternoonLoc:'商场',evening:'泡泡营业',eveningLoc:'宿舍'},
    {morning:'综艺录制',morningLoc:'KBS别馆',afternoon:'综艺录制',afternoonLoc:'KBS别馆',evening:'练习室加练',eveningLoc:'练习室'},
    {morning:'粉丝签售会',morningLoc:'签售会场',afternoon:'粉丝签售会',afternoonLoc:'签售会场',evening:'和队友聚餐',eveningLoc:'餐厅'},
    {morning:'回归预热直播',morningLoc:'公司直播间',afternoon:'概念照拍摄',afternoonLoc:'摄影棚',evening:'SNS营业',eveningLoc:'宿舍'},
    {morning:'舞蹈练习',morningLoc:'练习室',afternoon:'声乐训练',afternoonLoc:'声乐教室',evening:'OST录音',eveningLoc:'录音室'},
    {morning:'机场出发',morningLoc:'仁川机场',afternoon:'海外行程',afternoonLoc:'海外',evening:'酒店Vlog',eveningLoc:'酒店'},
    {morning:'颁奖礼红毯',morningLoc:'颁奖场馆',afternoon:'颁奖礼',afternoonLoc:'颁奖场馆',evening:'庆功宴',eveningLoc:'餐厅'},
    {morning:'年末舞台排练',morningLoc:'演出场馆',afternoon:'年末舞台',afternoonLoc:'演出场馆',evening:'团队夜宵',eveningLoc:'餐厅'},
    {morning:'新歌编舞学习',morningLoc:'练习室',afternoon:'打歌预录',afternoonLoc:'放送局',evening:'电台节目',eveningLoc:'电台'},
    {morning:'品牌站台',morningLoc:'百货商店',afternoon:'媒体采访',afternoonLoc:'咖啡厅',evening:'与哥哥吃饭',eveningLoc:'餐厅'},
    {morning:'团综拍摄',morningLoc:'户外',afternoon:'团综拍摄',afternoonLoc:'户外',evening:'自由时间',eveningLoc:'宿舍'},
    {morning:'合作曲录音',morningLoc:'录音室',afternoon:'编舞调整会议',afternoonLoc:'练习室',evening:'粉丝视频通话',eveningLoc:'宿舍'},
    {morning:'广告拍摄',morningLoc:'广告片场',afternoon:'广告拍摄',afternoonLoc:'广告片场',evening:'晚间练习',eveningLoc:'练习室'},
    {morning:'回归发布会',morningLoc:'酒店宴会厅',afternoon:'媒体轮访',afternoonLoc:'酒店',evening:'回归预热倒计时',eveningLoc:'宿舍'},
    {morning:'综艺节目录制',morningLoc:'SBS',afternoon:'画报拍摄',afternoonLoc:'弘大studio',evening:'泡泡问候',eveningLoc:'宿舍'},
    {morning:'新歌MV拍摄',morningLoc:'片场',afternoon:'MV拍摄继续',afternoonLoc:'片场',evening:'收工夜宵',eveningLoc:'宿舍'},
    {morning:'体检',morningLoc:'医院',afternoon:'休息',afternoonLoc:'宿舍',evening:'自主练习',eveningLoc:'练习室'},
    {morning:'粉丝见面会彩排',morningLoc:'场馆',afternoon:'粉丝见面会',afternoonLoc:'场馆',evening:'感动总结',eveningLoc:'宿舍'}
  ]
};
