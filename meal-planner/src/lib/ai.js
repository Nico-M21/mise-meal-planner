const ANTHROPIC_API = '/api/claude';
const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 3000;
const TIMEOUT_MS = 25000;

function fetchWithTimeout(url, options, ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

function safeParseJSON(text, fallback = null) {
  try {
    // Strip markdown code fences if present
    const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error('JSON parse failed:', text?.slice(0, 200));
    if (fallback !== null) return fallback;
    throw new Error('AI returned an unexpected response. Please try again.');
  }
}

async function callClaude(systemPrompt, userContent) {
  const response = await fetchWithTimeout(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'API error');
  return data.content[0].text;
}

export async function extractRecipeFromUrl(url) {
  const response = await fetchWithTimeout('/api/spoonacular', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) throw new Error(`Extraction failed: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function extractRecipeFromImage(base64Image, mediaType) {
  const response = await fetchWithTimeout(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: `You are a recipe extraction assistant. Extract recipe data from the provided image and return ONLY a valid JSON object with no markdown, no backticks, no explanation. Structure:
{
  "title": string,
  "description": string,
  "prep_time": number (minutes),
  "cook_time": number (minutes),
  "servings": number,
  "cuisine": string,
  "tags": string[],
  "ingredients": [{"name": string, "amount": string, "unit": string, "category": string}],
  "steps": [{"order": number, "instruction": string}]
}`,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
          { type: 'text', text: 'Extract the recipe from this image.' }
        ]
      }],
    }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return safeParseJSON(data.content[0].text);
}

export async function extractRecipeFromText(text) {
  const system = `You are a recipe extraction assistant. Extract or create a recipe from the given text and return ONLY a valid JSON object with no markdown, no backticks, no explanation. Structure:
{
  "title": string,
  "description": string,
  "prep_time": number (minutes),
  "cook_time": number (minutes),
  "servings": number,
  "cuisine": string,
  "tags": string[],
  "ingredients": [{"name": string, "amount": string, "unit": string, "category": string}],
  "steps": [{"order": number, "instruction": string}]
}`;

  const cleaned = text
    .replace(/https?:\/\/\S{80,}/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[▢►]/g, '')
    .replace(/\s{3,}/g, '\n\n')
    .trim();

  const markers = ['Ingredients', 'ingredients', 'INGREDIENTS', 'Prep Time', 'Cook Time'];
  let start = 0;
  for (const marker of markers) {
    const idx = cleaned.indexOf(marker);
    if (idx > 0 && idx < cleaned.length * 0.8) { start = Math.max(0, idx - 300); break; }
  }
  const truncated = cleaned.slice(start, start + 8000);
  const extracted = await callClaude(system, truncated);
  return safeParseJSON(extracted);
}

export async function suggestMeals({ count, days, protein, cuisine, cookTime, savedRecipes, pantryStaples, wishlistRecipes }) {
  const system = `You are a family meal planning assistant. Suggest meals based on the given criteria. Return ONLY a valid JSON array with no markdown, no backticks, no explanation. Each meal object:
{
  "title": string,
  "description": string,
  "cuisine": string,
  "cook_time": number (minutes),
  "protein": string,
  "servings": number,
  "from_saved": boolean,
  "saved_recipe_id": string or null,
  "ingredients": [{"name": string, "amount": string, "unit": string, "category": string}],
  "steps": [{"order": number, "instruction": string}]
}
If a meal matches a saved recipe, set from_saved to true and saved_recipe_id to the recipe id.
Prioritize wishlisted recipes when they fit the criteria.`;

  const userMsg = `Suggest exactly ${count} meals.
${days?.length ? `Days: ${days.join(', ')}` : ''}
${protein ? `Protein preference: ${protein}` : ''}
${cuisine ? `Cuisine style: ${cuisine}` : ''}
${cookTime ? `Max cook time: ${cookTime} minutes` : ''}
${wishlistRecipes?.length ? `PRIORITY - Wishlisted recipes (include these if they fit): ${JSON.stringify(wishlistRecipes.map(r => ({ id: r.id, title: r.title, cuisine: r.cuisine, cook_time: r.cook_time })))}` : ''}
${savedRecipes?.length ? `Other saved recipes to consider: ${JSON.stringify(savedRecipes.map(r => ({ id: r.id, title: r.title, cuisine: r.cuisine, cook_time: r.cook_time })))}` : ''}
${pantryStaples?.length ? `Pantry staples (exclude from grocery list): ${pantryStaples.join(', ')}` : ''}`;

  const text = await callClaude(system, userMsg);
  return safeParseJSON(text, []);
}

export async function swapMeal({ currentMeal, filters, savedRecipes, pantryStaples }) {
  const system = `You are a family meal planning assistant. Suggest ONE replacement meal. Return ONLY a valid JSON object with no markdown, no backticks, no explanation:
{
  "title": string,
  "description": string,
  "cuisine": string,
  "cook_time": number (minutes),
  "protein": string,
  "servings": number,
  "from_saved": boolean,
  "saved_recipe_id": string or null,
  "ingredients": [{"name": string, "amount": string, "unit": string, "category": string}],
  "steps": [{"order": number, "instruction": string}]
}`;

  const userMsg = `Replace this meal: "${currentMeal.title}"
Keep similar filters: ${JSON.stringify(filters)}
Saved recipes available: ${JSON.stringify(savedRecipes?.map(r => ({ id: r.id, title: r.title, cuisine: r.cuisine })) || [])}
Do NOT suggest "${currentMeal.title}" again.`;

  const text = await callClaude(system, userMsg);
  return safeParseJSON(text);
}

export function buildGroceryList(meals, pantryStaples = []) {
  const stapleSet = new Set(pantryStaples.map(s => s.toLowerCase().trim()));
  const ingredientMap = {};

  meals.forEach(meal => {
    const baseServings = meal.servings || 2;
    const targetServings = meal.targetServings || baseServings;
    // Guard against divide by zero
    const scale = baseServings > 0 ? targetServings / baseServings : 1;

    (meal.ingredients || []).forEach(ing => {
      const name = ing.name?.toLowerCase().trim();
      if (!name || stapleSet.has(name)) return;

      const rawAmount = parseFloat(ing.amount);
      const amount = isNaN(rawAmount) ? 1 : rawAmount;

      if (!ingredientMap[name]) {
        ingredientMap[name] = {
          ...ing,
          name: ing.name,
          totalAmount: amount * scale,
          category: ing.category || 'Other',
          meals: [meal.title],
        };
      } else {
        ingredientMap[name].totalAmount += amount * scale;
        if (!ingredientMap[name].meals.includes(meal.title)) {
          ingredientMap[name].meals.push(meal.title);
        }
      }
    });
  });

  const grouped = {};
  Object.values(ingredientMap).forEach(ing => {
    const cat = ing.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ing);
  });

  // Sort categories and items within each category
  const sorted = {};
  Object.keys(grouped).sort().forEach(cat => {
    sorted[cat] = grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
  });

  return sorted;
}
