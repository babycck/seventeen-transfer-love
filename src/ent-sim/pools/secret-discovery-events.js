// ============================================================
// 女主秘密被撞破事件池 3→13条
// ============================================================
export var SECRET_DISCOVERY_EVENTS = [
  { key: 'secret_fansign', text: '男主无意中看到你去EXO签售会回来的小票，笑着问你"这是追星还是追别的？"', exposure: 0, flag: 'secretFound' },
  { key: 'secret_fanfic', text: '你写EXO同人文的草稿被男主瞥见，他念出其中一句，你耳朵红到说不出话。', exposure: 0, flag: 'secretFound' },
  { key: 'secret_gift', text: '男主在你包里翻到EXO小卡，挑眉说："原来你喜欢的类型是这样？"', exposure: 0, flag: 'secretFound' },
  { key: 'secret_album_collection', text: '男主来你宿舍拿东西（哥哥让的），打开储物柜——里面整齐排列着EXO全套专辑。他愣了三秒，慢慢关上了柜门。晚上他发消息:"...至少不是别家男团的。"', exposure: 0, flag: 'secretFound' },
  { key: 'secret_cam_video', text: '你在Vlive里不小心让EXO应援棒从画面边角闪过了一帧。粉丝截图速度比你删档还快。男主在截图评论区留了一个emoji:🧐。', exposure: 1, flag: 'secretFound' },
  { key: 'secret_photos', text: '你手机相册里有一个隐藏文件夹——里面是某位EXO成员的舞台截图。男主借用你手机传文件的时候不小心滑到了。他看着屏幕，然后看你的表情。你还没开口解释，他先笑了。', exposure: 0, flag: 'secretFound' },
  { key: 'secret_lightstick', text: '哥哥在你行李箱夹层里发现了一把EXO官方应援棒。"等等——这谁的？！"你抢回来的时候撞到了门框。"不是你想的那样！""那是哪样？"你在脑子里飞速编答案。', exposure: 0, flag: 'secretFound' },
  { key: 'secret_playlist', text: '你的公开歌单被粉丝扒了——里面有EXO全专。评论区有人说"姐姐这品味跨度有点大"。公司经纪人发来一条消息:下次歌单藏好。', exposure: 1, flag: 'secretFound' },
  { key: 'secret_audition', text: '你以前参加过EXO经纪公司的海选——是练习生之前的事。视频资料被翻出来了——你在台上唱了一首EXO的歌，那时候头发特别短，台下的评委里坐着一个你现在认识的人。', exposure: 1, flag: 'secretFound' },
  { key: 'secret_login', text: '你的游戏账号昵称被扒出来了——是你名字缩写加某位EXO成员的生日。男主搜到了。发来截图加一个表情:"这个ID——你的？"你说被盗号了。他说:"你大号也绑了手机——不是被盗。"', exposure: 0, flag: 'secretFound' },
  { key: 'secret_fansite', text: '有人发现你是某个EXO站子的资深潜水——账号等级特别高。男主在泡泡里故意发了一条:"今天发现一个超老号——2000天的粉丝。"你秒懂——那号是你。', exposure: 1, flag: 'secretFound' },
  { key: 'secret_phone_lock', text:'男主不小心看到了你的手机锁屏——是EXO专辑封面。他看了看屏幕，又看了看你。"你追星追到把封面当壁纸。""...好听。""那我下次也发张专辑——你能把我的也设成壁纸吗。"', exposure: 0, flag: 'secretFound' },
  { key: 'secret_cafe_playlist', text:'你在咖啡馆等他的时候——播的是EXO的歌。他坐下的时候脸上的表情变了——不是生气——是那种"我该怎么打败一个你从练习生就开始听的团"的困惑。', exposure: 0, flag: 'secretFound' },
  { key: 'secret_screen_recording', text:'你录了一段音——是某场EXO演唱会的安可。录音里你的声音跟着唱了全程。你发在了只有你自己能看的分享——但不小心发到群里了。他听到了。他说:"你唱得不错——但那首安可我也听过——是那场演唱会。你嗓子唱到一半破了的那句——我也有。"', exposure: 1, flag: 'secretFound' },
  { key: 'secret_signed_cd', text:'你在二手市场买到了一张EXO绝版签名CD——藏在衣柜最里层。哥哥翻衣服的时候掉出来了。他看着那张CD——你看着他的表情——然后他说:"多少钱——我帮你去要一个真的签名。我们同台过——我认识他们经纪人。""——你这算帮我还是威胁我。""算。都算。"', exposure: 0, flag: 'secretFound' },
  { key: 'secret_ringtone_exposed', text:'你手机响了——铃声是EXO的歌。不是在宿舍——是在放送局待机室。旁边的后辈听到了——然后传开了。当天晚上那条"某女团成员手机铃声"上了趋势。他看到消息说:"下次用我的歌——我可以只给你写一首专属的——你不用设为公开。""...你不会是在吃EXO的醋吧。""不会。——我只是在吃你手机的事。"', exposure: 2, flag: 'secretFound' },
  { key: 'secret_photocard_trade', text:'你在粉丝交易群里用小号换卡——为了集齐某个EXO成员的卡。有人在小号里认出了你打字的口吻——是你团里的一个队友。队友私信你:"那张卡我有——你直接问我要。"你说队友怎么知道那是你——她说你讲话的方式是从练习生到现在都没变过的。', exposure: 0, flag: 'secretFound' },
  { key: 'secret_lip_sync_contest', text:'私下里你参加了线上随机舞蹈挑战——全是EXO的歌。你录了一段发在自己权限设为私密的号上。他找到了。他说:"这段跳得比你们打歌都用力——我数着你挥手的次数比你们主打歌还多。"你说你怎么找到的。他说你绑定的手机号没变——他搜了你所有可能的ID。', exposure: 1, flag: 'secretFound' },
  { key: 'secret_exo_concert_outfit', text:'你去EXO演唱会穿了团服——是EXO的周边T恤。不是作为爱豆——是作为粉丝。散场后你在停车场碰到他了。"这件T恤——""别说了。""不是我买的吧——不是——就是——有点眼熟。"你说你十七岁的时候买的。他说他知道——因为这件T恤他在某个练习生照片里见过。那时候你还没认识他。', exposure: 1, flag: 'secretFound' }
];
