// 把池子JSON嵌入模板 → 生成 test-play.html
import * as allPools from '../src/ent-sim/pools/index.js';
import { readFileSync, writeFileSync } from 'fs';

var template = readFileSync('public/test-play-template.html', 'utf8');
var poolJSON = {};
var poolNames = Object.keys(allPools);

for (var i = 0; i < poolNames.length; i++) {
  var name = poolNames[i];
  var arr = allPools[name];
  if (!arr || !arr.length) continue;
  var texts = [];
  for (var j = 0; j < Math.min(arr.length, 20); j++) {
    var entry = arr[j];
    if (!entry) continue;
    var txt = typeof entry === 'string' ? entry : ((entry && entry.text) || (entry && entry.t) || '');
    if (txt && txt.length < 300) texts.push(txt);
  }
  if (texts.length) poolJSON[name] = texts;
}

var embedded = 'var POOLS = ' + JSON.stringify(poolJSON) + ';';
var html = template.replace('/* __POOL_DATA_PLACEHOLDER__ */', embedded);
writeFileSync('public/test-play.html', html, 'utf8');

var total = Object.values(poolJSON).reduce(function(a,b){return a+b.length;},0);
console.log('Done. ' + Object.keys(poolJSON).length + ' pools, ' + total + ' texts');
console.log('Open: npm run dev → http://localhost:5173/test-play.html');
