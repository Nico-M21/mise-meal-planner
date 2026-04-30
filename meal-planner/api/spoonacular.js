const https = require('https');

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
    console.log('API Key present:', !!apiKey, 'Length:', apiKey ? apiKey.length : 0);
    console.log('URL to extract:', url);

    const encodedUrl = encodeURIComponent(url);
    const path = `/recipes/extract?apiKey=${apiKey}&url=${encodedUrl}&forceExtraction=false&analyze=false&includeNutrition=false`;
    console.log('Calling Spoonacular path length:', path.length);

    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.spoonacular.com',
        path: path,
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      };

      const request = https.request(options, (response) => {
        let body = '';
        console.log('Spoonacular status:', response.statusCode);
        response.on('data', chunk => body += chunk);
        response.on('end', () => resolve({ status: response.statusCode, body }));
      });

      request.on('error', (err) => {
        console.log('Request error:', err.message);
        reject(err);
      });

      request.setTimeout(8000, () => {
        console.log('Request timeout');
        request.destroy();
        reject(new Error('Timeout'));
      });

      request.end();
    });

    console.log('Response status:', data.status);
    console.log('Response preview:', data.body.slice(0, 200));

    if (data.status !== 200) {
      return res.status(data.status).json({ error: `Spoonacular returned ${data.status}: ${data.body.slice(0, 200)}` });
    }

    const parsed = JSON.parse(data.body);
    if (parsed.status === 'failure') return res.status(422).json({ error: 'Could not extract recipe' });

    res.json({
      title: parsed.title || '',
      description: parsed.summary ? parsed.summary.replace(/<[^>]+>/g, '').slice(0, 300) : '',
      prep_time: parsed.preparationMinutes > 0 ? parsed.preparationMinutes : null,
      cook_time: parsed.cookingMinutes > 0 ? parsed.cookingMinutes : (parsed.readyInMinutes || null),
      servings: parsed.servings || null,
      cuisine: parsed.cuisines?.[0] || '',
      tags: [...(parsed.dishTypes || []), ...(parsed.diets || [])],
      source_url: parsed.sourceUrl || url,
      ingredients: (parsed.extendedIngredients || []).map(ing => ({
        name: ing.name || '',
        amount: ing.amount ? String(ing.amount) : '',
        unit: ing.unit || '',
        category: mapCategory(ing.aisle),
      })),
      steps: (parsed.analyzedInstructions?.[0]?.steps || []).map(step => ({
        order: step.number,
        instruction: step.step,
      })),
    });

  } catch (err) {
    console.log('Caught error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
