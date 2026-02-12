import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Portfolio } from '../lib/supabase';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  portfolio_id: string;
  symbol: string;
  market: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  transaction_date: string;
  created_at: string;
}

interface TransactionHistoryProps {
  portfolioId?: string;
}

export function TransactionHistory({ portfolioId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(portfolioId || 'all');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [selectedPortfolio, dateFilter]);

  const loadPortfolios = async () => {
    const { data } = await supabase
      .from('portfolios')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setPortfolios(data);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (selectedPortfolio !== 'all') {
        query = query.eq('portfolio_id', selectedPortfolio);
      }

      if (dateFilter) {
        const startDate = new Date(dateFilter);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateFilter);
        endDate.setHours(23, 59, 59, 999);

        query = query
          .gte('transaction_date', startDate.toISOString())
          .lte('transaction_date', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPortfolioName = (portfolioId: string) => {
    const portfolio = portfolios.find((p) => p.id === portfolioId);
    return portfolio?.name || 'Unknown';
  };

  const totalBought = transactions
    .filter((t) => t.type === 'buy')
    .reduce((sum, t) => sum + t.shares * t.price, 0);

  const totalSold = transactions
    .filter((t) => t.type === 'sell')
    .reduce((sum, t) => sum + t.shares * t.price, 0);

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Transaction History
      </Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Portfolio</InputLabel>
          <Select
            value={selectedPortfolio}
            label="Portfolio"
            onChange={(e) => setSelectedPortfolio(e.target.value)}
          >
            <MenuItem value="all">All Portfolios</MenuItem>
            {portfolios.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Filter by Date"
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 200 }}
        />
      </Box>

      {/* Summary */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1, flex: 1, minWidth: 150 }}>
          <Typography variant="body2" color="text.secondary">
            Total Bought
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="success.main">
            ${totalBought.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'error.50', borderRadius: 1, flex: 1, minWidth: 150 }}>
          <Typography variant="body2" color="text.secondary">
            Total Sold
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="error.main">
            ${totalSold.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, flex: 1, minWidth: 150 }}>
          <Typography variant="body2" color="text.secondary">
            Net Position
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="primary.main">
            ${(totalBought - totalSold).toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* Transactions Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : transactions.length === 0 ? (
        <Alert severity="info">No transactions found</Alert>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Portfolio</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Symbol</TableCell>
                <TableCell>Market</TableCell>
                <TableCell align="right">Shares</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    {format(new Date(tx.transaction_date), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{getPortfolioName(tx.portfolio_id)}</TableCell>
                  <TableCell>
                    <Chip
                      icon={
                        tx.type === 'buy' ? (
                          <TrendingUp size={16} />
                        ) : (
                          <TrendingDown size={16} />
                        )
                      }
                      label={tx.type.toUpperCase()}
                      color={tx.type === 'buy' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold">{tx.symbol}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={tx.market} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">{tx.shares.toLocaleString()}</TableCell>
                  <TableCell align="right">${tx.price.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold" color={tx.type === 'buy' ? 'error' : 'success'}>
                      {tx.type === 'buy' ? '-' : '+'}${(tx.shares * tx.price).toFixed(2)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
