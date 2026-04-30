import React, { useState } from 'react';
import './index.css';
import { BookOpen, Calendar, PlusCircle, Settings } from 'lucide-react';
import { RecipeBookPage } from './pages/RecipeBookPage';
import { AddRecipePage } from './pages/AddRecipePage';
import { MealPlannerPage } from './pages/MealPlannerPage';
import { SettingsPage } from './pages/SettingsPage';
import { useToast, Toast } from './hooks/useToast';

const NAV_ITEMS = [
  { key: 'recipes', label: 'Recipes', icon: BookOpen },
  { key: 'planner', label: 'Meal Planner', icon: Calendar },
  { key: 'add', label: 'Add Recipe', icon: PlusCircle },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [page, setPage] = useState('recipes');
  const [recipeRefresh, setRecipeRefresh] = useState(0);
  const { toast, showToast } = useToast();

  function handleRecipeSaved() {
    setRecipeRefresh(n => n + 1);
    setPage('recipes');
  }

  return (
    <div className="app-shell">
      <nav className="nav">
        <div className="nav-logo">
          Mise
          <span>family meal planner</span>
        </div>
        <div className="nav-links">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`nav-link ${page === key ? 'active' : ''}`}
              onClick={() => setPage(key)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="main-content">
        {page === 'recipes' && (
          <RecipeBookPage refreshTrigger={recipeRefresh} showToast={showToast} />
        )}
        {page === 'planner' && (
          <MealPlannerPage showToast={showToast} />
        )}
        {page === 'add' && (
          <AddRecipePage onSaved={handleRecipeSaved} showToast={showToast} />
        )}
        {page === 'settings' && (
          <SettingsPage showToast={showToast} />
        )}
      </main>

      <Toast toast={toast} />
    </div>
  );
}
