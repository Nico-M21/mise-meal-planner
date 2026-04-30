# Mise — Family Meal Planner

## Setup Instructions

### 1. Set up the Supabase database
1. Go to https://supabase.com/dashboard/project/beackhiisfwbilzexavh/sql
2. Open the SQL Editor
3. Copy and paste the entire contents of `supabase_schema.sql`
4. Click "Run"

### 2. Push to GitHub
1. Create a new repo at https://github.com/new (name it `mise-meal-planner` or whatever you want)
2. In your terminal, navigate to this folder and run:
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 3. Deploy to Netlify
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub account
4. Select your repo
5. Set build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `build`
6. Click "Deploy site"

That's it. Every time you push changes to GitHub, Netlify auto-deploys.

---

## Features
- **Recipe Book** — Browse, search, filter, and rate saved recipes
- **Add Recipe** — Import via URL, photo/video upload, or manual entry (AI-powered extraction)
- **Meal Planner** — AI suggests meals for the week, swap any meal, adjust servings per meal
- **Grocery List** — Auto-generated from your meal plan, organized by category, pantry staples excluded
- **Settings** — Manage your pantry staples list
