import { readFileSync, writeFileSync } from 'fs';

var f = readFileSync('src/ent-sim/pools/chat-male-lead.js', 'utf8');
var kw = /出道|打歌|舞台|一位|奖杯|颁奖|回归|综艺|专辑|签售|演唱|泡泡|音源|应援|直拍|热搜/;
var lines = f.split('\n');
var fixed = 0;

for (var i = 0; i < lines.length; i++) {
  var line = lines[i];
  // 已有 require 的跳过
  if (line.indexOf('require:') >= 0) continue;
  // 只处理 from 行
  if (line.indexOf('from:') < 0) continue;
  // 关键字匹配
  if (kw.test(line) && line.indexOf(',time:') >= 0) {
    lines[i] = line.replace(',time:', ',require:"debut",time:');
    fixed++;
  }
}

writeFileSync('src/ent-sim/pools/chat-male-lead.js', lines.join('\n'), 'utf8');
console.log('Fixed ' + fixed + ' entries with require:"debut"');
