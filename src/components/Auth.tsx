import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';
import { Container, Paper, Typography, Box } from '@mui/material';

export function Auth() {
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box textAlign="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            Stock Portfolio Manager
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to manage your investment portfolio
          </Typography>
        </Box>

        <SupabaseAuth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#1976d2',
                  brandAccent: '#1565c0',
                },
              },
            },
          }}
          providers={['google']}
          onlyThirdPartyProviders={false}
          redirectTo={window.location.origin}
        />

        <Box mt={3} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            Track stocks from Hong Kong, China, and US markets
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
