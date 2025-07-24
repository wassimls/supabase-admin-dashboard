
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

// These values are provided by the user.
// In a real-world application, they should be stored in environment variables.
export const supabaseUrl = 'https://zpucambojfgakszxciyj.supabase.co';
// WARNING: The service_role key has admin privileges and bypasses RLS.
// It should not be exposed on the client-side in a production application.
// This is being used as per the user's explicit request for an admin dashboard.
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdWNhbWJvamZnYWtzenhjaXlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQwODQxNywiZXhwIjoyMDY2OTg0NDE3fQ.DpP1-GlBgu5z5l4H-koA_qZHXfhE9cz3K8QKPsKTLm8';

// The 'Database' generic provides type safety for your Supabase queries.
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export default supabase;
