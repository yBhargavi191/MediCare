const functions = require('firebase-functions');
const fetch = require('node-fetch');

exports.apiChat = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  try {
    const { message = '', history = [] } = req.body || {};
    const system = 'You are MediCare AI health assistant. Give safe, general health info in simple words. Never diagnose or prescribe. Always advise to call 112 (India) or local emergency in emergencies. Be concise, helpful.';
    const messages = [{ role: 'system', content: system }];
    for (const h of history) {
      if (h && h.role && h.content) messages.push(h);
    }
    if (message) messages.push({ role: 'user', content: message });
    const apiKey = process.env.OPENAI_API_KEY || functions.config().openai?.key;
    if (!apiKey) return res.status(500).json({ content: 'Missing OPENAI_API_KEY' });
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: 250
      })
    });
    const data = await resp.json();
    const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content.trim() : 'Sorry, can you rephrase?';
    return res.json({ content: reply });
  } catch (e) {
    return res.status(500).json({ content: 'API error.' });
  }
});
