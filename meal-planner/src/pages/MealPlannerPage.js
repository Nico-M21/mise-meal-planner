import React, { useState, useEffect } from 'react';
import { Shuffle, BookOpen, Users, RefreshCw, Check, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { suggestMeals, swapMeal, buildGroceryList } from '../lib/ai';
import { RecipeModal } from '../components/RecipeModal';

const PROTEINS = ['Any', 'Chicken', 'Beef', 'Pork', 'Fish', 'Shrimp', 'Vegetarian', 'Vegan'];
const CUISINES = ['Any', 'American', 'Mexican', 'Italian', 'Asian', 'Thai', 'Chinese', 'Japanese', 'Indian', 'Mediterranean'];
const COOK_TIMES = [{ label: 'Any', value: '' }, { label: 'Under 30 min', value: 30 }, { label: 'Under 45 min', value: 45 }, { label: 'Under 60 min', value: 60 }];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function MealPlannerPage({ showToast }) {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [pantryStaples, setPantryStaples] = useState([]);
  const [step, setStep] = useState('form'); // 'form' | 'plan' | 'grocery'

  // Form state
  const [mealCount, setMealCount] = useState(5);
  const [selectedDays, setSelectedDays] = useState([]);
  const [protein, setProtein] = useState('Any');
  const [cuisine, setCuisine] = useState('Any');
  const [cookTime, setCookTime] = useState('');

  // Plan state
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(null);

  // Grocery state
  const [groceryList, setGroceryList] = useState({});
  const [checkedItems, setCheckedItems] = useState({});

  // Pick from saved modal
  const [pickingFor, setPickingFor] = useState(null);
  const [expandedMeal, setExpandedMeal] = useState(null);

  useEffect(() => {
    supabase.from('recipes').select('*').then(({ data }) => setSavedRecipes(data || []));
    supabase.from('pantry_staples').select('name').then(({ data }) => setPantryStaples((data || []).map(d => d.name)));
  }, []);

  function toggleDay(day) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  async function generatePlan() {
    setLoading(true);
    try {
      const filters = {
        count: mealCount,
        days: selectedDays.length ? selectedDays : null,
        protein: protein !== 'Any' ? protein : null,
        cuisine: cuisine !== 'Any' ? cuisine : null,
        cookTime: cookTime || null,
        savedRecipes,
        pantryStaples,
      };
      const suggested = await suggestMeals(filters);
      const withServings = suggested.map(m => ({ ...m, targetServings: m.servings || 2, _filters: filters }));
      setMeals(withServings);
      setStep('plan');
    } catch (e) {
      showToast('Failed to generate meal plan. Try again.', 'error');
    }
    setLoading(false);
  }

  async function handleSwapAI(index) {
    setSwapping(index);
    try {
      const filters = { protein: protein !== 'Any' ? protein : null, cuisine: cuisine !== 'Any' ? cuisine : null, cookTime: cookTime || null };
      const newMeal = await swapMeal({ currentMeal: meals[index], filters, savedRecipes, pantryStaples });
      const updated = [...meals];
      updated[index] = { ...newMeal, targetServings: newMeal.servings || 2 };
      setMeals(updated);
    } catch (e) {
      showToast('Swap failed. Try again.', 'error');
    }
    setSwapping(null);
  }

  function handleSwapSaved(index, recipe) {
    const updated = [...meals];
    updated[index] = {
      ...recipe,
      from_saved: true,
      saved_recipe_id: recipe.id,
      targetServings: recipe.servings || 2,
    };
    setMeals(updated);
    setPickingFor(null);
    showToast(`Swapped to ${recipe.title}`, 'success');
  }

  function updateServings(index, val) {
    const updated = [...meals];
    updated[index] = { ...updated[index], targetServings: Math.max(1, val) };
    setMeals(updated);
  }

  function buildList() {
    const list = buildGroceryList(meals, pantryStaples);
    setGroceryList(list);
    setCheckedItems({});
    setStep('grocery');
  }

  function toggleChecked(key) {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function saveMealPlan() {
    try {
      const week = new Date().toISOString().split('T')[0];
      await supabase.from('meal_plans').insert(
        meals.map((m, i) => ({
          week_of: week,
          day: selectedDays[i] || DAYS[i] || `Meal ${i + 1}`,
          meal_type: 'dinner',
          recipe_title: m.title,
          recipe_id: m.saved_recipe_id || null,
          servings: m.targetServings,
        }))
      );
      showToast('Meal plan saved!', 'success');
    } catch (e) {
      showToast('Could not save plan to history.', 'error');
    }
  }

  // FORM
  if (step === 'form') {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Plan Your Week</h1>
          <p className="page-subtitle">Tell us what you need and we'll suggest meals</p>
        </div>
        <div className="card" style={{ maxWidth: 560 }}>
          {/* Meal count - required */}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="label">How many meals do you need? *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setMealCount(m => Math.max(1, m - 1))}>−</button>
              <span style={{ fontSize: '1.4rem', fontFamily: 'Playfair Display, serif', minWidth: 32, textAlign: 'center' }}>{mealCount}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setMealCount(m => Math.min(14, m + 1))}>+</button>
            </div>
          </div>

          <div className="divider" />
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-faint)', marginBottom: 16, letterSpacing: '1px', textTransform: 'uppercase' }}>Optional filters</p>

          {/* Days */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="label">Days</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DAYS.map(d => (
                <button key={d} onClick={() => toggleDay(d)}
                  className="btn btn-sm"
                  style={{ background: selectedDays.includes(d) ? 'var(--terracotta)' : 'var(--cream)', color: selectedDays.includes(d) ? 'white' : 'var(--ink-light)', border: '1px solid var(--border)' }}>
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Protein, cuisine, time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="form-group">
              <label className="label">Protein</label>
              <select className="input" value={protein} onChange={e => setProtein(e.target.value)}>
                {PROTEINS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Cuisine</label>
              <select className="input" value={cuisine} onChange={e => setCuisine(e.target.value)}>
                {CUISINES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Max Cook Time</label>
              <select className="input" value={cookTime} onChange={e => setCookTime(e.target.value)}>
                {COOK_TIMES.map(t => <option key={t.label} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <button className="btn btn-primary" onClick={generatePlan} disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            {loading ? <><span className="spinner" /> Generating plan...</> : 'Generate Meal Plan'}
          </button>
        </div>
      </div>
    );
  }

  // MEAL PLAN
  if (step === 'plan') {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Your Meal Plan</h1>
            <p className="page-subtitle">Swap any meal or adjust servings</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setStep('form')}>← Back</button>
            <button className="btn btn-primary" onClick={buildList}><ShoppingCart size={16} /> Build Grocery List</button>
          </div>
        </div>

        <div className="meal-plan-grid">
          {meals.map((meal, i) => (
            <div key={i} className="card fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                    {selectedDays[i] || `Meal ${i + 1}`}
                    {meal.from_saved && <span style={{ marginLeft: 8, color: 'var(--sage)', fontWeight: 600 }}>· Saved recipe</span>}
                  </div>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.15rem', marginBottom: 6 }}>{meal.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--ink-light)', lineHeight: 1.5, marginBottom: 8 }}>{meal.description}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {meal.cuisine && <span className="tag tag-cuisine">{meal.cuisine}</span>}
                    {meal.cook_time && <span className="tag tag-time">{meal.cook_time}m</span>}
                    {meal.protein && meal.protein !== 'Any' && <span className="tag tag-protein">{meal.protein}</span>}
                  </div>
                </div>

                {/* Servings */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', marginBottom: 4 }}>Servings</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => updateServings(i, (meal.targetServings || 2) - 1)}>−</button>
                    <span style={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{meal.targetServings || 2}</span>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => updateServings(i, (meal.targetServings || 2) + 1)}>+</button>
                  </div>
                </div>
              </div>

              {/* Expandable ingredients */}
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setExpandedMeal(expandedMeal === i ? null : i)} style={{ color: 'var(--ink-faint)', fontSize: '0.8rem' }}>
                  {expandedMeal === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {expandedMeal === i ? 'Hide' : 'Show'} ingredients
                </button>
                {expandedMeal === i && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                      {(meal.ingredients || []).map((ing, j) => (
                        <span key={j} style={{ fontSize: '0.82rem', color: 'var(--ink-light)' }}>
                          {ing.amount} {ing.unit} {ing.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Swap actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleSwapAI(i)} disabled={swapping === i}>
                  {swapping === i ? <span className="spinner" /> : <Shuffle size={13} />}
                  New suggestion
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setPickingFor(i)}>
                  <BookOpen size={13} /> Pick from saved
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={buildList}><ShoppingCart size={16} /> Build Grocery List</button>
          <button className="btn btn-secondary" onClick={saveMealPlan}>Save Plan</button>
        </div>

        {/* Pick from saved modal */}
        {pickingFor !== null && (
          <div className="modal-overlay" onClick={() => setPickingFor(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Pick a Saved Recipe</h2>
                <button className="btn btn-ghost" onClick={() => setPickingFor(null)}>✕</button>
              </div>
              {savedRecipes.length === 0 ? (
                <p style={{ color: 'var(--ink-faint)' }}>No saved recipes yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {savedRecipes.map(r => (
                    <button key={r.id} onClick={() => handleSwapSaved(pickingFor, r)}
                      style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{r.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--ink-faint)' }}>{r.cuisine} · {(r.prep_time || 0) + (r.cook_time || 0)}m</div>
                      </div>
                      <Check size={16} style={{ color: 'var(--sage)' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // GROCERY LIST
  if (step === 'grocery') {
    const allItems = Object.values(groceryList).flat();
    const checkedCount = Object.values(checkedItems).filter(Boolean).length;

    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Grocery List</h1>
            <p className="page-subtitle">{checkedCount} of {allItems.length} items checked</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setStep('plan')}>← Back to plan</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {Object.entries(groceryList).map(([category, items]) => (
            <div key={category} className="card grocery-category">
              <div className="grocery-category-title">{category}</div>
              {items.map((item, i) => {
                const key = `${category}-${i}`;
                return (
                  <div key={key} className={`grocery-item ${checkedItems[key] ? 'checked' : ''}`} onClick={() => toggleChecked(key)} style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!checkedItems[key]} onChange={() => toggleChecked(key)} onClick={e => e.stopPropagation()} />
                    <span style={{ flex: 1 }}>
                      <strong>{item.totalAmount % 1 === 0 ? item.totalAmount : item.totalAmount.toFixed(1)} {item.unit}</strong> {item.name}
                    </span>
                    {item.meals?.length > 1 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--ink-faint)' }}>{item.meals.length} meals</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {pantryStaples.length > 0 && (
          <p style={{ marginTop: 16, fontSize: '0.82rem', color: 'var(--ink-faint)' }}>
            ✓ {pantryStaples.length} pantry staple{pantryStaples.length !== 1 ? 's' : ''} excluded from this list
          </p>
        )}
      </div>
    );
  }

  return null;
}
