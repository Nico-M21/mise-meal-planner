-- Run this entire script in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/beackhiisfwbilzexavh/sql

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  cuisine TEXT,
  tags JSONB DEFAULT '[]',
  source_url TEXT,
  image_url TEXT,
  ingredients JSONB DEFAULT '[]',
  steps JSONB DEFAULT '[]',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pantry staples table
CREATE TABLE IF NOT EXISTS pantry_staples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal plans table (for saving weekly plans)
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_of DATE NOT NULL,
  day TEXT,
  meal_type TEXT DEFAULT 'dinner',
  recipe_title TEXT,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  servings INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (open access since no auth)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_staples ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no login required)
CREATE POLICY "Allow all on recipes" ON recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on pantry_staples" ON pantry_staples FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on meal_plans" ON meal_plans FOR ALL USING (true) WITH CHECK (true);
