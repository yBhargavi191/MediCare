const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    });
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message = '', history = [] } = JSON.parse(body || '{}');
        const system = 'You are MediCare AI health assistant. Give safe, general health info in simple words. Never diagnose or prescribe. Always advise to call 112 (India) or local emergency in emergencies. Be concise, helpful.';
        const messages = [{ role: 'system', content: system }];
        for (const h of history) {
          if (h && h.role && h.content) messages.push(h);
        }
        if (message) messages.push({ role: 'user', content: message });
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ content: 'Missing OPENAI_API_KEY' }));
        }
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
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ content: reply }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ content: 'API error.' }));
      }
    });
    return;
  }
  // serve static files for dev if needed? but not required
  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log('chat api on', PORT);
});
