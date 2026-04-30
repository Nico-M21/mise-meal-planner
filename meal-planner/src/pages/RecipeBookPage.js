import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeModal } from '../components/RecipeModal';

const CUISINES = ['All', 'American', 'Mexican', 'Italian', 'Asian', 'Thai', 'Chinese', 'Japanese', 'Indian', 'Mediterranean', 'French', 'Greek', 'Other'];
const COOK_TIMES = [{ label: 'Any time', value: '' }, { label: 'Under 30 min', value: 30 }, { label: 'Under 45 min', value: 45 }, { label: 'Under 60 min', value: 60 }, { label: 'Over 60 min', value: 61 }];

async function aiSearch(query, recipes) {
  const response = await fetch('/.netlify/functions/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: `You are a recipe search assistant. Given a natural language query and a list of saved recipes, return a JSON array of recipe IDs that best match the query. Only return IDs from the provided list. If none match well, return an empty array. Return ONLY a valid JSON array of strings, no markdown, no explanation.`,
      messages: [{
        role: 'user',
        content: `Query: "${query}"\n\nRecipes:\n${JSON.stringify(recipes.map(r => ({ id: r.id, title: r.title, description: r.description, cuisine: r.cuisine, cook_time: r.cook_time, tags: r.tags, ingredients: (r.ingredients || []).slice(0, 5).map(i => i.name) })))}`
      }],
    }),
  });
  const data = await response.json();
  const result = data.content[0].text.trim();
  return JSON.parse(result);
}

export function RecipeBookPage({ refreshTrigger, showToast }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('All');
  const [cookTimeFilter, setCookTimeFilter] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [aiResults, setAiResults] = useState(null); // null = no AI search yet
  const [aiLoading, setAiLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => { fetchRecipes(); }, [refreshTrigger]);

  async function fetchRecipes() {
    setLoading(true);
    const { data, error } = await supabase.from('recipes').select('*').order('created_at', { ascending: false });
    if (!error) setRecipes(data || []);
    setLoading(false);
  }

  async function handleRate(id, rating) {
    await supabase.from('recipes').update({ rating }).eq('id', id);
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, rating } : r));
    showToast('Rating saved', 'success');
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this recipe?')) return;
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (!error) {
      setRecipes(prev => prev.filter(r => r.id !== id));
      showToast('Recipe deleted');
    }
  }

  async function handleAiSearch() {
    if (!query.trim() || recipes.length === 0) return;
    setAiLoading(true);
    try {
      const ids = await aiSearch(query.trim(), recipes);
      setAiResults(ids);
      if (ids.length === 0) showToast('No matches found — try different wording');
    } catch (e) {
      showToast('Search failed, try again', 'error');
    }
    setAiLoading(false);
  }

  function clearSearch() {
    setQuery('');
    setAiResults(null);
  }

  // Apply filters
  let filtered = recipes;

  // If AI search has results, use those
  if (aiResults !== null) {
    filtered = recipes.filter(r => aiResults.includes(r.id));
  } else if (query.trim()) {
    // Basic text search while typing (before hitting search)
    filtered = recipes.filter(r =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.description?.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Apply cuisine filter
  if (cuisineFilter !== 'All') {
    filtered = filtered.filter(r => r.cuisine === cuisineFilter);
  }

  // Apply cook time filter
  if (cookTimeFilter) {
    const max = parseInt(cookTimeFilter);
    if (max === 61) {
      filtered = filtered.filter(r => (r.cook_time || 0) > 60);
    } else {
      filtered = filtered.filter(r => ((r.prep_time || 0) + (r.cook_time || 0)) <= max);
    }
  }

  const isAiActive = aiResults !== null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Recipe Book</h1>
        <p className="page-subtitle">{recipes.length} saved recipe{recipes.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }} />
            <input
              className="input"
              placeholder='Try "quick chicken dinner" or "1 pot meal with beef" or "fancy anniversary dinner"...'
              value={query}
              onChange={e => { setQuery(e.target.value); if (aiResults) setAiResults(null); }}
              onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
              style={{ paddingLeft: 36, paddingRight: query ? 36 : 14 }}
            />
            {query && (
              <button onClick={clearSearch} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAiSearch}
            disabled={aiLoading || !query.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            {aiLoading ? <span className="spinner" /> : <><Sparkles size={15} /> Search</>}
          </button>
        </div>
        {isAiActive && (
          <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--terracotta)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} />
            AI found {filtered.length} match{filtered.length !== 1 ? 'es' : ''} for "{query}"
            <button onClick={clearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: '0.82rem', textDecoration: 'underline' }}>Clear</button>
          </div>
        )}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select className="input" value={cuisineFilter} onChange={e => setCuisineFilter(e.target.value)} style={{ width: 'auto' }}>
          {CUISINES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input" value={cookTimeFilter} onChange={e => setCookTimeFilter(e.target.value)} style={{ width: 'auto' }}>
          {COOK_TIMES.map(t => <option key={t.label} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>{recipes.length === 0 ? 'No recipes yet' : 'No results'}</h3>
          <p>{recipes.length === 0 ? 'Add your first recipe to get started' : 'Try different search terms or filters'}</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {filtered.map(r => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onRate={handleRate}
              onDelete={handleDelete}
              onView={setSelectedRecipe}
            />
          ))}
        </div>
      )}

      {selectedRecipe && <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />}
    </div>
  );
}
