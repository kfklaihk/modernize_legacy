import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { supabase, convertToUSD, getMarketCurrency, EXCHANGE_RATES } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getStockQuote } from '../lib/marketstack';
import type { Portfolio, Holding } from '../lib/supabase';

interface PortfolioWithValue extends Portfolio {
  totalValue: number;
  totalCost: number;
  profitLoss: number;
  profitLossPercent: number;
}

interface HoldingWithPrice extends Holding {
  currentPrice: number;
  currentValue: number; // in USD
  currentValueMarket: number; // in Market Currency
  profitLoss: number; // in USD
  currency: string;
  stockName: string;
  transactionType: 'buy' | 'sell'; // from transactions
  transactionDate: string;
  transactionPrice: number;
  positionType: 'buy' | 'sell'; // computed: 'buy' if shares > 0, 'sell' if shares < 0
}

export function PortfolioManager() {
  const { profile, refreshProfile } = useAuth();
  const [portfolios, setPortfolios] = useState<PortfolioWithValue[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<HoldingWithPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const [longValue, setLongValue] = useState(0);  // Buy stocks value
  const [shortValue, setShortValue] = useState(0); // Sell stocks value (absolute)

  useEffect(() => {
    if (profile?.id) {
      loadPortfolios();
    } else {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (selectedPortfolio) {
      loadHoldings(selectedPortfolio);
    }
  }, [selectedPortfolio]);

  const loadPortfolios = async () => {
    if (!profile?.id) return;
    try {
      setLoading(true);
      const { data: portfoliosData, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate portfolio values
      const portfoliosWithValues = await Promise.all(
        (portfoliosData || []).map(async (portfolio) => {
          const { data: holdingsData } = await supabase
            .from('holdings')
            .select('*')
            .eq('portfolio_id', portfolio.id);

          let totalValue = 0;
          let totalCost = 0;

          if (holdingsData) {
            for (const holding of holdingsData) {
              try {
                const quote = await getStockQuote(holding.symbol, holding.market);
                const currentValueUSD = convertToUSD(holding.shares * quote.price, holding.market);
                const costUSD = convertToUSD(holding.shares * holding.average_cost, holding.market);
                totalValue += currentValueUSD;
                totalCost += costUSD;
              } catch (error) {
                console.error(`Error fetching price for ${holding.symbol}:`, error);
                const costUSD = convertToUSD(holding.shares * holding.average_cost, holding.market);
                totalCost += costUSD;
                totalValue += costUSD; // Fallback
              }
            }
          }

          const profitLoss = totalValue - totalCost;
          const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

          return {
            ...portfolio,
            totalValue,
            totalCost,
            profitLoss,
            profitLossPercent,
          };
        })
      );

      setPortfolios(portfoliosWithValues);
      if (portfoliosWithValues.length > 0 && !selectedPortfolio) {
        setSelectedPortfolio(portfoliosWithValues[0].id);
      }
    } catch (error) {
      console.error('Error loading portfolios:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHoldings = async (portfolioId: string) => {
    try {
      // Fetch transactions for reference (newest first)
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('transaction_date', { ascending: false });

      if (txError) {
        console.error('Transaction fetch error:', txError);
      }

      // Fetch holdings - IMPORTANT: this is the main data source
      const { data: holdingsData, error: hError } = await supabase
        .from('holdings')
        .select('*')
        .eq('portfolio_id', portfolioId);

      if (hError) {
        console.error('Holdings fetch error:', hError);
        throw hError;
      }

      console.log('Holdings fetched:', holdingsData?.length || 0, 'records');

      let totalLong = 0;
      let totalShort = 0;

      if (!holdingsData || holdingsData.length === 0) {
        setHoldings([]);
        setLongValue(0);
        setShortValue(0);
        refreshProfile();
        return;
      }

      const holdingsWithPrices = await Promise.all(
        holdingsData.map(async (holding) => {
          try {
            const quote = await getStockQuote(holding.symbol, holding.market);
            const currentPrice = quote.price;
            const currentValueMarket = holding.shares * currentPrice;
            const currentValueUSD = convertToUSD(currentValueMarket, holding.market);
            
            const costMarket = holding.shares * holding.average_cost;
            const costUSD = convertToUSD(costMarket, holding.market);
            
            const profitLossUSD = currentValueUSD - costUSD;

            // Get latest transaction(s) for this holding
            const holdingTxs = transactionsData?.filter(
              (tx) => tx.symbol === holding.symbol && tx.market === holding.market
            ) || [];
            
            const lastTx = holdingTxs[0]; // Already sorted by transaction_date desc

            // Determine position type: buy = shares > 0, sell = shares < 0
            const positionType: 'buy' | 'sell' = holding.shares >= 0 ? 'buy' : 'sell';

            // Track long/short values
            if (holding.shares > 0) {
              totalLong += currentValueUSD;
            } else if (holding.shares < 0) {
              totalShort += Math.abs(currentValueUSD);
            }

            return {
              ...holding,
              currentPrice,
              currentValue: currentValueUSD,
              currentValueMarket,
              profitLoss: profitLossUSD,
              currency: getMarketCurrency(holding.market),
              stockName: quote.name,
              transactionType: lastTx?.type || positionType,
              transactionDate: lastTx?.transaction_date || holding.created_at,
              transactionPrice: lastTx?.price || holding.average_cost,
              positionType,
            };
          } catch (error) {
            console.error(`Error fetching price for ${holding.symbol}:`, error);
            const costUSD = convertToUSD(holding.shares * holding.average_cost, holding.market);
            
            // Still track in long/short even on error
            if (holding.shares > 0) {
              totalLong += costUSD;
            } else if (holding.shares < 0) {
              totalShort += Math.abs(costUSD);
            }

            const lastTx = transactionsData?.find(
              (tx) => tx.symbol === holding.symbol && tx.market === holding.market
            );

            const positionType: 'buy' | 'sell' = holding.shares >= 0 ? 'buy' : 'sell';

            return {
              ...holding,
              currentPrice: holding.average_cost,
              currentValue: costUSD,
              currentValueMarket: holding.shares * holding.average_cost,
              profitLoss: 0,
              currency: getMarketCurrency(holding.market),
              stockName: holding.symbol,
              transactionType: lastTx?.type || positionType,
              transactionDate: lastTx?.transaction_date || holding.created_at,
              transactionPrice: lastTx?.price || holding.average_cost,
              positionType,
            };
          }
        })
      );

      console.log('Holdings with prices computed:', holdingsWithPrices.length);
      setHoldings(holdingsWithPrices);
      setLongValue(totalLong);
      setShortValue(totalShort);
      refreshProfile();
    } catch (error) {
      console.error('Error loading holdings:', error);
      setHoldings([]);
      setLongValue(0);
      setShortValue(0);
    }
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentPortfolio = portfolios.find((p) => p.id === selectedPortfolio);

  return (
    <Box>
      {/* Exchange Rate Info */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.50' }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Exchange Rates:</strong> 1 USD = {EXCHANGE_RATES.USD_TO_HKD} HKD | 1 HKD = {EXCHANGE_RATES.HKD_TO_CNY} CNY
        </Typography>
      </Paper>

      {/* Portfolio Value Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Cash Balance Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'secondary.light', color: 'white', height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Wallet size={20} />
                <Typography variant="body2" fontWeight="bold">
                  Cash (USD)
                </Typography>
              </Box>
              <Typography 
                sx={{ 
                  fontSize: 'clamp(1.5rem, 6vw, 2.5rem)', 
                  fontWeight: 'bold',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                ${profile?.cash_balance?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Long (Buy) Portfolio Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'success.light', color: 'white', height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp size={20} />
                <Typography variant="body2" fontWeight="bold">
                  Buy Portfolio ($)
                </Typography>
              </Box>
              <Typography 
                sx={{ 
                  fontSize: 'clamp(1.5rem, 6vw, 2.5rem)', 
                  fontWeight: 'bold',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                ${longValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Short (Sell) Portfolio Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'error.light', color: 'white', height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingDown size={20} />
                <Typography variant="body2" fontWeight="bold">
                  Sell Portfolio ($)
                </Typography>
              </Box>
              <Typography 
                sx={{ 
                  fontSize: 'clamp(1.5rem, 6vw, 2.5rem)', 
                  fontWeight: 'bold',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                ${shortValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* Holdings Table */}
      {currentPortfolio && (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Holdings
          </Typography>

          {holdings.length === 0 ? (
            <Alert severity="info">
              No holdings yet. Use the trading interface below to buy or sell stocks.
            </Alert>
          ) : (
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.light' }}>
                    <TableCell><strong>Buy/Sell</strong></TableCell>
                    <TableCell><strong>Stock Code</strong></TableCell>
                    <TableCell><strong>Stock Name</strong></TableCell>
                    <TableCell><strong>Transaction Date</strong></TableCell>
                    <TableCell align="right"><strong>Transaction Price</strong></TableCell>
                    <TableCell align="right"><strong>Number of Shares</strong></TableCell>
                    <TableCell align="right"><strong>Latest EOD Price</strong></TableCell>
                    <TableCell><strong>Currency</strong></TableCell>
                    <TableCell align="right"><strong>Gain/Loss Amount</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {holdings.map((holding) => (
                    <TableRow key={holding.id} hover>
                      <TableCell>
                        <Chip
                          label={holding.positionType.toUpperCase()}
                          color={holding.positionType === 'buy' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{holding.symbol}</TableCell>
                      <TableCell>{holding.stockName}</TableCell>
                      <TableCell>{new Date(holding.transactionDate).toLocaleDateString()}</TableCell>
                      <TableCell align="right">{holding.transactionPrice?.toFixed(4) ?? '0.00'}</TableCell>
                      <TableCell align="right">{Math.abs(holding.shares).toLocaleString()}</TableCell>
                      <TableCell align="right">{holding.currentPrice?.toFixed(4) ?? '0.00'}</TableCell>
                      <TableCell>{holding.currency}</TableCell>
                      <TableCell align="right">
                        <Typography
                          fontWeight="bold"
                          color={holding.profitLoss >= 0 ? 'success.main' : 'error.main'}
                        >
                          {holding.profitLoss >= 0 ? '+' : ''}${holding.profitLoss.toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </Box>
  );
}
