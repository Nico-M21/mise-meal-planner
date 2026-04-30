import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['Oils & Fats', 'Spices & Herbs', 'Condiments & Sauces', 'Baking', 'Grains & Pasta', 'Canned & Broths', 'Produce Basics', 'Dairy Basics', 'Other'];

const DEFAULT_STAPLES = [
  { name: 'olive oil', category: 'Oils & Fats' },
  { name: 'vegetable oil', category: 'Oils & Fats' },
  { name: 'butter', category: 'Oils & Fats' },
  { name: 'salt', category: 'Spices & Herbs' },
  { name: 'black pepper', category: 'Spices & Herbs' },
  { name: 'cumin', category: 'Spices & Herbs' },
  { name: 'paprika', category: 'Spices & Herbs' },
  { name: 'oregano', category: 'Spices & Herbs' },
  { name: 'bay leaves', category: 'Spices & Herbs' },
  { name: 'red pepper flakes', category: 'Spices & Herbs' },
  { name: 'garlic powder', category: 'Spices & Herbs' },
  { name: 'onion powder', category: 'Spices & Herbs' },
  { name: 'soy sauce', category: 'Condiments & Sauces' },
  { name: 'hot sauce', category: 'Condiments & Sauces' },
  { name: 'worcestershire sauce', category: 'Condiments & Sauces' },
  { name: 'flour', category: 'Baking' },
  { name: 'sugar', category: 'Baking' },
  { name: 'baking powder', category: 'Baking' },
  { name: 'baking soda', category: 'Baking' },
  { name: 'chicken broth', category: 'Canned & Broths' },
  { name: 'beef broth', category: 'Canned & Broths' },
  { name: 'garlic', category: 'Produce Basics' },
  { name: 'onion', category: 'Produce Basics' },
];

async function detectCategory(ingredientName) {
  const response = await fetch('/.netlify/functions/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: `You categorize pantry ingredients. Given an ingredient name, return ONLY one of these exact category names, nothing else:
Oils & Fats
Spices & Herbs
Condiments & Sauces
Baking
Grains & Pasta
Canned & Broths
Produce Basics
Dairy Basics
Other`,
      messages: [{ role: 'user', content: ingredientName }],
    }),
  });
  const data = await response.json();
  const result = data.content[0].text.trim();
  return CATEGORIES.includes(result) ? result : 'Other';
}

export function SettingsPage({ showToast }) {
  const [staples, setStaples] = useState([]);
  const [newStaple, setNewStaple] = useState('');
  const [newCategory, setNewCategory] = useState('Other');
  const [detecting, setDetecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => { fetchStaples(); }, []);

  // Auto-detect category as user types (debounced)
  useEffect(() => {
    if (!newStaple.trim() || newStaple.trim().length < 3) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setDetecting(true);
      try {
        const cat = await detectCategory(newStaple.trim());
        setNewCategory(cat);
      } catch (e) {
        // silently fail, keep current category
      }
      setDetecting(false);
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [newStaple]);

  async function fetchStaples() {
    const { data } = await supabase.from('pantry_staples').select('*').order('category').order('name');
    setStaples(data || []);
    setLoading(false);
  }

  async function addStaple(name) {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed || staples.find(s => s.name === trimmed)) return;
    const { data, error } = await supabase.from('pantry_staples').insert([{ name: trimmed, category: newCategory }]).select();
    if (!error) {
      setStaples(prev => [...prev, data[0]].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
      showToast(`Added ${trimmed} to ${newCategory}`, 'success');
    }
    setNewStaple('');
    setNewCategory('Other');
  }

  async function confirmAndDelete() {
    if (!confirmDelete) return;
    await supabase.from('pantry_staples').delete().eq('id', confirmDelete.id);
    setStaples(prev => prev.filter(s => s.id !== confirmDelete.id));
    showToast(`Removed ${confirmDelete.name}`);
    setConfirmDelete(null);
  }

  async function addDefaults() {
    const existing = new Set(staples.map(s => s.name));
    const toAdd = DEFAULT_STAPLES.filter(s => !existing.has(s.name));
    if (toAdd.length === 0) { showToast('All defaults already added'); return; }
    const { data, error } = await supabase.from('pantry_staples').insert(toAdd).select();
    if (!error) {
      setStaples(prev => [...prev, ...data].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
      showToast(`Added ${data.length} staples`, 'success');
    }
  }

  const grouped = staples.reduce((acc, s) => {
    const cat = s.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your pantry staples — these won't appear on grocery lists</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Playfair Display, serif' }}>Pantry Staples</h3>
          <button className="btn btn-secondary btn-sm" onClick={addDefaults}>+ Add common defaults</button>
        </div>

        {/* Add new */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input
            className="input"
            placeholder="Type an ingredient..."
            value={newStaple}
            onChange={e => setNewStaple(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !detecting && addStaple(newStaple)}
            style={{ flex: 1 }}
          />
          <div style={{ position: 'relative' }}>
            <select
              className="input"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              style={{ width: 'auto', paddingRight: detecting ? 32 : 14 }}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            {detecting && (
              <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <span className="spinner" style={{ width: 14, height: 14 }} />
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => addStaple(newStaple)} disabled={!newStaple.trim() || detecting}>
            <Plus size={16} />
          </button>
        </div>

        {detecting && (
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-faint)', marginTop: -16, marginBottom: 12 }}>
            Detecting category...
          </p>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}><span className="spinner" /></div>
        ) : staples.length === 0 ? (
          <p style={{ color: 'var(--ink-faint)', fontSize: '0.9rem' }}>No staples added yet. Add some above or use the defaults.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                  {category} <span style={{ color: 'var(--border)', fontWeight: 400 }}>({items.length})</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {items.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--sage-light)', color: 'var(--sage)', padding: '4px 10px 4px 12px', borderRadius: 20, fontSize: '0.85rem' }}>
                      {s.name}
                      <button onClick={() => setConfirmDelete({ id: s.id, name: s.name })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sage)', display: 'flex', alignItems: 'center', padding: 0 }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 10 }}>Remove staple?</h3>
            <p style={{ color: 'var(--ink-light)', marginBottom: 20, fontSize: '0.9rem' }}>
              Remove <strong>{confirmDelete.name}</strong> from your pantry staples? It will start appearing on grocery lists.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={confirmAndDelete} style={{ background: '#C0392B' }}>Remove</button>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
