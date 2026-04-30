import React, { useState } from 'react';
import { Clock, Users, ChefHat, Star, Trash2, Eye } from 'lucide-react';

export function RecipeCard({ recipe, onRate, onDelete, onView }) {
  const [hoverStar, setHoverStar] = useState(0);

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', lineHeight: 1.3, flex: 1 }}>
          {recipe.title}
        </h3>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onView(recipe)} title="View recipe">
            <Eye size={14} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(recipe.id)} title="Delete" style={{ color: '#C0392B' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Description */}
      {recipe.description && (
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-light)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {recipe.description}
        </p>
      )}

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {recipe.cuisine && <span className="tag tag-cuisine">{recipe.cuisine}</span>}
        {totalTime > 0 && <span className="tag tag-time"><Clock size={10} /> {totalTime}m</span>}
        {recipe.servings && <span className="tag tag-protein"><Users size={10} /> {recipe.servings} servings</span>}
      </div>

      {/* Divider */}
      <div className="divider" style={{ margin: '4px 0' }} />

      {/* Rating */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="stars">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              className="star"
              onMouseEnter={() => setHoverStar(n)}
              onMouseLeave={() => setHoverStar(0)}
              onClick={() => onRate(recipe.id, n)}
              style={{ color: n <= (hoverStar || recipe.rating || 0) ? 'var(--gold)' : 'var(--border)' }}
            >
              ★
            </button>
          ))}
        </div>
        {recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--ink-faint)', textDecoration: 'none' }}>
            Source ↗
          </a>
        )}
      </div>
    </div>
  );
}
