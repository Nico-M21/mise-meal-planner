const https = require('https');
const http = require('http');

function fetchUrlPartial(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'identity',
        'Connection': 'close',
        'Range': 'bytes=0-80000',
      },
    };
    const req = lib.request(options, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${parsed.protocol}//${parsed.hostname}${res.headers.location}`;
        req.destroy();
        return fetchUrlPartial(next, redirects + 1).then(resolve).catch(reject);
      }
      let data = '';
      let done = false;
      res.on('data', chunk => {
        data += chunk;
        // Stop once we have enough to find JSON-LD
        if (data.length > 80000 && !done) {
          done = true;
          req.destroy();
          resolve({ status: res.statusCode, body: data });
        }
      });
      res.on('end', () => { if (!done) resolve({ status: res.statusCode, body: data }); });
    });
    req.on('error', (e) => {
      // ECONNRESET is expected when we destroy early
      if (e.code === 'ECONNRESET' || e.message === 'socket hang up') {
        resolve({ status: 200, body: '' });
      } else {
        reject(e);
      }
    });
    req.setTimeout(7000, () => { req.destroy(); });
    req.end();
  });
}

function extractRecipeContent(html) {
  // Try JSON-LD first — most recipe sites embed full structured data
  const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const json = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
        const data = JSON.parse(json);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const recipe = item['@type'] === 'Recipe'
            ? item
            : (item['@graph'] || []).find(n => n['@type'] === 'Recipe');
          if (recipe) {
            return `STRUCTURED RECIPE DATA (JSON-LD):\n${JSON.stringify(recipe, null, 2)}`.slice(0, 8000);
          }
        }
      } catch (e) { /* try next */ }
    }
  }

  // Fallback: strip HTML
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s{3,}/g, '\n\n').trim();
  return text.slice(0, 6000);
}

function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const body = JSON.parse(event.body);

    if (body.fetchUrl) {
      let content = '';
      try {
        const page = await fetchUrlPartial(body.fetchUrl);
        content = extractRecipeContent(page.body);
        if (!content || content.length < 50) {
          return { statusCode: 422, body: JSON.stringify({ error: 'Could not extract content from this page. Try manual entry.' }) };
        }
      } catch (e) {
        return { statusCode: 422, body: JSON.stringify({ error: `Could not fetch page: ${e.message}` }) };
      }

      const result = await callAnthropic({
        model: body.model || 'claude-sonnet-4-5',
        max_tokens: body.max_tokens || 1000,
        system: body.system,
        messages: [{ role: 'user', content: `Extract the recipe from this content:\n\n${content}` }],
      });

      return { statusCode: result.status, headers: { 'Content-Type': 'application/json' }, body: result.body };
    }

    const result = await callAnthropic(body);
    return { statusCode: result.status, headers: { 'Content-Type': 'application/json' }, body: result.body };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
