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
  Alert,
  CircularProgress,
} from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  portfolio_id: string;
  symbol: string;
  symbol_name: string;
  market: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  currency: string;
  transaction_date: string;
  created_at: string;
}

export function TransactionHistory() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadTransactions();
    }
  }, [profile?.id]);

  const loadTransactions = async () => {
    if (!profile?.id) return;
    try {
      setLoading(true);
      
      // Get all portfolios for this user first
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', profile.id);
        
      if (!portfolios || portfolios.length === 0) {
        setTransactions([]);
        return;
      }
      
      const portfolioIds = portfolios.map(p => p.id);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .in('portfolio_id', portfolioIds)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Transactions Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : transactions.length === 0 ? (
        <Alert severity="info">No transactions found matching your criteria.</Alert>
      ) : (
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Stock Code</TableCell>
                <TableCell>Stock Name</TableCell>
                <TableCell>Trade Type</TableCell>
                <TableCell>Trade Time</TableCell>
                <TableCell align="right">Shares</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell align="right">Total Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <Typography fontWeight="bold">{tx.symbol}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tx.market}
                    </Typography>
                  </TableCell>
                  <TableCell>{tx.symbol_name || tx.symbol}</TableCell>
                  <TableCell>
                    <Chip
                      icon={tx.type === 'buy' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      label={tx.type.toUpperCase()}
                      color={tx.type === 'buy' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(tx.transaction_date), 'yyyy-MM-dd HH:mm:ss')}
                  </TableCell>
                  <TableCell align="right">{tx.shares.toLocaleString()}</TableCell>
                  <TableCell align="right">{tx.price.toFixed(2)}</TableCell>
                  <TableCell>{tx.currency || 'USD'}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      {(tx.shares * tx.price).toFixed(2)}
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
