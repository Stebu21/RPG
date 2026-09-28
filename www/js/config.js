// Salvataggi online (Supabase). Vuoti = solo sul dispositivo.
// La chiave anon è pubblica per natura: i dati sono protetti dalle funzioni in supabase/schema.sql.
// In sviluppo (http://localhost, dove girano anche i test) si resta offline per non sporcare
// il database vero; l'app Android (https://localhost) e il sito pubblicato usano Supabase.
const DEV = location.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
export const SUPABASE_URL = DEV ? '' : 'https://kpuewbspkeomgszamftt.supabase.co';
export const SUPABASE_KEY = DEV ? '' : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdWV3YnNwa2VvbWdzemFtZnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1ODg2NDIsImV4cCI6MjEwNjE2NDY0Mn0.8Vz5z1eSV2huk5yzm3zqH5MZ3AnDDHKar0x8_WkseNk';
