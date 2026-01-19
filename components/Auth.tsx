
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthProps {
  onLogin: (user: User) => void;
  onGuest: () => void;
}

// Componente SVG do Logo Nano Pro
const NanoLogo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M45 5 L80 25 L80 65 L45 85 L10 65 L10 25 Z" stroke="currentColor" strokeWidth="3" fill="none"/>
    <path d="M20 20 L35 20 M55 20 L70 20 M75 30 L75 40 M75 50 L75 60 M70 70 L55 70 M35 70 L20 70 M15 60 L15 50 M15 40 L15 30" stroke="currentColor" strokeWidth="2" fill="none"/>
    <circle cx="20" cy="20" r="3" fill="currentColor"/>
    <circle cx="70" cy="20" r="3" fill="currentColor"/>
    <circle cx="75" cy="45" r="3" fill="currentColor"/>
    <circle cx="70" cy="70" r="3" fill="currentColor"/>
    <circle cx="20" cy="70" r="3" fill="currentColor"/>
    <circle cx="15" cy="45" r="3" fill="currentColor"/>
    <ellipse cx="45" cy="45" rx="22" ry="10" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(-30 45 45)"/>
    <ellipse cx="45" cy="45" rx="22" ry="10" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(30 45 45)"/>
    <ellipse cx="45" cy="45" rx="22" ry="10" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(90 45 45)"/>
    <circle cx="45" cy="45" r="4" fill="currentColor"/>
  </svg>
);

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
    <div className="min-h-screen bg-gradient-to-br from-[#004d33] via-[#005c3e] to-[#007a52] flex flex-col items-center justify-between p-4 sm:p-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-emerald-400/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-300/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-radial from-white/5 to-transparent rounded-full"></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md z-10 animate-fadeIn">
        {/* Logo Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="relative inline-block mb-6">
            {/* Glow effect behind logo */}
            <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-150"></div>
            <div className="relative bg-white/95 backdrop-blur-sm p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/50 transform hover:scale-105 transition-all duration-500">
              <NanoLogo className="w-20 h-20 sm:w-24 sm:h-24 text-[#005c3e]" />
            </div>
          </div>
          
          <h1 className="text-white text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3 drop-shadow-lg">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-white">
              Nano Pro
            </span>
          </h1>
          <p className="text-emerald-100/80 text-[10px] sm:text-xs font-bold tracking-[0.3em] sm:tracking-[0.4em] uppercase">
            Logística Industrial Inteligente
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 animate-scaleIn border border-white/50 relative overflow-hidden">
          {/* Card decorative element */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-emerald-100/50 to-transparent rounded-full blur-2xl"></div>
          
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold text-center border-2 border-red-100 animate-shake flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Login Field */}
              <div className="group">
                <div className="flex items-center gap-2 mb-2 text-gray-400 group-focus-within:text-emerald-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <label className="text-[10px] font-black uppercase tracking-widest">Login</label>
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50/80 border-2 border-gray-100 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:shadow-lg transition-all text-gray-700 font-semibold placeholder:text-gray-300"
                  placeholder="Seu login"
                  required
                />
              </div>

              {/* Password Field */}
              <div className="group">
                <div className="flex items-center gap-2 mb-2 text-gray-400 group-focus-within:text-emerald-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <label className="text-[10px] font-black uppercase tracking-widest">Senha</label>
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50/80 border-2 border-gray-100 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:shadow-lg transition-all text-gray-700 font-semibold placeholder:text-gray-300"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#005c3e] to-[#007a52] text-white font-black py-4 rounded-xl shadow-xl hover:shadow-2xl hover:from-[#004d33] hover:to-[#006644] transition-all uppercase text-sm tracking-widest border-b-4 border-emerald-950/50 active:translate-y-0.5 active:border-b-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sincronizando...
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Guest Mode */}
            <div className="text-center pt-2">
              <button 
                type="button"
                onClick={onGuest}
                className="text-gray-400 hover:text-emerald-600 text-[10px] font-bold uppercase tracking-widest transition-all hover:tracking-[0.2em] inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Modo Consulta (Visitante)
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full text-center pb-2 z-20 mt-8">
        <p className="text-emerald-100/60 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] leading-loose">
          Nano Pro &copy; 2026 - Gestão Industrial de Alta Performance
        </p>
      </div>
    </div>
  );
};
