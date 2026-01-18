
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

      if (userError || !user) throw new Error('Credenciais Nano não reconhecidas.');
      if (user.password !== password) throw new Error('Senha incorreta.');

      // Login realizado SEM localStorage - sessão em memória
      onLogin(user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#005c3e] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Elementos visuais Nano ao fundo */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-700/20 rounded-full blur-[100px]"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-900/40 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-lg bg-white rounded-[4rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.5)] overflow-hidden animate-scaleIn border-4 border-gray-400 relative z-10">
        <div className="bg-[#005c3e] p-16 text-center relative">
           <div className="absolute top-0 right-0 p-10 text-white/5 text-8xl font-black italic">N</div>
           <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl transform rotate-12">
              <span className="text-[#005c3e] text-5xl font-black italic">N</span>
           </div>
           <h1 className="text-white text-4xl font-black tracking-tighter uppercase italic leading-none">Nano Pro</h1>
           <p className="text-emerald-100 text-[10px] font-black mt-4 opacity-60 uppercase tracking-[0.5em]">Logística Industrial Inteligente</p>
        </div>
        
        <div className="p-12 lg:p-16 bg-white">
          {error && (
            <div className="mb-10 p-6 bg-red-50 text-red-600 rounded-2xl text-[11px] font-black border-2 border-red-100 uppercase tracking-widest animate-shake">
              ⚠️ {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-[0.3em] ml-2">ID Acesso Nano</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-8 py-5 bg-gray-50 border-2 border-gray-200 rounded-3xl focus:border-[#005c3e] outline-none transition-all text-xl font-bold shadow-inner"
                placeholder="USUÁRIO"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-[0.3em] ml-2">Senha Operacional</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-8 py-5 bg-gray-50 border-2 border-gray-200 rounded-3xl focus:border-[#005c3e] outline-none transition-all text-xl font-bold shadow-inner"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#005c3e] text-white font-black py-6 rounded-[2rem] shadow-2xl hover:bg-emerald-900 transition-all disabled:opacity-50 uppercase text-xs tracking-[0.3em] border-b-8 border-emerald-950 active:translate-y-2 active:border-b-0"
            >
              {loading ? 'Validando...' : 'Autenticar Sistema'}
            </button>
          </form>

          <div className="mt-12 pt-10 border-t-2 border-gray-100 text-center">
            <button 
              onClick={onGuest}
              className="text-gray-400 hover:text-[#005c3e] text-[10px] font-black transition-all uppercase tracking-[0.3em] border-b-2 border-transparent hover:border-emerald-600"
            >
              👁️ MODO CONSULTA (GUEST)
            </button>
          </div>
        </div>
      </div>
      <p className="fixed bottom-10 text-white/30 text-[9px] font-black uppercase tracking-[1em]">Nano Tech Security System</p>
    </div>
  );
};
