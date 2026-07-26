// calendar-events.js | 日历节日池 | 8节日+四人生日+出道纪念日 | 共62→72条
export var CALENDAR_EVENTS = [].concat(
  // ===== 你的生日 (4条) =====
  [
    { key: 'heroine_bday_morning', require:'birthday=heroine', text: '今天是你生日。早上醒过来的时候手机上有几条未读消息——妈妈、哥哥、还有他。你看了很久屏幕，最后还是先点开了妈妈那条。' },
    { key: 'heroine_bday_brother', require:'birthday=heroine&&aff>=20', text: '生日这天哥哥闯进你们练习室，把蛋糕怼到你面前。队友在旁边唱生日歌，完全走调。他也在门口靠着——手里好像还拎着个袋子，但没进来。' },
    { key: 'heroine_bday_ml_gift', require:'birthday=heroine&&aff>=30', text: '生日当晚你在宿舍拆礼物。队友送了一堆化妆品和零食。然后你看到了一个没署名的盒子——打开是一条银色的项链。你翻遍了盒子没有找到卡片。但你认得那个品牌。' },
    { key: 'heroine_bday_fan_notice', require:'birthday=heroine&&debut', text: '今天你的生日。粉丝在地铁站做了咖啡车应援。你站在自己的海报前面拍了张照，发了泡泡。评论区刷屏了韩语和中文混杂的「生日快乐」。' }
  ],
  // ===== 男主生日 (5条) =====
  [
    { key: 'ml_bday_gift_prep', require:'birthday=ml&&aff>=20', text: '明天是他生日。你前一周就在挑礼物——看了很多推荐帖，最后选定了一条和你手链同款的。只是还没想好怎么给他。' },
    { key: 'ml_bday_midnight', require:'birthday=ml&&aff>=30', text: '他在零点发了官咖——是自拍和感谢粉丝的话。你在评论区打了很多字又删掉，最后私信发了一句"生日快乐"。他秒回了一个问号然后一个笑脸。' },
    { key: 'ml_bday_brother_tease', require:'birthday=ml&&aff>=30', text: '今天是他的生日。你托哥哥转交礼物的时候哥哥意味深长地看着你："连我生日你都没这么上心过。"你假装听不懂。' },
    { key: 'ml_bday_fan_buzz', require:'birthday=ml&&debut', text: '今天是他生日。推特趋势第一是他名字的生日tag。你在待机室刷着粉丝做的生日图——保存了其中最好看的一张。' },
    { key: 'ml_bday_secret_visit', require:'birthday=ml&&aff>=50', text: '今天是他生日。你在他公司附近订了个小咖啡厅，发定位给他。"不用回——就是想说句生日快乐。"他到的时候，你看到他还穿着打歌服。' }
  ],
  // ===== 哥哥生日 (4条) =====
  [
    { key: 'brother_bday_tease', require:'birthday=brother', text: '今天哥哥生日。你发消息问他："又老一岁，感觉如何？"他秒回了一个刀的表情，然后补一句"礼物呢。"你丢了一个快递单号给他。' },
    { key: 'brother_bday_team_surprise', require:'birthday=brother', text: '今天是哥哥生日。他们团在待机室给他准备了惊喜——你被拉进了视频通话里一起唱生日歌。他嘴上说"别搞"，但画面模糊的时候你还是看到了他眼眶有点红。' },
    { key: 'brother_bday_ml_present', require:'birthday=brother&&aff>=20', text: '哥哥生日这天，男主特地在群聊里@了他送祝福。你看到截图的时候愣了一下——他发了很长一段。你忽然觉得哥哥这人缘真的挺好的。' },
    { key: 'brother_bday_family_call', require:'birthday=brother', text: '今天哥哥生日。晚上你打视频回家，爸妈在厨房煮海带汤。屏幕里哥哥抱怨"都出道了还给我煮汤"，但一碗都没剩下。' }
  ],
  // ===== 情敌生日 (3条) =====
  [
    { key: 'rival_bday_encounter', require:'birthday=rival&&aff>=15', text: '今天是情敌的生日。你在待机室走廊碰到他，他在打电话谢谢谁。你经过的时候他看了你一眼——像在判断你会不会开口。' },
    { key: 'rival_bday_msg_dilemma', require:'birthday=rival&&aff>=25', text: '今天是情敌的生日。你在犹豫要不要发一句认证。打了删、删了打——最后还是发了不到十个字。他回得很快。这个速度让你有点不自在。' },
    { key: 'rival_bday_ml_notice', require:'birthday=rival&&aff>=20', text: '今天是情敌的生日。男主在群里发了一长串调侃。你刷到的时候忍不住笑了——然后想起自己还欠情敌一句祝福，划回私信页面停顿了五秒。' }
  ],
  // ===== 情人节 · 2月 (5条) =====
  [
    { key: 'valentine_ml_appears', require:'month=2&&debut', text: '2月14日。你今天行程结束得晚，出公司大门的时候发现他靠在墙上——手里拿着一个小盒子。他说"路过"。' },
    { key: 'valentine_brother_relay', require:'month=2&&trainee', text: '情人节。哥哥突然给你发消息说"有人托我转交东西给你"。你打开他放在练习室柜子里的袋子——是一盒巧克力和一张没署名的卡片。' },
    { key: 'valentine_secret_gift', require:'month=2&&debut', text: '今天你收到了一份匿名礼物放在公司前台。经纪人说是粉丝送的。但你认得那个包装纸——跟他上次在直播里展示的是同一个牌子。' },
    { key: 'valentine_fan_notice', require:'month=2&&debut', text: '情人节当天你发了自拍。评论区有人说"姐姐颈链好像是XX品牌的限定款——谁送的？！"你赶紧删了重发一张没戴项链的。' },
    { key: 'valentine_missed', require:'month=2&&debut', text: '情人节这天你们两人都在跑行程。晚上你刷到他在官咖发的消息——配图是录音室的时钟，时间是23:59。你在评论打了又删，最后只发了颗心。' }
  ],
  // ===== 白色情人节 · 3月 (3条) =====
  [
    { key: 'white_day_reply', require:'month=3&&debut', text: '3月14日。你犹豫了很久要不要回礼。最后你往他待机室门口放了一杯热美式——附纸条写着"一个月前谢谢"。' },
    { key: 'white_day_candy_found', require:'month=3&&debut', text: '今天你包里莫名多了一盒糖果。队友说"是不是上次情人节你送谁了回礼？"你装傻说不知道。但糖被姐姐们抢走了一半。' },
    { key: 'white_day_fan_spot', require:'month=3&&debut', text: '白色情人节粉丝在签售会上问"姐姐有收到糖果吗"。你笑着打太极，但耳朵红了——因为那人昨天确实托哥哥转交了一盒。' }
  ],
  // ===== 圣诞节 · 12月 (5条) =====
  [
    { key: 'xmas_end_year_stage', require:'month=12&&debut', text: '圣诞节刚好是年末歌谣大战。你在后台走廊撞见他，他说"圣诞快乐"。旁边有人在搬道具，但你觉得那一瞬间很安静。' },
    { key: 'xmas_first_snow', require:'month=12&&trainee', text: '今天初雪。你站在练习室窗前看着雪花落下，手机响了——是他发来的。只有一句话：下雪了。' },
    { key: 'xmas_lonely_trainee', require:'month=12&&trainee', text: '圣诞节。练习室里只剩你一个人。外面街上很热闹，但你的世界只有镜子和地板上磨旧的痕迹。' },
    { key: 'xmas_date_attempt', require:'month=12&&aff>=50', text: '圣诞夜你们终于找到两小时的空档。他开车带你去南山——在山脚下停了二十分钟，谁也没下车。车窗上起了雾，他用手指在玻璃上画了个笑脸。' },
    { key: 'xmas_fan_event', require:'month=12&&debut', text: '圣诞签售会。一个粉丝打扮成圣诞老人递给你一封信："姐姐要一直幸福啊"。你低头说了谢谢，抬头的时候眼眶有点热。' }
  ],
  // ===== 元旦 · 1月1日 (3条) =====
  [
    { key: 'newyear_morning', require:'month=1&&debut', text: '元旦。新的一年第一天。你打开手机——泡泡上的粉丝、队友的群聊、经纪人的日程表，都在说"新的一年多指教"。你最后看了看和他的聊天记录，笑了。' },
    { key: 'newyear_resolution', require:'month=1&&trainee', text: '元旦。练习生宿舍里队友们在写新年愿望。你写了两个——一个关于出道，一个关于一个人。然后把纸条折起来塞进了抽屉最里面。' },
    { key: 'newyear_ml_first', require:'month=1&&aff>=30', text: '元旦零点。你的手机震了一下——是他发来的。没有新年快乐的前缀，只有一句："今年也拜托你了。"你看着这条消息，忽然觉得窗外的烟花都不重要了。' }
  ],
  // ===== 跨年夜 · 12月31日 (3条) =====
  [
    { key: 'newyear_eve_stage', require:'month=12&&debut', text: '今晚是跨年歌谣祭。你们在舞台上倒数到零——彩带落下来的时候，你隔着人群看到他在舞台另一侧，也正朝这边看。' },
    { key: 'newyear_eve_trainee', require:'month=12&&trainee', text: '跨年夜。你还在练习室。外面很热闹——电视在播年末舞台。你对着镜子说了一句"明年见"，然后关灯离开。走廊尽头有人影——你走快了两步。' },
    { key: 'newyear_eve_message', require:'month=12&&aff>=40', text: '跨年夜倒数结束。你们都在各自的公司跑行程。但你收到了一条只有四个字的消息——"新年快乐。"后面跟了一个表情，你认得那是他刚从泡泡上下载的。' }
  ],
  // ===== 万圣节 · 10月底 (3条) =====
  [
    { key: 'halloween_costume', require:'month=10&&debut', text: '万圣节。公司让你们拍了变装视频。你穿了一身黑猫造型，发到泡泡上十分钟就炸了。他在评论区发了一个猫的表情——然后秒删。但你知道你看到了。' },
    { key: 'halloween_ml_fan_notice', require:'month=10&&debut', text: '万圣节。今天发变装照的时候，粉丝从你背景里的一片衣角认出了他的外套同款。评论区开始丢放大镜截图。你赶紧编辑了图片——把右边裁掉了。' },
    { key: 'halloween_chill', require:'month=10&&aff>=30', text: '万圣夜。他说在你们公司附近拍节目。你戴了个口罩溜出去——在便利店门口碰头，一人买了一根棒棒糖，像两个逃课的高中生。' }
  ],
  // ===== 中秋/秋夕 (9月，3条) =====
  [
    { key: 'chuseok_family', require:'month=9', text: '中秋节。今天休假回家，妈妈做了一桌子菜。哥哥也在——他说"难得碰面"。吃完饭你们坐在地板上剥柚子，电视里播着中秋特辑。' },
    { key: 'chuseok_moon_message', require:'month=9&&aff>=20', text: '中秋节晚上。你拍了张月亮发到泡泡上。他十分钟后也发了一张月亮——角度一模一样。粉丝开始刷"xql"。你不敢回这条动态，但截了图。' },
    { key: 'chuseok_trainee_bonus', require:'month=9&&trainee', text: '中秋。公司发了松饼。你在练习室咬着松饼看着窗外的满月——手机里家人群聊在发红包。你领了三个，但没有说话。你怕一开口会想回家。' }
  ],
  // ===== 光棍节 · 11月11日 (2条) =====
  [
    { key: 'pepero_day', require:'month=11', text: '11月11日。今天是Pepero Day。队友买了一堆巧克力棒在练习室互相传。你接了一根，想了想——又拿了一根揣进口袋。你没说为什么。' },
    { key: 'pepero_ml_hint', require:'month=11&&aff>=25', text: 'Pepero Day。他在待机室门口递了你一根巧克力棒。"多出来的"——他说。附近有人在拍物料，但这个动作很快，快到可能没人注意到除了你。' }
  ],
  // ===== 出道纪念日 (4条) =====
  [
    { key: 'anniv_100day', require:'debut', text: '出道100天。经纪人带了一个小蛋糕到待机室。你们六个人挤在一张化妆镜前分着吃。有人录了视频——你后来看了很多遍。' },
    { key: 'anniv_1year', require:'debut', text: '出道一周年。粉丝在地铁站做了巨幅应援。你下班的时候特意绕路去看——站在广告牌前面拍了一张照，发给哥哥。他回："看到了，爸妈也看到了。"' },
    { key: 'anniv_ml_notice', require:'aff>=50', text: '今天是你出道一周年。他在凌晨发了一条消息——没有说祝贺，只是问"你睡了吗"。你没睡。你们聊到天亮。' },
    { key: 'anniv_subway_ad', require:'debut', text: '粉丝在你出道周年做的地铁应援被路人拍下来发到了网上。热搜词条是你和团名。你刷到的时候正在待机室，化妆师说你笑了整整五分钟。' }
  ],
  // ===== 出道日当天 (5条) =====
  [
    { key: 'debut_day_morning', require:'traineePhase=3', text: '出道日早上。你醒得很早，躺在床上盯着天花板。手机里有妈妈的消息、哥哥的消息、经纪人的消息。你深呼吸了一下——今天是你人生中最重要的一天。' },
    { key: 'debut_day_makeup', require:'traineePhase=3', text: '化妆师给你画眉毛的时候手有点抖。她说"第一次给出道的新人化妆，我也紧张"。你们两个在镜子里对视着笑了。' },
    { key: 'debut_day_brother_msg', require:'traineePhase=3', text: '哥哥在你去舞台的路上发来语音："我出道那天紧张到差点把话筒扔了——你肯定比我强。去吧。"你在走廊里听完，把手机锁屏放进口袋。' },
    { key: 'debut_day_backstage', require:'traineePhase=3', text: '待机室里所有同期都在。你们互相检查妆容、衣服、耳返。没有人说话。不是不说话——是怕一开口会哭。' },
    { key: 'debut_day_stage', require:'traineePhase=3', text: '灯光亮起来的时候你听见了自己的心跳。台下的应援声比你想象的大——虽然你还看不清他们的脸，但你知道有人在等你。' }
  ],
  // ===== 情人节 · 2月14日 (3条) =====
  [
    { key: 'valentine_choco_making', require:'month=2', text: '情人节。你在待机室偷偷做手工巧克力——队友们围过来帮忙。做得歪歪扭扭——但包装纸是你最喜欢的颜色。你没有写名字——只画了一颗很圆的爱心。' },
    { key: 'valentine_ml_choco', require:'month=2&&aff>=30', text: '情人节。他在待机室门口放了一小盒巧克力——没有署名。但盒子上印的牌子是你上次在泡泡说想试试的。你拿着盒子知道是他。巧克力是苦甜的——跟他平时说话的方式有点像。' },
    { key: 'valentine_staff_share', require:'month=2&&debut', text: '情人节。你分了一盒大包装巧克力给工作人员和队友——没有人注意到你留了最底下那块。那头一整天你都在等一个"还回来"的瞬间。' }
  ],
  // ===== 白色情人节 · 3月14日 (3条) =====
  [
    { key: 'white_day_anticipation', require:'month=3&&debut', text: '白色情人节。一个月前的巧克力——今天是不是该有回礼。你在待机室等了半天——铃声是经纪人的，门是队友的。傍晚的时候你的化妆台上多了一支棒棒糖——糖纸里面写了一行小字:上个月的巧克力——我留了最后一块。现在吃完了——所以来回礼。' },
    { key: 'white_day_candy_rain', require:'month=3&&aff>=30', text: '白色情人节。他拿了三大袋糖果给你的团——"公司多买的——帮忙分一下。"每个人都在抢口味。你拆开了最后剩下的一颗——是你最喜欢的柠檬味。不是巧合——他买的时候就留好了。' },
    { key: 'white_day_international', require:'month=3&&aff>=40', text: '白色情人节。他在泡泡发了手写卡片:"给所有在今天等回礼的人。"粉丝疯狂解读。你收到的是另一张卡片——私信里的——只有一句话:公开的那张——每句都有你——只是不能写你名字。但你知道——每句写的都是你。' }
  ],
  // ===== 夏日祭/七夕 · 7月 (4条) =====
  [
    { key: 'tanabata_wish', require:'month=7&&debut', text: '七夕。你在许愿签上写了愿望——挂在公司的许愿竹上。队友写的都是"回归大发""身体健康"。你写了——写了很久——风吹过来的时候你的纸条翻了一面——背面是空白的。不是没写完——是你把另一半愿望在心里说了。' },
    { key: 'tanabata_fireworks', require:'month=7&&debut', text: '夏天的烟花大会——公司在江边办团建。烟花升空的时候你的手机亮了一下——他发了一张烟花图。不是同一片天空——但连发消息的时间都是同步的。你说"在放烟花"。他回"在看你放的烟花——虽然看不到——但我在想你那边的天空是什么颜色。"' },
    { key: 'tanabata_hand_fan', require:'month=7&&aff>=30', text: '夏天太热——你在待机室对着小风扇吹。他过来——手里多了一把团扇——一边给自己扇风一边把风的方向转到了你这边。不是整面——是刚好吹到你的脖子——你刚才说过热的地方。' },
    { key: 'tanabata_yukata_pic', require:'month=7&&debut', text: '夏日画报——你穿了浴衣。拍了独照和合照。他在官咖发的今天是他的单曲预告——封面是夏天。你在评论里打了三个字:夏天好。他回了一个海浪emoji。粉丝说这是互动——你说是很热。' }
  ]
);
