
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthProps {
  onLogin: (user: User) => void;
  onGuest: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onGuest }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const safeUsername = username.toLowerCase().trim();
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', safeUsername)
        .maybeSingle();

      if (userError || !user) throw new Error('Usuário não encontrado.');
      if (user.password !== password) throw new Error('Senha incorreta.');

      localStorage.setItem('diario_user', JSON.stringify(user));
      onLogin(user);
    } catch (e) {
      setError((e as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    localStorage.setItem('diario_guest_mode', 'true');
    onGuest();
  };

  return (
    <div className="min-h-screen bg-emerald-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
        <div className="bg-emerald-900 p-12 text-center">
           <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-800 text-3xl font-bold shadow-xl">AS</div>
           <h1 className="text-white text-2xl font-bold">Diário de Bordo</h1>
           <p className="text-emerald-100 text-sm mt-2 opacity-80">Gestão Operacional Agrosystem</p>
        </div>
        
        <div className="p-8 lg:p-12">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Usuário</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Seu nome de usuário"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Acessar Sistema'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
            <button 
              onClick={handleGuest}
              className="text-gray-400 hover:text-emerald-600 text-sm font-bold transition-colors"
            >
              👁️ Continuar como Visitante
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
