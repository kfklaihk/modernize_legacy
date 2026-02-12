import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { getStockQuote, getMultipleStocks, EXAMPLE_STOCKS } from '../src/lib/marketstack';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock Supabase
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
  },
}));

describe('Marketstack API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStockQuote', () => {
    it('should fetch Hong Kong stock quote successfully', async () => {
      // Mock Marketstack API response
      const mockResponse = {
        data: {
          data: [
            {
              symbol: '0005.XHKG',
              open: 65.5,
              high: 66.2,
              low: 65.1,
              close: 65.8,
              volume: 1234567,
              date: '2024-02-10',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getStockQuote('0005', 'HK');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('0005');
      expect(result.market).toBe('HK');
      expect(result.price).toBe(65.8);
      expect(result.open).toBe(65.5);
      expect(result.high).toBe(66.2);
      expect(result.low).toBe(65.1);
      expect(result.volume).toBe(1234567);
      expect(result.change).toBeCloseTo(0.3, 1);
      expect(result.change_percent).toBeCloseTo(0.46, 1);
    });

    it('should fetch US stock quote successfully', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              symbol: 'AAPL',
              open: 180.0,
              high: 182.5,
              low: 179.5,
              close: 181.5,
              volume: 50000000,
              date: '2024-02-10',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getStockQuote('AAPL', 'US');

      expect(result.symbol).toBe('AAPL');
      expect(result.market).toBe('US');
      expect(result.price).toBe(181.5);
      expect(result.change).toBeCloseTo(1.5, 1);
    });

    it('should fetch China stock quote successfully', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              symbol: '600000.XSHG',
              open: 12.5,
              high: 12.8,
              low: 12.4,
              close: 12.7,
              volume: 8000000,
              date: '2024-02-10',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getStockQuote('600000', 'CN');

      expect(result.symbol).toBe('600000');
      expect(result.market).toBe('CN');
      expect(result.price).toBe(12.7);
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(getStockQuote('INVALID', 'US')).rejects.toThrow();
    });

    it('should format Hong Kong symbols correctly', async () => {
      const mockResponse = {
        data: { data: [{ symbol: '0005.XHKG', open: 65, high: 66, low: 64, close: 65.5, volume: 1000, date: '2024-02-10' }] },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await getStockQuote('5', 'HK'); // Should pad to 0005

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            symbols: '0005.XHKG',
          }),
        })
      );
    });
  });

  describe('getMultipleStocks', () => {
    it('should fetch multiple stocks simultaneously', async () => {
      const mockResponse1 = {
        data: { data: [{ symbol: '0005.XHKG', open: 65, high: 66, low: 64, close: 65.5, volume: 1000, date: '2024-02-10' }] },
      };
      const mockResponse2 = {
        data: { data: [{ symbol: 'AAPL', open: 180, high: 182, low: 179, close: 181, volume: 50000000, date: '2024-02-10' }] },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const results = await getMultipleStocks([
        { symbol: '0005', market: 'HK' },
        { symbol: 'AAPL', market: 'US' },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('0005');
      expect(results[1].symbol).toBe('AAPL');
    });
  });

  describe('EXAMPLE_STOCKS', () => {
    it('should have examples for all markets', () => {
      expect(EXAMPLE_STOCKS.HK).toBeDefined();
      expect(EXAMPLE_STOCKS.CN).toBeDefined();
      expect(EXAMPLE_STOCKS.US).toBeDefined();
      expect(EXAMPLE_STOCKS.HK.length).toBeGreaterThan(0);
      expect(EXAMPLE_STOCKS.CN.length).toBeGreaterThan(0);
      expect(EXAMPLE_STOCKS.US.length).toBeGreaterThan(0);
    });
  });
});
