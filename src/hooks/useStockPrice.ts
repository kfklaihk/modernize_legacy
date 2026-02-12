import { useQuery } from '@tanstack/react-query';
import { getStockQuote, type StockQuote } from '../lib/marketstack';

export function useStockPrice(symbol: string, market: string) {
  return useQuery<StockQuote>({
    queryKey: ['stock', symbol, market],
    queryFn: () => getStockQuote(symbol, market),
    staleTime: 60 * 60 * 1000, // 1 hour (EOD data doesn't change frequently)
    refetchInterval: 60 * 60 * 1000, // Refetch every hour
    enabled: !!symbol && !!market, // Only fetch if both values are provided
    retry: 2,
  });
}
