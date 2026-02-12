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
  Chip,
  Grid,
} from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useStockPrice } from '../hooks/useStockPrice';
import { SUPPORTED_MARKETS, EXAMPLE_STOCKS } from '../lib/marketstack';

export function StockQuote() {
  const [symbol, setSymbol] = useState('0005');
  const [market, setMarket] = useState('HK');
  const [searchSymbol, setSearchSymbol] = useState('0005');
  const [searchMarket, setSearchMarket] = useState('HK');

  const { data: quote, isLoading, error } = useStockPrice(searchSymbol, searchMarket);

  const handleSearch = () => {
    setSearchSymbol(symbol);
    setSearchMarket(market);
  };

  const handleExampleClick = (exampleSymbol: string, exampleMarket: string) => {
    setSymbol(exampleSymbol);
    setMarket(exampleMarket);
    setSearchSymbol(exampleSymbol);
    setSearchMarket(exampleMarket);
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Stock Quote (EOD Data)
      </Typography>

      {/* Search Form */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Stock Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="e.g., 0005, AAPL"
          sx={{ flex: 1, minWidth: 200 }}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Market</InputLabel>
          <Select
            value={market}
            label="Market"
            onChange={(e) => setMarket(e.target.value)}
          >
            {SUPPORTED_MARKETS.map((m) => (
              <MenuItem key={m.code} value={m.code}>
                {m.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={!symbol}
          sx={{ minWidth: 120 }}
        >
          Get Quote
        </Button>
      </Box>

      {/* Example Stocks */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Try these examples:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {EXAMPLE_STOCKS.HK.slice(0, 2).map((stock) => (
            <Chip
              key={stock.symbol}
              label={`${stock.symbol} (HK)`}
              onClick={() => handleExampleClick(stock.symbol, 'HK')}
              clickable
              size="small"
            />
          ))}
          {EXAMPLE_STOCKS.US.slice(0, 2).map((stock) => (
            <Chip
              key={stock.symbol}
              label={`${stock.symbol} (US)`}
              onClick={() => handleExampleClick(stock.symbol, 'US')}
              clickable
              size="small"
            />
          ))}
        </Box>
      </Box>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to fetch stock data'}
        </Alert>
      )}

      {/* Stock Data Display */}
      {quote && !isLoading && (
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            p: 3,
            borderRadius: 2,
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h4" fontWeight="bold">
                {quote.symbol}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {quote.name} • {quote.market} Market
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h3" fontWeight="bold">
                ${quote.price.toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                {quote.change >= 0 ? (
                  <TrendingUp size={24} />
                ) : (
                  <TrendingDown size={24} />
                )}
                <Typography variant="h6">
                  {quote.change >= 0 ? '+' : ''}
                  {quote.change.toFixed(2)} ({quote.change_percent.toFixed(2)}%)
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Open:</Typography>
                  <Typography fontWeight="bold">${quote.open.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>High:</Typography>
                  <Typography fontWeight="bold">${quote.high.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Low:</Typography>
                  <Typography fontWeight="bold">${quote.low.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Volume:</Typography>
                  <Typography fontWeight="bold">{quote.volume.toLocaleString()}</Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Date: {quote.date} • Last updated: {new Date(quote.lastUpdated).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}

      {!quote && !isLoading && !error && (
        <Alert severity="info">
          Enter a stock symbol and select a market to get started
        </Alert>
      )}
    </Paper>
  );
}
