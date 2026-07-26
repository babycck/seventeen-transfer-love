import { readdirSync, readFileSync } from 'fs';

var dir = 'src/ent-sim/pools';
var files = readdirSync(dir).filter(function(f) { return f.endsWith('.js'); });
var pools = {};

files.forEach(function(f) {
  try {
    var c = readFileSync(dir + '/' + f, 'utf8');
    // 统计 {key: / {vibe: / {cat: / {stage: / {show: / {t:' 这类模板入口
    var entries = c.match(/\{[a-z]+:/g);
    // 更精确: 统计独立对象条目
    var count = 0;
    var lines = c.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      // 检测条目行: { key:... 或 { vibe:... 或 { cat:... 等
      if (line.match(/^\s*\{ ?(key|vibe|cat|stage|show|type|t|text|name) ?:/)) count++;
    }
    var exportMatch = c.match(/export var (\w+)/);
    var name = exportMatch ? exportMatch[1] : '?';
    var key = f.replace('.js','') + ':' + name;
    if (count > 0) pools[key] = count;
  } catch(e) {}
});

var keys = Object.keys(pools).sort(function(a,b) { return pools[a] - pools[b]; });
console.log('=== 所有池子条目数（<50条标⚠） ===');
var total = 0;
keys.forEach(function(k) {
  var cnt = pools[k];
  var mark = cnt < 20 ? '🔴' : cnt < 50 ? '⚠' : '  ';
  console.log(mark + ' ' + pad(k, 40) + ' ' + String(cnt).padStart(4) + ' 条');
  total += cnt;
});
console.log('\n总计: ' + keys.length + ' 个池子, ' + total + ' 条总条目');

function pad(s, n) { while (s.length < n) s += ' '; return s; }
