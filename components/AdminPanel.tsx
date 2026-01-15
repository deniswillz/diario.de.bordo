
import React, { useState, useEffect } from 'react';
import { db } from '../services/supabase';
import { User } from '../types';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operador' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const data = await db.users.fetchAll();
    setUsers(data);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.users.create({ 
        username: newUser.username.toLowerCase().trim(), 
        password: newUser.password, 
        role: newUser.role as any,
        name: newUser.username.trim()
      });
      setNewUser({ username: '', password: '', role: 'operador' });
      fetchUsers();
      alert("Usuário criado com sucesso!");
    } catch (e) {
      alert("Erro ao criar: " + (e as any).message);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await db.users.updateRole(userId, role);
      fetchUsers();
    } catch (e) {
      alert("Erro ao atualizar.");
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (confirm(`Tem certeza que deseja excluir o usuário @${username}?`)) {
      try {
        await db.users.delete(userId);
        fetchUsers();
      } catch (e) {
        alert("Erro ao excluir usuário.");
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-black mb-6 text-gray-800 uppercase tracking-tight">👤 Criar Usuário</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
             <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Usuário</label>
                <input 
                  type="text" 
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#005c3e] outline-none text-sm font-bold"
                  required
                />
             </div>
             <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Senha</label>
                <input 
                  type="password" 
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#005c3e] outline-none text-sm font-bold"
                  required
                />
             </div>
             <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Perfil</label>
                <select 
                   value={newUser.role}
                   onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                   className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#005c3e] outline-none text-sm font-bold"
                >
                   <option value="operador">Operador (Apenas Ver)</option>
                   <option value="editor">Editor (Ver e Editar)</option>
                   <option value="admin">Administrador</option>
                </select>
             </div>
             <button type="submit" className="w-full bg-[#005c3e] text-white font-black py-4 rounded-xl shadow-lg mt-4 text-[10px] uppercase tracking-widest transition-all hover:bg-emerald-900">
                Criar Usuário
             </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 bg-gray-50/20">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Usuários Ativos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-gray-400 text-[9px] font-black uppercase tracking-[0.2em]">
                  <th className="px-8 py-5">Nome</th>
                  <th className="px-8 py-5">Usuário</th>
                  <th className="px-8 py-5">Perfil</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-8 py-6 font-black text-gray-900 text-sm">{u.name}</td>
                    <td className="px-8 py-6 text-gray-500 text-sm">@{u.username}</td>
                    <td className="px-8 py-6">
                      <select 
                        value={u.role}
                        onChange={e => handleUpdateRole(u.id, e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-tight focus:ring-2 focus:ring-[#005c3e] outline-none"
                      >
                        <option value="operador">Operador</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir Usuário"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
