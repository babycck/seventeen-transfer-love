fetch('https://babycck.github.io/seventeen-transfer-love/assets/index-CcRCytC_.js')
  .then(function(r) { return r.text(); })
  .then(function(t) {
    var keywords = ['激活验证', '激活码', '激活码无效', 'verifyToken', 'renderAuth', 'init()', 'function init()'];
    keywords.forEach(function(kw) {
      var idx = t.indexOf(kw);
      if (idx > -1) {
        console.log('FOUND:', kw, 'at', idx);
        console.log('  context:', t.slice(Math.max(0, idx - 20), idx + 80));
      } else {
        console.log('NOT FOUND:', kw);
      }
    });
  })
  .catch(function(e) { console.log('Error:', e.message); });
