import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://beackhiisfwbilzexavh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYWNraGlpc2Z3YmlsemV4YXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1Mjc3MTQsImV4cCI6MjA5MzEwMzcxNH0.yYzi-NOQN9cgtKXhmi8BWwrBSu7biAxfq8JyB6eTMCA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
