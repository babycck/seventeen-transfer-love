// ==================== UI 渲染 ====================
function renderAll() {
  var app = document.getElementById('app');
  if (GS.step < 5) {
    app.innerHTML = renderSetupWizard();
    bindSetupEvents();
  } else {
    app.innerHTML = renderGameScreen();
    bindGameEvents();
    scrollToLatestContent();
  }
}

function renderSetupWizard() {
  var html = '';

  if (GS.step === 1) {
    html = '<div class="setup-step"><h2>🔑 Step 1：API 设置</h2>' +
      '<p class="step-desc">输入你的 DeepSeek API Key 以启用 AI 剧情生成</p>' +
      '<label>API Key</label><input type="password" id="apiKeyInput" placeholder="sk-..." value="' + escHtml(GS.apiKey) + '">' +
      '<div style="display:flex;gap:6px;margin-top:6px">' +
      '<button class="btn-secondary" id="testApiBtn" style="flex:1">🔍 测试连接</button>' +
      '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;margin:0">' +
      '<input type="checkbox" id="aiEnabledCheck" ' + (GS.aiEnabled ? 'checked' : '') + '> 启用AI</label></div>' +
      '<div id="apiStatus" class="api-status hidden"></div>' +
      '<button class="btn-primary" id="step1Next">下一步 →</button></div>';
  } else if (GS.step === 2) {
    var hp = GS.heroineProfile;
    html = '<div class="setup-step"><h2>👩 Step 2：女主人设</h2>' +
      '<p class="step-desc">设定你的角色（设定后将只读）</p>' +
      '<label>姓名/昵称</label><input type="text" id="hpName" value="' + escHtml(hp.name) + '">' +
      '<label>年龄</label><input type="number" id="hpAge" value="' + hp.age + '" min="18" max="40">' +
      '<label>职业（自由填写）</label><input type="text" id="hpJob" value="' + escHtml(hp.job) + '">' +
      '<label>星座（可选）</label><div class="chip-row" id="zodiacChips">' +
      ZODIAC_SIGNS.map(function(s) {
        return '<span class="chip' + (hp.zodiac === s ? ' selected' : '') + '" data-val="' + s + '">' + s + '</span>';
      }).join('') + '</div>' +
      '<label>外貌特征（多选）</label><div class="chip-row" id="appearanceChips">' +
      APPEARANCE_TRAITS.map(function(s) {
        return '<span class="chip' + (hp.appearance.indexOf(s) >= 0 ? ' selected' : '') + '" data-val="' + s + '">' + s + '</span>';
      }).join('') + '</div>' +
      '<label>性格（多选）</label><div class="chip-row" id="personalityChips">' +
      PERSONALITY_TRAITS.map(function(s) {
        return '<span class="chip' + (hp.personality.indexOf(s) >= 0 ? ' selected' : '') + '" data-val="' + s + '">' + s + '</span>';
      }).join('') + '</div>' +
      '<label>MBTI</label><div class="chip-row" id="mbtiChips">' +
      MBTI_TYPES.map(function(s) {
        return '<span class="chip' + (hp.mbti === s ? ' selected' : '') + '" data-val="' + s + '">' + s + '</span>';
      }).join('') + '</div>' +
      '<label>私密体质（多选，可选）</label><div class="chip-row" id="privateChips">' +
      PRIVATE_TRAITS.map(function(s) {
        return '<span class="chip' + (hp.privateTraits.indexOf(s) >= 0 ? ' selected' : '') + '" data-val="' + s + '">' + s + '</span>';
      }).join('') + '</div>' +
      '<button class="btn-primary" id="step2Next">下一步 →</button>' +
      '<button class="btn-secondary" id="step2Back">← 返回</button></div>';
  } else if (GS.step === 3) {
    html = '<div class="setup-step"><h2>⭐ Step 3：选择成员</h2>' +
      '<p class="step-desc">从 13 位 SEVENTEEN 成员中选择 3 位参加节目 <small>（已选 ' + GS.selectedMembers.length + '/3）</small></p>' +
      '<div class="member-grid" id="memberGrid">' +
      MEMBERS.map(function(m) {
        var sel = GS.selectedMembers.indexOf(m.id) >= 0;
        return '<div class="member-chip' + (sel ? ' selected' : '') + '" data-id="' + m.id + '">' +
          m.emoji + '<br>' + m.name + '<br><small>' + m.stageName + '</small></div>';
      }).join('') + '</div>' +
      '<button class="btn-primary" id="step3Next" ' + (GS.selectedMembers.length !== 3 ? 'disabled' : '') + '>' +
      (GS.selectedMembers.length === 3 ? '下一步 →' : '请选择 3 位成员') + '</button>' +
      '<button class="btn-secondary" id="step3Back">← 返回</button></div>';
  } else if (GS.step === 4) {
    var selMembers = GS.selectedMembers.map(function(id) {
      return MEMBERS.find(function(m) { return m.id === id; });
    });
    html = '<div class="setup-step"><h2>💔 Step 4：标记秘密前任 X</h2>' +
      '<p class="step-desc">从 3 位成员中选择 1 位作为你的秘密前任（恋爱2年，分手1年）</p>' +
      '<div class="member-grid" id="xGrid">' +
      selMembers.map(function(m) {
        var isX = GS.secretX === m.id;
        return '<div class="member-chip' + (isX ? ' x-marked' : '') + '" data-id="' + m.id + '">' +
          m.emoji + '<br>' + m.name + '<br><small>' + (isX ? '💔 前任X' : '攻略对象') + '</small></div>';
      }).join('') + '</div>' +
      '<p style="color:#8b6b6b;font-size:11px;margin-top:6px">💡 其余2位成员各有场外女性X。X身份在节目中保密——当年是秘密恋爱，团内无人知晓。</p>' +
      '<button class="btn-primary" id="step4Start" ' + (!GS.secretX ? 'disabled' : '') + '>' +
      (GS.secretX ? '🎮 开始游戏！' : '请选择你的秘密前任') + '</button>' +
      '<button class="btn-secondary" id="step4Back">← 返回</button></div>';
  }

  return html;
}

