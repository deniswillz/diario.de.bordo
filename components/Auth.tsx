
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
    <div className="min-h-screen bg-[#006B47] flex flex-col items-center justify-between p-6 sm:p-8">

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          {/* Logo PNG */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <img
              src="/nano-logo.png"
              alt="Nano Pro"
              className="h-20 sm:h-24 object-contain filter brightness-0 invert"
            />
          </div>

          {/* Slogan */}
          <p className="text-white/80 text-[10px] sm:text-xs font-semibold tracking-[0.3em] uppercase">
            Logística Industrial Inteligente
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold text-center border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Login Field */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <label className="text-[10px] font-bold uppercase tracking-widest">Login</label>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-4 bg-[#f5f5f5] border-2 border-transparent rounded-xl outline-none focus:border-[#006B47] transition-all text-gray-700 font-medium"
                  placeholder="Seu login"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <label className="text-[10px] font-bold uppercase tracking-widest">Senha</label>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-4 bg-[#f5f5f5] border-2 border-transparent rounded-xl outline-none focus:border-[#006B47] transition-all text-gray-700 font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#006B47] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-[#005538] transition-all uppercase text-sm tracking-widest disabled:opacity-70"
            >
              {loading ? 'Sincronizando...' : 'Entrar'}
            </button>

            {/* Guest Mode */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onGuest}
                className="text-gray-400 hover:text-[#006B47] text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                Modo Consulta (Visitante)
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full text-center pt-8">
        <p className="text-white/60 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em]">
          Nano Pro © 2026 - Gestão Industrial de Alta Performance
        </p>
      </div>
    </div>
  );
};
