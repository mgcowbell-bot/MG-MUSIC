window.MG_MUSIC_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseAnonKey: 'YOUR_PUBLIC_ANON_KEY'
};

const { supabaseUrl, supabaseAnonKey } = window.MG_MUSIC_CONFIG;

const hasPlaceholderConfig =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('YOUR_PROJECT_REF') ||
  supabaseAnonKey.includes('YOUR_PUBLIC_ANON_KEY');

window.MG_MUSIC_CONFIG.isConfigured = !!window.supabase && !hasPlaceholderConfig;

const supabase = window.MG_MUSIC_CONFIG.isConfigured
  ? window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

if (!window.MG_MUSIC_CONFIG.isConfigured) {
  console.warn(
    'Supabase is not configured yet. Update js/config.js with your project URL and anon key to stop the network errors.'
  );
}
