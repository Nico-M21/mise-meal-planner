const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function mapCategory(aisle) {
  if (!aisle) return 'Other';
  const a = aisle.toLowerCase();
  if (a.includes('produce') || a.includes('vegetable') || a.includes('fruit')) return 'Produce';
  if (a.includes('meat') || a.includes('seafood') || a.includes('poultry')) return 'Protein';
  if (a.includes('dairy') || a.includes('cheese') || a.includes('milk') || a.includes('egg')) return 'Dairy';
  if (a.includes('oil') || a.includes('baking') || a.includes('spice') || a.includes('condiment') || a.includes('pasta') || a.includes('grain')) return 'Pantry';
  if (a.includes('frozen')) return 'Frozen';
  if (a.includes('beverage')) return 'Beverages';
  return 'Other';
}

module.exports = async function (req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { url } = req.body;
    const apiKey = process.env.SPOONACULAR_API_KEY;
    const endpoint = `https://api.spoonacular.com/recipes/extract?apiKey=${apiKey}&url=${encodeURIComponent(url)}&forceExtraction=false&analyze=false&includeNutrition=false`;
    const result = await httpsGet(endpoint);
    if (result.status !== 200) return res.status(result.status).json({ error: 'Extraction failed' });
    const data = JSON.parse(result.body);
    if (data.status === 'failure') return res.status(422).json({ error: 'Could not extract recipe' });

    res.json({
      title: data.title || '',
      description: data.summary ? data.summary.replace(/<[^>]+>/g, '').slice(0, 300) : '',
      prep_time: data.preparationMinutes > 0 ? data.preparationMinutes : null,
      cook_time: data.cookingMinutes > 0 ? data.cookingMinutes : (data.readyInMinutes || null),
      servings: data.servings || null,
      cuisine: data.cuisines?.[0] || '',
      tags: [...(data.dishTypes || []), ...(data.diets || [])],
      source_url: data.sourceUrl || url,
      ingredients: (data.extendedIngredients || []).map(ing => ({
        name: ing.name || '',
        amount: ing.amount ? String(ing.amount) : '',
        unit: ing.unit || '',
        category: mapCategory(ing.aisle),
      })),
      steps: (data.analyzedInstructions?.[0]?.steps || []).map(step => ({
        order: step.number,
        instruction: step.step,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