function bindSetupEvents() {
  if (GS.step === 1) {
    document.getElementById('apiKeyInput').addEventListener('input', function() {
      GS.apiKey = this.value.trim();
      saveGame();
    });
    document.getElementById('aiEnabledCheck').addEventListener('change', function() {
      GS.aiEnabled = this.checked;
      saveGame();
    });
    document.getElementById('testApiBtn').addEventListener('click', async function() {
      var s = document.getElementById('apiStatus');
      s.classList.remove('hidden', 'success', 'error', 'testing');
      s.classList.add('testing');
      s.textContent = '⏳ 正在测试连接...';
      var ok = await testAPIConnection(GS.apiKey);
      s.classList.remove('testing');
      if (ok) {
        s.classList.add('success');
        s.textContent = '✅ 连接成功！API Key 有效';
      } else {
        s.classList.add('error');
        s.textContent = '❌ 连接失败，请检查 API Key';
      }
    });
    document.getElementById('step1Next').addEventListener('click', function() {
      if (!GS.apiKey.trim()) {
        alert('请输入 API Key');
        return;
      }
      GS.step = 2;
      saveGame();
      renderAll();
    });
  }

  if (GS.step === 2) {
    document.getElementById('hpName').addEventListener('input', function() {
      GS.heroineProfile.name = this.value;
      saveGame();
    });
    document.getElementById('hpAge').addEventListener('input', function() {
      GS.heroineProfile.age = parseInt(this.value) || 25;
      saveGame();
    });
    document.getElementById('hpJob').addEventListener('input', function() {
      GS.heroineProfile.job = this.value;
      saveGame();
    });
    bindChipGroup('zodiacChips', function(val) {
      GS.heroineProfile.zodiac = (GS.heroineProfile.zodiac === val) ? '' : val;
      saveGame();
    }, true);
    bindChipGroup('appearanceChips', function(val) {
      toggleArrayItem(GS.heroineProfile.appearance, val);
      saveGame();
    }, false);
    bindChipGroup('personalityChips', function(val) {
      toggleArrayItem(GS.heroineProfile.personality, val);
      saveGame();
    }, false);
    bindChipGroup('mbtiChips', function(val) {
      GS.heroineProfile.mbti = val;
      saveGame();
    }, true);
    bindChipGroup('privateChips', function(val) {
      toggleArrayItem(GS.heroineProfile.privateTraits, val);
      saveGame();
    }, false);
    document.getElementById('step2Next').addEventListener('click', function() {
      GS.step = 3;
      saveGame();
      renderAll();
    });
    document.getElementById('step2Back').addEventListener('click', function() {
      GS.step = 1;
      saveGame();
      renderAll();
    });
  }

  if (GS.step === 3) {
    document.querySelectorAll('#memberGrid .member-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        var id = this.dataset.id;
        if (GS.selectedMembers.indexOf(id) >= 0) {
          GS.selectedMembers = GS.selectedMembers.filter(function(x) { return x !== id; });
        } else if (GS.selectedMembers.length < 3) {
          GS.selectedMembers.push(id);
        }
        saveGame();
        renderAll();
      });
    });
    document.getElementById('step3Next').addEventListener('click', function() {
      if (GS.selectedMembers.length !== 3) return;
      GS.step = 4;
      GS.secretX = '';
      saveGame();
      renderAll();
    });
    document.getElementById('step3Back').addEventListener('click', function() {
      GS.step = 2;
      saveGame();
      renderAll();
    });
  }

  if (GS.step === 4) {
    document.querySelectorAll('#xGrid .member-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        GS.secretX = this.dataset.id;
        saveGame();
        renderAll();
      });
    });
    document.getElementById('step4Start').addEventListener('click', async function() {
      if (!GS.secretX) return;
      var otherMembers = GS.selectedMembers.filter(function(id) { return id !== GS.secretX; });
      GS.affection = {};
      GS.affection[GS.secretX] = randInt(35, 50);
      for (var i = 0; i < otherMembers.length; i++) {
        GS.affection[otherMembers[i]] = randInt(0, 5);
      }
      GS.step = 5;
      GS.day = 1;
      GS.phaseIndex = 0;
      GS.stayCount = 0;
      GS.phaseChoiceCount = 0;
      GS.todayFullText = [];
      GS.dailyFullTexts = [];
      GS.dailySummaries = [];
      GS.observerGuest = '';
      GS.observerGuestPrevious = '';
      GS.pendingDatingResult = null;
      GS.currentDatingPartner = null;
      GS.datingDiceResult = null;
      GS.day10ChosenDate = null;
      GS.pendingPromises = [];
      GS.todayRevealedInfo = '';
      GS.affectionLog = {};
      GS.prevRawText = '';
      GS.pendingMemoryReview = null;
      GS.drunkTrigger = null;
      GS.drunkRoundCount = 0;
      saveGame();
      renderAll();
      if (GS.aiEnabled) {
        await generateAllXArchives();
      } else {
        GS.xBackstory = 'AI未启用，X档案将在AI启用后生成。';
        saveGame();
      }
      await generatePhaseNarrative();
    });
    document.getElementById('step4Back').addEventListener('click', function() {
      GS.step = 3;
      saveGame();
      renderAll();
    });
  }
}

function bindChipGroup(containerId, callback, isSingle) {
  var c = document.getElementById(containerId);
  if (!c) return;
  c.querySelectorAll('.chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      var val = this.dataset.val;
      if (isSingle) {
        c.querySelectorAll('.chip').forEach(function(x) { x.classList.remove('selected'); });
        this.classList.add('selected');
      } else {
        this.classList.toggle('selected');
      }
      callback(val);
    });
  });
}

function toggleArrayItem(arr, val) {
  var idx = arr.indexOf(val);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(val);
}

