fetch('https://babycck.github.io/seventeen-transfer-love/assets/index-CcRCytC_.js')
  .then(function(r) { return r.text(); })
  .then(function(t) {
    var keywords = ['ADMIN_CODES', 'SVT-ADMIN', 'verifyToken', 'seventeen-transfer-auth', 'activate', 'authScreen', 'auth_code'];
    keywords.forEach(function(kw) {
      var idx = t.indexOf(kw);
      if (idx > -1) {
        console.log('FOUND:', kw, 'at', idx, ':', t.slice(Math.max(0, idx - 30), idx + 60));
      }
    });
    console.log('---');
    console.log('Total file size:', t.length);
  })
  .catch(function(e) { console.log('Error:', e.message); });
