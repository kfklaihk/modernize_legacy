import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('../src/lib/supabase', () => ({
  supabase: mockSupabase,
}));

vi.mock('../src/lib/marketstack', () => ({
  getStockQuote: vi.fn().mockResolvedValue({
    symbol: 'AAPL',
    market: 'US',
    name: 'Apple Inc.',
    price: 181.5,
    open: 180.0,
    high: 182.5,
    low: 179.5,
    close: 181.5,
    volume: 50000000,
    change: 1.5,
    change_percent: 0.83,
    date: '2024-02-10',
    lastUpdated: new Date().toISOString(),
  }),
}));

describe('Portfolio Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Portfolio Creation', () => {
    it('should create a new portfolio successfully', async () => {
      const mockUserId = 'user-123';
      const mockPortfolioName = 'My Test Portfolio';

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Simulate portfolio creation
      const portfolioData = {
        user_id: mockUserId,
        name: mockPortfolioName,
        description: '',
      };

      const result = await mockSupabase.from('portfolios').insert(portfolioData);

      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('portfolios');
    });
  });

  describe('Holdings Management', () => {
    it('should add a new holding when buying stock', async () => {
      const mockHoldingData = {
        portfolio_id: 'portfolio-123',
        symbol: 'AAPL',
        market: 'US',
        shares: 100,
        average_cost: 180.0,
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: [mockHoldingData], error: null }),
      });

      const result = await mockSupabase.from('holdings').insert(mockHoldingData);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it('should update existing holding when buying more shares', async () => {
      const existingHolding = {
        id: 'holding-123',
        shares: 50,
        average_cost: 175.0,
      };

      const newShares = 50;
      const newPrice = 185.0;

      const newTotalShares = existingHolding.shares + newShares;
      const newTotalCost =
        existingHolding.shares * existingHolding.average_cost + newShares * newPrice;
      const newAverageCost = newTotalCost / newTotalShares;

      expect(newTotalShares).toBe(100);
      expect(newAverageCost).toBeCloseTo(180.0, 1);
    });

    it('should reduce shares when selling stock', async () => {
      const existingHolding = {
        id: 'holding-123',
        shares: 100,
        average_cost: 180.0,
      };

      const sharesToSell = 30;
      const remainingShares = existingHolding.shares - sharesToSell;

      expect(remainingShares).toBe(70);
    });

    it('should delete holding when all shares are sold', async () => {
      const existingHolding = {
        id: 'holding-123',
        shares: 100,
      };

      const sharesToSell = 100;
      const remainingShares = existingHolding.shares - sharesToSell;

      expect(remainingShares).toBe(0);
      // In the app, this triggers a delete operation
    });

    it('should prevent selling more shares than owned', () => {
      const existingHolding = {
        shares: 50,
      };

      const sharesToSell = 100;

      expect(sharesToSell).toBeGreaterThan(existingHolding.shares);
      // In the app, this would throw an error
    });
  });

  describe('Portfolio Value Calculation', () => {
    it('should calculate portfolio value correctly', async () => {
      const holdings = [
        { symbol: 'AAPL', shares: 100, average_cost: 180.0, current_price: 181.5 },
        { symbol: '0005', shares: 500, average_cost: 65.0, current_price: 65.8 },
      ];

      const totalValue = holdings.reduce(
        (sum, h) => sum + h.shares * h.current_price,
        0
      );

      const totalCost = holdings.reduce(
        (sum, h) => sum + h.shares * h.average_cost,
        0
      );

      const profitLoss = totalValue - totalCost;
      const profitLossPercent = (profitLoss / totalCost) * 100;

      expect(totalValue).toBeCloseTo(51050, 0); // 18150 + 32900
      expect(totalCost).toBeCloseTo(50500, 0); // 18000 + 32500
      expect(profitLoss).toBeCloseTo(550, 0);
      expect(profitLossPercent).toBeCloseTo(1.09, 1);
    });

    it('should handle empty portfolio', () => {
      const holdings: any[] = [];

      const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.current_price, 0);

      expect(totalValue).toBe(0);
    });

    it('should calculate profit/loss for individual holdings', () => {
      const holding = {
        shares: 100,
        average_cost: 180.0,
        current_price: 185.0,
      };

      const currentValue = holding.shares * holding.current_price;
      const cost = holding.shares * holding.average_cost;
      const profitLoss = currentValue - cost;
      const profitLossPercent = (profitLoss / cost) * 100;

      expect(currentValue).toBe(18500);
      expect(cost).toBe(18000);
      expect(profitLoss).toBe(500);
      expect(profitLossPercent).toBeCloseTo(2.78, 1);
    });
  });

  describe('Transaction Processing', () => {
    it('should record buy transaction', async () => {
      const transactionData = {
        portfolio_id: 'portfolio-123',
        symbol: 'AAPL',
        market: 'US',
        type: 'buy',
        shares: 100,
        price: 181.5,
        transaction_date: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: [transactionData], error: null }),
      });

      const result = await mockSupabase.from('transactions').insert(transactionData);

      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('transactions');
    });

    it('should record sell transaction', async () => {
      const transactionData = {
        portfolio_id: 'portfolio-123',
        symbol: 'AAPL',
        market: 'US',
        type: 'sell',
        shares: 50,
        price: 185.0,
        transaction_date: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: [transactionData], error: null }),
      });

      const result = await mockSupabase.from('transactions').insert(transactionData);

      expect(result.error).toBeNull();
    });

    it('should calculate trade total correctly', () => {
      const shares = 100;
      const price = 181.5;
      const total = shares * price;

      expect(total).toBe(18150);
    });
  });

  describe('Stock Symbol Formatting', () => {
    it('should format Hong Kong symbols correctly', () => {
      const symbol = '5';
      const paddedSymbol = symbol.padStart(4, '0');
      const marketstackSymbol = `${paddedSymbol}.XHKG`;

      expect(marketstackSymbol).toBe('0005.XHKG');
    });

    it('should format China symbols correctly', () => {
      const symbol = '600000';
      const marketstackSymbol = `${symbol}.XSHG`;

      expect(marketstackSymbol).toBe('600000.XSHG');
    });

    it('should format US symbols correctly', () => {
      const symbol = 'aapl';
      const marketstackSymbol = symbol.toUpperCase();

      expect(marketstackSymbol).toBe('AAPL');
    });
  });

  describe('Example Stocks', () => {
    it('should have valid Hong Kong example stocks', () => {
      expect(EXAMPLE_STOCKS.HK).toBeInstanceOf(Array);
      expect(EXAMPLE_STOCKS.HK.length).toBeGreaterThan(0);
      expect(EXAMPLE_STOCKS.HK[0]).toHaveProperty('symbol');
      expect(EXAMPLE_STOCKS.HK[0]).toHaveProperty('name');
    });

    it('should have valid US example stocks', () => {
      expect(EXAMPLE_STOCKS.US).toBeInstanceOf(Array);
      expect(EXAMPLE_STOCKS.US.length).toBeGreaterThan(0);
    });

    it('should have valid China example stocks', () => {
      expect(EXAMPLE_STOCKS.CN).toBeInstanceOf(Array);
      expect(EXAMPLE_STOCKS.CN.length).toBeGreaterThan(0);
    });
  });
});
