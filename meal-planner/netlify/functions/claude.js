const https = require('https');
const http = require('http');

function fetchUrl(url, redirects = 0) {
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'identity',
        'Connection': 'close',
      },
    };
    const req = lib.request(options, (res) => {
      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location.startsWith('http') ? res.headers.location : `${parsed.protocol}//${parsed.hostname}${res.headers.location}`;
        return fetchUrl(next, redirects + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function extractRecipeContent(html) {
  // First try to get JSON-LD recipe data (most recipe sites embed this)
  const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const json = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
        const data = JSON.parse(json);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const recipe = item['@type'] === 'Recipe' ? item : (item['@graph'] || []).find(n => n['@type'] === 'Recipe');
          if (recipe) return `STRUCTURED RECIPE DATA:\n${JSON.stringify(recipe, null, 2)}`.slice(0, 8000);
        }
      } catch (e) { /* continue */ }
    }
  }

  // Fall back to stripped HTML text
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s{3,}/g, '\n\n').trim();
  return text.slice(0, 6000);
}

function httpsPost(body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const body = JSON.parse(event.body);

    if (body.fetchUrl) {
      let content;
      try {
        const page = await fetchUrl(body.fetchUrl);
        content = extractRecipeContent(page.body);
      } catch (e) {
        return { statusCode: 422, body: JSON.stringify({ error: `Could not fetch URL: ${e.message}` }) };
      }

      const claudeBody = JSON.stringify({
        model: body.model || 'claude-sonnet-4-5',
        max_tokens: body.max_tokens || 1000,
        system: body.system,
        messages: [{ role: 'user', content: `Extract the recipe from this content:\n\n${content}` }],
      });

      const result = await httpsPost(claudeBody);
      return { statusCode: result.status, headers: { 'Content-Type': 'application/json' }, body: result.body };
    }

    const claudeBody = JSON.stringify(body);
    const result = await httpsPost(claudeBody);
    return { statusCode: result.status, headers: { 'Content-Type': 'application/json' }, body: result.body };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
