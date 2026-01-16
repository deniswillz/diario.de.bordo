
import React, { useState } from 'react';
import { User, AppState } from '../types';
import { PasswordModal } from './PasswordModal';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LayoutProps {
  children: React.ReactNode;
  currentSection: string;
  onSectionChange: (section: any) => void;
  user: User | null;
  isGuest: boolean;
  onLogout: () => void;
  data?: AppState;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentSection, onSectionChange, user, isGuest, onLogout, data }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  
  // Cálculo dinâmico de itens críticos (pendentes há 3+ dias) para o badge
  const criticalCount = [
    ...(data?.notas.filter(n => 
      ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && 
      differenceInDays(new Date(), new Date(n.data + 'T12:00:00')) >= 3
    ) || []),
    ...(data?.ordens.filter(o => 
      o.status === 'Em Separação' && 
      differenceInDays(new Date(), new Date(o.data + 'T12:00:00')) >= 3
    ) || [])
  ].length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'notas', label: 'Notas Fiscais', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'ordens', label: 'Ordens de Produção', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  if (!isGuest) {
    navItems.push({ id: 'comentarios', label: 'Comentários', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' });
  }

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' });
  }

  const today = new Date();
  const formattedDate = format(today, "eeee, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      {/* HEADER AGROSYSTEM */}
      <header className="h-14 bg-[#005c3e] flex items-center justify-between px-6 shrink-0 z-50 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-1.5">
             <div className="text-xl font-bold italic tracking-tighter">A</div>
             <div className="text-lg font-medium tracking-tight opacity-90">agrosystem</div>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
           <h1 className="text-sm font-bold tracking-wide">Diário de Bordo</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Sino Notificação Dinâmico */}
          <div className="relative group">
             <button onClick={() => onSectionChange('dashboard')} className="p-2 hover:bg-white/10 rounded-full transition-colors relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {criticalCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-[10px] font-black flex items-center justify-center rounded-full border border-[#005c3e] animate-pulse">
                    {criticalCount}
                  </span>
                )}
             </button>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
            <span className="text-[11px] font-bold hidden sm:block">{isGuest ? 'Visitante' : user?.name || 'Usuário'}</span>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center border border-white/10 shadow-inner">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
          </div>

          <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/10" title="Sair">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
          </button>

          <div className="text-[11px] font-medium opacity-80 border-l border-white/10 pl-4 hidden lg:block lowercase first-letter:uppercase">
             {formattedDate}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`fixed inset-y-0 left-0 z-[60] w-64 bg-white border-r transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto mt-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onSectionChange(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    currentSection === item.id ? 'bg-[#005c3e] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={item.icon} />
                  </svg>
                  <span className="font-bold text-xs uppercase tracking-tight">{item.label}</span>
                </button>
              ))}
            </nav>
            {!isGuest && (
              <div className="p-4 border-t">
                <button onClick={() => setPasswordModalOpen(true)} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-gray-400 hover:text-[#005c3e] transition-colors uppercase tracking-widest">
                  ⚙️ Alterar Senha
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {user && <PasswordModal userId={user.id} isOpen={isPasswordModalOpen} onClose={() => setPasswordModalOpen(false)} />}
    </div>
  );
};
