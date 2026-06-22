// ==================== API 调用 ====================
async function callDeepSeek(systemPrompt, userMessage, maxTokens) {
  maxTokens = maxTokens || 6000;
  // [P0-1] 更换 API endpoint 与模型
  var resp = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GS.apiKey
    },
    body: JSON.stringify({
      model: API_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: maxTokens,
      temperature: 0.85
    })
  });
  if (!resp.ok) {
    var err = await resp.text();
    throw new Error('API ' + resp.status + ': ' + err);
  }
  var data = await resp.json();
  return data.choices[0].message.content;
}

async function testAPIConnection(apiKey) {
  try {
    // [P0-1] 使用新 endpoint 做连通性测试
    var resp = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: API_MODEL,
        messages: [{ role: 'user', content: '请回复"连接成功"' }],
        max_tokens: 10,
        temperature: 0
      })
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}
