import axios from 'axios';
import { supabase } from './supabase';

const MARKETSTACK_API_KEY = import.meta.env.VITE_MARKETSTACK_API_KEY;
const MARKETSTACK_BASE_URL = 'https://api.marketstack.com/v2';

export interface StockQuote {
  symbol: string;
  market: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  change_percent: number;
  date: string;
  lastUpdated: string;
}

/**
 * Get stock ticker symbol for Marketstack API
 * Marketstack uses different symbol formats
 */
function getMarketstackSymbol(symbol: string, market: string): string {
  const cleanSymbol = symbol.split('.')[0].toUpperCase();

  if (market === 'HK') {
    // Marketstack expects 4-digit or 5-digit symbols for HK with .XHKG
    // If the symbol is 5 digits with a leading zero (e.g., 00001), trim one zero to make it 4 digits (0001)
    let finalSymbol = cleanSymbol;
    if (finalSymbol.length === 5 && finalSymbol.startsWith('0')) {
      finalSymbol = finalSymbol.substring(1);
    }
    return `${finalSymbol}.HK`;
  } else if (market === 'CN') {
    // China: Add .XSHG (Shanghai) or .XSHE (Shenzhen)
    if (symbol.toUpperCase().endsWith('.XSHE')) return symbol.toUpperCase();
    if (symbol.toUpperCase().endsWith('.XSHG')) return symbol.toUpperCase();

    // Check if it's likely Shenzhen (starts with 0 or 3) vs Shanghai (starts with 6)
    if (cleanSymbol.startsWith('0') || cleanSymbol.startsWith('3')) {
      return `${cleanSymbol}.XSHE`;
    }
    return `${cleanSymbol}.XSHG`;
  } else if (market === 'US') {
    return cleanSymbol;
  }
  return cleanSymbol;
}

/**
 * Fetch latest intraday stock data from Marketstack
 */
export async function getStockQuote(
  symbol: string,
  market: string
): Promise<StockQuote> {
  try {
    // 1. Check cache first (avoid unnecessary API calls)
    const { data: cached } = await supabase
      .from('stock_cache')
      .select('*')
      .eq('symbol', symbol)
      .eq('market', market)
      .single();

    // If cache is fresh (< 12 hours), return it
    if (cached) {
      const cacheAge = Date.now() - new Date(cached.last_updated).getTime();
      if (cacheAge < 12 * 60 * 60 * 1000) { // 12 hours
        return {
          symbol: cached.symbol,
          market: cached.market,
          name: cached.name || symbol,
          price: parseFloat(cached.price.toString()),
          open: parseFloat(cached.price.toString()),
          high: parseFloat(cached.price.toString()),
          low: parseFloat(cached.price.toString()),
          close: parseFloat(cached.price.toString()),
          volume: cached.volume || 0,
          change: cached.change ? parseFloat(cached.change.toString()) : 0,
          change_percent: cached.change_percent ? parseFloat(cached.change_percent.toString()) : 0,
          date: new Date(cached.last_updated).toISOString(),
          lastUpdated: cached.last_updated
        };
      }
    }

    // 2. Fetch from Marketstack API
    const marketstackSymbol = getMarketstackSymbol(symbol, market);
    
    // Using v2 eod as requested
    const response = await axios.get(`${MARKETSTACK_BASE_URL}/eod`, {
      params: {
        access_key: MARKETSTACK_API_KEY,
        symbols: marketstackSymbol
      }
    });

    // Check if we got data
    if (!response.data.data || response.data.data.length === 0) {
      throw new Error(`No data found for ${symbol} in ${market} market`);
    }

    const data = response.data.data[0];
    
    // In EOD, use 'close' as the price
    const currentPrice = data.close || data.open || data.last;
    const openPrice = data.open || currentPrice;
    const change = currentPrice - openPrice;
    const change_percent = openPrice !== 0 ? ((change / openPrice) * 100) : 0;

    const quote: StockQuote = {
      symbol: symbol,
      market: market,
      name: data.symbol || symbol,
      price: currentPrice,
      open: openPrice,
      high: data.high || currentPrice,
      low: data.low || currentPrice,
      close: data.close || currentPrice,
      volume: data.volume || 0,
      change: change,
      change_percent: change_percent,
      date: data.date,
      lastUpdated: new Date().toISOString()
    };

    // 3. Update cache
    await supabase
      .from('stock_cache')
      .upsert({
        symbol: symbol,
        market: market,
        name: data.symbol,
        price: currentPrice,
        change: change,
        change_percent: change_percent,
        volume: data.volume || 0,
        last_updated: new Date().toISOString()
      });

    return quote;
  } catch (error: any) {
    console.error('Marketstack API Error:', error);
    
    // If API fails, try to return cached data even if stale
    const { data: cached } = await supabase
      .from('stock_cache')
      .select('*')
      .eq('symbol', symbol)
      .eq('market', market)
      .single();

    if (cached) {
      console.warn('Returning stale cache due to API error');
      return {
        symbol: cached.symbol,
        market: cached.market,
        name: cached.name || symbol,
        price: parseFloat(cached.price.toString()),
        open: parseFloat(cached.price.toString()),
        high: parseFloat(cached.price.toString()),
        low: parseFloat(cached.price.toString()),
        close: parseFloat(cached.price.toString()),
        volume: cached.volume || 0,
        change: cached.change ? parseFloat(cached.change.toString()) : 0,
        change_percent: cached.change_percent ? parseFloat(cached.change_percent.toString()) : 0,
        date: new Date(cached.last_updated).toISOString().split('T')[0],
        lastUpdated: cached.last_updated
      };
    }

    throw new Error(`Failed to fetch stock data: ${error.message}`);
  }
}

/**
 * Fetch multiple stocks at once
 */
export async function getMultipleStocks(
  symbols: Array<{ symbol: string; market: string }>
): Promise<StockQuote[]> {
  const quotes = await Promise.all(
    symbols.map(({ symbol, market }) => getStockQuote(symbol, market))
  );
  return quotes;
}

/**
 * Get available exchanges/markets
 */
export const SUPPORTED_MARKETS = [
  { code: 'HK', name: 'Hong Kong Stock Exchange', suffix: '.HK' },
  { code: 'CN', name: 'China Stock Market', suffix: '.XSHG' },
  { code: 'US', name: 'US Stock Market', suffix: '' }
];

/**
 * Example stock symbols for testing
 */
export const EXAMPLE_STOCKS = {
  HK: [
    { symbol: '0005', name: 'HSBC Holdings' },
    { symbol: '0700', name: 'Tencent Holdings' },
    { symbol: '0941', name: 'China Mobile' },
    { symbol: '1299', name: 'AIA Group' }
  ],
  CN: [
    { symbol: '600000', name: 'Pudong Development Bank' },
    { symbol: '600036', name: 'China Merchants Bank' },
    { symbol: '601398', name: 'Industrial and Commercial Bank of China' }
  ],
  US: [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' }
  ]
};
