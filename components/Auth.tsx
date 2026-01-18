
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

      if (userError || !user) throw new Error('Credenciais não reconhecidas.');
      if (user.password !== password) throw new Error('Senha incorreta.');

      onLogin(user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#005c3e] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Marca d'água de fundo */}
      <div className="absolute top-10 right-10 opacity-5 select-none pointer-events-none">
        <span className="text-[30rem] font-black italic leading-none">N</span>
      </div>

      <div className="flex flex-col items-center justify-center w-full max-w-md z-10 animate-fadeIn">
        {/* Seção de Identidade Visual (Logo e Slogan) */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white p-8 rounded-[2.5rem] shadow-2xl transform -rotate-6 mb-8 border-4 border-emerald-900/10">
            <span className="text-[#005c3e] text-6xl font-black italic select-none">N</span>
          </div>
          <h1 className="text-white text-5xl md:text-6xl font-black italic tracking-tighter uppercase mb-4 leading-none">
            NANO PRO
          </h1>
          <p className="text-emerald-100/70 text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase">
            Logística Industrial Inteligente
          </p>
        </div>

        {/* Cartão de Login */}
        <div className="w-full bg-white rounded-[2.5rem] shadow-2xl p-10 animate-scaleIn border-4 border-emerald-950/10 mb-10">
          <form onSubmit={handleLogin} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase text-center border-2 border-red-100 animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" /></svg>
                  <label className="text-[10px] font-black uppercase tracking-widest">Login</label>
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-6 py-4 bg-[#f8fafc] border-2 border-blue-50/50 rounded-2xl outline-none focus:border-emerald-600 transition-all text-gray-700 font-bold shadow-inner"
                  placeholder="Seu login"
                  required
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <label className="text-[10px] font-black uppercase tracking-widest">Senha</label>
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-[#f8fafc] border-2 border-blue-50/50 rounded-2xl outline-none focus:border-emerald-600 transition-all text-gray-700 font-bold shadow-inner"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#005c3e] text-white font-black py-5 rounded-2xl shadow-xl hover:bg-emerald-900 transition-all uppercase text-sm tracking-widest border-b-6 border-emerald-950 active:translate-y-1"
            >
              {loading ? 'Sincronizando...' : 'Entrar'}
            </button>

            <div className="text-center pt-2">
              <button 
                type="button"
                onClick={onGuest}
                className="text-gray-400 hover:text-emerald-700 text-[9px] font-black uppercase tracking-widest transition-colors"
              >
                Modo Consulta (Visitante)
              </button>
            </div>
          </form>
        </div>

        {/* Rodapé de Copyright - Agora mais visível e fixo na hierarquia flex */}
        <div className="text-center pb-4">
          <p className="text-emerald-200/50 text-[9px] font-black uppercase tracking-[0.4em] leading-relaxed">
            Nano Pro &copy; 2026 - Gestão Industrial de Alta Performance
          </p>
        </div>
      </div>
    </div>
  );
};
