import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        initializeProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        initializeProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeProfile = async (user: User) => {
    try {
      // Fetch existing profile first to avoid resetting cash_balance on refresh
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (!existingProfile) {
        const { data: createdProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            cash_balance: 1000000,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(createdProfile);
      } else {
        setProfile(existingProfile);
      }

      // Ensure a default portfolio exists for this user
      const { data: existingPortfolios, error: portfolioError } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (portfolioError) throw portfolioError;

      if (!existingPortfolios || existingPortfolios.length === 0) {
        const { error: insertPortfolioError } = await supabase.from('portfolios').insert({
          user_id: user.id,
          name: 'Main Portfolio',
          description: 'My primary trading portfolio',
        });

        if (insertPortfolioError) throw insertPortfolioError;
      }

    } catch (err) {
      console.error('Error initializing profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, profile, loading, signOut, refreshProfile: () => user && initializeProfile(user) };
}
