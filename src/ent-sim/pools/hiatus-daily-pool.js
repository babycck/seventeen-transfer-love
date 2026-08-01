// ============================================================
// 空白期专用剧情池（hiatus-daily-pool.js）
// plan #14: 空白期 = 回归结束/无打歌行程的日常阶段
// cat: routine / anxiety / bonding / sideHustle / fan / romance / growth
// ============================================================
export var HIATUS_DAILY_POOL = [
  // ── routine（日常）weight=4 ──
  { key: 'hiatus_routine_01', text: '今天没有行程——你睡到自然醒。打开手机看到群聊里队友在讨论去哪吃早午餐。这是空白期难得的悠闲。', cat: 'routine', weight: 4 },
  { key: 'hiatus_routine_02', text: '你在宿舍对着镜子练了三个小时的舞——不是因为有考核，是因为你想。空白期不代表停下来。', cat: 'routine', weight: 4 },
  { key: 'hiatus_routine_03', text: '你去了公司练习室——虽然今天没有安排训练，但钢琴室空着。你弹了几首自己的歌。', cat: 'routine', weight: 4 },
  { key: 'hiatus_routine_04', text: '你和队友一起去超市买了食材——今晚在宿舍做部队锅。空白期的小确幸。', cat: 'routine', weight: 4 },
  { key: 'hiatus_routine_05', text: '你在宿舍整理衣柜——翻出了练习生时期的第一件训练服。标签还缝着名字。你看了很久。', cat: 'routine', weight: 3 },
  { key: 'hiatus_routine_06', text: '今天你去了公司附近的咖啡厅——点了一杯冰美式，坐在窗边看路人。偶尔有人认出你，但只是远远地微笑。', cat: 'routine', weight: 4 },
  { key: 'hiatus_routine_07', text: '你发现了一家新的漫画咖啡厅——在里面待了整个下午。没人打扰。你觉得这才是真正的休息。', cat: 'routine', weight: 3 },
  { key: 'hiatus_routine_08', text: '你去了健身房——空白期更要保持状态。跑步机上的时间比想象中过得更快。', cat: 'routine', weight: 4 },

  // ── anxiety（焦虑·空白期特有）weight=2 ──
  { key: 'hiatus_anxiety_01', text: '今天是空白期第N天。你刷到别团的回归预告——又一个新的。你关掉手机，但脑子还在转。', cat: 'anxiety', weight: 2 },
  { key: 'hiatus_anxiety_02', text: '经纪人说"目前没有新计划"。这四个字让你在练习室多跳了两个小时——跳到膝盖开始抗议。', cat: 'anxiety', weight: 2 },
  { key: 'hiatus_anxiety_03', text: '你在泡泡上看粉丝留言——有人问"姐姐什么时候回归"。你不知道怎么回答。你也不知道。', cat: 'anxiety', weight: 2 },
  { key: 'hiatus_anxiety_04', text: '深夜你躺在床上刷着手机——看到同期出道的团已经发了第三张专辑。你翻了个身，天花板还是那个天花板。', cat: 'anxiety', weight: 2 },
  { key: 'hiatus_anxiety_05', text: '你去了公司——想找社长谈谈下次回归的计划。但在门口站了五分钟，没有敲门。', cat: 'anxiety', weight: 2 },

  // ── bonding（羁绊·和队友/哥哥互动）weight=3 ──
  { key: 'hiatus_bond_01', text: '队友突然拉你去KTV——"空白期就是要唱歌！"虽然不是打歌舞台，但你们的和声在包厢里回荡。', cat: 'bonding', weight: 3 },
  { key: 'hiatus_bond_02', text: '你和最年长的姐姐去了桑拿房——她一边拍你的背一边说："别急。空白期是蓄力。"你泡在水里，觉得她说得对。', cat: 'bonding', weight: 3 },
  { key: 'hiatus_bond_03', text: '今天你和忙内line一起拍了vlog——内容是"空白期一天怎么过"。视频里你们笑得很自然。', cat: 'bonding', weight: 3 },
  { key: 'hiatus_bond_04', text: '哥哥突然来宿舍看你——带了一袋零食。"听说你们空白期——怕你无聊。"你拆开包装的时候他在旁边坐下，什么都没说。', cat: 'bonding', weight: 3 },
  { key: 'hiatus_bond_05', text: '你和队友在练习室里即兴编舞——不是回归曲，只是跟着音乐自由摆动。你们笑到停不下来。', cat: 'bonding', weight: 3 },

  // ── sideHustle（副业/个人发展）weight=2 ──
  { key: 'hiatus_side_01', text: '你开始学写歌词——在笔记本上涂涂改改。有些句子还不错。你想也许空白期可以产出点什么。', cat: 'sideHustle', weight: 2 },
  { key: 'hiatus_side_02', text: '你报名了一个线上声乐课程——不是公司的，是自己找的。空白期是你给自己充电的时间。', cat: 'sideHustle', weight: 2 },
  { key: 'hiatus_side_03', text: '你开始拍vlog——记录空白期的日常。第一个视频发了之后粉丝反响很好，有人评论"看到姐姐的日常比看舞台还幸福"。', cat: 'sideHustle', weight: 2 },
  { key: 'hiatus_side_04', text: '你在ins上开了直播——只是和粉丝聊聊天。有人问回归日期，你说"在准备了"。没有具体日期。但你说的时候在笑。', cat: 'sideHustle', weight: 2 },
  { key: 'hiatus_side_05', text: '你去了一家舞蹈工作室——不是公司的，是外面的。你想学点新风格。空白期是拓展边界的机会。', cat: 'sideHustle', weight: 2 },

  // ── fan（粉丝互动）weight=3 ──
  { key: 'hiatus_fan_01', text: '你在泡泡上发了一条长文——谢谢粉丝在空白期还在等你。评论区的回复让你鼻子有点酸。', cat: 'fan', weight: 3 },
  { key: 'hiatus_fan_02', text: '今天你收到了粉丝寄来的手写信——厚厚一叠。信里说"空白期我们也在"。你读了三遍。', cat: 'fan', weight: 3 },
  { key: 'hiatus_fan_03', text: '粉丝在官咖组织了"空白期应援"——不是花钱的，是每天写一条鼓励的话。你翻了翻，发现有人已经坚持了两个月。', cat: 'fan', weight: 3 },
  { key: 'hiatus_fan_04', text: '你发了一张练习室的照片到ins——配文"空白期也在努力"。点赞数比想象中多。空白期不代表被遗忘。', cat: 'fan', weight: 3 },

  // ── romance（恋爱线·空白期特有）weight=2 ──
  { key: 'hiatus_rom_01', text: '空白期意味着你有更多时间——男主发消息问你在哪。你说在宿舍。二十分钟后他出现在楼下。', cat: 'romance', weight: 2 },
  { key: 'hiatus_rom_02', text: '他今天也没有行程——你们约了去汉江边骑车。路人不多，你们可以并排骑、说话、偶尔碰到手臂。', cat: 'romance', weight: 2 },
  { key: 'hiatus_rom_03', text: '他在空白期来看你——说"反正我也没事"。你看着他手里的两杯咖啡，知道他不是没事——是推了别的事。', cat: 'romance', weight: 2 },
  { key: 'hiatus_rom_04', text: '你们一起去了一家很小的唱片店——在弘大的小巷子里。他拿起一张老专辑说"这张我也有"。你们在店里待了一下午，店主给你们放了黑胶。', cat: 'romance', weight: 2 },
  { key: 'hiatus_rom_05', text: '他在深夜发了一段他弹的吉他——说是"空白期写的"。你听了三遍。第三遍的时候他问：好听吗。你说——是写给我的吧。他没否认。', cat: 'romance', weight: 2 },

  // ── growth（个人成长）weight=2 ──
  { key: 'hiatus_growth_01', text: '你开始写日记——不是泡泡，是给自己的。空白期让你有时间回头看自己走过的路。', cat: 'growth', weight: 2 },
  { key: 'hiatus_growth_02', text: '今天你在镜子前站了很久——不是在练舞，是在看自己。空白期让你重新认识自己的样子。', cat: 'growth', weight: 2 },
  { key: 'hiatus_growth_03', text: '你开始读一本一直没时间读的书——书签停在第47页已经三个月了。空白期是最好的阅读时间。', cat: 'growth', weight: 2 },
  { key: 'hiatus_growth_04', text: '你去看了前辈的演唱会——不是作为艺人，是作为观众。你在台下跟着唱的时候忘了自己是偶像。', cat: 'growth', weight: 2 },
  { key: 'hiatus_growth_05', text: '今天你在公司天台坐了很久——看着首尔的夜景。空白期不是空白——是你重新校准自己的时间。', cat: 'growth', weight: 2 }
];
