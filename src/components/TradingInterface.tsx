import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getStockQuote, EXAMPLE_STOCKS } from '../lib/marketstack';
import type { Portfolio } from '../lib/supabase';

interface TradingInterfaceProps {
  onTradeComplete?: () => void;
}

export function TradingInterface({ onTradeComplete }: TradingInterfaceProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState<'HK' | 'CN' | 'US'>('HK');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stockInfo, setStockInfo] = useState<any>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);

  useEffect(() => {
    loadPortfolios();
  }, []);

  const loadPortfolios = async () => {
    const { data } = await supabase
      .from('portfolios')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setPortfolios(data);
      if (data.length > 0) {
        setSelectedPortfolio(data[0].id);
      }
    }
  };

  const fetchStockPrice = async () => {
    if (!symbol || !market) return;

    try {
      setFetchingPrice(true);
      setError('');
      const quote = await getStockQuote(symbol, market);
      setStockInfo(quote);
      setPrice(quote.price.toString());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stock price');
      setStockInfo(null);
    } finally {
      setFetchingPrice(false);
    }
  };

  const executeTrade = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (!selectedPortfolio || !symbol || !shares || !price) {
        setError('Please fill in all fields');
        return;
      }

      const sharesNum = parseInt(shares);
      const priceNum = parseFloat(price);

      if (sharesNum <= 0) {
        setError('Shares must be greater than 0');
        return;
      }

      if (priceNum <= 0) {
        setError('Price must be greater than 0');
        return;
      }

      // Create transaction record
      const { error: txError } = await supabase.from('transactions').insert({
        portfolio_id: selectedPortfolio,
        symbol: symbol.toUpperCase(),
        market: market,
        type: tradeType,
        shares: sharesNum,
        price: priceNum,
        transaction_date: new Date().toISOString(),
      });

      if (txError) throw txError;

      // Update holdings
      const { data: existingHolding } = await supabase
        .from('holdings')
        .select('*')
        .eq('portfolio_id', selectedPortfolio)
        .eq('symbol', symbol.toUpperCase())
        .eq('market', market)
        .single();

      if (tradeType === 'buy') {
        if (existingHolding) {
          // Update existing holding
          const newTotalShares = existingHolding.shares + sharesNum;
          const newTotalCost =
            existingHolding.shares * existingHolding.average_cost + sharesNum * priceNum;
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
          // Create new holding
          const { error: insertError } = await supabase.from('holdings').insert({
            portfolio_id: selectedPortfolio,
            symbol: symbol.toUpperCase(),
            market: market,
            shares: sharesNum,
            average_cost: priceNum,
          });

          if (insertError) throw insertError;
        }
      } else {
        // Sell
        if (!existingHolding) {
          setError('You do not own this stock');
          return;
        }

        if (existingHolding.shares < sharesNum) {
          setError(`Insufficient shares. You own ${existingHolding.shares} shares.`);
          return;
        }

        const newShares = existingHolding.shares - sharesNum;

        if (newShares === 0) {
          // Delete holding if all shares sold
          const { error: deleteError } = await supabase
            .from('holdings')
            .delete()
            .eq('id', existingHolding.id);

          if (deleteError) throw deleteError;
        } else {
          // Update holding with reduced shares
          const { error: updateError } = await supabase
            .from('holdings')
            .update({
              shares: newShares,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingHolding.id);

          if (updateError) throw updateError;
        }
      }

      setSuccess(
        `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${sharesNum} shares of ${symbol.toUpperCase()} at $${priceNum}`
      );

      // Reset form
      setSymbol('');
      setShares('');
      setPrice('');
      setStockInfo(null);

      // Notify parent
      if (onTradeComplete) {
        onTradeComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Trade execution failed');
    } finally {
      setLoading(false);
    }
  };

  const stockOptions = EXAMPLE_STOCKS[market].map((s) => s.symbol);

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Trading Interface
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Portfolio Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Portfolio</InputLabel>
            <Select
              value={selectedPortfolio}
              label="Portfolio"
              onChange={(e) => setSelectedPortfolio(e.target.value)}
            >
              {portfolios.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Buy/Sell Toggle */}
        <Grid item xs={12} md={6}>
          <ToggleButtonGroup
            value={tradeType}
            exclusive
            onChange={(_, value) => value && setTradeType(value)}
            fullWidth
          >
            <ToggleButton value="buy" color="success">
              <TrendingUp size={18} style={{ marginRight: 8 }} />
              Buy
            </ToggleButton>
            <ToggleButton value="sell" color="error">
              <TrendingDown size={18} style={{ marginRight: 8 }} />
              Sell
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>

        {/* Market Selection */}
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Market</InputLabel>
            <Select value={market} label="Market" onChange={(e: any) => setMarket(e.target.value)}>
              <MenuItem value="HK">Hong Kong</MenuItem>
              <MenuItem value="CN">China</MenuItem>
              <MenuItem value="US">US</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Symbol Input with Autocomplete */}
        <Grid item xs={12} md={8}>
          <Autocomplete
            freeSolo
            options={stockOptions}
            value={symbol}
            onChange={(_, newValue) => setSymbol(newValue || '')}
            onInputChange={(_, newValue) => setSymbol(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Stock Symbol" placeholder="e.g., 0005, AAPL" />
            )}
          />
        </Grid>

        {/* Fetch Price Button */}
        <Grid item xs={12}>
          <Button
            fullWidth
            variant="outlined"
            onClick={fetchStockPrice}
            disabled={!symbol || fetchingPrice}
            startIcon={fetchingPrice && <CircularProgress size={16} />}
          >
            {fetchingPrice ? 'Fetching Price...' : 'Get Current Price'}
          </Button>
        </Grid>

        {/* Stock Info Display */}
        {stockInfo && (
          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>{stockInfo.name}</strong> ({stockInfo.symbol})
              </Typography>
              <Typography variant="h6">
                Current Price: ${stockInfo.price.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Change: {stockInfo.change >= 0 ? '+' : ''}${stockInfo.change.toFixed(2)} (
                {stockInfo.changePercent.toFixed(2)}%)
              </Typography>
            </Alert>
          </Grid>
        )}

        {/* Shares Input */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Number of Shares"
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            inputProps={{ min: 1 }}
          />
        </Grid>

        {/* Price Input */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Price per Share"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputProps={{ min: 0.01, step: 0.01 }}
          />
        </Grid>

        {/* Total Cost Display */}
        {shares && price && (
          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                bgcolor: tradeType === 'buy' ? 'success.50' : 'error.50',
                borderRadius: 1,
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                Total {tradeType === 'buy' ? 'Cost' : 'Proceeds'}:{' '}
                ${(parseInt(shares) * parseFloat(price)).toFixed(2)}
              </Typography>
            </Box>
          </Grid>
        )}

        {/* Execute Trade Button */}
        <Grid item xs={12}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={executeTrade}
            disabled={loading || !selectedPortfolio || !symbol || !shares || !price}
            color={tradeType === 'buy' ? 'success' : 'error'}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${shares || '0'} Shares`
            )}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}
