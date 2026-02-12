import { useState } from 'react';
import { Container, Typography, AppBar, Toolbar, Button, Box, Alert, Tabs, Tab } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { StockQuote } from '../components/StockQuote';
import { AIHelper } from '../components/AIHelper';
import { PortfolioManager } from '../components/PortfolioManager';
import { TradingInterface } from '../components/TradingInterface';
import { TransactionHistory } from '../components/TransactionHistory';
import { LogOut } from 'lucide-react';

export function Home() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTradeComplete = () => {
    // Refresh portfolio data when trade is completed
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      {/* App Bar */}
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            📊 Stock Portfolio Manager
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

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Welcome back! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your stock portfolio, execute trades, and track performance across HK, CN, and US markets.
          </Typography>
        </Box>

        {/* Tabs Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Portfolio Overview" />
            <Tab label="Trading" />
            <Tab label="Transaction History" />
            <Tab label="Stock Quotes" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {activeTab === 0 && (
          <Box key={refreshKey}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Portfolio Management:</strong> View your holdings, track performance, and manage multiple portfolios.
                Prices are updated from EOD (End of Day) data.
              </Typography>
            </Alert>
            <PortfolioManager />
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Trading Interface:</strong> Buy and sell stocks across multiple markets.
                Transactions update your portfolio holdings in real-time.
              </Typography>
            </Alert>
            <TradingInterface onTradeComplete={handleTradeComplete} />
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Transaction History:</strong> View all your past trades with detailed information.
                Filter by portfolio or date to analyze your trading activity.
              </Typography>
            </Alert>
            <TransactionHistory />
          </Box>
        )}

        {activeTab === 3 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>End-of-Day (EOD) Data:</strong> Stock prices shown are from the previous trading day's close.
                Data is sourced from Marketstack API and updated daily.
              </Typography>
            </Alert>
            <StockQuote />
          </Box>
        )}

      </Container>

      {/* AI Helper Chatbot */}
      <AIHelper />
    </>
  );
}
