import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qpnsvpqbiucviupxvmjh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1I0MR1W32mIniJKVDvI1LQ_OwJclc0-'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);