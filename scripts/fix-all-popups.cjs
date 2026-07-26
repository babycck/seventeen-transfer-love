var fs = require('fs');
var c = fs.readFileSync('d:/SEVENTEEN/src/ent-sim/ui.js', 'utf8');

// 修复所有弹窗内部结构：
// <div class="es-stageup-overlay" max-width... → 内层 card 包装
// 把内层 es-stageup-overlay class 的 div 变成 es-stageup-card

// 1. Brand/Award/Letter popups: 内层div有es-stageup-overlay但应改为card
// 模式: overlay.innerHTML = '<div class="es-stageup-overlay" style="max-width:
c = c.split('<div class="es-stageup-overlay" style="max-width:').join('<div class="es-stageup-card" style="max-width:');

// 2. 统一关闭按钮: es-pop-btn + closeEntSimModal → primary + inline remove
c = c.split('class="es-pop-btn" onclick="window.closeEntSimModal()"').join('class="primary" onclick="var p=this.closest(\'.es-stageup-overlay\');if(p)p.remove();"');

// 3. 删除不再需要的 window.closeEntSimModal = function... 赋值
c = c.replace(/window\.closeEntSimModal = function\(\) \{ closeModalDirect\(overlay\);.*?\n  \}/g, '');
c = c.replace(/window\.closeEntSimModal = function\(\) \{ closeModalDirect\(overlay\); \}/g, '');

// 4. 内部 card 里的 h3 还没转完的全部清理
// 确保 card 内没有裸标签

// 5. 缩短 teammates 弹窗内容 - 在 showGenericEventPopup 中限制文字长度
var oldGen = 'function showGenericEventPopup(title, data) {\n  if (!data) return;\n  var text = data.t || data.text || \'\';';
var newGen = 'function showGenericEventPopup(title, data) {\n  if (!data) return;\n  var text = (data.t || data.text || \'\').slice(0, 200);';
if (c.includes(oldGen)) {
  c = c.replace(oldGen, newGen);
  console.log('Generic popup limited to 200 chars');
}

// 6. 修复弹窗结束标签：移除孤儿 closeEntSimModal 赋值
c = c.replace('closeModalDirect(overlay);', 'overlay.remove();');
c = c.replace('closeModalDirect(overlay)', 'overlay.remove()');

fs.writeFileSync('d:/SEVENTEEN/src/ent-sim/ui.js', c);
console.log('All popup structures fixed');
