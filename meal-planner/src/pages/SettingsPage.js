import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
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

export function SettingsPage({ showToast }) {
  const [staples, setStaples] = useState([]);
  const [newStaple, setNewStaple] = useState('');
  const [newCategory, setNewCategory] = useState('Spices & Herbs');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { fetchStaples(); }, []);

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
      showToast(`Added ${trimmed}`, 'success');
    }
    setNewStaple('');
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

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input
            className="input"
            placeholder="Add a staple ingredient..."
            value={newStaple}
            onChange={e => setNewStaple(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStaple(newStaple)}
            style={{ flex: 1 }}
          />
          <select className="input" value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ width: 'auto' }}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => addStaple(newStaple)} disabled={!newStaple.trim()}>
            <Plus size={16} />
          </button>
        </div>

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
