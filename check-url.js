fetch('https://babycck.github.io/seventeen-transfer-love/assets/index-CcRCytC_.js')
  .then(function(r) { return r.text(); })
  .then(function(t) {
    console.log('File size:', t.length);
    var keywords = ['workers.dev', 'generateLocalToken', 'local_admin', 'svt_auth', 'renderAuth', 'AUTH_TOKEN', 'authScreen'];
    keywords.forEach(function(kw) {
      var idx = t.indexOf(kw);
      if (idx > -1) {
        console.log('FOUND:', kw, 'at', idx, ctx(t, idx, 80));
      } else {
        console.log('NOT FOUND:', kw);
      }
    });
    function ctx(str, pos, len) {
      var start = Math.max(0, pos - 30);
      return str.slice(start, start + len);
    }
  })
  .catch(function(e) { console.log('Error:', e.message); });