// ==================== 游戏界面渲染 ====================
function renderGameScreen() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var phaseLabel = PHASE_LABELS[PHASES[GS.phaseIndex]];
  var isNight = GS.phaseIndex === 3;
  var hasConsequences = GS.consequenceNarratives.length > 0;
  var smsSent = GS.smsSentToday;
  var phaseChoicesExhausted = GS.phaseChoiceCount >= MAX_PHASE_CHOICES;
  // Day 11 不限制选项次数
  var isDay11 = GS.day === 11;
  var stayExhausted = GS.stayCount >= MAX_STAY_COUNT;
  var html = '';

  // Header
  html += '<div class="header">' +
    '<span class="day-badge">Day ' + GS.day + '</span>' +
    '<span class="phase-tag">' + phaseLabel + '</span>' +
    '<span class="affection-hint" id="affectionHint" title="点击查看好感度详情">' +
    members.map(function(m) { return getAffectionHint(m.id); }).join(' · ') +
    '</span>' +
    '<div class="header-btns">' +
    '<button id="helpBtn" title="规则速览">❓</button>' +
    '<button id="historyBtn" title="历史剧情回顾">📖</button>' +
    '<button id="xArchiveBtn" title="查看X档案">📋</button>' +
    '<button id="smsHistoryBtn" title="查看短信历史">📜</button>' +
    (GS.gifts && GS.gifts.length > 0 ? '<button id="giftBtn" title="小礼物">🎁</button>' : '') +
    '<button id="resetGameBtn" title="重置游戏">🔄</button>' +
    '</div></div>';

  // 记忆审查面板（非模态可折叠）- 仅在 pendingMemoryReview 存在时渲染
  if (GS.pendingMemoryReview) {
    var mr = GS.pendingMemoryReview;
    html += '<div class="memory-review-panel" id="memoryReviewPanel">' +
      '<div class="mr-toggle" id="mrToggle">' +
      '<span>📋 Day ' + mr.day + ' 记忆压缩摘要</span>' +
      '<span class="mr-status">待确认</span>' +
      '<span id="mrToggleIcon">▾</span>' +
      '</div>' +
      '<div class="mr-body" id="mrBody">' +
      '<textarea id="mrTextarea">' + escHtml(mr.summary) + '</textarea>' +
      '<div class="mr-actions">' +
      '<button class="btn-mr-recompress" id="mrRecompress">🔄 重新压缩</button>' +
      '<button class="btn-mr-confirm" id="mrConfirm">✅ 确认无误</button>' +
      '</div></div></div>';
  }

  // 叙事
  html += '<div class="card"><div class="narrative-box" id="narrativeBox">';
  if (GS.phaseNarrative) html += renderParsedNarrative(GS.parsedNarrative);
  for (var i = 0; i < GS.consequenceNarratives.length; i++) {
    html += '<div class="separator"></div>';
    html += renderParsedNarrative(GS.consequenceNarratives[i].parsed);
  }
  html += '</div></div>';

  // [P0-3] 真心话模式选项区（3轮制：轻度→中度→深度，每轮4人）
  if (GS.truthState && GS.truthState.active) {
    var ts = GS.truthState;
    var levelLabels = { light: '轻度', medium: '中度', deep: '深度' };
    var currentLevel = ts.round === 1 ? 'light' : ts.round === 2 ? 'medium' : 'deep';
    var drawerId = ts.drawerOrder[ts.subRound - 1];
    var isHeroineTurn = (drawerId === 'heroine');
    html += '<div class="card"><div class="options-area" id="optionsArea">';
    if (isHeroineTurn) {
      html += '<button class="option-btn" data-idx="0"><span class="opt-label">A</span>如实回答（自由输入）</button>';
      html += '<button class="option-btn" data-idx="1"><span class="opt-label">B</span>拒绝回答并喝酒（+1杯）</button>';
    } else {
      var dm = MEMBERS.find(function(m) { return m.id === drawerId; });
      var dname = dm ? dm.name : '嘉宾';
      html += '<button class="option-btn btn-special" data-idx="0"><span class="opt-label">▶</span>观看' + dname + '的回合</button>';
    }
    html += '<p style="font-size:10px;color:#8b6b6b;text-align:right;margin-top:4px">真心话第' + ts.round + '/3轮（' + levelLabels[currentLevel] + '）· 第' + ts.subRound + '/4人 · 当前：' + (isHeroineTurn ? '女主' : (dm ? dm.name : '嘉宾')) + '</p>';
    html += '</div></div>';
  } else {
    // 普通选项
    var opts = GS.currentOptions;
    if (opts.length > 0 && (!phaseChoicesExhausted || isDay11)) {
      html += '<div class="card"><div class="options-area" id="optionsArea">';
      var labels = ['A', 'B', 'C'];
      for (var j = 0; j < opts.length; j++) {
        var isSpecial = opts[j].text.indexOf('进入约会场景') >= 0;
        html += '<button class="option-btn' + (isSpecial ? ' btn-special' : '') + '" data-idx="' + j + '">' +
          '<span class="opt-label">' + (labels[j] || (j + 1)) + '</span>' +
          escHtml(opts[j].text) + '</button>';
      }
      if (!isDay11) {
        html += '<p style="font-size:10px;color:#8b6b6b;text-align:right;margin-top:4px">本时段剩余选项次数：' +
          (MAX_PHASE_CHOICES - GS.phaseChoiceCount) + '/' + MAX_PHASE_CHOICES + '</p>';
      } else if (!GS.truthState) {
        html += '<p style="font-size:10px;color:#8b6b6b;text-align:right;margin-top:4px">Day 11 真心话环节 · 不限制选项次数</p>';
      }
      html += '</div></div>';
    } else if (phaseChoicesExhausted && !isDay11 && !smsSent) {
      html += '<div class="card"><p style="text-align:center;color:#8b6b6b;font-size:13px">本时段选项次数已用完，请进入下一时段。</p></div>';
    }
  }

  // [P0-3] 真心话模式下 Action Bar 只显示重新生成
  if (GS.truthState && GS.truthState.active) {
    html += '<div class="card"><div class="action-bar" id="actionBar">';
    html += '<button class="btn-regenerate" id="btnRegenerate">🔄 重新生成本段</button>';
    html += '</div></div>';
  } else {
    // 普通 Action Bar
    html += '<div class="card"><div class="action-bar" id="actionBar">';
    if (!hasConsequences) {
      html += '<button class="btn-regenerate" id="btnRegenerate">🔄 重新生成本段</button>';
      if (!phaseChoicesExhausted || isDay11) {
        html += '<button class="btn-skip" id="btnSkip">▶ 跳过进入下一时段</button>';
      } else {
        html += '<button class="btn-skip" id="btnSkip" style="font-weight:900">▶ 进入下一时段</button>';
      }
      if (isNight && !smsSent) html += '<button class="btn-sms" id="btnSms">📨 发送心动短信</button>';
    } else {
      if (!isNight) {
        if (!phaseChoicesExhausted || isDay11) {
          html += '<button class="btn-skip" id="btnNextPhase">▶ 进入下一时段</button>';
        } else {
          html += '<button class="btn-skip" id="btnNextPhase" style="font-weight:900">▶ 进入下一时段</button>';
        }
        html += '<button class="btn-regenerate" id="btnRegenerate">🔄 重新生成本段</button>';
      } else {
        if (!smsSent) html += '<button class="btn-sms" id="btnSms">📨 发送心动短信</button>';
        html += '<button class="btn-regenerate" id="btnRegenerate">🔄 重新生成本段</button>';
      }
    }
    if (smsSent && isNight) {
      html += '<button class="btn-next-day" id="btnNextDay">✅ 确认进入下一天</button>';
      if (!stayExhausted) {
        html += '<button class="btn-continue" id="btnContinue">✍️ 继续今天（' + GS.stayCount + '/' + MAX_STAY_COUNT + '）</button>';
      }
    }
    html += '</div></div>';
  }

  // 自由输入
  var freeDisabled = (smsSent && isNight && stayExhausted);
  html += '<div class="card"><div class="free-input-area">' +
    '<input type="text" id="freeInput" placeholder="✍️ 自由输入你的行动/想法..." value="' +
    escHtml(GS.freeInput || '') + '"' + (freeDisabled ? ' disabled' : '') + '>' +
    '<button class="btn-save-input" id="btnSaveInput">💾</button>' +
    '<button class="btn-act-input" id="btnActInput"' + (freeDisabled ? ' disabled' : '') + '>✍️ 行动</button></div></div>';

  // 游戏结束
  if (GS.gameOver) {
    html += renderEndingScreen(members);
  }

  return html;
}

