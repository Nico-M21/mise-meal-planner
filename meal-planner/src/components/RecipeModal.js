import React from 'react';
import { X, Clock, Users, ChefHat } from 'lucide-react';

export function RecipeModal({ recipe, onClose }) {
  if (!recipe) return null;
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{recipe.title}</h2>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {recipe.prep_time && <span style={{ fontSize: '0.82rem', color: 'var(--ink-faint)' }}>Prep: {recipe.prep_time}m</span>}
              {recipe.cook_time && <span style={{ fontSize: '0.82rem', color: 'var(--ink-faint)' }}>Cook: {recipe.cook_time}m</span>}
              {recipe.servings && <span style={{ fontSize: '0.82rem', color: 'var(--ink-faint)' }}>{recipe.servings} servings</span>}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        {recipe.description && (
          <p style={{ color: 'var(--ink-light)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 20 }}>
            {recipe.description}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Ingredients */}
          <div>
            <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 12 }}>Ingredients</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(recipe.ingredients || []).map((ing, i) => (
                <li key={i} style={{ fontSize: '0.88rem', color: 'var(--ink-light)', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ color: 'var(--terracotta)', fontSize: '0.7rem' }}>●</span>
                  <span><strong>{ing.amount} {ing.unit}</strong> {ing.name}</span>
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
      </div>
    </div>
  );
}
