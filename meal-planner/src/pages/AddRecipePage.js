import React, { useState } from 'react';
import { Link2, Upload, PenLine, ChevronRight, Plus, X } from 'lucide-react';
import { extractRecipeFromUrl, extractRecipeFromImage, extractRecipeFromText } from '../lib/ai';
import { supabase } from '../lib/supabase';

const BLANK_RECIPE = {
  title: '', description: '', prep_time: '', cook_time: '', servings: '', cuisine: '',
  tags: [], source_url: '',
  ingredients: [{ name: '', amount: '', unit: '', category: 'Produce' }],
  steps: [{ order: 1, instruction: '' }],
};

const CATEGORIES = ['Produce', 'Protein', 'Dairy', 'Pantry', 'Frozen', 'Bakery', 'Beverages', 'Other'];
const CUISINES = ['American', 'Mexican', 'Italian', 'Asian', 'Thai', 'Chinese', 'Japanese', 'Indian', 'Mediterranean', 'French', 'Greek', 'Other'];

export function AddRecipePage({ onSaved, showToast }) {
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleUrlExtract() {
    if (!urlInput.trim()) return;
    setLoading(true);
    try {
      const extracted = await extractRecipeFromUrl(urlInput.trim());
      setRecipe({ ...BLANK_RECIPE, ...extracted, source_url: urlInput.trim() });
    } catch (e) {
      showToast('Could not extract recipe. Try manual entry.', 'error');
    }
    setLoading(false);
  }

  async function handlePasteExtract() {
    if (!pasteText.trim()) return;
    setLoading(true);
    try {
      const extracted = await extractRecipeFromText(pasteText.trim());
      setRecipe({ ...BLANK_RECIPE, ...extracted, source_url: urlInput.trim() });
    } catch (e) {
      showToast('Could not extract recipe. Try manual entry.', 'error');
    }
    setLoading(false);
  }

  async function handlePasteExtract() {
    if (!pasteText.trim()) return;
    setLoading(true);
    try {

      const extracted = await extractRecipeFromText(pasteText.trim());
      setRecipe({ ...BLANK_RECIPE, ...extracted, source_url: urlInput.trim() });
    } catch (e) {
      showToast('Could not extract recipe. Try manual entry.', 'error');
    }
    setLoading(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      // Compress image before sending to stay under 4MB limit
      const compressed = await compressImage(file, 1200, 0.7);
      const base64 = compressed.split(',')[1];
      const extracted = await extractRecipeFromImage(base64, 'image/jpeg');
      setRecipe({ ...BLANK_RECIPE, ...extracted });
      setLoading(false);
    } catch (err) {
      showToast('Could not extract recipe from image.', 'error');
      setLoading(false);
    }
  }

  function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function handleManual() {
    setRecipe({ ...BLANK_RECIPE });
    setMode('manual');
  }

  function updateIngredient(i, field, val) {
    const updated = [...recipe.ingredients];
    updated[i] = { ...updated[i], [field]: val };
    setRecipe({ ...recipe, ingredients: updated });
  }

  function addIngredient() {
    setRecipe({ ...recipe, ingredients: [...recipe.ingredients, { name: '', amount: '', unit: '', category: 'Other' }] });
  }

  function removeIngredient(i) {
    setRecipe({ ...recipe, ingredients: recipe.ingredients.filter((_, idx) => idx !== i) });
  }

  function updateStep(i, val) {
    const updated = [...recipe.steps];
    updated[i] = { ...updated[i], instruction: val };
    setRecipe({ ...recipe, steps: updated });
  }

  function addStep() {
    setRecipe({ ...recipe, steps: [...recipe.steps, { order: recipe.steps.length + 1, instruction: '' }] });
  }

  function removeStep(i) {
    setRecipe({ ...recipe, steps: recipe.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })) });
  }

  async function saveRecipe() {
    if (!recipe.title) { showToast('Recipe needs a title', 'error'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('recipes').insert([{
        title: recipe.title,
        description: recipe.description,
        prep_time: parseInt(recipe.prep_time) || null,
        cook_time: parseInt(recipe.cook_time) || null,
        servings: parseInt(recipe.servings) || null,
        cuisine: recipe.cuisine,
        tags: recipe.tags,
        source_url: recipe.source_url,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        rating: null,
      }]);
      if (error) throw error;
      showToast('Recipe saved!', 'success');
      setRecipe(null);
      setMode(null);
      setUrlInput('');
      setPasteText('');
      onSaved();
    } catch (e) {
      showToast('Failed to save recipe.', 'error');
    }
    setSaving(false);
  }

  // Mode selector
  if (!mode && !recipe) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Add a Recipe</h1>
          <p className="page-subtitle">Import from the web, upload a photo, or type it in</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, maxWidth: 600 }}>
          {[
            { key: 'url', icon: <Link2 size={28} />, label: 'From a Website', sub: 'Copy & paste recipe text' },
            { key: 'upload', icon: <Upload size={28} />, label: 'Upload a Photo', sub: 'AI extracts the recipe' },
            { key: 'paste', icon: <PenLine size={28} />, label: 'Paste Text', sub: 'For Substack, paywalled sites' },
            { key: 'manual', icon: <PenLine size={28} />, label: 'Type it in', sub: 'Manual entry from scratch' },
          ].map(opt => (
            <button key={opt.key} className="card"
              onClick={() => opt.key === 'manual' ? handleManual() : setMode(opt.key)}
              style={{ border: '2px solid var(--border)', background: 'var(--warm-white)', textAlign: 'center', cursor: 'pointer', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--terracotta)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ color: 'var(--terracotta)' }}>{opt.icon}</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{opt.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-faint)' }}>{opt.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // URL import mode
  if (mode === 'url' && !recipe) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Import from Website</h1>
          <p className="page-subtitle">Paste the recipe URL and we'll extract it automatically</p>
        </div>
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="label">Recipe URL</label>
            <input className="input" placeholder="https://www.allrecipes.com/recipe/..."
              value={urlInput} onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUrlExtract()} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={handleUrlExtract} disabled={loading || !urlInput.trim()}>
              {loading ? <><span className="spinner" /> Extracting...</> : <><ChevronRight size={16} /> Extract Recipe</>}
            </button>
            <button className="btn btn-secondary" onClick={() => setMode(null)}>Back</button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPaste(!showPaste)} style={{ color: 'var(--ink-faint)', fontSize: '0.82rem' }}>
            {showPaste ? '▲ Hide' : '▼ Site not working? Paste the text instead'}
          </button>
          {showPaste && (
            <div style={{ marginTop: 12 }}>
              <label className="label">Paste the recipe page text here</label>
              <textarea className="input" rows={6} placeholder="Open the recipe page, press Ctrl+A then Ctrl+C to copy, paste here..." value={pasteText} onChange={e => setPasteText(e.target.value)} style={{ resize: 'vertical', fontSize: '0.85rem', marginBottom: 8 }} />
              <button className="btn btn-primary btn-sm" onClick={handlePasteExtract} disabled={loading || !pasteText.trim()}>
                {loading ? <span className="spinner" /> : 'Extract from pasted text'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Paste mode
  if (mode === 'paste' && !recipe) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Paste Recipe Text</h1>
          <p className="page-subtitle">For Substack, paywalled, or tricky sites</p>
        </div>
        <div className="card" style={{ maxWidth: 560 }}>
          <div style={{ background: 'var(--gold-pale)', border: '1px solid var(--gold)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--ink-light)', lineHeight: 1.7 }}>
            <strong>How to do it:</strong><br />
            1. Open the recipe page<br />
            2. Press <strong>Ctrl+A</strong> to select all, then <strong>Ctrl+C</strong> to copy<br />
            3. Paste below with <strong>Ctrl+V</strong>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="label">Recipe URL (optional)</label>
            <input className="input" placeholder="https://..." value={urlInput} onChange={e => setUrlInput(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="label">Paste recipe text *</label>
            <textarea className="input" rows={8} placeholder="Paste the page text here..." value={pasteText} onChange={e => setPasteText(e.target.value)} style={{ resize: 'vertical', fontSize: '0.85rem' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handlePasteExtract} disabled={loading || !pasteText.trim()}>
              {loading ? <><span className="spinner" /> Extracting...</> : <><ChevronRight size={16} /> Extract Recipe</>}
            </button>
            <button className="btn btn-secondary" onClick={() => setMode(null)}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  // File upload
  if (mode === 'upload' && !recipe) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Upload Photo or Video</h1>
        </div>
        <div className="card" style={{ maxWidth: 520, textAlign: 'center' }}>
          {loading ? (
            <div style={{ padding: 40 }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--ink-faint)' }}>Extracting recipe...</p>
            </div>
          ) : (
            <label style={{ display: 'block', padding: 40, cursor: 'pointer', border: '2px dashed var(--border)', borderRadius: 8 }}>
              <Upload size={32} style={{ color: 'var(--terracotta)', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 500, marginBottom: 4 }}>Drop a file or click to browse</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-faint)' }}>JPG, PNG, HEIC supported</p>
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          )}
          <button className="btn btn-secondary" onClick={() => setMode(null)} style={{ marginTop: 16 }}>Back</button>
        </div>
      </div>
    );
  }

  // Recipe edit form
  if (recipe) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">{mode === 'manual' ? 'New Recipe' : 'Review & Save'}</h1>
          <p className="page-subtitle">{mode !== 'manual' ? 'AI extracted this — check it over before saving' : 'Fill in your recipe details'}</p>
        </div>
        <div style={{ display: 'grid', gap: 20, maxWidth: 760 }}>
          <div className="card">
            <h3 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 16 }}>Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Title *</label>
                <input className="input" value={recipe.title} onChange={e => setRecipe({ ...recipe, title: e.target.value })} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={recipe.description} onChange={e => setRecipe({ ...recipe, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Prep Time (min)</label>
                <input className="input" type="number" value={recipe.prep_time} onChange={e => setRecipe({ ...recipe, prep_time: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Cook Time (min)</label>
                <input className="input" type="number" value={recipe.cook_time} onChange={e => setRecipe({ ...recipe, cook_time: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Servings</label>
                <input className="input" type="number" value={recipe.servings} onChange={e => setRecipe({ ...recipe, servings: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Cuisine</label>
                <select className="input" value={recipe.cuisine} onChange={e => setRecipe({ ...recipe, cuisine: e.target.value })}>
                  <option value="">Select...</option>
                  {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 10 }}>Ingredients</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr 110px 28px', gap: 6, marginBottom: 6, padding: '0 2px' }}>
              {['Amount', 'Unit', 'Ingredient', 'Category', ''].map((h, i) => (
                <span key={i} style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr 110px 28px', gap: 6, alignItems: 'center' }}>
                  <input className="input" placeholder="1.5" value={ing.amount} onChange={e => updateIngredient(i, 'amount', e.target.value)} style={{ fontSize: '0.88rem' }} />
                  <input className="input" placeholder="cup" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} style={{ fontSize: '0.88rem' }} />
                  <input className="input" placeholder="chicken breast" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} style={{ fontSize: '0.88rem' }} />
                  <select className="input" value={ing.category} onChange={e => updateIngredient(i, 'category', e.target.value)} style={{ fontSize: '0.82rem' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={() => removeIngredient(i)} style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer' }}><X size={14} /></button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={addIngredient} style={{ marginTop: 10 }}>
              <Plus size={14} /> Add ingredient
            </button>
          </div>

          <div className="card">
            <h3 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 16 }}>Steps</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recipe.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--terracotta)', fontWeight: 700, minWidth: 20, paddingTop: 10, fontSize: '0.85rem' }}>{i + 1}.</span>
                  <textarea className="input" rows={2} value={step.instruction} onChange={e => updateStep(i, e.target.value)} style={{ flex: 1, fontSize: '0.88rem' }} />
                  <button onClick={() => removeStep(i)} style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', paddingTop: 10 }}><X size={14} /></button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={addStep} style={{ marginTop: 10 }}>
              <Plus size={14} /> Add step
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={saveRecipe} disabled={saving}>
              {saving ? <span className="spinner" /> : 'Save Recipe'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setRecipe(null); setMode(null); }}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