function renderParsedNarrative(parsed) {
  var html = '';

  // 新版：按 AI 返回的顺序依次渲染每个 block，采访间/成员采访间/X采访间会出现在正文对应位置
  if (parsed.blocks && parsed.blocks.length > 0) {
    for (var i = 0; i < parsed.blocks.length; i++) {
      var b = parsed.blocks[i];
      var content = (b.content || '').trim();
      if (!content) continue;

      if (b.type === 'narrative') {
        var paras = content.split('\n').filter(function(p) { return p.trim(); });
        for (var p = 0; p < paras.length; p++) {
          html += '<p>' + escHtml(paras[p]) + '</p>';
        }
      } else if (b.type === 'interview') {
        html += '<div class="interview">🎙 <strong>【采访间】</strong> ' + escHtml(content) + '</div>';
      } else if (b.type === 'xInterview') {
        html += '<div class="x-interview">🎙️💔 <strong>【X采访间】</strong> ' + escHtml(content) + '</div>';
      } else if (b.type === 'memberInterview') {
        html += '<div class="member-interview">🎤 ' + escHtml(content) + '</div>';
      } else if (b.type === 'directorOS') {
        var dlines = content.split('\n').filter(function(l) { return l.trim(); });
        for (var m = 0; m < dlines.length; m++) {
          html += '<div class="director-os">🎬 <strong>【导演OS】</strong> ' + escHtml(dlines[m]) + '</div>';
        }
      } else if (b.type === 'observerOS') {
        var olines = content.split('\n').filter(function(l) { return l.trim(); });
        for (var n = 0; n < olines.length; n++) {
          var formatted = olines[n].replace(
            /^(李龙真|金叡园|郑基锡|[\u4e00-\u9fa5]+)[：:]/,
            '<span class="obs-name">$1：</span>'
          );
          html += '<div class="observer-os">💭 ' + formatted + '</div>';
        }
      }
    }
    return html;
  }

  // 兼容旧存档：没有 blocks 时按字段聚合渲染（全部堆在底部）
  if (parsed.narrative) {
    var paras = parsed.narrative.split('\n').filter(function(p) { return p.trim(); });
    for (var ii = 0; ii < paras.length; ii++) {
      html += '<p>' + escHtml(paras[ii]) + '</p>';
    }
  }
  if (parsed.interviews && parsed.interviews.length > 0) {
    for (var j = 0; j < parsed.interviews.length; j++) {
      html += '<div class="interview">🎙 <strong>【采访间】</strong> ' + escHtml(parsed.interviews[j]) + '</div>';
    }
  }
  if (parsed.xInterviews && parsed.xInterviews.length > 0) {
    for (var k = 0; k < parsed.xInterviews.length; k++) {
      html += '<div class="x-interview">🎙️💔 <strong>【X采访间】</strong> ' + escHtml(parsed.xInterviews[k]) + '</div>';
    }
  }
  if (parsed.memberInterviews && parsed.memberInterviews.length > 0) {
    for (var l = 0; l < parsed.memberInterviews.length; l++) {
      html += '<div class="member-interview">🎤 ' + escHtml(parsed.memberInterviews[l]) + '</div>';
    }
  }
  if (parsed.directorOS) {
    var dlines2 = parsed.directorOS.split('\n').filter(function(l) { return l.trim(); });
    for (var mm = 0; mm < dlines2.length; mm++) {
      html += '<div class="director-os">🎬 <strong>【导演OS】</strong> ' + escHtml(dlines2[mm]) + '</div>';
    }
  }
  if (parsed.observerOS) {
    var olines2 = parsed.observerOS.split('\n').filter(function(l) { return l.trim(); });
    for (var nn = 0; nn < olines2.length; nn++) {
      var formatted2 = olines2[nn].replace(
        /^(李龙真|金叡园|郑基锡|[\u4e00-\u9fa5]+)[：:]/,
        '<span class="obs-name">$1：</span>'
      );
      html += '<div class="observer-os">💭 ' + formatted2 + '</div>';
    }
  }
  return html;
}

function renderEndingScreen(members) {
  var html = '<div class="card" style="text-align:center">' +
    '<h3 style="color:#c2185b">🎉 游戏结束</h3>' +
    '<p style="font-size:15px;margin:10px 0">你的最终选择：<strong>' + escHtml(GS.finalChoice) + '</strong></p>';

  html += '<p style="font-size:13px;margin:8px 0"><strong>最终好感度</strong></p>';
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var aff = GS.affection[m.id] || 0;
    html += '<p style="font-size:13px">' + m.emoji + ' ' + m.name + '：' + getAffectionDesc(aff) + ' ' + aff + '</p>';
  }

  if (GS.smsHistory.length > 0) {
    html += '<p style="font-size:13px;margin-top:8px"><strong>📨 短信统计</strong></p>';
    var smsCount = {};
    for (var s = 0; s < GS.smsHistory.length; s++) {
      var t = GS.smsHistory[s].name;
      smsCount[t] = (smsCount[t] || 0) + 1;
    }
    for (var name in smsCount) {
      html += '<p style="font-size:12px;color:#8b6b6b">发给 ' + escHtml(name) + '：' + smsCount[name] + '条</p>';
    }
    html += '<p style="font-size:12px;color:#8b6b6b">总计：' + GS.smsHistory.length + '条</p>';
  }

  html += '<button class="btn-primary" id="btnRestart" style="max-width:180px;margin:8px auto">🔄 重新开始</button></div>';
  return html;
}

