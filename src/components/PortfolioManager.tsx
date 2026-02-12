import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import { Add, TrendingUp, TrendingDown, Edit, Delete, Refresh } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  stockName: string;
}

export function PortfolioManager() {
  const [portfolios, setPortfolios] = useState<PortfolioWithValue[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<HoldingWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPortfolio) {
      loadHoldings(selectedPortfolio);
    }
  }, [selectedPortfolio]);

  const loadPortfolios = async () => {
    try {
      setLoading(true);
      const { data: portfoliosData, error } = await supabase
        .from('portfolios')
        .select('*')
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
                const currentValue = holding.shares * quote.price;
                const cost = holding.shares * holding.average_cost;
                totalValue += currentValue;
                totalCost += cost;
              } catch (error) {
                console.error(`Error fetching price for ${holding.symbol}:`, error);
                totalCost += holding.shares * holding.average_cost;
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
      setRefreshing(true);
      const { data: holdingsData, error } = await supabase
        .from('holdings')
        .select('*')
        .eq('portfolio_id', portfolioId);

      if (error) throw error;

      const holdingsWithPrices = await Promise.all(
        (holdingsData || []).map(async (holding) => {
          try {
            const quote = await getStockQuote(holding.symbol, holding.market);
            const currentPrice = quote.price;
            const currentValue = holding.shares * currentPrice;
            const cost = holding.shares * holding.average_cost;
            const profitLoss = currentValue - cost;
            const profitLossPercent = cost > 0 ? (profitLoss / cost) * 100 : 0;

            return {
              ...holding,
              currentPrice,
              currentValue,
              profitLoss,
              profitLossPercent,
              stockName: quote.name,
            };
          } catch (error) {
            console.error(`Error fetching price for ${holding.symbol}:`, error);
            return {
              ...holding,
              currentPrice: holding.average_cost,
              currentValue: holding.shares * holding.average_cost,
              profitLoss: 0,
              profitLossPercent: 0,
              stockName: holding.symbol,
            };
          }
        })
      );

      setHoldings(holdingsWithPrices);
    } catch (error) {
      console.error('Error loading holdings:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const createPortfolio = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('portfolios').insert({
        user_id: user.id,
        name: newPortfolioName,
        description: '',
      });

      if (error) throw error;

      setNewPortfolioName('');
      setCreateDialogOpen(false);
      loadPortfolios();
    } catch (error) {
      console.error('Error creating portfolio:', error);
    }
  };

  const deletePortfolio = async (portfolioId: string) => {
    if (!confirm('Are you sure you want to delete this portfolio?')) return;

    try {
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', portfolioId);

      if (error) throw error;

      setSelectedPortfolio(null);
      loadPortfolios();
    } catch (error) {
      console.error('Error deleting portfolio:', error);
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
      {/* Portfolio Selector */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight="bold">
          My Portfolios
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Portfolio
        </Button>
      </Box>

      {/* Portfolio Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {portfolios.map((portfolio) => (
          <Grid item xs={12} sm={6} md={4} key={portfolio.id}>
            <Card
              sx={{
                cursor: 'pointer',
                border: selectedPortfolio === portfolio.id ? '2px solid' : '1px solid',
                borderColor: selectedPortfolio === portfolio.id ? 'primary.main' : 'divider',
              }}
              onClick={() => setSelectedPortfolio(portfolio.id)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {portfolio.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePortfolio(portfolio.id);
                    }}
                  >
                    <Delete size={18} />
                  </IconButton>
                </Box>

                <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                  ${portfolio.totalValue.toFixed(2)}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {portfolio.profitLoss >= 0 ? (
                    <TrendingUp size={16} color="green" />
                  ) : (
                    <TrendingDown size={16} color="red" />
                  )}
                  <Typography
                    variant="body2"
                    color={portfolio.profitLoss >= 0 ? 'success.main' : 'error.main'}
                    fontWeight="bold"
                  >
                    {portfolio.profitLoss >= 0 ? '+' : ''}${portfolio.profitLoss.toFixed(2)} (
                    {portfolio.profitLossPercent.toFixed(2)}%)
                  </Typography>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Cost: ${portfolio.totalCost.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Holdings Table */}
      {currentPortfolio && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Holdings - {currentPortfolio.name}
            </Typography>
            <Button
              startIcon={refreshing ? <CircularProgress size={16} /> : <Refresh />}
              onClick={() => loadHoldings(selectedPortfolio!)}
              disabled={refreshing}
              size="small"
            >
              Refresh Prices
            </Button>
          </Box>

          {holdings.length === 0 ? (
            <Alert severity="info">
              No holdings yet. Use the trading interface below to buy stocks.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Market</TableCell>
                    <TableCell align="right">Shares</TableCell>
                    <TableCell align="right">Avg Cost</TableCell>
                    <TableCell align="right">Current Price</TableCell>
                    <TableCell align="right">Market Value</TableCell>
                    <TableCell align="right">P&L</TableCell>
                    <TableCell align="right">P&L %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {holdings.map((holding) => (
                    <TableRow key={holding.id}>
                      <TableCell>
                        <Typography fontWeight="bold">{holding.symbol}</Typography>
                      </TableCell>
                      <TableCell>{holding.stockName}</TableCell>
                      <TableCell>
                        <Chip label={holding.market} size="small" />
                      </TableCell>
                      <TableCell align="right">{holding.shares.toLocaleString()}</TableCell>
                      <TableCell align="right">${holding.average_cost.toFixed(2)}</TableCell>
                      <TableCell align="right">${holding.currentPrice.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold">
                          ${holding.currentValue.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          color={holding.profitLoss >= 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {holding.profitLoss >= 0 ? '+' : ''}${holding.profitLoss.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          color={holding.profitLossPercent >= 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {holding.profitLossPercent >= 0 ? '+' : ''}
                          {holding.profitLossPercent.toFixed(2)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={6} align="right">
                      <Typography variant="h6" fontWeight="bold">
                        Total:
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" fontWeight="bold">
                        ${currentPortfolio.totalValue.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color={currentPortfolio.profitLoss >= 0 ? 'success.main' : 'error.main'}
                      >
                        {currentPortfolio.profitLoss >= 0 ? '+' : ''}$
                        {currentPortfolio.profitLoss.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color={
                          currentPortfolio.profitLossPercent >= 0 ? 'success.main' : 'error.main'
                        }
                      >
                        {currentPortfolio.profitLossPercent >= 0 ? '+' : ''}
                        {currentPortfolio.profitLossPercent.toFixed(2)}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Create Portfolio Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New Portfolio</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Portfolio Name"
            fullWidth
            value={newPortfolioName}
            onChange={(e) => setNewPortfolioName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createPortfolio()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={createPortfolio} variant="contained" disabled={!newPortfolioName}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
