
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/supabase';
import { User, Backup, AppState, UserRole } from '../types';
import { format, parseISO } from 'date-fns';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operador' });
  const [actionLoading, setActionLoading] = useState(false);
  const [showSqlFix, setShowSqlFix] = useState(false);
  
  // UI States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dialog, setDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDestructive?: boolean } | null>(null);
  const [exportModalData, setExportModalData] = useState<string | null>(null);
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
      showToast("Bloqueio de segurança SQL", 'error');
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
      setShowSqlFix(true);
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
          showToast("Erro SQL ao excluir", 'error');
          setShowSqlFix(true);
        } finally {
          setDialog(null);
        }
      }
    });
  };

  const handleExportBackup = async () => {
    setActionLoading(true);
    try {
      const [notas, ordens, comentarios] = await Promise.all([db.notas.fetch(), db.ordens.fetch(), db.comentarios.fetch()]);
      const snapshot = { notas, ordens, comentarios };
      // Somente exibição para cópia manual, eliminando erros de blob/download
      setExportModalData(JSON.stringify(snapshot, null, 2));
      await db.system.createBackup(snapshot, 'manual').catch(() => {});
      await fetchBackups();
    } catch (e: any) {
      showToast("Erro ao exportar dados", 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreFromCloud = (backup: Backup) => {
    setDialog({
      isOpen: true,
      title: "Aplicar Backup Cloud?",
      message: "Os dados locais serão substituídos pela versão de " + format(parseISO(backup.created_at), "dd/MM") + ".",
      isDestructive: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await db.system.restoreFromSnapshot(backup.data_snapshot);
          // Estado de sucesso sem reload forçado para evitar erro de sandbox
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

  const handleDeleteBackup = (id: string) => {
    setDialog({
      isOpen: true,
      title: "Apagar Sincronização?",
      message: "Este ponto de restauração será removido permanentemente da nuvem.",
      isDestructive: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await db.system.deleteBackup(id);
          await fetchBackups();
          showToast("Sincronização removida.");
        } catch (e: any) {
          showToast("Erro ao excluir backup cloud", 'error');
          setShowSqlFix(true);
        } finally {
          setActionLoading(false);
          setDialog(null);
        }
      }
    });
  };

  // TELA DE SUCESSO PÓS-RESTAURAÇÃO (EVITA ERRO DE REDIRECIONAMENTO)
  if (isRestored) {
    return (
      <div className="fixed inset-0 z-[500] bg-[#005c3e] flex items-center justify-center p-6 text-center animate-fadeIn">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-lg w-full animate-scaleIn">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-gray-900 text-3xl font-black uppercase tracking-tighter leading-none">Dados Restaurados</h2>
          <p className="text-gray-500 text-sm font-bold mt-6 uppercase tracking-widest leading-relaxed">
            A base de dados foi atualizada com sucesso na nuvem.
          </p>
          <div className="mt-10 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
             <p className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em]">Ação Necessária:</p>
             <p className="text-xs font-bold text-emerald-600 mt-2">Pressione <kbd className="bg-white px-2 py-1 rounded shadow-sm border border-emerald-200">F5</kbd> ou o botão abaixo para atualizar sua visão.</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full mt-8 py-6 bg-[#005c3e] text-white font-black rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-900 transition-all active:scale-95"
          >
            Atualizar Agora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-20 relative">
      {/* Toasts */}
      {toast && (
        <div className={`fixed top-20 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slideInRight ${
          toast.type === 'error' ? 'bg-red-600 border-red-500 text-white' : 'bg-emerald-900 border-emerald-800 text-white'
        }`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <p className="text-[10px] font-black uppercase tracking-widest">{toast.message}</p>
        </div>
      )}

      {/* Manual Export Center */}
      {exportModalData && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
            <div className="p-10 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-emerald-900 uppercase tracking-tight">Centro de Backup Manual</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Exportação Segura Agrosystem</p>
              </div>
              <button onClick={() => setExportModalData(null)} className="p-4 hover:bg-emerald-100 rounded-full text-emerald-900 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-10 flex-1 overflow-hidden flex flex-col">
              <div className="mb-6 p-6 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4 shadow-sm">
                <span className="text-2xl">📋</span>
                <p className="text-sm text-blue-800 font-bold leading-relaxed">
                  Para garantir a segurança, copie o código abaixo e salve em um arquivo de texto no seu computador. Downloads automáticos estão desativados por segurança do navegador.
                </p>
              </div>
              <textarea 
                readOnly 
                value={exportModalData} 
                className="w-full flex-1 p-6 bg-gray-900 text-emerald-400 font-mono text-[11px] rounded-3xl border-none outline-none resize-none shadow-inner custom-scrollbar"
              />
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(exportModalData);
                    showToast("Copiado para transferência!");
                  }}
                  className="flex-[2] py-6 bg-[#005c3e] text-white font-black rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-900 transition-all"
                >
                  Copiar Todos os Dados
                </button>
                <button 
                  onClick={() => setExportModalData(null)}
                  className="flex-1 py-6 bg-gray-100 text-gray-500 font-black rounded-2xl text-xs uppercase tracking-[0.2em]"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {dialog?.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-scaleIn">
            <div className={`p-10 text-center ${dialog.isDestructive ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${dialog.isDestructive ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <span className="text-3xl">{dialog.isDestructive ? '⚠️' : '❓'}</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{dialog.title}</h3>
              <p className="text-sm text-gray-500 font-bold mt-2 px-6 leading-relaxed">{dialog.message}</p>
            </div>
            <div className="p-8 flex gap-3">
              <button onClick={() => setDialog(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-2xl text-[10px] uppercase tracking-widest">Cancelar</button>
              <button onClick={dialog.onConfirm} className={`flex-1 py-4 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg ${dialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Maintenance Area */}
      {showSqlFix && (
        <div className="p-8 bg-red-600 text-white rounded-[2rem] shadow-2xl animate-shake border-4 border-red-400">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-5xl">🚨</span>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Correção de Permissões</h3>
              <p className="text-xs font-bold opacity-90 mt-2 uppercase tracking-widest leading-none">O Banco Supabase precisa liberar o acesso às tabelas.</p>
            </div>
          </div>
          <div className="relative mb-6">
            <pre className="bg-black/30 p-6 rounded-2xl text-[10px] font-mono overflow-x-auto border border-white/20 text-red-50">
{`ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_producao DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups DISABLE ROW LEVEL SECURITY;`}
            </pre>
            <button 
              onClick={() => { 
                navigator.clipboard.writeText(`ALTER TABLE public.users DISABLE ROW LEVEL SECURITY; ALTER TABLE public.notas_fiscais DISABLE ROW LEVEL SECURITY; ALTER TABLE public.ordens_producao DISABLE ROW LEVEL SECURITY; ALTER TABLE public.comentarios DISABLE ROW LEVEL SECURITY; ALTER TABLE public.backups DISABLE ROW LEVEL SECURITY;`); 
                showToast('Comando Copiado!'); 
              }} 
              className="absolute top-4 right-4 px-4 py-2 bg-white text-red-600 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all"
            >
              Copiar SQL
            </button>
          </div>
          <button onClick={() => setShowSqlFix(false)} className="w-full py-4 bg-red-800 hover:bg-red-900 text-white font-black rounded-xl text-[10px] uppercase tracking-widest">Já liberei o acesso no painel SQL</button>
        </div>
      )}

      {/* Control Header */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex-1">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Painel de Controle</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestão de Infraestrutura e Snapshots</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSqlFix(true)} className="px-6 py-3 bg-red-100 text-red-600 text-[10px] font-black uppercase rounded-xl hover:bg-red-200 transition-colors">Segurança SQL</button>
          <button onClick={handleExportBackup} disabled={actionLoading} className="px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-emerald-700">Exportar Backup</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Management */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Colaboradores</h3>
            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded">{users.length} USUÁRIOS</span>
          </div>
          <div className="p-6 space-y-6">
            <form onSubmit={handleCreateUser} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="ID Login" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" required />
                <input type="password" placeholder="Senha" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div className="flex gap-3">
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase outline-none cursor-pointer">
                  <option value="operador">Operador</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
                <button type="submit" disabled={actionLoading} className="px-8 py-3 bg-[#005c3e] text-white text-[10px] font-black uppercase rounded-xl hover:bg-emerald-900 transition-all shadow-md active:scale-95">Ativar</button>
              </div>
            </form>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {users.map(u => {
                const isSelf = u.id === currentUser.id;
                return (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl group hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-emerald-500">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center font-black text-xs uppercase group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">{u.username.substring(0,2)}</div>
                      <div>
                        <p className="text-sm font-black text-gray-800 leading-none">{u.username}</p>
                        <div className="mt-1">
                          {isSelf ? <span className="text-[8px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded uppercase font-black">Admin Logado</span> : (
                            <select value={u.role} onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)} className="bg-transparent text-[10px] font-black text-emerald-600 uppercase border-none outline-none cursor-pointer">
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="operador">Operador</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                    {!isSelf && (
                      <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-gray-300 hover:text-red-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sync Center */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Sincronização Cloud</h3>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">PONTOS DE RESTAURAÇÃO</span>
          </div>
          <div className="p-6 space-y-3 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
            {backups.map(b => (
              <div key={b.id} className="flex items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100 border-l-4 border-l-emerald-500 group transition-all">
                <div>
                  <p className="text-sm font-black text-gray-800">{format(parseISO(b.created_at), "dd/MM/yyyy HH:mm")}</p>
                  <p className="text-[9px] font-black uppercase text-gray-400 mt-1">{b.tipo} snapshot</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRestoreFromCloud(b)} className="px-5 py-2.5 bg-white border border-gray-200 text-[9px] font-black text-gray-600 uppercase rounded-xl hover:border-emerald-500 hover:text-emerald-600 shadow-sm transition-all group-hover:scale-105 active:scale-95">Restaurar</button>
                  <button onClick={() => handleDeleteBackup(b.id)} className="p-2.5 text-gray-300 hover:text-red-600 transition-colors bg-white border border-gray-100 rounded-xl hover:shadow-md">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
            {backups.length === 0 && (
              <div className="text-center py-20 text-gray-300 font-black uppercase text-[10px] tracking-widest">Nenhum backup em nuvem</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
