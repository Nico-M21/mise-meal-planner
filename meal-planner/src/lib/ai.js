const ANTHROPIC_API = '/api/claude';
const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 3000;

async function callClaude(systemPrompt, userContent) {
  const response = await fetch(ANTHROPIC_API, {
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
  return data.content[0].text;
}

export async function extractRecipeFromUrl(url) {
  const response = await fetch('/api/spoonacular', {
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
  const response = await fetch(ANTHROPIC_API, {
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
  return JSON.parse(data.content[0].text);
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
  // Clean the text — strip URLs (especially long ad tracker URLs), markdown links, junk chars
  const cleaned = text
    .replace(/https?:\/\/\S{80,}/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[▢►]/g, '')
    .replace(/\s{3,}/g, '\n\n')
    .trim();

  // Find where the actual recipe starts
  const markers = ["Ingredients", "ingredients", "INGREDIENTS", "Prep Time", "Cook Time"];
  let start = 0;
  for (const marker of markers) {
    const idx = cleaned.indexOf(marker);
    if (idx > 0 && idx < cleaned.length * 0.8) { start = Math.max(0, idx - 300); break; }
  }
  const truncated = cleaned.slice(start, start + 8000);
  const extracted = await callClaude(system, truncated);
  return JSON.parse(extracted);
}

export async function suggestMeals({ count, days, protein, cuisine, cookTime, savedRecipes, pantryStaples }) {
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
If a meal matches a saved recipe, set from_saved to true and saved_recipe_id to the recipe id.`;

  const userMsg = `Suggest exactly ${count} meals.
${days?.length ? `Days: ${days.join(', ')}` : ''}
${protein ? `Protein preference: ${protein}` : ''}
${cuisine ? `Cuisine style: ${cuisine}` : ''}
${cookTime ? `Max cook time: ${cookTime} minutes` : ''}
${savedRecipes?.length ? `Saved recipes to consider: ${JSON.stringify(savedRecipes.map(r => ({ id: r.id, title: r.title, cuisine: r.cuisine, cook_time: r.cook_time, protein: r.tags })))}` : ''}
${pantryStaples?.length ? `Pantry staples (exclude from grocery list): ${pantryStaples.join(', ')}` : ''}
Mix saved recipes with new suggestions when appropriate.`;

  const text = await callClaude(system, userMsg);
  return JSON.parse(text);
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
  return JSON.parse(text);
}

export function buildGroceryList(meals, pantryStaples = []) {
  const stapleSet = new Set(pantryStaples.map(s => s.toLowerCase().trim()));
  const ingredientMap = {};

  meals.forEach(meal => {
    const scale = (meal.targetServings || meal.servings || 1) / (meal.servings || 1);
    (meal.ingredients || []).forEach(ing => {
      const name = ing.name?.toLowerCase().trim();
      if (!name || stapleSet.has(name)) return;
      const key = name;
      if (!ingredientMap[key]) {
        ingredientMap[key] = { ...ing, name: ing.name, totalAmount: parseFloat(ing.amount) || 1, category: ing.category || 'Other', meals: [meal.title] };
      } else {
        ingredientMap[key].totalAmount += (parseFloat(ing.amount) || 1) * scale;
        if (!ingredientMap[key].meals.includes(meal.title)) ingredientMap[key].meals.push(meal.title);
      }
    });
  });

  const grouped = {};
  Object.values(ingredientMap).forEach(ing => {
    const cat = ing.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ing);
  });

  return grouped;
}
