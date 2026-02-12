import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Holding {
  id: string;
  portfolio_id: string;
  symbol: string;
  market: string;
  shares: number;
  average_cost: number;
  created_at: string;
  updated_at: string;
}

export interface StockCache {
  id: string;
  symbol: string;
  market: string;
  name: string | null;
  price: number;
  change: number | null;
  change_percent: number | null;
  volume: number | null;
  last_updated: string;
}