function bindGameEvents() {
  // 记忆审查面板事件
  var mrToggle = document.getElementById('mrToggle');
  if (mrToggle) {
    mrToggle.addEventListener('click', function() {
      var body = document.getElementById('mrBody');
      var icon = document.getElementById('mrToggleIcon');
      if (body) {
        body.classList.toggle('hidden');
        if (icon) icon.textContent = body.classList.contains('hidden') ? '▸' : '▾';
      }
    });
  }

  var mrConfirm = document.getElementById('mrConfirm');
  if (mrConfirm) {
    mrConfirm.addEventListener('click', async function() {
      var editedSummary = (document.getElementById('mrTextarea') || {}).value || '';
      if (editedSummary.trim()) {
        GS.dailySummaries.push(editedSummary.trim());
        GS.pendingPromises = extractPendingPromises(editedSummary);
        GS.todayRevealedInfo = extractRevealedInfo(editedSummary);
      }
      GS.pendingMemoryReview = null;
      saveGame();
      renderAll();
      if (GS.day === 10) showDay10DatingModal();
      else await generatePhaseNarrative();
    });
  }

  var mrRecompress = document.getElementById('mrRecompress');
  if (mrRecompress) {
    mrRecompress.addEventListener('click', async function() {
      showLoading('正在重新压缩...');
      var newSummary = await compressTodayToSummary();
      hideLoading();
      if (GS.pendingMemoryReview) {
        GS.pendingMemoryReview.summary = newSummary;
        saveGame();
        renderAll();
      }
    });
  }

  document.querySelectorAll('#optionsArea .option-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var idx = parseInt(this.dataset.idx);

      // [P0-3] 真心话模式选项处理（3轮制）
      if (GS.truthState && GS.truthState.active) {
        var ts = GS.truthState;
        var drawerId = ts.drawerOrder[ts.subRound - 1];
        var isHeroineTurn = (drawerId === 'heroine');
        var optText = '';
        if (isHeroineTurn) {
          optText = idx === 0 ? '如实回答' : '拒绝回答并喝酒';
        } else {
          optText = '观看' + (MEMBERS.find(function(m){return m.id===drawerId})||{}).name + '的回合';
        }
        document.querySelectorAll('#optionsArea .option-btn').forEach(function(b) { b.disabled = true; });
        await handleTruthRound({ text: optText });
        return;
      }

      var opt = GS.currentOptions[idx];
      if (!opt) return;

      // 处理「进入约会场景」按钮
      if (opt.text.indexOf('进入约会场景') >= 0) {
        document.querySelectorAll('#optionsArea .option-btn').forEach(function(b) { b.disabled = true; });
        GS.phaseIndex = 1; // 跳到下午
        resetPhaseState();
        saveGame();
        renderAll();
        await generatePhaseNarrative();
        return;
      }

      document.querySelectorAll('#optionsArea .option-btn').forEach(function(b) { b.disabled = true; });
      await handleOptionChoice(opt);
    });
  });

  var regenBtn = document.getElementById('btnRegenerate');
  if (regenBtn) {
    regenBtn.addEventListener('click', async function() {
      this.disabled = true;
      await handleRegenerate();
      this.disabled = false;
    });
  }

  var skipBtn = document.getElementById('btnSkip') || document.getElementById('btnNextPhase');
  if (skipBtn) {
    skipBtn.addEventListener('click', async function() {
      this.disabled = true;
      await advancePhase();
      this.disabled = false;
    });
  }

  var smsBtn = document.getElementById('btnSms');
  if (smsBtn) smsBtn.addEventListener('click', function() { showSmsModal(); });

  var nextDayBtn = document.getElementById('btnNextDay');
  if (nextDayBtn) {
    nextDayBtn.addEventListener('click', async function() {
      this.disabled = true;
      await goToNextDay();
      this.disabled = false;
    });
  }

  var contBtn = document.getElementById('btnContinue');
  if (contBtn) {
    contBtn.addEventListener('click', async function() {
      this.disabled = true;
      await continueToday();
      this.disabled = false;
    });
  }

  var xBtn = document.getElementById('xArchiveBtn');
  if (xBtn) xBtn.addEventListener('click', showXArchiveModal);

  var smsHistBtn = document.getElementById('smsHistoryBtn');
  if (smsHistBtn) smsHistBtn.addEventListener('click', showSmsHistoryModal);

  // [P0-2] 小礼物面板
  var giftBtn = document.getElementById('giftBtn');
  if (giftBtn) giftBtn.addEventListener('click', showGiftPanel);

  var historyBtn = document.getElementById('historyBtn');
  if (historyBtn) historyBtn.addEventListener('click', showHistoryModal);

  var helpBtn = document.getElementById('helpBtn');
  if (helpBtn) helpBtn.addEventListener('click', showHelpModal);

  var resetBtn = document.getElementById('resetGameBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetGame);

  var affHint = document.getElementById('affectionHint');
  if (affHint) affHint.addEventListener('click', showAffectionPanel);

  var saveInputBtn = document.getElementById('btnSaveInput');
  if (saveInputBtn) {
    saveInputBtn.addEventListener('click', function() {
      GS.freeInput = (document.getElementById('freeInput') || {}).value || '';
      saveGame();
      alert('✅ 已保存');
    });
  }

  var actInputBtn = document.getElementById('btnActInput');
  if (actInputBtn) {
    actInputBtn.addEventListener('click', async function() {
      var inputText = ((document.getElementById('freeInput') || {}).value || '').trim();
      if (!inputText) {
        alert('请先输入你的行动或想法');
        return;
      }
      this.disabled = true;
      await handleFreeAction(inputText);
      this.disabled = false;
    });
  }

  var restartBtn = document.getElementById('btnRestart');
  if (restartBtn) {
    restartBtn.addEventListener('click', function() {
      GS = defaultGameState();
      saveGame();
      renderAll();
    });
  }
}

function scrollToLatestContent() {
  setTimeout(function() {
    var box = document.getElementById('narrativeBox');
    if (!box) return;
    var separators = box.querySelectorAll('.separator');
    if (separators.length > 0) {
      separators[separators.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      box.scrollTop = box.scrollHeight;
    }
  }, 100);
}

// ==================== 每日插图提示词弹窗 ====================
async function showImagePromptModal(summaryText) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var promptText = '正在生成画面描述...';
  var inner = '<div class="modal-content" style="text-align:center">' +
    '<h3>📸 Day ' + GS.day + ' 剧情插图</h3>' +
    '<p style="font-size:12px;color:#8b6b6b;margin-bottom:10px">以下画面描述可复制到即梦、通义万相、Midjourney等工具生成插图。<br>建议上传对应成员的真人照片作为参考图。</p>' +
    '<textarea id="imagePromptText" style="min-height:120px;font-size:12px;text-align:left" readonly>' + escHtml(promptText) + '</textarea>' +
    '<button class="btn-copy" id="imgCopyBtn">📋 一键复制</button>' +
    '<button class="btn-confirm" id="imgSkipBtn" style="background:linear-gradient(135deg,#e91e63,#f06292);margin-top:6px">✅ 跳过，进入 Day ' + GS.day + '</button>' +
    '</div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  if (GS.aiEnabled) {
    try {
      var hp = GS.heroineProfile;
      var members = GS.selectedMembers.map(function(id) {
        return MEMBERS.find(function(m) { return m.id === id; });
      });
      var memberAppearances = members.map(function(m) {
        return m.name + '——' + m.appearance;
      }).join('；');
      var imgPrompt = await callDeepSeek(
        '你是图像提示词生成助手。基于以下恋爱综艺剧情摘要，生成一条中文画面描述（用于AI图片生成工具如即梦、通义万相）。\n要求：\n- 描述今日最有画面感的一个场景\n- 包含女主外貌特征（' + hp.appearance.join('、') + '）\n- 包含涉及成员的外貌特征\n- 韩剧电影感美学，暖色调，浅景深\n- 不超过80字\n- 只输出描述本身，不加任何说明',
        '今日剧情摘要：' + summaryText + '\n\n成员外貌参考：' + memberAppearances + '\n\n请生成中文画面描述。',
        TOKEN_CONFIG.imagePrompt
      );
      var ta = document.getElementById('imagePromptText');
      if (ta) ta.value = imgPrompt.trim();
    } catch (e) {
      var ta = document.getElementById('imagePromptText');
      if (ta) ta.value = '（生成失败，请手动描述你想要的画面）';
    }
  }

  overlay.querySelector('#imgCopyBtn').addEventListener('click', function() {
    var ta = document.getElementById('imagePromptText');
    if (ta) {
      ta.select();
      try {
        navigator.clipboard.writeText(ta.value);
        alert('✅ 已复制到剪贴板！');
      } catch (e) {
        alert('⚠️ 复制失败，请手动选择复制。');
      }
    }
  });

  overlay.querySelector('#imgSkipBtn').addEventListener('click', function() {
    overlay.remove();
    if (GS.day === 10) showDay10DatingModal();
    else generatePhaseNarrative();
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
}

// ==================== 骰子弹窗 ====================
function showDatingDiceModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content" style="text-align:center">' +
    '<h3>🎲 Day ' + GS.day + ' · 约会配对</h3>' +
    '<p style="color:#8b6b6b;font-size:13px;margin-bottom:14px">投出骰子，决定今天的约会对象</p>' +
    '<div class="dice-area">' +
    '<div class="dice-box" id="diceBox">?</div>' +
    '<p class="dice-result hidden" id="diceResult"></p>' +
    '</div>' +
    '<button class="btn-confirm" id="diceRollBtn" style="max-width:200px;margin:0 auto">🎲 投骰子</button>' +
    '<button class="btn-confirm hidden" id="diceConfirmBtn" style="max-width:200px;margin:8px auto 0">✅ 确认，开始约会</button>' +
    '</div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  var diceRolled = false;

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay && !diceRolled) overlay.remove();
  });

  overlay.querySelector('#diceRollBtn').addEventListener('click', function() {
    this.disabled = true;
    var diceBox = document.getElementById('diceBox');
    diceBox.classList.add('rolling');

    setTimeout(function() {
      var result = rollDatingDice();
      diceBox.classList.remove('rolling');
      diceBox.textContent = result.roll;
      GS.datingDiceResult = result;

      var dateMember = MEMBERS.find(function(m) { return m.id === result.partner; });
      var resultEl = document.getElementById('diceResult');
      resultEl.innerHTML = '🎲 骰子点数 <strong>' + result.roll + '</strong> → 约会对象：<strong>' +
        dateMember.emoji + ' ' + dateMember.name + '</strong><br>' +
        '<span style="font-size:12px;color:#8b6b6b">命运选择了' + dateMember.name + '作为你今天的约会对象</span>';
      resultEl.classList.remove('hidden');

      document.getElementById('diceConfirmBtn').classList.remove('hidden');
      diceRolled = true;
      saveGame();
    }, 700);
  });

  overlay.querySelector('#diceConfirmBtn').addEventListener('click', async function() {
    overlay.remove();
    await generatePhaseNarrative();
  });
}

