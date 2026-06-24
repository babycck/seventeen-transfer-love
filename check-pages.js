fetch('https://babycck.github.io/seventeen-transfer-love/')
  .then(function(r) { return r.text(); })
  .then(function(t) {
    var matches = t.match(/src\=\"([^\"]+\.js[^\"]*)\"/g);
    if (matches) {
      matches.forEach(function(x) { console.log(x); });
    } else {
      console.log('No script src found');
    }
    console.log('---');
    var idx = t.indexOf('BACKEND_URL');
    if (idx > -1) {
      console.log('HAS BACKEND_URL:', t.slice(idx, idx + 80));
    } else {
      var idx2 = t.indexOf('auth');
      if (idx2 > -1) {
        console.log('Has auth at', idx2, ':', t.slice(idx2 - 20, idx2 + 60));
      } else {
        console.log('No auth in HTML. Length:', t.length);
        console.log('First 500 chars:', t.slice(0, 500));
      }
    }
  })
  .catch(function(e) { console.log('Error:', e.message); });
