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
  cash_balance: number; // USD based
  created_at: string;
  updated_at: string;
}

// Fixed Exchange Rates
// 1 USD = 7.75 HKD
// 1 HKD = 0.89 CNY (inverse: 1 CNY = 1/0.89 HKD ≈ 1.124 HKD)
export const EXCHANGE_RATES = {
  USD_TO_HKD: 7.75,
  HKD_TO_CNY: 0.89,
};

/**
 * Get display currency for a market
 */
export function getMarketCurrency(market: string): string {
  switch (market) {
    case 'HK': return 'HKD';
    case 'CN': return 'CNY';
    case 'US': return 'USD';
    default: return 'USD';
  }
}

/**
 * Convert value from market currency to USD for portfolio calculation
 */
export function convertToUSD(amount: number, market: string): number {
  if (market === 'US') return amount;
  if (market === 'HK') return amount / EXCHANGE_RATES.USD_TO_HKD;  // HKD to USD
  if (market === 'CN') {
    // CNY to HKD then HKD to USD
    const hkdVal = amount / EXCHANGE_RATES.HKD_TO_CNY;  // CNY -> HKD
    return hkdVal / EXCHANGE_RATES.USD_TO_HKD;  // HKD -> USD
  }
  return amount;
}

/**
 * Convert from USD to market currency
 */
export function convertFromUSD(amountUSD: number, market: string): number {
  if (market === 'US') return amountUSD;
  if (market === 'HK') return amountUSD * EXCHANGE_RATES.USD_TO_HKD;  // USD -> HKD
  if (market === 'CN') {
    // USD to HKD then HKD to CNY
    const hkdVal = amountUSD * EXCHANGE_RATES.USD_TO_HKD;  // USD -> HKD
    return hkdVal * EXCHANGE_RATES.HKD_TO_CNY;  // HKD -> CNY
  }
  return amountUSD;
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
  user_id: string;
  symbol: string;
  market: string;
  shares: number;
  average_cost: number;
  type?: 'buy' | 'sell';  // 'buy' for long positions (shares > 0), 'sell' for short positions (shares < 0)
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

export interface Transaction {
  id: string;
  portfolio_id: string;
  user_id: string;
  symbol: string;
  symbol_name: string;
  market: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  currency: string;
  transaction_date: string;
  created_at: string;
}
