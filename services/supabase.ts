
import { createClient } from '@supabase/supabase-js';
import { NotaFiscal, OrdemProducao, Comentario, User } from '../types';

const SUPABASE_URL = 'https://sibdtuatfpdjqgrhekoe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYmR0dWF0ZnBkanFncmhla29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDkxOTIsImV4cCI6MjA4Mzg4NTE5Mn0.jRDGgIhiekr6cGgHg0nb6jNkHamFKTCunOjaii_9Yew';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const db = {
  notas: {
    async fetch() {
      const { data, error } = await supabase.from('notas_fiscais').select('*').order('data', { ascending: false });
      if (error) throw error;
      return data as NotaFiscal[];
    },
    async save(nota: Partial<NotaFiscal>) {
      const { data, error } = await supabase.from('notas_fiscais').upsert(nota).select().single();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('notas_fiscais').delete().eq('id', id);
      if (error) throw error;
    }
  },
  ordens: {
    async fetch() {
      const { data, error } = await supabase.from('ordens_producao').select('*').order('data', { ascending: false });
      if (error) throw error;
      return data as OrdemProducao[];
    },
    async save(ordem: Partial<OrdemProducao>) {
      const { data, error } = await supabase.from('ordens_producao').upsert(ordem).select().single();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('ordens_producao').delete().eq('id', id);
      if (error) throw error;
    }
  },
  comentarios: {
    async fetch() {
      const { data, error } = await supabase.from('comentarios').select('*').order('data', { ascending: false });
      if (error) throw error;
      return data as Comentario[];
    },
    async save(comentario: Partial<Comentario>) {
      const { data, error } = await supabase.from('comentarios').upsert(comentario).select().single();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('comentarios').delete().eq('id', id);
      if (error) throw error;
    }
  },
  users: {
    async fetchAll() {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as User[];
    },
    async create(user: Partial<User>) {
      const { data, error } = await supabase.from('users').insert([user]).select().single();
      if (error) throw error;
      return data;
    },
    async updateRole(userId: string, role: string) {
      const { error } = await supabase.from('users').update({ role }).eq('id', userId);
      if (error) throw error;
    },
    async updatePassword(userId: string, password: string) {
      const { error } = await supabase.from('users').update({ password }).eq('id', userId);
      if (error) throw error;
    },
    async delete(userId: string) {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
    }
  }
};
