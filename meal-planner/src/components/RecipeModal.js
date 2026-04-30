import React, { useState } from 'react';
import { X } from 'lucide-react';

function scaleAmount(amount, scale) {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  const scaled = num * scale;
  // Clean up decimals — show fractions nicely
  if (scaled % 1 === 0) return String(scaled);
  return String(Math.round(scaled * 100) / 100);
}

export function RecipeModal({ recipe, onClose }) {
  const [servings, setServings] = useState(recipe?.servings || 2);
  if (!recipe) return null;

  const baseServings = recipe.servings || servings;
  const scale = servings / baseServings;
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 660 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <h2 className="modal-title">{recipe.title}</h2>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {recipe.prep_time && <span style={{ fontSize: '0.82rem', color: 'var(--ink-faint)' }}>Prep: {recipe.prep_time}m</span>}
              {recipe.cook_time && <span style={{ fontSize: '0.82rem', color: 'var(--ink-faint)' }}>Cook: {recipe.cook_time}m</span>}
              {totalTime > 0 && <span style={{ fontSize: '0.82rem', color: 'var(--ink-faint)' }}>Total: {totalTime}m</span>}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        {recipe.description && (
          <p style={{ color: 'var(--ink-light)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 16 }}>
            {recipe.description}
          </p>
        )}

        {/* Servings scaler */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--cream)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink-light)' }}>Servings:</span>
          <button
            onClick={() => setServings(s => Math.max(1, s - 1))}
            style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            −
          </button>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', minWidth: 24, textAlign: 'center' }}>{servings}</span>
          <button
            onClick={() => setServings(s => s + 1)}
            style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            +
          </button>
          {scale !== 1 && (
            <span style={{ fontSize: '0.78rem', color: 'var(--terracotta)', marginLeft: 4 }}>
              {scale > 1 ? `${Math.round(scale * 10) / 10}× recipe` : `${Math.round(scale * 10) / 10}× recipe`}
            </span>
          )}
          {scale !== 1 && (
            <button onClick={() => setServings(recipe.servings || 2)}
              style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Reset
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Ingredients */}
          <div>
            <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 12 }}>Ingredients</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {(recipe.ingredients || []).map((ing, i) => (
                <li key={i} style={{ fontSize: '0.88rem', color: 'var(--ink-light)', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ color: 'var(--terracotta)', fontSize: '0.7rem', flexShrink: 0 }}>●</span>
                  <span>
                    <strong>{scaleAmount(ing.amount, scale)} {ing.unit}</strong> {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
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
