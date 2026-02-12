import axios from 'axios';
import { supabase } from './supabase';

const MARKETSTACK_API_KEY = import.meta.env.VITE_MARKETSTACK_API_KEY;
const MARKETSTACK_BASE_URL = 'http://api.marketstack.com/v1';

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
  if (market === 'HK') {
    // Hong Kong: Add .XHKG suffix
    // Example: 0005 -> 0005.XHKG
    const paddedSymbol = symbol.padStart(4, '0');
    return `${paddedSymbol}.XHKG`;
  } else if (market === 'CN') {
    // China: Add .XSHG (Shanghai) or .XSHE (Shenzhen)
    // Default to Shanghai for now
    return `${symbol}.XSHG`;
  } else if (market === 'US') {
    // US stocks: No suffix needed
    return symbol.toUpperCase();
  }
  return symbol;
}

/**
 * Fetch latest EOD (End of Day) stock data from Marketstack
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

    // If cache is fresh (< 1 hour), return it
    if (cached) {
      const cacheAge = Date.now() - new Date(cached.last_updated).getTime();
      if (cacheAge < 60 * 60 * 1000) { // 1 hour
        return {
          symbol: cached.symbol,
          market: cached.market,
          name: cached.name || symbol,
          price: parseFloat(cached.price.toString()),
          open: parseFloat(cached.price.toString()), // Cache doesn't have these
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
    }

    // 2. Fetch from Marketstack API
    const marketstackSymbol = getMarketstackSymbol(symbol, market);
    
    const response = await axios.get(`${MARKETSTACK_BASE_URL}/eod/latest`, {
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
    
    // Calculate change and change percent
    const change = data.close - data.open;
    const change_percent = ((change / data.open) * 100);

    const quote: StockQuote = {
      symbol: symbol,
      market: market,
      name: data.symbol || symbol,
      price: data.close,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      volume: data.volume,
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
        price: data.close,
        change: change,
        change_percent: change_percent,
        volume: data.volume,
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
  { code: 'HK', name: 'Hong Kong Stock Exchange', suffix: '.XHKG' },
  { code: 'CN', name: 'Shanghai Stock Exchange', suffix: '.XSHG' },
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
