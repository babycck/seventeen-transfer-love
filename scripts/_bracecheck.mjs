import fs from 'fs';
var s = fs.readFileSync('src/ent-sim/ui.js', 'utf8');
var lines = s.split('\n');
var depth = 0, inStr = null, inLine = false, inBlock = false;
for (var i = 0; i < lines.length; i++) {
  var line = lines[i];
  if (line.length && line[0] !== ' ' && line[0] !== '\t') {
    var t = line.trim();
    if ((t.startsWith('function ') || t.startsWith('export function ')) && depth !== 0) {
      console.log('>>> top-level fn opens at depth ' + depth + ' (prev fn missing close) line', i + 1, JSON.stringify(line.slice(0,50)));
    }
  }
  for (var j = 0; j < line.length; j++) {
    var ch = line[j], next = line[j+1] || '';
    if (inBlock) { if (ch==='*'&&next==='/'){inBlock=false;j++;} continue; }
    if (inLine) continue;
    if (inStr) { if (ch==='\\'){j++;continue;} if (ch===inStr) inStr=null; continue; }
    if (ch==='/'&&next==='/'){inLine=true;break;}
    if (ch==='/'&&next==='*'){inBlock=true;j++;continue;}
    if (ch==='"'||ch==="'"){inStr=ch;continue;}
    if (ch==='{')depth++; else if (ch==='}')depth--;
  }
  inLine = false;
}
console.log('final depth', depth);
