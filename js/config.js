window.MG_MUSIC_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseAnonKey: 'YOUR_PUBLIC_ANON_KEY'
};

const { supabaseUrl, supabaseAnonKey } = window.MG_MUSIC_CONFIG;

const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