// ==================== Day 10 约会选择弹窗 ====================
function showDay10DatingModal() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>👆 Day 10 · 指定约会对象</h3>' +
    '<p style="color:#8b6b6b;font-size:12px;margin-bottom:12px">今天是自由约会日——由你来指定跟谁约会。请选择：</p>' +
    '<div class="sms-target-options">';
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var isX = m.id === GS.secretX;
    inner += '<button class="sms-target-btn" data-id="' + m.id + '" style="font-size:15px;padding:14px">' +
      m.emoji + ' ' + m.name + '（' + m.stageName + '）' + (isX ? ' 💔' : '') + '</button>';
  }
  inner += '</div></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.sms-target-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var chosenId = this.dataset.id;
      overlay.remove();
      GS.day10ChosenDate = chosenId;
      saveGame();
      await generatePhaseNarrative();
    });
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
}

// ==================== 短信系统 ====================
async function sendSms(targetId, smsContent) {
  var targetMember = MEMBERS.find(function(m) { return m.id === targetId; });
  GS.smsSentToday = true;
  GS.smsTarget = targetId;
  GS.smsDrafts = [];
  GS.smsHistory.push({
    day: GS.day,
    target: targetId,
    name: targetMember.name,
    content: smsContent
  });

  updateAffection(targetId, 5);
  addAffectionLog(targetId, 5, '你发送了心动短信给' + targetMember.name);

  var otherIds = GS.selectedMembers.filter(function(id) { return id !== targetId; });
  for (var i = 0; i < otherIds.length; i++) {
    var delta = -randInt(1, 2);
    var om = MEMBERS.find(function(m) { return m.id === otherIds[i]; });
    updateAffection(otherIds[i], delta);
    addAffectionLog(otherIds[i], delta, '未收到短信');
  }

  if (!GS.aiEnabled) {
    saveGame();
    renderAll();
    return;
  }

  showLoading('正在发送短信...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('sms', {
      targetName: targetMember.name,
      smsContent: smsContent
    });
    var rawText = await callDeepSeek(sysPrompt, userMsg, TOKEN_CONFIG.sms);
    var parsed = parseNarrative(rawText);
    parsed.options = [];
    GS.consequenceNarratives.push({ rawText: rawText, parsed: parsed });
    GS.currentOptions = [];
    GS.todayFullText.push(rawText);
    saveGame();
    renderAll();
  } catch (e) {
    alert('⚠️ 短信生成失败：' + e.message + '\n请点击刷新按钮重试。');
  }
  hideLoading();
}

async function continueToday() {
  if (GS.stayCount >= MAX_STAY_COUNT) {
    alert('⚠️ 今日继续次数已用完（' + MAX_STAY_COUNT + '/' + MAX_STAY_COUNT + '）。');
    return;
  }
  GS.stayCount++;

  if (!GS.aiEnabled) {
    alert('⚠️ AI 未启用，请先启用 AI。');
    return;
  }

  showLoading('正在生成延伸剧情...');
  try {
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('stay');
    var rawText = await callDeepSeek(sysPrompt, userMsg, TOKEN_CONFIG.stay);
    var parsed = parseNarrative(rawText);
    GS.consequenceNarratives.push({ rawText: rawText, parsed: parsed });
    GS.currentOptions = parsed.options;
    GS.todayFullText.push(rawText);
    saveGame();
    renderAll();
  } catch (e) {
    alert('⚠️ 生成失败：' + e.message + '\n请点击刷新按钮重试。');
  }
  hideLoading();
}

// ==================== 弹窗 ====================
function showSmsModal() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var isEarlyGame = GS.day <= 7;
  var availableMembers = isEarlyGame ?
    members.filter(function(m) { return m.id !== GS.secretX; }) :
    members;
  var drafts = GS.smsDrafts.length > 0 ? GS.smsDrafts : [
    '今天和你聊天很开心。',
    '谢谢你今天的陪伴。',
    '晚安，明天见。'
  ];
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>📨 发送心动短信</h3>' +
    '<p style="color:#8b6b6b;font-size:11px;margin-bottom:8px">' +
    (isEarlyGame ? 'Day 1-7 不能发给X' : 'Day 8-11 可以发给X') + '</p>' +
    '<p style="font-size:12px;color:#c2185b;margin-bottom:8px">选择短信内容：</p>' +
    '<div class="sms-draft-list">';
  for (var i = 0; i < drafts.length; i++) {
    inner += '<button class="sms-draft-btn" data-idx="' + i + '">' +
      (i + 1) + '. ' + escHtml(drafts[i]) + '</button>';
  }
  inner += '</div>' +
    '<p style="font-size:12px;color:#c2185b;margin:8px 0">或自己写：</p>' +
    '<textarea class="sms-custom-input" id="smsCustomInput" placeholder="输入你想说的话...（可选）"></textarea>' +
    '<p style="font-size:12px;color:#c2185b;margin:8px 0" id="smsTargetLabel" class="hidden">选择发送对象：</p>' +
    '<div class="sms-target-options hidden" id="smsTargets">';
  for (var j = 0; j < availableMembers.length; j++) {
    var m = availableMembers[j];
    inner += '<button class="sms-target-btn" data-id="' + m.id + '">' +
      m.emoji + ' ' + m.name + (m.id === GS.secretX ? ' 💔' : '') + '</button>';
  }
  inner += '</div><button class="modal-close" id="smsCancel">取消</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  var selectedDraft = '';
  overlay.querySelectorAll('.sms-draft-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.sms-draft-btn').forEach(function(b) { b.classList.remove('selected'); });
      this.classList.add('selected');
      selectedDraft = drafts[parseInt(this.dataset.idx)];
      document.getElementById('smsTargetLabel').classList.remove('hidden');
      document.getElementById('smsTargets').classList.remove('hidden');
    });
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#smsCancel').addEventListener('click', function() {
    overlay.remove();
  });

  overlay.querySelectorAll('.sms-target-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var customText = (document.getElementById('smsCustomInput') || {}).value || '';
      var finalText = customText.trim() || selectedDraft;
      if (!finalText) {
        alert('请选择短信草稿或输入自定义内容');
        return;
      }
      var targetId = this.dataset.id;
      overlay.remove();
      await sendSms(targetId, finalText);
    });
  });
}

