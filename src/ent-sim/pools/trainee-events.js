// trainee-events.js | 练习生事件池 | 月末评价/被前辈夸/同期被刷/社内Showcase/出道触发 | 50条
export var TRAINEE_EVENTS = [
  // stage=1 前期（基础训练期）
  { stage: 1, key: 'eval_first_c', text: '第一次月末评价你拿了C-。出评价室的时候腿在抖，哥哥发来消息问怎么样，你打了又删，最后只回了个表情包。' },
  { stage: 1, key: 'senior_notice', text: '今天一位前辈在走廊经过时停了一下，看着你说"你的音色不错"。你愣在原地好几分钟才反应过来。' },
  { stage: 1, key: 'lost_first_day', text: '第一天来公司的路上迷路了三次。在练习室门口深呼吸，推开门发现大家都已经到了，齐刷刷看着你。' },
  { stage: 1, key: 'helped_by_peer', text: '你练舞到半夜，一个同期给你买了杯热咖啡。她说"我也经常这样，别太拼了"。' },
  { stage: 1, key: 'mirror_solo', text: '你一个人在镜子前练到凌晨两点。整栋楼都安静了，只有你鞋底摩擦地板的声音。' },
  { stage: 1, key: 'first_group_practice', text: '第一次跟团合练，你总是跟不上节奏。队长姐姐单独留你下来，一个动作一个动作地教。' },
  { stage: 1, key: 'teacher_praise_weak', text: '声乐课老师终于说了一句"有进步"。虽然语气很平淡，但你在心里默默记住了这个瞬间。' },
  { stage: 1, key: 'phone_call_mom', text: '晚上回到宿舍给妈妈打了电话。她说"累就回家吧"，你咬着嘴唇说"不累，挺好的"。挂了电话哭了好一会儿。' },
  { stage: 1, key: 'older_sister_night_snack', text: '半夜饿了去自动贩卖机，碰到了一个姐姐队的姐姐。她买了两个饭团，分了你一个。你们坐在楼梯间就着矿泉水吃。' },
  { stage: 1, key: 'forgot_lyrics', text: '今天小组练习的时候你忘词了，全场安静了五秒钟。你觉得那五秒比一整个下午还长。' },

  // stage=2 中期（竞争适应期）
  { stage: 2, key: 'eval_b_plus', text: '月末评价你拿了B+。虽然不是A，但评委说"进步很明显"。你出来的时候笑得像个傻瓜。' },
  { stage: 2, key: 'peer_eliminated', text: '同期的朋友今天被通知淘汰了。她收拾东西的时候笑着跟你说"要加油出道啊"。你帮她拎了箱子到门口。回来以后在练习室哭了。' },
  { stage: 2, key: 'first_compliment', text: '舞蹈老师第一次当众夸你"律动很好"。所有同期都看了你一眼。你低着头不敢看人，耳朵烧得厉害。' },
  { stage: 2, key: 'showcase_internal', text: '社内小型Showcase——你在台上唱歌的时候看到前排评委点了下头。那是这几个月来你离"被认可"最近的一刻。' },
  { stage: 2, key: 'rival_competition', text: '你发现同期有人在偷偷加练——她的routine比你的流畅。你什么都没说，但从那晚开始你也留到最后一个走。' },
  { stage: 2, key: 'brother_visit', text: '哥哥今天突然出现在练习室门口，提着一袋零食。他说"路过"。同期的练习生们全都偷偷看你们，你知道她们在好奇。' },
  { stage: 2, key: 'first_vocal_solo', text: '声乐课独唱环节，老师让你站在中间。你唱完的时候教室很安静——不是因为唱砸了，是因为大家都在听。' },
  { stage: 2, key: 'team_leader_assigned', text: '分组练习时你被指定为小组长。第一次要带着别人练习，你紧张到声音都在抖，但组员都说"姐姐你比想象中做得好"。' },
  { stage: 2, key: 'health_scare', text: '今天训练到一半头有点晕，你靠在墙边休息。队长姐姐过来摸了下你的额头，说"去休息室躺一下，我帮你跟老师说"。' },
  { stage: 2, key: 'hope_letter', text: '你开始写一封信——给未来的自己。写到一半又划掉了，觉得太傻了。但还是折好塞进了练习室储物柜的最里面。' },

  // stage=3 后期（出道冲刺期）+ 出道触发事件
  { stage: 3, key: 'debut_group_rumor', text: '有人在传出道组的名单。你没有刻意去听，但耳朵还是忍不住竖了起来。那天下午的练习你心不在焉。' },
  { stage: 3, key: 'debut_song_first_hear', text: '第一次听到出道曲demo的时候你起了一身鸡皮疙瘩。制片人问"怎么样"，你说的第一句话是——"我要唱"。' },
  { stage: 3, key: 'concept_meeting_nervous', text: 'MV概念会议上大家讨论得热火朝天，你坐在角落里不敢说话。队长推了推你的肩膀："你也说说啊，这是你的出道曲。"' },
  { stage: 3, key: 'final_eval_before_debut', text: '出道前最后一次内部审核。社长、制作人、舞蹈总监全部到场。你站在中间的位置，手心全是汗。' },
  { stage: 3, key: 'rival_debut_final', text: '出道组最终名单今天公布。你和同期竞争对手被叫到一起谈话。气氛很微妙——你们都知道，名单上不可能同时有两个人。' },
  { stage: 3, key: 'debut_d_day_countdown', text: '出道日倒计时：7天。你盯着墙上的日历，用记号笔在今天的日期上画了一个圈。经纪人经过说"别看了，快去练习"。' },
  { stage: 3, key: 'brother_debut_advice', text: '哥哥今天专门找了时间跟你谈话。他说"出道以后跟练习生时期不一样——你得学会在镜头前藏住很多事情"。你看着他的眼睛，知道他意有所指。' },
  { stage: 3, key: 'staff_encouragement', text: '一直带你的经纪人姐姐今天递给你一瓶维他命水，说"第一眼看到你就觉得你会出道的"。你接过水，好一会儿才说谢谢。' },
  { stage: 3, key: 'last_night_before', text: '出道前一晚，你在宿舍床上翻来覆去睡不着。窗外的路灯把窗帘染成橘色。你能听到隔壁房间队友的呼吸声——她们大概也没睡。' },
  { stage: 3, key: 'debut_final_eval', text: '出道最终评价——你站在评价室门口深吸一口气。这一关过后，要么出道，要么离开。门开了。', require: 'traineePhase=3' }
];
