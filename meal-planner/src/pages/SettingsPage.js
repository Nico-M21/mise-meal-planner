import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DEFAULT_STAPLES = [
  'olive oil', 'salt', 'black pepper', 'garlic', 'onion', 'butter',
  'flour', 'sugar', 'vegetable oil', 'soy sauce', 'chicken broth',
  'cumin', 'paprika', 'oregano', 'bay leaves', 'red pepper flakes'
];

export function SettingsPage({ showToast }) {
  const [staples, setStaples] = useState([]);
  const [newStaple, setNewStaple] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStaples(); }, []);

  async function fetchStaples() {
    const { data } = await supabase.from('pantry_staples').select('*').order('name');
    setStaples(data || []);
    setLoading(false);
  }

  async function addStaple(name) {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed || staples.find(s => s.name === trimmed)) return;
    const { data, error } = await supabase.from('pantry_staples').insert([{ name: trimmed }]).select();
    if (!error) {
      setStaples(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setNewStaple('');
  }

  async function removeStaple(id) {
    await supabase.from('pantry_staples').delete().eq('id', id);
    setStaples(prev => prev.filter(s => s.id !== id));
  }

  async function addDefaults() {
    const existing = new Set(staples.map(s => s.name));
    const toAdd = DEFAULT_STAPLES.filter(s => !existing.has(s));
    if (toAdd.length === 0) { showToast('All defaults already added'); return; }
    const { data, error } = await supabase.from('pantry_staples').insert(toAdd.map(name => ({ name }))).select();
    if (!error) {
      setStaples(prev => [...prev, ...data].sort((a, b) => a.name.localeCompare(b.name)));
      showToast(`Added ${data.length} staples`, 'success');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your pantry staples — these won't appear on grocery lists</p>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Playfair Display, serif' }}>Pantry Staples</h3>
          <button className="btn btn-secondary btn-sm" onClick={addDefaults}>+ Add common defaults</button>
        </div>

        {/* Add new */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            className="input"
            placeholder="Add a staple ingredient..."
            value={newStaple}
            onChange={e => setNewStaple(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStaple(newStaple)}
          />
          <button className="btn btn-primary" onClick={() => addStaple(newStaple)} disabled={!newStaple.trim()}>
            <Plus size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}><span className="spinner" /></div>
        ) : staples.length === 0 ? (
          <p style={{ color: 'var(--ink-faint)', fontSize: '0.9rem' }}>No staples added yet. Add some above or use the defaults.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {staples.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--sage-light)', color: 'var(--sage)', padding: '4px 10px 4px 12px', borderRadius: 20, fontSize: '0.85rem' }}>
                {s.name}
                <button onClick={() => removeStaple(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sage)', display: 'flex', alignItems: 'center', padding: 0 }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