function showXArchiveModal() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var xMember = members.find(function(m) { return m.id === GS.secretX; });
  var otherMembers = members.filter(function(m) { return m.id !== GS.secretX; });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>📋 X 关系档案</h3>' +
    '<p><span class="x-member-name">💔 ' + escHtml(GS.heroineProfile.name) + ' ↔ ' +
    escHtml(xMember.name) + '（' + escHtml(xMember.stageName) + '）· 场内X</span></p>' +
    '<p>' + (GS.xBackstory || '档案生成中...').replace(/\n/g, '<br>') + '</p>' +
    '<hr style="border-color:#f0d0d0;margin:10px 0">';
  for (var i = 0; i < otherMembers.length; i++) {
    var om = otherMembers[i];
    inner += '<p><span class="x-member-name">' + om.emoji + ' ' +
      escHtml(om.name) + '（' + escHtml(om.stageName) + '）↔ 场外X（女性）</span></p>' +
      '<p>' + (GS.memberXBackstories[om.id] || '档案生成中...').replace(/\n/g, '<br>') + '</p>' +
      '<hr style="border-color:#f0d0d0;margin:10px 0">';
  }
  inner += '<button class="modal-close" id="xArchiveClose">关闭</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('#xArchiveClose').addEventListener('click', function() {
    overlay.remove();
  });
}

// [P2-7] X 记忆物品展示弹窗
function showXItemsModal() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>📦 X 记忆物品</h3>' +
    '<p style="font-size:12px;color:#8b6b6b;margin-bottom:10px">制作组公开了以下与X相关的记忆物品：</p>';
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var items = GS.xItems[m.id];
    if (items) {
      inner += '<div style="background:#fff5f5;border-radius:10px;padding:10px;margin-bottom:8px">' +
        '<p style="font-weight:700;font-size:14px;margin-bottom:4px">' + m.emoji + ' ' + escHtml(m.name) + '</p>' +
        '<p style="font-size:12px;color:#5d3a3a;white-space:pre-wrap">' + escHtml(items).replace(/\n/g, '<br>') + '</p></div>';
    }
  }
  inner += '<button class="modal-close" id="xItemsClose">关闭</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('#xItemsClose').addEventListener('click', function() {
    overlay.remove();
  });
}

function showSmsHistoryModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>📜 短信历史</h3>';
  if (GS.smsHistory.length === 0) {
    inner += '<p style="color:#8b6b6b;text-align:center;padding:20px 0">暂无已发送的短信</p>';
  } else {
    for (var i = GS.smsHistory.length - 1; i >= 0; i--) {
      var sms = GS.smsHistory[i];
      inner += '<div style="background:#fff5f5;border-radius:10px;padding:10px;margin-bottom:8px">' +
        '<p style="font-size:11px;color:#8b6b6b;margin-bottom:4px">Day ' + sms.day + ' · 发给 <strong>' +
        escHtml(sms.name) + '</strong></p>' +
        '<p style="font-size:13px;color:#5d3a3a">' + escHtml(sms.content) + '</p></div>';
    }
  }
  inner += '<button class="modal-close" id="smsHistoryClose">关闭</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('#smsHistoryClose').addEventListener('click', function() {
    overlay.remove();
  });
}

// [P0-2] 小礼物面板
function showGiftPanel() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>🎁 小礼物</h3>';
  if (GS.gifts.length === 0) {
    inner += '<p style="color:#8b6b6b;text-align:center;padding:20px 0">暂无礼物</p>';
  } else {
    inner += '<p style="font-size:12px;color:#8b6b6b;margin-bottom:8px">选择一份礼物送给谁：</p>';
    for (var i = 0; i < GS.gifts.length; i++) {
      var g = GS.gifts[i];
      inner += '<div style="background:#fff5f5;border-radius:10px;padding:10px;margin-bottom:8px">' +
        '<p style="font-weight:700;font-size:13px;margin-bottom:4px">' + escHtml(g.name) + '</p>' +
        '<p style="font-size:11px;color:#8b6b6b;margin-bottom:6px">' + escHtml(g.desc) + '</p>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">';
      for (var j = 0; j < members.length; j++) {
        var m = members[j];
        inner += '<button class="sms-target-btn" data-gift-idx="' + i + '" data-member-id="' + m.id + '">' +
          m.emoji + ' ' + m.name + '</button>';
      }
      inner += '</div></div>';
    }
  }
  inner += '<button class="modal-close" id="giftPanelClose">关闭</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('#giftPanelClose').addEventListener('click', function() {
    overlay.remove();
  });

  overlay.querySelectorAll('[data-gift-idx]').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var giftIdx = parseInt(this.dataset.giftIdx);
      var memberId = this.dataset.memberId;
      overlay.remove();
      await sendGift(memberId, giftIdx);
    });
  });
}

async function sendGift(memberId, giftIdx) {
  var gift = GS.gifts[giftIdx];
  if (!gift) return;
  var member = MEMBERS.find(function(m) { return m.id === memberId; });
  if (!member) return;

  showLoading('正在生成送礼剧情...');
  try {
    var sysPrompt = '你是《换乘恋爱》的短篇剧情生成AI。请根据以下信息，写一段约300字的送礼反应剧情。' +
      '女主把「' + gift.name + '」送给了' + member.name + '。' +
      '写出他的即时反应、对话、以及女主的感受。' +
      '只输出正文，不要写选项、不要写采访间、不要写导演OS、不要写观察员OS。';
    var reaction = await callDeepSeek(sysPrompt, '生成送礼剧情', 800);

    // 追加到当前叙事
    GS.phaseNarrative += '\n\n🎁 【送礼剧情】\n' + reaction;
    var parsed = parseNarrative(GS.phaseNarrative);
    GS.parsedNarrative = parsed;
    GS.currentOptions = parsed.options;

    // 好感度
    var bonus = 5;
    if (gift.type === 'food' && (member.id === 'mingyu' || member.id === 'dk')) bonus += 3;
    updateAffection(memberId, bonus);
    addAffectionLog(memberId, bonus, '收到礼物「' + gift.name + '」');

    // 未收到礼物的成员 -0~1（简单处理：随机0或-1）
    var otherMembers = GS.selectedMembers.filter(function(id) { return id !== memberId; });
    for (var i = 0; i < otherMembers.length; i++) {
      if (Math.random() < 0.5) {
        updateAffection(otherMembers[i], -1);
        addAffectionLog(otherMembers[i], -1, '看到你送了礼物给别人');
      }
    }

    // 移除已使用的礼物
    GS.gifts.splice(giftIdx, 1);
    saveGame();
    renderAll();
  } catch (e) {
    alert('⚠️ 送礼剧情生成失败：' + e.message);
  }
  hideLoading();
}

