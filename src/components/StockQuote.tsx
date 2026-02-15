import { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Alert,
  Grid,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { TrendingUp, TrendingDown, RefreshCcw, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useStockPrice } from '../hooks/useStockPrice';
import { SUPPORTED_MARKETS } from '../lib/marketstack';
import { STOCK_LISTS } from '../lib/stockLists';
import { supabase, convertToUSD, getMarketCurrency } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface StockQuoteProps {
  onTradeComplete?: () => void;
}

export function StockQuote({ onTradeComplete }: StockQuoteProps) {
  const { profile, refreshProfile } = useAuth();
  const [symbol, setSymbol] = useState('0005.HK');
  const [market, setMarket] = useState('HK');
  const [searchSymbol, setSearchSymbol] = useState('0005.HK');
  const [searchMarket, setSearchMarket] = useState('HK');
  const [shares, setShares] = useState('');
  const [loading, setLoading] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [tradeSuccess, setTradeSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');

  const { data: quote, isLoading, error: quoteError } = useStockPrice(searchSymbol, searchMarket);

  const handleSearch = () => {
    setSearchSymbol(symbol);
    setSearchMarket(market);
    setTradeSuccess('');
    setTradeError('');
  };

  const handleTradeAction = (type: 'buy' | 'sell') => {
    const sharesNum = parseInt(shares);
    if (!shares || isNaN(sharesNum) || sharesNum <= 0) {
      setTradeError('Please enter a valid number of shares');
      return;
    }
    setTradeType(type);
    setConfirmOpen(true);
  };

  const executeTrade = async () => {
    setConfirmOpen(false);
    if (!quote) return;

    try {
      setLoading(true);
      setTradeError('');
      setTradeSuccess('');

      const sharesNum = parseInt(shares);
      if (isNaN(sharesNum)) throw new Error('Invalid number of shares');

      const priceNum = quote.price;
      const totalValueMarket = sharesNum * priceNum;
      const totalValueUSD = convertToUSD(totalValueMarket, quote.market);

      // Check cash for buy
      if (tradeType === 'buy' && (profile?.cash_balance ?? 0) < totalValueUSD) {
        setTradeError(`Insufficient cash. Required: $${totalValueUSD.toFixed(2)} USD, Available: $${profile?.cash_balance?.toFixed(2) ?? '0.00'} USD`);
        return;
      }

      const userId = profile?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Ensure a portfolio exists for this specific user
      let currentPortfolioId;
      const { data: existingPortfolios } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (existingPortfolios && existingPortfolios.length > 0) {
        currentPortfolioId = existingPortfolios[0].id;
      } else {
        const { data: newPortfolio, error: pfError } = await supabase
          .from('portfolios')
          .insert({ 
            name: 'Main Portfolio', 
            user_id: userId,
            description: 'Primary trading portfolio'
          })
          .select()
          .single();
        
        if (pfError) throw pfError;
        currentPortfolioId = newPortfolio.id;
      }

      // Create transaction record
      const { error: txError } = await supabase.from('transactions').insert({
        portfolio_id: currentPortfolioId,
        user_id: userId,
        symbol: quote.symbol.toUpperCase(),
        symbol_name: quote.name || quote.symbol.toUpperCase(),
        market: quote.market,
        type: tradeType,
        shares: sharesNum,
        price: priceNum,
        currency: getMarketCurrency(quote.market),
        transaction_date: new Date().toISOString(),
      });

      if (txError) throw txError;

      // Update User Cash Balance
      const newCashBalance = tradeType === 'buy' 
        ? (profile?.cash_balance || 0) - totalValueUSD
        : (profile?.cash_balance || 0) + totalValueUSD;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ cash_balance: newCashBalance })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update holdings - use array instead of single() to handle no-data case
      const { data: existingHoldingArray, error: holdingError } = await supabase
        .from('holdings')
        .select('*')
        .eq('portfolio_id', currentPortfolioId)
        .eq('symbol', quote.symbol.toUpperCase())
        .eq('market', quote.market);

      if (holdingError && holdingError.code !== 'PGRST116') throw holdingError;
      const existingHolding = existingHoldingArray && existingHoldingArray.length > 0 ? existingHoldingArray[0] : null;

      if (tradeType === 'buy') {
        if (existingHolding) {
          const newTotalShares = existingHolding.shares + sharesNum;
          const newTotalCost = existingHolding.shares * existingHolding.average_cost + sharesNum * priceNum;
          const newAverageCost = newTotalCost / newTotalShares;

          const { error: updateError } = await supabase
            .from('holdings')
            .update({
              shares: newTotalShares,
              average_cost: newAverageCost,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingHolding.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase.from('holdings').insert({
            portfolio_id: currentPortfolioId,
            user_id: userId,
            symbol: quote.symbol.toUpperCase(),
            market: quote.market,
            shares: sharesNum,
            average_cost: priceNum,
            type: 'buy',
          });
          if (insertError) throw insertError;
        }
      } else {
        // Sell
        if (existingHolding) {
          const newShares = existingHolding.shares - sharesNum;
          if (newShares === 0) {
            await supabase.from('holdings').delete().eq('id', existingHolding.id);
          } else {
            await supabase.from('holdings').update({
              shares: newShares,
              updated_at: new Date().toISOString(),
            }).eq('id', existingHolding.id);
          }
        } else {
          // New short position
          const { error: insertError } = await supabase.from('holdings').insert({
            portfolio_id: currentPortfolioId,
            user_id: userId,
            symbol: quote.symbol.toUpperCase(),
            market: quote.market,
            shares: -sharesNum,
            average_cost: priceNum,
            type: 'sell',
          });
          if (insertError) throw insertError;
        }
      }

      setTradeSuccess(
        `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${sharesNum} shares of ${quote.symbol.toUpperCase()} at ${getMarketCurrency(quote.market)} ${priceNum?.toFixed(2) ?? 'N/A'}`
      );
      setShares('');
      if (onTradeComplete) onTradeComplete();
      refreshProfile();
    } catch (err: any) {
      setTradeError(err.message || 'Trade execution failed');
    } finally {
      setLoading(false);
    }
  };

  const currentStocks = STOCK_LISTS[market] || [];

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Search & Query Form */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Autocomplete
          freeSolo
          options={currentStocks}
          getOptionLabel={(option) => typeof option === 'string' ? option : `${option.symbol} - ${option.name}`}
          value={currentStocks.find(o => o.symbol === symbol) || symbol}
          onChange={(_, newValue) => {
            if (typeof newValue === 'string') setSymbol(newValue);
            else if (newValue) setSymbol(newValue.symbol);
          }}
          onInputChange={(_, newValue) => setSymbol(newValue)}
          sx={{ flex: 1, minWidth: 300 }}
          renderInput={(params) => (
            <TextField {...params} label="Stock Code" placeholder="e.g., 0005, 600000, AAPL" />
          )}
        />
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Market</InputLabel>
          <Select value={market} label="Market" onChange={(e) => setMarket(e.target.value)}>
            {SUPPORTED_MARKETS.map((m) => (
              <MenuItem key={m.code} value={m.code}>{m.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={!symbol || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshCcw size={18} />}
          sx={{ minWidth: 120 }}
        >
          Query
        </Button>
      </Box>

      {/* Quote Display */}
      {quoteError && !isLoading && (
        <Alert severity="error" sx={{ mb: 3 }}>{quoteError instanceof Error ? quoteError.message : 'Failed to fetch stock data'}</Alert>
      )}

      {quote && !isLoading && (
        <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="h3" fontWeight="bold">
                {getMarketCurrency(quote.market)} {quote?.price?.toFixed(2) ?? 'N/A'}
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>{quote.symbol}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                {quote.change >= 0 ? <TrendingUp size={24} color="#4caf50" /> : <TrendingDown size={24} color="#f44336" />}
                <Typography variant="h6" fontWeight="bold">
                  {quote.change >= 0 ? '+' : ''}{quote?.change?.toFixed(2) ?? '0.00'} ({quote?.change_percent?.toFixed(2) ?? '0.00'}%)
                </Typography>
              </Box>
            </Grid>
            
            {/* Trading Inputs (Shares and Buy/Sell) */}
            <Grid item xs={12} md={6}>
              <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Trade This Stock</Typography>
                <TextField
                  fullWidth
                  label="Number of Shares"
                  type="number"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    color="success" 
                    onClick={() => handleTradeAction('buy')}
                    disabled={loading || !shares || parseInt(shares) <= 0}
                  >
                    Buy
                  </Button>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    color="error" 
                    onClick={() => handleTradeAction('sell')}
                    disabled={loading || !shares || parseInt(shares) <= 0}
                  >
                    Sell
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {tradeError && <Alert severity="error" sx={{ mb: 2 }}>{tradeError}</Alert>}
      {tradeSuccess && <Alert severity="success" sx={{ mb: 2 }}>{tradeSuccess}</Alert>}

      {!quote && !isLoading && !quoteError && (
        <Alert severity="info">Enter a stock symbol and click Query to track and trade</Alert>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertTriangle color="#ed6c02" /> Confirm {tradeType.toUpperCase()} Order
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to <strong>{tradeType}</strong> <strong>{shares}</strong> shares of <strong>{quote?.symbol.toUpperCase()}</strong> at <strong>{getMarketCurrency(quote?.market || '')} {quote?.price?.toFixed(2) ?? 'N/A'}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Estimated Total USD: ${convertToUSD(parseInt(shares) * (quote?.price || 0), quote?.market || '').toFixed(2)}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={executeTrade} 
            variant="contained" 
            color={tradeType === 'buy' ? 'success' : 'error'}
            startIcon={<ShoppingCart size={18} />}
          >
            Confirm {tradeType === 'buy' ? 'Buy' : 'Sell'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

