import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeModal } from '../components/RecipeModal';

const CUISINES = ['All', 'American', 'Mexican', 'Italian', 'Asian', 'Thai', 'Chinese', 'Japanese', 'Indian', 'Mediterranean', 'French', 'Greek', 'Other'];

export function RecipeBookPage({ refreshTrigger, showToast }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('All');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    fetchRecipes();
  }, [refreshTrigger]);

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

  const filtered = recipes.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    const matchCuisine = cuisineFilter === 'All' || r.cuisine === cuisineFilter;
    return matchSearch && matchCuisine;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Recipe Book</h1>
        <p className="page-subtitle">{recipes.length} saved recipe{recipes.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }} />
          <input className="input" placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }} />
        </div>
        <select className="input" value={cuisineFilter} onChange={e => setCuisineFilter(e.target.value)} style={{ width: 'auto' }}>
          {CUISINES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>{recipes.length === 0 ? 'No recipes yet' : 'No results'}</h3>
          <p>{recipes.length === 0 ? 'Add your first recipe to get started' : 'Try a different search or filter'}</p>
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
