
// ==================== 提取待兑现约定 ====================
export function extractPendingPromises(summaryText) {
  var promises = [];
  var lines = summaryText.split('\n');
  var inPromises = false;
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (t.indexOf('待兑现约定') >= 0 || t.indexOf('约定') >= 0) {
      inPromises = true;
      continue;
    }
    if (inPromises) {
      if (t.startsWith('-') || t.startsWith('•') || t.match(/^\d+[\.、]/)) {
        promises.push(t.replace(/^[-•\d\.、\s]+/, '').trim());
      } else if (t === '' || t.indexOf('今日已揭示') >= 0 || t.indexOf('关键事件') >= 0) {
        inPromises = false;
      }
    }
  }
  return promises;
}

export function extractRevealedInfo(summaryText) {
  var info = [];
  var lines = summaryText.split('\n');
  var inInfo = false;
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (t.indexOf('今日已揭示信息') >= 0 || t.indexOf('已揭示') >= 0) {
      inInfo = true;
      continue;
    }
    if (inInfo) {
      if (t.startsWith('-') || t.startsWith('•') || t.match(/^\d+[\.、]/)) {
        info.push(t.replace(/^[-•\d\.、\s]+/, '').trim());
      } else if (t === '') {
        inInfo = false;
      }
    }
  }
  return info.join('\n');
}



