
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/supabase';
import { User, AppState, UserRole } from '../types';

interface AdminPanelProps {
  currentData: AppState;
  onRefresh: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentData, onRefresh }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'operador' as UserRole });
  const [myPassword, setMyPassword] = useState({ current: '', confirm: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
      showToast("Falha ao carregar usuários Nano", 'error');
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.username) {
      showToast("Preencha os campos obrigatórios", "error");
      return;
    }
    setActionLoading(true);
    try {
      if (editingUserId) {
        await db.users.update(editingUserId, { 
          name: userForm.name.trim(), 
          username: userForm.username.toLowerCase().trim(), 
          role: userForm.role 
        });
        showToast("Acesso Nano atualizado com sucesso.");
      } else {
        if (!userForm.password) {
          showToast("Senha é obrigatória para novos usuários", "error");
          return;
        }
        await db.users.create({
          name: userForm.name.trim(),
          username: userForm.username.toLowerCase().trim(),
          password: userForm.password,
          role: userForm.role
        });
        showToast("Novo acesso Nano liberado.");
      }
      setUserForm({ name: '', username: '', password: '', role: 'operador' });
      setEditingUserId(null);
      await fetchUsers();
    } catch (e: any) {
      showToast("Erro ao processar acesso", 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateMyPassword = async () => {
    if (myPassword.current !== myPassword.confirm || myPassword.current.length < 4) {
      showToast("Verifique as senhas digitadas", "error");
      return;
    }
    setActionLoading(true);
    try {
      await db.users.updatePassword(currentUser.id, myPassword.current);
      setMyPassword({ current: '', confirm: '' });
      showToast("Senha pessoal atualizada.");
    } catch {
      showToast("Erro ao atualizar senha", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.id) return;
    if (!confirm("Remover permanentemente este acesso?")) return;
    try {
      await db.users.delete(userId);
      await fetchUsers();
      showToast("Acesso removido.");
    } catch {
      showToast("Erro ao remover", "error");
    }
  };

  return (
    <div className="space-y-10 pb-24">
      {toast && (
        <div className={`fixed top-24 right-10 z-[300] px-8 py-4 rounded-2xl shadow-2xl border-2 font-black text-[10px] uppercase tracking-widest animate-slideInRight ${toast.type === 'success' ? 'bg-emerald-900 text-white border-emerald-600' : 'bg-red-900 text-white border-red-600'}`}>
          {toast.message}
        </div>
      )}

      {/* MINHA CONTA NANO - ACESSO UNIVERSAL */}
      <section className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-gray-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="h-8 w-2.5 bg-[#005c3e] rounded-full"></div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">Minha Conta Nano</h2>
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Alterar senha de acesso ao sistema</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
          <div className="md:col-span-4">
            <label className="block text-[8px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Nova Senha</label>
            <input type="password" value={myPassword.current} onChange={e => setMyPassword({...myPassword, current: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl outline-none focus:border-emerald-600 font-bold" placeholder="••••••••" />
          </div>
          <div className="md:col-span-4">
            <label className="block text-[8px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Confirmar Senha</label>
            <input type="password" value={myPassword.confirm} onChange={e => setMyPassword({...myPassword, confirm: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl outline-none focus:border-emerald-600 font-bold" placeholder="••••••••" />
          </div>
          <div className="md:col-span-4">
            <button onClick={handleUpdateMyPassword} className="w-full py-5 bg-[#005c3e] text-white font-black rounded-2xl text-[9px] uppercase tracking-widest shadow-lg hover:bg-emerald-900 transition-all border-b-6 border-emerald-950">Atualizar Minha Senha</button>
          </div>
        </div>
      </section>

      {/* SEÇÕES RESTRITAS APENAS PARA ADMIN */}
      {isAdmin ? (
        <>
          {/* COLABORADORES NANO */}
          <section className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-gray-100 animate-fadeIn">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="h-8 w-2.5 bg-[#005c3e] rounded-full"></div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">Colaboradores Nano</h2>
              </div>
              <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-4 py-2 rounded-full uppercase tracking-widest">{users.length} Usuários</span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
              {/* Formulário */}
              <div className="xl:col-span-5 bg-gray-50/50 p-8 rounded-[2rem] border-2 border-gray-100 shadow-inner">
                <h3 className="text-[10px] font-black text-gray-400 uppercase mb-8 tracking-[0.3em] text-center">{editingUserId ? 'Atualizar Acesso' : 'Cadastrar Novo Acesso'}</h3>
                <form onSubmit={handleSaveUser} className="space-y-5">
                  <input type="text" placeholder="Nome do Usuário" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-gray-200 rounded-2xl outline-none focus:border-emerald-600 font-bold" />
                  <input type="text" placeholder="Identificador (Login)" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-gray-200 rounded-2xl outline-none focus:border-emerald-600 font-bold" />
                  {!editingUserId && (
                    <input type="password" placeholder="Senha Inicial" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-gray-200 rounded-2xl outline-none focus:border-emerald-600 font-bold" />
                  )}
                  <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full px-6 py-4 bg-white border-2 border-gray-200 rounded-2xl outline-none focus:border-emerald-600 font-bold uppercase text-[10px] tracking-widest">
                    <option value="operador">Nível Operador</option>
                    <option value="editor">Nível Editor</option>
                    <option value="admin">Nível Administrador</option>
                  </select>
                  <button type="submit" disabled={actionLoading} className="w-full py-5 bg-[#005c3e] text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl border-b-6 border-emerald-950 active:translate-y-1">
                    {editingUserId ? 'Salvar Alterações' : 'Liberar Acesso Nano'}
                  </button>
                  {editingUserId && (
                    <button type="button" onClick={() => { setEditingUserId(null); setUserForm({name: '', username: '', password: '', role: 'operador'}); }} className="w-full py-4 text-gray-400 font-black text-[9px] uppercase">Cancelar Edição</button>
                  )}
                </form>
              </div>

              {/* Lista */}
              <div className="xl:col-span-7 space-y-4">
                {users.map(u => (
                  <div key={u.id} className="p-5 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-between group border-l-[10px] border-l-emerald-600 shadow-sm">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-gray-50 text-gray-700 font-black rounded-xl flex items-center justify-center border-2 border-gray-100 uppercase italic">{u.name.charAt(0)}</div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 uppercase leading-none mb-1">{u.name}</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold text-gray-400">LOGIN: {u.username}</span>
                          <span className="text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">{u.role}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingUserId(u.id); setUserForm({ name: u.name, username: u.username, password: '', role: u.role }); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* INFRAESTRUTURA NANO */}
          <section className="p-10 bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-xl animate-fadeIn">
            <div className="flex items-center gap-4 mb-10">
              <div className="h-8 w-2.5 bg-[#005c3e] rounded-full"></div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">Infraestrutura Nano</h2>
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Dados críticos e recuperação</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-12 bg-gray-50/50 rounded-[2.5rem] text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-8">
                  <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                </div>
                <h3 className="text-lg font-black text-gray-900 uppercase italic mb-4">Nano Cloud Sync</h3>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-10">Gera um ponto de restauração manual agora na rede Nano.</p>
                <button onClick={async () => {
                  setActionLoading(true);
                  try { await db.system.createBackup(currentData, 'manual'); showToast("Backup realizado."); } catch { showToast("Erro", "error"); }
                  finally { setActionLoading(false); }
                }} className="w-full py-5 bg-[#005c3e] text-white font-black rounded-2xl text-[9px] uppercase tracking-widest shadow-xl border-b-6 border-emerald-950 active:translate-y-1">Novo Backup Cloud</button>
              </div>
              <div className="p-12 bg-gray-50/50 rounded-[2.5rem] text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-8">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </div>
                <h3 className="text-lg font-black text-gray-900 uppercase italic mb-4">Time Travel</h3>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-10">Retorne o banco Nano a um estado anterior via snapshot.</p>
                <button className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-[9px] uppercase tracking-widest shadow-xl border-b-6 border-blue-900 active:translate-y-1">Ver Histórico Nano</button>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="p-10 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">
            Recursos restritos ao administrador do sistema Nano
          </p>
        </div>
      )}
    </div>
  );
};