// [P1-4] 非阻塞 Toast 提示
function showToast(message) {
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
    'background:#333;color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;' +
    'z-index:3000;opacity:0;transition:opacity .3s;box-shadow:0 2px 8px rgba(0,0,0,.2);';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(function() { toast.style.opacity = '1'; });
  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { toast.remove(); }, 300);
  }, 2000);
}

// ==================== 历史剧情回顾面板 ====================
function showHistoryModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  var inner = '<div class="modal-content" style="width:520px;max-width:98vw"><h3>📖 历史剧情回顾</h3>';

  var totalDays = GS.dailyFullTexts.length;
  if (totalDays === 0) {
    inner += '<p style="color:#8b6b6b;text-align:center;padding:20px 0">暂无历史剧情（当前为 Day 1）</p>';
  } else {
    inner += '<div class="history-tabs" id="historyTabs">';
    for (var d = 0; d < totalDays; d++) {
      inner += '<button class="history-tab' + (d === totalDays - 1 ? ' active' : '') +
        '" data-day="' + d + '">Day ' + (d + 1) + '</button>';
    }
    inner += '</div><div class="history-content" id="historyContent"></div>';
  }

  inner += '<button class="modal-close" id="historyClose">关闭</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  function showDayContent(dayIdx) {
    var content = document.getElementById('historyContent');
    if (!content) return;
    var texts = GS.dailyFullTexts[dayIdx] || [];
    var html = '';
    for (var i = 0; i < texts.length; i++) {
      var parsed = parseNarrative(texts[i]);
      html += renderParsedNarrative(parsed);
      if (i < texts.length - 1) html += '<div class="separator"></div>';
    }
    content.innerHTML = html;
  }

  if (totalDays > 0) showDayContent(totalDays - 1);

  overlay.querySelectorAll('.history-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      overlay.querySelectorAll('.history-tab').forEach(function(t) { t.classList.remove('active'); });
      this.classList.add('active');
      showDayContent(parseInt(this.dataset.day));
    });
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('#historyClose').addEventListener('click', function() {
    overlay.remove();
  });
}

// ==================== 规则速览面板 ====================
function showHelpModal() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var xMember = members.find(function(m) { return m.id === GS.secretX; });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content" style="width:500px;max-width:98vw"><h3>❓ 规则速览</h3>' +
    '<div style="font-size:12px;line-height:1.8;color:#5d3a3a">' +
    '<p><strong>📅 当前：Day ' + GS.day + ' · ' + PHASE_LABELS[PHASES[GS.phaseIndex]] + '</strong></p>' +
    '<p><strong>💔 你的X：</strong>' + xMember.emoji + ' ' + xMember.name + '（秘密恋爱2年，分手1年，团内无人知晓）</p>' +
    '<p><strong>📨 短信规则：</strong>' + (GS.day <= 7 ? 'Day 1-7 不能发给X，可选另外2位成员' : 'Day 8-11 可以发给X，可选全部3位成员') + '</p>' +
    '<p><strong>🎲 约会配对：</strong>Day 4/5/8 由你投骰子决定约会对象；Day 9 强制X约会；Day 10 由你指定</p>' +
    '<p><strong>📋 关键日程：</strong></p>' +
    '<p style="margin-left:12px">Day 1：入住 + 傍晚读X介绍信</p>' +
    '<p style="margin-left:12px">Day 3：每人说一个故事</p>' +
    '<p style="margin-left:12px">Day 4：第一次约会配对 + 第一批X记忆公开</p>' +
    '<p style="margin-left:12px">Day 6：第二批X记忆公开</p>' +
    '<p style="margin-left:12px">Day 9：X约会日（情感高潮）</p>' +
    '<p style="margin-left:12px">Day 11：真心话环节</p>' +
    '<p style="margin-left:12px">Day 12：最终选择（复合 or 换乘）</p>' +
    '<p><strong>✍️ 选项限制：</strong>每时段最多选择' + MAX_PHASE_CHOICES + '次选项（含自由输入），超过后自动进入下一时段。Day 11 不限制。</p>' +
    '<p><strong>🌙 继续今天：</strong>深夜短信后可继续' + MAX_STAY_COUNT + '次（含自由输入）</p>' +
    (GS.heroineProfile.privateTraits.length > 0 ? '<p><strong>⚠️ 私密体质：</strong>' + GS.heroineProfile.privateTraits.join('、') + '</p>' : '') +
    '</div>' +
    '<button class="modal-close" id="helpClose">关闭</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('#helpClose').addEventListener('click', function() {
    overlay.remove();
  });
}

// ==================== 好感度面板 ====================
function showAffectionPanel() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content" style="width:480px;max-width:98vw"><h3>💕 好感度面板</h3>';
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var aff = GS.affection[m.id] || 0;
    var logs = GS.affectionLog[m.id] || [];
    inner += '<div style="background:#fff5f5;border-radius:12px;padding:12px;margin-bottom:10px">' +
      '<p style="font-weight:700;font-size:15px;margin-bottom:6px">' +
      m.emoji + ' ' + m.name + ' <span style="font-size:18px">' + getAffectionDesc(aff) + '</span> ' +
      '<span style="font-size:13px;color:#8b6b6b">' + aff + '</span></p>';
    if (logs.length === 0) {
      inner += '<p style="font-size:12px;color:#8b6b6b">（暂无变化记录）</p>';
    } else {
      var recentLogs = logs.slice(-3);
      for (var j = recentLogs.length - 1; j >= 0; j--) {
        var log = recentLogs[j];
        var changeClass = log.change > 0 ? 'aff-change-pos' : 'aff-change-neg';
        inner += '<div class="aff-log-item">Day ' + log.day + ' ' + log.phase + '：' +
          '<span class="' + changeClass + '">' + (log.change > 0 ? '+' : '') + log.change + '</span> ' +
          escHtml(log.reason) + ' <span class="aff-total">→ ' + log.total + '</span></div>';
      }
    }
    inner += '</div>';
  }
  inner += '<button class="modal-close" id="affPanelClose">关闭</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('#affPanelClose').addEventListener('click', function() {
    overlay.remove();
  });
}
