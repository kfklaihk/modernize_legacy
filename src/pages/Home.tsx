import { useState } from 'react';
import { Container, Typography, AppBar, Toolbar, Button, Box, Divider } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { StockQuote } from '../components/StockQuote';
import { AIHelper } from '../components/AIHelper';
import { PortfolioManager } from '../components/PortfolioManager';
import { TransactionHistory } from '../components/TransactionHistory';
import { LogOut, LayoutDashboard, History, Search } from 'lucide-react';

export function Home() {
  const { user, signOut } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTradeComplete = () => {
    // Refresh portfolio and transaction history when trade is completed
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      {/* App Bar */}
      <AppBar position="sticky" elevation={2}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            📊 Simulated Stock Trading System
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
            {user?.email}
          </Typography>
          <Button
            color="inherit"
            onClick={signOut}
            startIcon={<LogOut size={18} />}
            variant="outlined"
            sx={{ borderColor: 'rgba(255, 255, 255, 0.5)' }}
          >
            Sign Out
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main Content - Single Vertical Layout */}
      <Container maxWidth="xl" sx={{ mt: 4, mb: 10 }}>
        
        {/* 1. Portfolio Holdings Section */}
        <Box sx={{ mb: 6 }} key={`portfolio-${refreshKey}`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <LayoutDashboard size={28} color="#667eea" />
            <Typography variant="h4" fontWeight="bold">Portfolio Holdings</Typography>
          </Box>
          <PortfolioManager />
        </Box>

        <Divider sx={{ mb: 6 }} />

        {/* 2. Stock Query & Trading Section */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Search size={28} color="#667eea" />
            <Typography variant="h4" fontWeight="bold">Track Stock</Typography>
          </Box>
          <StockQuote onTradeComplete={handleTradeComplete} />
        </Box>

        <Divider sx={{ mb: 6 }} />

        {/* 3. Transaction History Section */}
        <Box sx={{ mb: 6 }} key={`history-${refreshKey}`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <History size={28} color="#667eea" />
            <Typography variant="h4" fontWeight="bold">Transaction Log</Typography>
          </Box>
          <TransactionHistory />
        </Box>

      </Container>

      {/* AI Helper Chatbot - Movable Popup */}
      <AIHelper />
    </>
  );
}
