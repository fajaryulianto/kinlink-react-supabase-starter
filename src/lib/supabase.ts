import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      trees: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      members: {
        Row: {
          id: string;
          tree_id: string;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          nickname: string | null;
          maiden_name: string | null;
          gender: 'male' | 'female' | 'other' | null;
          birth_date: string;
          birth_place: string;
          death_date: string | null;
          death_place: string | null;
          is_living: boolean;
          photo_url: string | null;
          occupation: string | null;
          education: string | null;
          biography: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          tree_id: string;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          nickname?: string | null;
          maiden_name?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          birth_date: string;
          birth_place: string;
          death_date?: string | null;
          death_place?: string | null;
          is_living?: boolean;
          photo_url?: string | null;
          occupation?: string | null;
          education?: string | null;
          biography?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          tree_id?: string;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          nickname?: string | null;
          maiden_name?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          birth_date?: string;
          birth_place?: string;
          death_date?: string | null;
          death_place?: string | null;
          is_living?: boolean;
          photo_url?: string | null;
          occupation?: string | null;
          education?: string | null;
          biography?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
      };
    };
  };
};