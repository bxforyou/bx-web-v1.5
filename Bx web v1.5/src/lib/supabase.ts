import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallback to working credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vbxcxjbjvovlkuiyphhf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZieGN4amJqdm92bGt1aXlwaGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MzI5ODUsImV4cCI6MjA2NTMwODk4NX0.FLA5DCsu8zbV5R3EPE7fa3aieijDKNwMrWXK1oQ82YY';

// Create client with enhanced configuration for better connectivity
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Authentication functions
export const signInWithPassword = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Authentication error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Authentication successful');
    return { success: true, user: data.user };
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Sign out error:', error);
      return false;
    }
    
    console.log('✅ Signed out successfully');
    return true;
  } catch (error) {
    console.error('❌ Sign out error:', error);
    return false;
  }
};

// Database functions with improved error handling
export const saveContentToDatabase = async (content: any) => {
  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication required for database write operations');
      return false;
    }

    const { data, error } = await supabase
      .from('site_content')
      .upsert({ 
        id: 1, 
        content: content,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('❌ Error saving to database:', error);
      return false;
    }
    
    console.log('✅ Content saved to database successfully - visible to ALL users globally!');
    return true;
  } catch (error) {
    console.error('❌ Database save error:', error);
    return false;
  }
};

export const loadContentFromDatabase = async () => {
  try {
    // Add timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const { data, error } = await supabase
      .from('site_content')
      .select('content')
      .eq('id', 1)
      .single()
      .abortSignal(controller.signal);
    
    clearTimeout(timeoutId);
    
    if (error) {
      // If it's a network error, return null to fall back to localStorage
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.warn('⚠️ Network error loading from database, falling back to localStorage');
        return null;
      }
      console.error('❌ Error loading from database:', error);
      return null;
    }
    
    console.log('✅ Content loaded from database successfully');
    return data?.content || null;
  } catch (error) {
    // Handle network errors gracefully
    if (error.name === 'AbortError') {
      console.warn('⚠️ Database request timed out, falling back to localStorage');
    } else if (error.message.includes('Failed to fetch')) {
      console.warn('⚠️ Network error loading from database, falling back to localStorage');
    } else {
      console.error('❌ Database load error:', error);
    }
    return null;
  }
};

// Real-time subscription for content changes with error handling
export const subscribeToContentChanges = (callback: (content: any) => void) => {
  try {
    return supabase
      .channel('site_content_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_content'
        },
        (payload) => {
          if (payload.new && payload.new.content) {
            console.log('🔄 Real-time content update received');
            callback(payload.new.content);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Real-time subscription error, continuing without real-time updates');
        }
      });
  } catch (error) {
    console.warn('⚠️ Real-time subscription failed, continuing without real-time updates:', error);
    // Return a dummy subscription object
    return {
      unsubscribe: () => {}
    };
  }
};

// Test database connectivity with better error handling
export const testDatabaseConnection = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const { data, error } = await supabase
      .from('site_content')
      .select('count')
      .limit(1)
      .abortSignal(controller.signal);
    
    clearTimeout(timeoutId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Connection timeout' };
    }
    return { success: false, error: 'Connection failed' };
  }
};