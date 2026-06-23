import { createClient } from '@supabase/supabase-js';

// Add your Supabase URL and Key here
const SUPABASE_URL = 'https://bgnqecjvjcmzkqorkali.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbnFlY2p2amNtemtxb3JrYWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0ODUyNDEsImV4cCI6MjA5NzA2MTI0MX0.F5ujz1X3_trdu-c08dMyFqXA7jIkmpplkd8r7tipwiQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface BeerItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  cost: number;
  cat?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export interface ImportRecord {
  id: string;
  created_at: string;
  item: string;
  quantity: number;
  cost: number;
}

export interface DeductRecord {
  id: string;
  created_at: string;
  item: string;
  quantity: number;
  approved: 'pending' | 'approved' | 'rejected';
}
