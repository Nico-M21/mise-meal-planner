import React, { useState } from 'react';
import { X, Pencil, Plus, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['Produce', 'Protein', 'Dairy', 'Pantry', 'Frozen', 'Bakery', 'Beverages', 'Other'];
const CUISINES = ['American', 'Mexican', 'Italian', 'Asian', 'Thai', 'Chinese', 'Japanese', 'Indian', 'Mediterranean', 'French', 'Greek', 'Other'];

function scaleAmount(amount, scale) {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  const scaled = num * scale;
  if (scaled % 1 === 0) return String(scaled);
  return String(Math.round(scaled * 100) / 100);
}

export function RecipeModal({ recipe, onClose, onSaved, showToast }) {
  const [servings, setServings] = useState(recipe?.servings || 2);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!recipe) return null;

  const baseServings = recipe.servings || servings;
  const scale = servings / baseServings;
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  function startEdit() {
    setDraft({ ...recipe, ingredients: recipe.ingredients || [], steps: recipe.steps || [] });
    setEditing(true);
  }

  function updateIngredient(i, field, val) {
    const updated = [...draft.ingredients];
    updated[i] = { ...updated[i], [field]: val };
    setDraft({ ...draft, ingredients: updated });
  }

  function addIngredient() {
    setDraft({ ...draft, ingredients: [...draft.ingredients, { name: '', amount: '', unit: '', category: 'Other' }] });
  }

  function removeIngredient(i) {
    setDraft({ ...draft, ingredients: draft.ingredients.filter((_, idx) => idx !== i) });
  }

  function updateStep(i, val) {
    const updated = [...draft.steps];
    updated[i] = { ...updated[i], instruction: val };
    setDraft({ ...draft, steps: updated });
  }

  function addStep() {
    setDraft({ ...draft, steps: [...draft.steps, { order: draft.steps.length + 1, instruction: '' }] });
  }

  function removeStep(i) {
    setDraft({ ...draft, steps: draft.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })) });
  }

  async function saveEdit() {
    if (!draft.title) { showToast('Recipe needs a title', 'error'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('recipes').update({
        title: draft.title,
        description: draft.description,
        prep_time: parseInt(draft.prep_time) || null,
        cook_time: parseInt(draft.cook_time) || null,
        servings: parseInt(draft.servings) || null,
        cuisine: draft.cuisine,
        tags: draft.tags,
        source_url: draft.source_url,
        ingredients: draft.ingredients,
        steps: draft.steps,
      }).eq('id', recipe.id);
      if (error) throw error;
      showToast('Recipe saved!', 'success');
      setEditing(false);
      onSaved && onSaved({ ...recipe, ...draft });
    } catch (e) {
      showToast('Failed to save changes.', 'error');
    }
    setSaving(false);
  }

  // EDIT MODE
  if (editing && draft) {
    return (
      <div className="modal-overlay" onClick={() => setEditing(false)}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
          <div className="modal-header">
            <h2 className="modal-title">Edit Recipe</h2>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}><X size={18} /></button>
          </div>

          {/* Basic info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Title *</label>
              <input className="input" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={draft.description || ''} onChange={e => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Prep Time (min)</label>
              <input className="input" type="number" value={draft.prep_time || ''} onChange={e => setDraft({ ...draft, prep_time: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Cook Time (min)</label>
              <input className="input" type="number" value={draft.cook_time || ''} onChange={e => setDraft({ ...draft, cook_time: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Servings</label>
              <input className="input" type="number" value={draft.servings || ''} onChange={e => setDraft({ ...draft, servings: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Cuisine</label>
              <select className="input" value={draft.cuisine || ''} onChange={e => setDraft({ ...draft, cuisine: e.target.value })}>
                <option value="">Select...</option>
                {CUISINES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Ingredients */}
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>Ingredients</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr 110px 28px', gap: 6, marginBottom: 4 }}>
              {['Amount', 'Unit', 'Ingredient', 'Category', ''].map((h, i) => (
                <span key={i} style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {draft.ingredients.map((ing, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr 110px 28px', gap: 6, alignItems: 'center' }}>
                  <input className="input" placeholder="1.5" value={ing.amount} onChange={e => updateIngredient(i, 'amount', e.target.value)} style={{ fontSize: '0.85rem' }} />
                  <input className="input" placeholder="cup" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} style={{ fontSize: '0.85rem' }} />
                  <input className="input" placeholder="ingredient" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} style={{ fontSize: '0.85rem' }} />
                  <select className="input" value={ing.category || 'Other'} onChange={e => updateIngredient(i, 'category', e.target.value)} style={{ fontSize: '0.82rem' }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <button onClick={() => removeIngredient(i)} style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={addIngredient} style={{ marginTop: 8 }}>
              <Plus size={14} /> Add ingredient
            </button>
          </div>

          {/* Steps */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>Steps</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {draft.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--terracotta)', fontWeight: 700, minWidth: 20, paddingTop: 10, fontSize: '0.85rem' }}>{i + 1}.</span>
                  <textarea className="input" rows={2} value={step.instruction} onChange={e => updateStep(i, e.target.value)} style={{ flex: 1, fontSize: '0.88rem' }} />
                  <button onClick={() => removeStep(i)} style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', paddingTop: 10 }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={addStep} style={{ marginTop: 8 }}>
              <Plus size={14} /> Add step
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
              {saving ? <span className="spinner" /> : <><Save size={15} /> Save Changes</>}
            </button>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // VIEW MODE
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 660 }}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <h2 className="modal-title">{recipe.title}</h2>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {recipe.prep_time && <span style={{ fontSize: '0.82rem', color: 'var(--ink-faint)' }}>Prep: {recipe.prep_time}m</span>}
              {recipe.cook_time && <span style={{ fontSize: '0.82rem', color: 'var(--ink-faint)' }}>Cook: {recipe.cook_time}m</span>}
              {totalTime > 0 && <span style={{ fontSize: '0.82rem', color: 'var(--ink-faint)' }}>Total: {totalTime}m</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" onClick={startEdit}>
              <Pencil size={13} /> Edit
            </button>
            <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {recipe.description && (
          <p style={{ color: 'var(--ink-light)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 16 }}>
            {recipe.description}
          </p>
        )}

        {/* Servings scaler */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--cream)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink-light)' }}>Servings:</span>
          <button onClick={() => setServings(s => Math.max(1, s - 1))}
            style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', minWidth: 24, textAlign: 'center' }}>{servings}</span>
          <button onClick={() => setServings(s => s + 1)}
            style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          {scale !== 1 && <span style={{ fontSize: '0.78rem', color: 'var(--terracotta)', marginLeft: 4 }}>{Math.round(scale * 10) / 10}× recipe</span>}
          {scale !== 1 && (
            <button onClick={() => setServings(recipe.servings || 2)}
              style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Reset
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 12 }}>Ingredients</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {(recipe.ingredients || []).map((ing, i) => (
                <li key={i} style={{ fontSize: '0.88rem', color: 'var(--ink-light)', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ color: 'var(--terracotta)', fontSize: '0.7rem', flexShrink: 0 }}>●</span>
                  <span><strong>{scaleAmount(ing.amount, scale)} {ing.unit}</strong> {ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 12 }}>Steps</h4>
            <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(recipe.steps || []).sort((a, b) => a.order - b.order).map((step, i) => (
                <li key={i} style={{ fontSize: '0.85rem', color: 'var(--ink-light)', lineHeight: 1.5, display: 'flex', gap: 10 }}>
                  <span style={{ color: 'var(--terracotta)', fontWeight: 700, flexShrink: 0, fontSize: '0.82rem' }}>{i + 1}.</span>
                  <span>{step.instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {recipe.source_url && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '0.82rem', color: 'var(--ink-faint)', textDecoration: 'none' }}>
              View original recipe ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
