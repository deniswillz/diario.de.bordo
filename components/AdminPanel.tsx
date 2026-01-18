
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
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'operador' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSqlFix, setShowSqlFix] = useState(false);
  const [showCloudBackups, setShowCloudBackups] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dialog, setDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDestructive?: boolean } | null>(null);
  const [isRestored, setIsRestored] = useState(false);

  // Configurações de Perfil (Senha)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const currentUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('active_user') || '{}');
    } catch { return {}; }
  })();

  const isAdmin = currentUser.role === 'admin';

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await db.users.fetchAll();
      setUsers(data || []);
    } catch (e: any) {
      showToast("Falha na carga Nano", 'error');
    }
  }, [isAdmin]);

  const fetchBackups = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await db.system.fetchBackups();
      setBackups(data || []);
    } catch (e: any) {}
  }, [isAdmin]);

  useEffect(() => {
    fetchUsers();
    fetchBackups();
  }, [fetchUsers, fetchBackups]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await db.users.create({
        name: newUser.name.trim(),
        username: newUser.username.toLowerCase().trim(),
        password: newUser.password,
        role: newUser.role as any
      });
      setNewUser({ name: '', username: '', password: '', role: 'operador' });
      await fetchUsers();
      showToast("Novo acesso Nano criado.");
    } catch (e: any) {
      showToast("Erro ao criar usuário", 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("As senhas não coincidem", "error");
      return;
    }
    setActionLoading(true);
    try {
      const userId = currentUser.id;
      if (!userId) throw new Error("Usuário não identificado");
      await db.users.updatePassword(userId, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showToast("Senha Nano atualizada com sucesso.");
    } catch (e: any) {
      showToast("Falha ao mudar senha", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateThirdPartyUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);
    try {
      const updates: any = {
        name: editingUser.name.trim()
      };
      if (editingUser.password && editingUser.password.trim().length > 0) {
        updates.password = editingUser.password;
      }
      
      await db.users.update(editingUser.id, updates);
      setEditingUser(null);
      await fetchUsers();
      showToast("Dados do colaborador atualizados.");
    } catch (e: any) {
      showToast("Falha na atualização Nano", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      await db.users.updateRole(userId, newRole);
      await fetchUsers();
      showToast("Cargo atualizado.");
    } catch (e: any) {
      showToast("Erro na atualização", 'error');
    }
  };

  const handleDeleteUser = (id: string) => {
    setDialog({
      isOpen: true,
      title: "Excluir Usuário?",
      message: "Esta ação removerá permanentemente o acesso deste colaborador.",
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
      showToast("Snapshot Nano gerado na nuvem.");
    } catch (e: any) {
      showToast("Erro no backup Nano", 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (isRestored) {
    return (
      <div className="fixed inset-0 z-[500] bg-[#005c3e] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-lg w-full">
          <h2 className="text-gray-900 text-3xl font-black uppercase tracking-tighter">Dados Restaurados Nano</h2>
          <button onClick={() => window.location.reload()} className="w-full mt-10 py-8 bg-[#005c3e] text-white font-black rounded-3xl text-xs uppercase shadow-xl border-b-8 border-emerald-950">Reiniciar Sistema</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fadeIn pb-24 relative">
      {toast && (
        <div className={`fixed top-24 right-10 z-[200] px-10 py-5 rounded-3xl shadow-2xl border-4 flex items-center gap-6 ${
          toast.type === 'error' ? 'bg-red-600 border-red-500 text-white' : 'bg-emerald-900 border-emerald-700 text-white'
        }`}>
          <p className="text-[10px] font-black uppercase tracking-widest">{toast.message}</p>
        </div>
      )}

      {dialog?.isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border-4 border-gray-400">
            <div className={`p-10 text-center ${dialog.isDestructive ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{dialog.title}</h3>
              <p className="text-sm text-gray-600 font-bold mt-4">{dialog.message}</p>
            </div>
            <div className="p-8 flex gap-4 bg-white border-t-2 border-gray-100">
              <button onClick={() => setDialog(null)} className="flex-1 py-5 bg-gray-100 text-gray-500 font-black rounded-2xl text-[10px] uppercase tracking-widest">Cancelar</button>
              <button onClick={dialog.onConfirm} className={`flex-1 py-5 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl ${dialog.isDestructive ? 'bg-red-600' : 'bg-emerald-600'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {editingUser && isAdmin && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden border-4 border-emerald-600 animate-scaleIn">
            <div className="p-10 bg-[#005c3e] text-white">
              <h3 className="text-2xl font-black uppercase tracking-tighter italic">Editar Colaborador Nano</h3>
              <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-2">Alteração de credenciais e identificação</p>
            </div>
            <form onSubmit={handleUpdateThirdPartyUser} className="p-12 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Nome Completo</label>
                <input 
                  type="text" 
                  value={editingUser.name}
                  onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full px-8 py-5 bg-gray-50 border-2 border-gray-300 rounded-3xl focus:border-emerald-600 outline-none font-bold text-xl shadow-inner" 
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Nova Senha (deixe vazio para manter)</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={editingUser.password || ''}
                  onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                  className="w-full px-8 py-5 bg-gray-50 border-2 border-gray-300 rounded-3xl focus:border-emerald-600 outline-none font-bold text-xl shadow-inner" 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-6 bg-gray-100 text-gray-500 font-black rounded-3xl text-[10px] uppercase tracking-widest border-2 border-gray-200">Cancelar</button>
                <button type="submit" disabled={actionLoading} className="flex-[2] py-6 bg-[#005c3e] text-white font-black rounded-3xl text-[10px] uppercase tracking-[0.2em] shadow-xl border-b-8 border-emerald-950 active:translate-y-1">
                  {actionLoading ? 'Gravando...' : 'Confirmar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seção 1: Minha Conta (Visível para todos logados) */}
      <section className="bg-white p-14 rounded-[4rem] shadow-2xl border-2 border-gray-300 relative overflow-hidden">
        <div className="flex items-center gap-10 mb-12">
          <div className="h-14 w-3 bg-[#005c3e] rounded-full"></div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Minha Conta Nano</h2>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">Alterar senha de acesso ao sistema</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Nova Senha</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-8 py-5 bg-gray-50 border-2 border-gray-400 rounded-3xl focus:border-emerald-600 outline-none font-bold text-xl shadow-inner" 
              required
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Confirmar Senha</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-8 py-5 bg-gray-50 border-2 border-gray-400 rounded-3xl focus:border-emerald-600 outline-none font-bold text-xl shadow-inner" 
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={actionLoading}
            className="py-6 bg-[#005c3e] text-white font-black rounded-3xl text-[10px] uppercase tracking-[0.2em] shadow-xl border-b-8 border-emerald-950 active:translate-y-1 active:border-b-0"
          >
            {actionLoading ? 'Processando...' : 'Atualizar Minha Senha'}
          </button>
        </form>
      </section>

      {/* Seções Restritas ao ADMIN */}
      {isAdmin && (
        <>
          <section className="bg-white p-14 rounded-[4rem] shadow-2xl border-2 border-gray-300">
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-10">
                <div className="h-14 w-3 bg-[#005c3e] rounded-full"></div>
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Colaboradores Nano</h2>
              </div>
              <span className="bg-emerald-100 text-emerald-800 px-6 py-2 rounded-full font-black text-xs uppercase border-2 border-emerald-200">{users.length} usuários</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="p-10 bg-gray-50 border-2 border-gray-300 rounded-[3.5rem] shadow-inner">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8 text-center">Cadastrar Novo Acesso</h4>
                <form onSubmit={handleCreateUser} className="space-y-6">
                  <input 
                    type="text" 
                    placeholder="Nome do Usuário" 
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className="w-full px-8 py-5 bg-white border-2 border-gray-400 rounded-2xl outline-none font-bold text-lg" 
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Identificador (Login)" 
                    value={newUser.username}
                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                    className="w-full px-8 py-5 bg-white border-2 border-gray-400 rounded-2xl outline-none font-bold text-lg" 
                    required
                  />
                  <input 
                    type="password" 
                    placeholder="Senha Inicial" 
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    className="w-full px-8 py-5 bg-white border-2 border-gray-400 rounded-2xl outline-none font-bold text-lg" 
                    required
                  />
                  <select 
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                    className="w-full px-8 py-5 bg-white border-2 border-gray-400 rounded-2xl outline-none font-black text-xs uppercase tracking-widest appearance-none cursor-pointer"
                  >
                    <option value="operador">Nível Operador</option>
                    <option value="editor">Nível Editor</option>
                    <option value="admin">Nível Administrador</option>
                  </select>
                  <button type="submit" disabled={actionLoading} className="w-full py-6 bg-emerald-700 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest border-b-4 border-emerald-900 active:scale-95 disabled:opacity-50">
                    {actionLoading ? 'Criando...' : 'Liberar Acesso Nano'}
                  </button>
                </form>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-6 bg-white border-2 border-gray-300 rounded-3xl hover:border-emerald-500 transition-all border-l-8 border-l-emerald-600">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center font-black text-emerald-700 border-2 border-gray-200 uppercase">{u.username.charAt(0)}</div>
                      <div>
                        <p className="text-xl font-black text-gray-900 tracking-tight">{u.name || u.username}</p>
                        <div className="flex items-center gap-4">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Login: {u.username}</p>
                          <select 
                            value={u.role} 
                            onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                            className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-transparent outline-none cursor-pointer hover:underline"
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="operador">Operador</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingUser(u)} className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Editar Colaborador">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)} className="p-3 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all" title="Excluir Acesso">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white p-14 rounded-[4rem] shadow-2xl border-2 border-gray-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-emerald-100 text-6xl font-black opacity-10 italic">NANO INFRA</div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16">
               <div className="flex items-center gap-10">
                  <div className="h-14 w-3 bg-[#005c3e] rounded-full"></div>
                  <div>
                     <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Infraestrutura Nano</h2>
                     <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mt-2">Dados Críticos e Recuperação</p>
                  </div>
               </div>
               <button onClick={() => setShowSqlFix(true)} className="px-10 py-5 bg-gray-50 border-2 border-gray-300 text-[10px] font-black uppercase text-gray-500 rounded-2xl hover:border-red-500 hover:text-red-600 transition-all">Segurança SQL Nano</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="p-10 bg-gray-50 border-2 border-gray-400 rounded-[3rem] text-center hover:border-emerald-600 transition-all group">
                  <div className="w-16 h-16 bg-white border-2 border-gray-300 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">☁️</div>
                  <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">Nano Cloud Sync</h4>
                  <p className="text-xs font-bold text-gray-400 mt-3 mb-10 leading-relaxed">Gera um ponto de restauração manual agora na rede Nano.</p>
                  <button onClick={handleManualBackup} disabled={actionLoading} className="w-full py-6 bg-[#005c3e] text-white font-black rounded-3xl text-[10px] uppercase tracking-widest shadow-2xl border-b-8 border-emerald-950 active:translate-y-1">Novo Backup Cloud</button>
               </div>
               
               <div className="p-10 bg-gray-50 border-2 border-gray-400 rounded-[3rem] text-center hover:border-blue-600 transition-all group">
                  <div className="w-16 h-16 bg-white border-2 border-gray-300 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">🔄</div>
                  <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">Time Travel</h4>
                  <p className="text-xs font-bold text-gray-400 mt-3 mb-10 leading-relaxed">Retorne o banco Nano a um estado anterior via snapshot.</p>
                  <button onClick={() => setShowCloudBackups(true)} className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl text-[10px] uppercase tracking-widest shadow-2xl border-b-8 border-blue-900 active:translate-y-1">Ver Histórico Nano</button>
               </div>
            </div>
          </section>

          {showSqlFix && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-fadeIn">
              <div className="p-14 bg-red-600 text-white rounded-[4rem] shadow-2xl max-w-3xl w-full border-4 border-red-400">
                <h3 className="text-4xl font-black uppercase tracking-tighter italic mb-12">Script Estrutural Nano</h3>
                <pre className="bg-black/40 p-10 rounded-[2.5rem] text-[10px] font-mono overflow-x-auto border-2 border-white/20 text-red-50 leading-loose shadow-inner mb-10">
{`ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_producao DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;`}
                </pre>
                <button onClick={() => setShowSqlFix(false)} className="w-full py-8 bg-red-900 hover:bg-black text-white font-black rounded-3xl text-xs uppercase tracking-[0.3em] shadow-2xl border-2 border-red-700">Fechar Terminal</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
