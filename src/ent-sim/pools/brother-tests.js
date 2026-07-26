// ============================================================
// 哥哥递进考验池（按好感 15/40/70 触发）3→21→30条
// ============================================================
export var BROTHER_ADVANCE_TESTS = [
  // ── 第一档：试探期 (好感15-39) ──
  { key: 'test_1a', minAff: 15, maxAff: 39, text: '哥哥把你拉到练习室角落："他最近看你的眼神不对，你给我说实话，你们是不是在暧昧？"支持度 +3/-3。', support: 3, failSupport: -3, flag: 'testNudged1' },
  { key: 'test_1b', minAff: 15, maxAff: 39, text: '哥哥在吃饭时"无意"提起最近队里有成员经常看手机傻笑。"你知道是谁吗？"他看着你。筷子搁在碗沿上——他连饭都没怎么吃。', support: 2, failSupport: -3, flag: 'testNudged1b' },
  { key: 'test_1c', minAff: 15, maxAff: 39, text: '哥哥拿着两杯咖啡在走廊上堵住你。"一杯是你的。另一杯——你帮我给一个人。你知道是谁。"你接过，手心有点汗。他拍了拍你肩膀。', support: 3, failSupport: -2, flag: 'testNudged1c' },
  { key: 'test_1d', minAff: 15, maxAff: 39, text: '年终结算会议上，哥哥坐在你旁边。桌上摆着团体的成绩和个人的轨迹。他在纸上写了一行字推到你面前——"你们进度到哪里了？"你画了一个问号。他画了一个箭头指回给你的那位。', support: 2, failSupport: -3, flag: 'testNudged1d' },
  { key: 'test_1e', minAff: 20, maxAff: 39, text: '哥哥在待机室把门虚掩上——外面是正在拍花絮的摄像机。"现在没人了——我问你一个问题，你不用马上回答。他——对你是还行的吗？不是问好不好——是位置。固定的那种还是流动的那种。"', support: 3, failSupport: -3, flag: 'testNudged1e' },
  { key: 'test_1f', minAff: 20, maxAff: 39, text: '两个人顺路坐了一段出租车。车里广播播了一首老情歌。哥哥没有关掉——你没有说话。快下车时他说:"那歌——是他喜欢的。""你怎么知道。""他练习生时期手机里全是他喜欢的歌。你最近听的单子跟那个重叠了。"', support: 2, failSupport: -2, flag: 'testNudged1f' },
  { key: 'test_1g', minAff: 25, maxAff: 39, text: '团建游戏时间——真心话传到你手里之前，哥哥把话题转了。他替你挡了一个直接的问题。后来你问为什么，他说:"你准备好自己说的话——被全世界听——之前——先想好你想跟他说的话。"', support: 3, failSupport: -3, flag: 'testNudged1g' },
  // ── 第二档：设局期 (好感40-69) ──
  { key: 'test_2a', minAff: 40, maxAff: 69, text: '哥哥故意在男主面前安排你和情敌独处（让情敌送你回家），男主脸色变了，但什么都没说。支持度 +5/-5。', support: 5, failSupport: -5, flag: 'testNudged2' },
  { key: 'test_2b', minAff: 40, maxAff: 69, text: '哥哥安排了三人晚餐——你、他、情敌。他在桌上一直在观察。甜点没上完他就找了个让你去洗手间的机会把你拉出去。"看到刚才他看你的表情了吗——那是一种保护欲。如果以后有人伤你——他会先伤自己。"', support: 5, failSupport: -4, flag: 'testNudged2b' },
  { key: 'test_2c', minAff: 40, maxAff: 69, text: '哥哥约你和男主一起去看电影——恐怖片。黑暗中他坐在中间一排。散场时他看向你:"你刚才抓的是他的手——我看到的——别跟我说是害怕。"', support: 4, failSupport: -5, flag: 'testNudged2c' },
  { key: 'test_2d', minAff: 45, maxAff: 69, text: '哥哥发了个地址让你去。到了以后发现是一间小录音棚——男主在里面戴着耳机。哥哥在门口堵住了你的退路:"你进去跟他说——就现在——你想他为你写歌还是为别人。"', support: 6, failSupport: -5, flag: 'testNudged2d' },
  { key: 'test_2e', minAff: 50, maxAff: 69, text: '他把你叫到天台:"你跟他开始了？我现在不是哥哥——我是一起跟他走过最糟糕时光的人。所以我现在问你——你能不能答应我——无论什么时候——不要让他一个人。"', support: 6, failSupport: -6, flag: 'testNudged2e' },
  { key: 'test_2f', minAff: 50, maxAff: 69, text: '你们团队的月末评价结束后——他在走廊单独跟男主待了半个小时。后来他发了一句:"我跟他聊了。不是关于你——是帮他理了一下如果我妹真的和他在一起——他的规划是什么。他有规划——但不是为了舞台。是为了你。"', support: 5, failSupport: -3, flag: 'testNudged2f' },
  { key: 'test_2g', minAff: 55, maxAff: 69, text: '年末活动结束那晚——他把你摁在休息室的椅子上。"我看了你们这几个月——从试探到避开到放弃躲避——我替你们都累。现在——你坐在这张椅子上——告诉我你到底在想什么。"支持度 +5/-4。', support: 5, failSupport: -4, flag: 'testNudged2g' },
  // ── 第三档：结局前把关 (好感≥70) ──
  { key: 'test_3a', minAff: 70, text: '结局前哥哥把你和男主叫到一起，把麦克风塞到你手里："今天你给我一句准话，你要不要他。"支持度 +8/-8。', support: 8, failSupport: -8, flag: 'testNudged3' },
  { key: 'test_3b', minAff: 70, text: '他把一张手写的纸推到你面前——是练习生时期的日记。上面有一页提到了你:那时候你还没出道——他经常去天台看星星——现在我知道——那个人会在天台等我。纸页边缘微微卷了。哥哥说:"这张纸他让我看一眼——只一眼——然后给你。我给晚了——但我现在给你了。"', support: 8, failSupport: -6, flag: 'testNudged3b' },
  { key: 'test_3c', minAff: 75, text: '"最后问你一次——"他收起了平时所有的玩笑表情。"如果有一天——他不在这个行业了——你还会选他吗。""我不是在替他问。我是在替你们将来的某一天问。"', support: 9, failSupport: -8, flag: 'testNudged3c' },
  { key: 'test_3d', minAff: 75, text: '他把团里的一些未公开视频放给你看——男主做的一些决定里都有提到:"因为我认识的一个人让我想尽全力——我不能说名字——但这个人不是偶像——是让我变成更好的普通人的人。"哥哥关掉屏幕。看着你。他什么都不用说了。', support: 8, failSupport: -7, flag: 'testNudged3d' },
  { key: 'test_3e', minAff: 80, text: '两个人在工作室里并排坐着——他从包里拿出一枚很小的戒指盒子。"这不是我给你的——是他买了很久——怕给你添压力。我帮他保管到现在。"你打开盒子——戒指内圈刻了一个字。是你名字的第一个笔画。', support: 10, failSupport: -8, flag: 'testNudged3e' },
  { key: 'test_3f', minAff: 80, text: '他在乐队休息室拿出了一把旧版吉他——是他练习生时期自己买的第一把。琴头贴着你第一次见他那天的日期贴纸。"这把吉他陪了他八年——现在他让我交给你。不是因为你要弹——是因为你就是这把吉他在等的下一个和弦。"', support: 9, failSupport: -7, flag: 'testNudged3f' },
  { key: 'test_3g', minAff: 85, text: '全团都在的场合——他忽然站出来把所有人的注意力带到你身上。"我今天是作为七年队友和二十六年哥哥说这句话——我把你们之间看得很清楚。现在我只需要你的一个回答——不管多小声——只要是真的。"', support: 10, failSupport: -10, flag: 'testNudged3g' },
  // ── 第一档补充 ──
  { key:'test_1h', minAff:15, maxAff:39, text:'哥哥在你待机室翻看你的手机——不是偷看，是你放在桌上忘了锁屏。他看到了聊天列表顶上那个名字。他放下手机——看着你:"你的置顶——是我的队友。"你说手滑。他说手滑一次是意外——手滑两次是系统记录。', support:3, failSupport:-2, flag:'testNudged1h'},
  { key:'test_1i', minAff:20, maxAff:39, text:'练舞休息的时候他忽然问你:"他最近有没有送过你什么奇怪的东西。"你说没有。他说那你桌上那个咖啡杯——那个牌子是他代言的。你昨天明明喝的是冰美式——但杯子是热饮款。那杯子是别人替你拿过来的——不是你自己接的。', support:2, failSupport:-3, flag:'testNudged1i'},
  { key:'test_1j', minAff:25, maxAff:39, text:'哥哥发来一张截图——是你和男主在走廊擦肩而过的饭拍。他说:"这张图已经在我手机里存了一个多月了。不是粉丝拍的——是我自己拍的。因为那个瞬间我发现——你俩对视的时候——是我见过最像戏又最不像戏的表情。"', support:3, failSupport:-2, flag:'testNudged1j'},
  // ── 第二档补充 ──
  { key:'test_2h', minAff:40, maxAff:69, text:'他发给你一份文档——是男主最近采访的原始记录。里面有一段被要求删掉的话:"现在的动力有一部分来自一个人——她不是我的——但我想变成配得上她的人。"哥哥的备注只有一行字:这是原始稿。剪辑前。所以——你现在知道答案了。', support:6, failSupport:-4, flag:'testNudged2h'},
  { key:'test_2i', minAff:45, maxAff:69, text:'他约你在公司楼下长椅坐。旁边有人在跳广场舞——音乐震耳欲聋。他靠近你耳朵说:"我认识他十年——从来没有见过他为别人紧张成这样。不是因为害怕——是因为想做好。"然后他站起来拍拍你的肩膀走了。', support:5, failSupport:-5, flag:'testNudged2i'},
  { key:'test_2j', minAff:50, maxAff:69, text:'他把男主一年前的日记页复印了给你——只有一页。上面有一行:"如果有一天——她能在我写的歌里听到自己的影子——那这首歌就完成了。"那首歌已经发了——你听过。哥哥在纸背后写了:"你看——她早就听到了。"', support:7, failSupport:-5, flag:'testNudged2j'},
  // ── 第三档补充 ──
  { key:'test_3h', minAff:70, text:'哥哥把他俩练习生时期的合照拿出来——背面是他给哥哥写的一句话:谢谢你们。无论是谁——跟你站在一起——都是我的幸运。哥哥指着"无论谁"三个字:"他写这行的时候——你还没出道。他已经在预留位置了。"', support:8, failSupport:-6, flag:'testNudged3h'},
  { key:'test_3i', minAff:75, text:'最后一把钥匙——是他给你的。不是真的钥匙——是一个U盘。里面有他写的七首歌——每首歌名对应一个你们之间的节点。哥哥替他把第一个——也是最旧的那个——交给你:"他说——这些歌全部发完了——下一张就是你的名字。"', support:9, failSupport:-7, flag:'testNudged3i'}
];
