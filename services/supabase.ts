
import { createClient } from '@supabase/supabase-js';
import { NotaFiscal, OrdemProducao, Comentario, User, Backup, AppState } from '../types';

const SUPABASE_URL = 'https://sibdtuatfpdjqgrhekoe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYmR0dWF0ZnBkanFncmhla29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDkxOTIsImV4cCI6MjA4Mzg4NTE5Mn0.jRDGgIhiekr6cGgHg0nb6jNkHamFKTCunOjaii_9Yew';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const formatSupabaseError = (error: any): string => {
  if (!error) return 'Erro desconhecido';
  if (typeof error === 'string') return error;
  
  const message = error.message || error.details || (error.code ? `Erro código ${error.code}` : null);
  if (message) return message;
  
  try {
    return JSON.stringify(error);
  } catch {
    return 'Erro ao processar detalhes da falha';
  }
};

const isMissingTableError = (error: any): boolean => {
  if (!error) return false;
  const msg = error.message?.toLowerCase() || '';
  return (
    error.code === '42P01' || 
    msg.includes('could not find the table') || 
    msg.includes('relation "backups" does not exist') ||
    error.status === 404
  );
};

export const db = {
  notas: {
    async fetch() {
      const { data, error } = await supabase.from('notas_fiscais').select('*').order('data', { ascending: false });
      if (error) throw new Error(formatSupabaseError(error));
      return data as NotaFiscal[];
    },
    async save(nota: Partial<NotaFiscal>) {
      const { data, error } = await supabase.from('notas_fiscais').upsert(nota).select().single();
      if (error) throw new Error(formatSupabaseError(error));
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('notas_fiscais').delete().eq('id', id);
      if (error) throw new Error(formatSupabaseError(error));
    }
  },
  ordens: {
    async fetch() {
      const { data, error } = await supabase.from('ordens_producao').select('*').order('data', { ascending: false });
      if (error) throw new Error(formatSupabaseError(error));
      return data as OrdemProducao[];
    },
    async save(ordem: Partial<OrdemProducao>) {
      const { data, error } = await supabase.from('ordens_producao').upsert(ordem).select().single();
      if (error) throw new Error(formatSupabaseError(error));
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('ordens_producao').delete().eq('id', id);
      if (error) throw new Error(formatSupabaseError(error));
    }
  },
  comentarios: {
    async fetch() {
      const { data, error } = await supabase.from('comentarios').select('*').order('data', { ascending: false });
      if (error) throw new Error(formatSupabaseError(error));
      return data as Comentario[];
    },
    async save(comentario: Partial<Comentario>) {
      const { data, error } = await supabase.from('comentarios').upsert(comentario).select().single();
      if (error) throw new Error(formatSupabaseError(error));
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('comentarios').delete().eq('id', id);
      if (error) throw new Error(formatSupabaseError(error));
    }
  },
  users: {
    async fetchAll() {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(formatSupabaseError(error));
      return data as User[];
    },
    async create(user: Partial<User>) {
      const { data, error } = await supabase.from('users').insert([user]).select().single();
      if (error) throw new Error(formatSupabaseError(error));
      return data;
    },
    async updateRole(userId: string, role: string) {
      const { error } = await supabase.from('users').update({ role }).eq('id', userId);
      if (error) throw new Error(formatSupabaseError(error));
    },
    async updatePassword(userId: string, password: string) {
      const { error } = await supabase.from('users').update({ password }).eq('id', userId);
      if (error) throw new Error(formatSupabaseError(error));
    },
    async delete(userId: string) {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw new Error(formatSupabaseError(error));
    }
  },
  system: {
    async clearAllData() {
      await Promise.all([
        supabase.from('notas_fiscais').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('ordens_producao').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('comentarios').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);
    },
    async restoreFromSnapshot(snapshot: AppState) {
      await this.clearAllData();
      
      const cleanNotas = (snapshot.notas || []).map(({ id, ...rest }) => rest);
      const cleanOrdens = (snapshot.ordens || []).map(({ id, ...rest }) => rest);
      const cleanComentarios = (snapshot.comentarios || []).map(({ id, ...rest }) => rest);

      if (cleanNotas.length > 0) {
        const { error } = await supabase.from('notas_fiscais').insert(cleanNotas);
        if (error) throw new Error(formatSupabaseError(error));
      }
      if (cleanOrdens.length > 0) {
        const { error } = await supabase.from('ordens_producao').insert(cleanOrdens);
        if (error) throw new Error(formatSupabaseError(error));
      }
      if (cleanComentarios.length > 0) {
        const { error } = await supabase.from('comentarios').insert(cleanComentarios);
        if (error) throw new Error(formatSupabaseError(error));
      }
    },
    async createBackup(snapshot: AppState, tipo: 'manual' | 'automatico' = 'manual') {
      try {
        const { data, error } = await supabase.from('backups').insert([{
          data_snapshot: snapshot,
          tipo: tipo
        }]).select().single();
        
        if (error) {
          if (isMissingTableError(error)) {
            const missingErr = new Error("A tabela de backups não existe.");
            (missingErr as any).isMissingTable = true;
            throw missingErr;
          }
          throw new Error(formatSupabaseError(error));
        }

        const { data: allBackups } = await supabase.from('backups').select('id').order('created_at', { ascending: false });
        if (allBackups && allBackups.length > 7) {
          const toDelete = allBackups.slice(7).map(b => b.id);
          await supabase.from('backups').delete().in('id', toDelete);
        }

        return data;
      } catch (err) {
        throw err;
      }
    },
    async fetchBackups() {
      try {
        const { data, error } = await supabase.from('backups').select('*').order('created_at', { ascending: false });
        if (error) {
          if (isMissingTableError(error)) {
            const err = new Error("Tabela de backups ausente.");
            (err as any).isMissingTable = true;
            throw err;
          }
          throw new Error(formatSupabaseError(error));
        }
        
        return (data || []).map(b => {
          let snapshot = b.data_snapshot;
          if (typeof snapshot === 'string') {
            try {
              snapshot = JSON.parse(snapshot);
            } catch (e) {
              snapshot = { notas: [], ordens: [], comentarios: [] };
            }
          }
          return {
            ...b,
            data_snapshot: snapshot || { notas: [], ordens: [], comentarios: [] }
          };
        }) as Backup[];
      } catch (err) {
        throw err;
      }
    },
    async deleteBackup(id: string) {
      const { error } = await supabase.from('backups').delete().eq('id', id);
      if (error) throw new Error(formatSupabaseError(error));
    }
  }
};
