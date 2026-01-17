
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/supabase';
import { User, Backup, AppState, UserRole } from '../types';
import { format, parseISO } from 'date-fns';

interface AdminPanelProps {
  currentData: AppState;
  onRefresh: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentData, onRefresh }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operador' });
  const [actionLoading, setActionLoading] = useState(false);
  const [showSqlFix, setShowSqlFix] = useState(false);
  const [showCloudBackups, setShowCloudBackups] = useState(false);
  
  // UI States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dialog, setDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDestructive?: boolean } | null>(null);
  const [isRestored, setIsRestored] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const currentUser = (() => {
    try {
      const stored = localStorage.getItem('diario_user');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  })();

  const fetchUsers = useCallback(async () => {
    try {
      const data = await db.users.fetchAll();
      setUsers(data || []);
    } catch (e: any) {
      showToast("Falha na carga de usuários", 'error');
    }
  }, []);

  const fetchBackups = useCallback(async () => {
    try {
      const data = await db.system.fetchBackups();
      setBackups(data || []);
    } catch (e: any) {}
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchUsers(), fetchBackups().catch(() => {})]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchUsers, fetchBackups]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await db.users.create({
        username: newUser.username.toLowerCase().trim(),
        password: newUser.password,
        name: newUser.username,
        role: newUser.role as any
      });
      setNewUser({ username: '', password: '', role: 'operador' });
      await fetchUsers();
      showToast("Novo acesso criado.");
    } catch (e: any) {
      showToast("Erro ao criar usuário", 'error');
      setShowSqlFix(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      await db.users.updateRole(userId, newRole);
      await fetchUsers();
      showToast("Hierarquia atualizada.");
    } catch (e: any) {
      showToast("Erro ao mudar cargo", 'error');
    }
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) {
      showToast("Auto-exclusão negada.", 'error');
      return;
    }
    setDialog({
      isOpen: true,
      title: "Apagar Colaborador?",
      message: "Esta ação é irreversível e remove o acesso ao sistema.",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await db.users.delete(id);
          await fetchUsers();
          showToast("Acesso removido.");
        } catch (e: any) {
          showToast("Erro ao excluir", 'error');
        } finally {
          setDialog(null);
        }
      }
    });
  };

  const handleManualBackup = async () => {
    setActionLoading(true);
    try {
      await db.system.createBackup(currentData, 'manual');
      await fetchBackups();
      showToast("Snapshot manual gerado na nuvem.");
    } catch (e: any) {
      showToast("Erro ao gerar backup", 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreFromCloud = (backup: Backup) => {
    setDialog({
      isOpen: true,
      title: "Aplicar Backup Cloud?",
      message: "Os dados operacionais serão substituídos pela versão de " + format(parseISO(backup.created_at), "dd/MM HH:mm") + ".",
      isDestructive: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await db.system.restoreFromSnapshot(backup.data_snapshot);
          setIsRestored(true);
        } catch (e: any) {
          showToast("Falha na restauração", 'error');
        } finally {
          setActionLoading(false);
          setDialog(null);
        }
      }
    });
  };

  const handleResetSystem = () => {
    setDialog({
      isOpen: true,
      title: "RESET TOTAL DO SISTEMA?",
      message: "ATENÇÃO: Todas as Notas Fiscais, Ordens e Comentários serão APAGADOS permanentemente.",
      isDestructive: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await db.system.clearAllData();
          onRefresh();
          showToast("Sistema reiniciado com sucesso.");
        } catch (e: any) {
          showToast("Erro no reset do banco", 'error');
        } finally {
          setActionLoading(false);
          setDialog(null);
        }
      }
    });
  };

  if (isRestored) {
    return (
      <div className="fixed inset-0 z-[500] bg-[#005c3e] flex items-center justify-center p-6 text-center animate-fadeIn">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-lg w-full animate-scaleIn">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-gray-900 text-3xl font-black uppercase tracking-tighter leading-none">Dados Restaurados</h2>
          <p className="text-gray-500 text-sm font-bold mt-6 uppercase tracking-widest leading-relaxed">
            A base de dados foi sincronizada com o snapshot de nuvem.
          </p>
          <button onClick={() => window.location.reload()} className="w-full mt-10 py-6 bg-[#005c3e] text-white font-black rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-900 transition-all active:scale-95 border-2 border-emerald-950">Reiniciar Visão</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fadeIn pb-20 relative">
      {/* Toasts */}
      {toast && (
        <div className={`fixed top-20 right-8 z-[200] px-8 py-5 rounded-2xl shadow-2xl border-2 flex items-center gap-4 animate-slideInRight ${
          toast.type === 'error' ? 'bg-red-600 border-red-500 text-white' : 'bg-emerald-900 border-emerald-700 text-white'
        }`}>
          <span className="text-2xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <p className="text-xs font-black uppercase tracking-widest">{toast.message}</p>
        </div>
      )}

      {/* Cloud Restore Modal */}
      {showCloudBackups && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-scaleIn border-4 border-gray-400">
            <div className="p-10 bg-gray-50 border-b-2 border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Histórico Cloud</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Pontos de Restauração Agrosystem</p>
              </div>
              <button onClick={() => setShowCloudBackups(false)} className="p-4 bg-white border-2 border-gray-300 text-gray-400 hover:text-red-600 hover:border-red-500 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
              {backups.map(b => (
                <div key={b.id} className="flex items-center justify-between p-6 bg-gray-50 border-2 border-gray-300 rounded-3xl hover:border-emerald-500 transition-all group">
                  <div>
                    <p className="text-lg font-black text-gray-900">{format(parseISO(b.created_at), "dd/MM/yyyy - HH:mm")}</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${b.tipo === 'automatico' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>{b.tipo} snapshot</span>
                  </div>
                  <button onClick={() => handleRestoreFromCloud(b)} className="px-6 py-3 bg-white border-2 border-gray-300 text-[10px] font-black uppercase rounded-2xl hover:bg-emerald-600 hover:text-white hover:border-emerald-800 transition-all shadow-md active:scale-95">Restaurar</button>
                </div>
              ))}
              {backups.length === 0 && <div className="text-center py-20 text-gray-400 font-black uppercase tracking-widest">Nenhum backup em nuvem</div>}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {dialog?.isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-scaleIn border-4 border-gray-400">
            <div className={`p-10 text-center ${dialog.isDestructive ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border-2 ${dialog.isDestructive ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}>
                <span className="text-4xl">{dialog.isDestructive ? '⚠️' : '❓'}</span>
              </div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{dialog.title}</h3>
              <p className="text-sm text-gray-600 font-bold mt-4 leading-relaxed px-4">{dialog.message}</p>
            </div>
            <div className="p-8 flex gap-4 bg-white border-t-2 border-gray-100">
              <button onClick={() => setDialog(null)} className="flex-1 py-5 bg-gray-100 text-gray-500 font-black rounded-2xl text-[10px] uppercase tracking-widest border-2 border-gray-300">Cancelar</button>
              <button onClick={dialog.onConfirm} className={`flex-1 py-5 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl border-2 ${dialog.isDestructive ? 'bg-red-600 hover:bg-red-700 border-red-800' : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-800'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Configurações de Sistema */}
      <section className="bg-white p-12 rounded-[3.5rem] shadow-xl border-2 border-gray-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
           <div className="flex items-center gap-8">
              <div className="h-14 w-3 bg-[#005c3e] rounded-full shadow-sm"></div>
              <div>
                 <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Configurações Globais</h2>
                 <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mt-1">Infraestrutura e Dados Críticos</p>
              </div>
           </div>
           <div className="flex gap-4 w-full md:w-auto">
             <button onClick={() => setShowSqlFix(!showSqlFix)} className="flex-1 md:flex-none px-8 py-4 bg-gray-50 border-2 border-gray-300 text-[10px] font-black uppercase text-gray-500 rounded-2xl hover:border-red-500 hover:text-red-600 transition-all">Segurança SQL</button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="p-10 bg-gray-50 border-2 border-gray-400 rounded-[2.5rem] flex flex-col items-center text-center group hover:bg-emerald-50 hover:border-emerald-600 transition-all">
              <div className="w-16 h-16 bg-white border-2 border-gray-300 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-md group-hover:scale-110 transition-transform">☁️</div>
              <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Backup Cloud</h4>
              <p className="text-xs font-bold text-gray-400 mt-2 mb-8 leading-relaxed">Gera um ponto de restauração manual agora.</p>
              <button onClick={handleManualBackup} disabled={actionLoading} className="w-full py-5 bg-[#005c3e] text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-900 transition-all border-2 border-emerald-950">Backup Manual</button>
           </div>

           <div className="p-10 bg-gray-50 border-2 border-gray-400 rounded-[2.5rem] flex flex-col items-center text-center group hover:bg-blue-50 hover:border-blue-600 transition-all">
              <div className="w-16 h-16 bg-white border-2 border-gray-300 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-md group-hover:scale-110 transition-transform">🔄</div>
              <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Restaurar Dados</h4>
              <p className="text-xs font-bold text-gray-400 mt-2 mb-8 leading-relaxed">Selecione uma versão anterior para aplicar.</p>
              <button onClick={() => setShowCloudBackups(true)} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all border-2 border-blue-800">Ver Histórico</button>
           </div>

           <div className="p-10 bg-gray-50 border-2 border-gray-400 rounded-[2.5rem] flex flex-col items-center text-center group hover:bg-red-50 hover:border-red-600 transition-all">
              <div className="w-16 h-16 bg-white border-2 border-gray-300 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-md group-hover:scale-110 transition-transform">☢️</div>
              <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight text-red-600">Reset Total</h4>
              <p className="text-xs font-bold text-gray-400 mt-2 mb-8 leading-relaxed">Apaga permanentemente todos os registros.</p>
              <button onClick={handleResetSystem} disabled={actionLoading} className="w-full py-5 bg-red-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all border-2 border-red-800">Resetar Sistema</button>
           </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Management */}
        <div className="bg-white rounded-[3.5rem] border-2 border-gray-300 shadow-xl overflow-hidden flex flex-col">
          <div className="p-10 border-b-2 bg-gray-50/50 flex justify-between items-center border-gray-200">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-[0.3em]">Colaboradores</h3>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full border-2 border-emerald-200 uppercase">{users.length} Registros</span>
          </div>
          <div className="p-10 space-y-10">
            <form onSubmit={handleCreateUser} className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-gray-300 space-y-6 shadow-inner">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="ID Login" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="px-6 py-4 bg-white border-2 border-gray-400 rounded-2xl text-sm font-black outline-none focus:border-emerald-600 transition-all shadow-md" required />
                <input type="password" placeholder="Senha" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="px-6 py-4 bg-white border-2 border-gray-400 rounded-2xl text-sm font-black outline-none focus:border-emerald-600 transition-all shadow-md" required />
              </div>
              <div className="flex gap-4">
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="flex-1 px-6 py-4 bg-white border-2 border-gray-400 rounded-2xl text-xs font-black uppercase outline-none cursor-pointer shadow-md">
                  <option value="operador">Operador</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
                <button type="submit" disabled={actionLoading} className="px-10 py-4 bg-[#005c3e] text-white text-[10px] font-black uppercase rounded-2xl hover:bg-emerald-900 transition-all shadow-xl border-2 border-emerald-950">Criar Acesso</button>
              </div>
            </form>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              {users.map(u => {
                const isSelf = u.id === currentUser.id;
                return (
                  <div key={u.id} className="flex items-center justify-between p-6 bg-white border-2 border-gray-300 rounded-[2rem] group hover:shadow-xl transition-all border-l-[12px] border-l-emerald-600">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-gray-100 text-gray-400 border-2 border-gray-200 rounded-2xl flex items-center justify-center font-black text-lg uppercase group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-all">{u.username.substring(0,2)}</div>
                      <div>
                        <p className="text-xl font-black text-gray-900 leading-none tracking-tight">{u.username}</p>
                        <div className="mt-2">
                          {isSelf ? <span className="text-[9px] bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase font-black border border-blue-200">Admin Logado</span> : (
                            <select value={u.role} onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)} className="bg-transparent text-[11px] font-black text-emerald-600 uppercase border-none outline-none cursor-pointer tracking-widest hover:underline">
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="operador">Operador</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                    {!isSelf && (
                      <button onClick={() => handleDeleteUser(u.id)} className="p-4 text-gray-300 hover:text-red-600 border-2 border-transparent hover:border-red-200 rounded-2xl transition-all active:scale-90">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Audit / Extra Section */}
        <div className="bg-white rounded-[3.5rem] border-2 border-gray-300 shadow-xl overflow-hidden flex flex-col p-12">
           <div className="flex items-center gap-6 mb-10">
             <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center justify-center text-3xl">📊</div>
             <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Status Operacional</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo de Registros no Banco</p>
             </div>
           </div>
           
           <div className="space-y-6">
              <div className="flex justify-between items-center p-6 bg-gray-50 border-2 border-gray-300 rounded-2xl">
                <span className="text-xs font-black uppercase text-gray-500 tracking-widest">Notas Fiscais</span>
                <span className="text-2xl font-black text-gray-900">{currentData.notas.length}</span>
              </div>
              <div className="flex justify-between items-center p-6 bg-gray-50 border-2 border-gray-300 rounded-2xl">
                <span className="text-xs font-black uppercase text-gray-500 tracking-widest">Ordens Produção</span>
                <span className="text-2xl font-black text-gray-900">{currentData.ordens.length}</span>
              </div>
              <div className="flex justify-between items-center p-6 bg-gray-50 border-2 border-gray-300 rounded-2xl">
                <span className="text-xs font-black uppercase text-gray-500 tracking-widest">Apontamentos</span>
                <span className="text-2xl font-black text-gray-900">{currentData.comentarios.length}</span>
              </div>
           </div>

           <div className="mt-auto p-8 bg-emerald-900 text-white rounded-[2.5rem] border-2 border-emerald-950 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Sincronização Ativa</p>
              <h4 className="text-lg font-black mt-2 leading-tight">Os dados estão sendo monitorados em tempo real pela infraestrutura Agrosystem Cloud.</h4>
              <div className="mt-6 flex items-center gap-3">
                 <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                 <span className="text-xs font-bold uppercase tracking-widest">Banco Conectado</span>
              </div>
           </div>
        </div>
      </div>

      {showSqlFix && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fadeIn">
          <div className="p-12 bg-red-600 text-white rounded-[3.5rem] shadow-2xl max-w-2xl w-full border-4 border-red-400 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center gap-6 mb-8">
              <span className="text-6xl">🚨</span>
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter">Script de Segurança Mestre</h3>
                <p className="text-xs font-bold opacity-90 mt-2 uppercase tracking-widest leading-none">Execute para fixar problemas de salvamento e colunas ausentes.</p>
              </div>
            </div>
            <div className="relative mb-8">
              <pre className="bg-black/40 p-8 rounded-[2rem] text-[10px] font-mono overflow-x-auto border-2 border-white/20 text-red-50 leading-relaxed shadow-inner">
{`-- 1. Desativa Segurança (RLS) para permitir escrita via App
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_producao DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups DISABLE ROW LEVEL SECURITY;

-- 2. Garante que a coluna 'conferente' exista
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS conferente TEXT;
ALTER TABLE public.ordens_producao ADD COLUMN IF NOT EXISTS conferente TEXT;

-- 3. Garante que os IDs sejam gerados automaticamente se estiverem faltando
ALTER TABLE public.notas_fiscais ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.ordens_producao ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.comentarios ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.backups ALTER COLUMN id SET DEFAULT gen_random_uuid();`}
              </pre>
              <button onClick={() => { navigator.clipboard.writeText(`ALTER TABLE public.users DISABLE ROW LEVEL SECURITY; ALTER TABLE public.notas_fiscais DISABLE ROW LEVEL SECURITY; ALTER TABLE public.ordens_producao DISABLE ROW LEVEL SECURITY; ALTER TABLE public.comentarios DISABLE ROW LEVEL SECURITY; ALTER TABLE public.backups DISABLE ROW LEVEL SECURITY; ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS conferente TEXT; ALTER TABLE public.ordens_producao ADD COLUMN IF NOT EXISTS conferente TEXT; ALTER TABLE public.notas_fiscais ALTER COLUMN id SET DEFAULT gen_random_uuid(); ALTER TABLE public.ordens_producao ALTER COLUMN id SET DEFAULT gen_random_uuid(); ALTER TABLE public.comentarios ALTER COLUMN id SET DEFAULT gen_random_uuid(); ALTER TABLE public.backups ALTER COLUMN id SET DEFAULT gen_random_uuid();`); showToast('Script Mestre Copiado!'); }} className="absolute top-6 right-6 px-6 py-3 bg-white text-red-600 rounded-2xl text-[10px] font-black uppercase shadow-xl active:scale-95 transition-all">Copiar Tudo</button>
            </div>
            <button onClick={() => setShowSqlFix(false)} className="w-full py-6 bg-red-800 hover:bg-red-900 text-white font-black rounded-2xl text-xs uppercase tracking-[0.2em] shadow-2xl border-2 border-red-950">Fechar Monitor</button>
          </div>
        </div>
      )}
    </div>
  );
};
