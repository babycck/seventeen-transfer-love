fetch('https://babycck.github.io/seventeen-transfer-love/assets/index-CcRCytC_.js')
  .then(function(r) { return r.text(); })
  .then(function(t) {
    var idx = t.indexOf('BACKEND_URL');
    if (idx > -1) {
      console.log('BACKEND_URL FOUND at', idx);
      console.log('Content:', t.slice(idx, idx + 120));
    } else {
      console.log('BACKEND_URL NOT FOUND');
      console.log('File length:', t.length);
      var idx2 = t.indexOf('verifyToken');
      if (idx2 > -1) {
        console.log('But verifyToken found at', idx2);
      }
      var idx3 = t.indexOf('ADMIN_CODES');
      if (idx3 > -1) {
        console.log('ADMIN_CODES found at', idx3);
        console.log(t.slice(idx3, idx3 + 200));
      }
    }
  })
  .catch(function(e) { console.log('Error:', e.message); });
