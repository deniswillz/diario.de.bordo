
import React, { useState } from 'react';
import { User, AppState } from '../types';
import { format, differenceInDays, parseISO } from 'date-fns';
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
  const [showNotifications, setShowNotifications] = useState(false);
  
  const criticalNotas = data?.notas.filter(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(new Date(), parseISO(n.data)) >= 3) || [];
  const criticalOrdens = data?.ordens.filter(o => o.status === 'Em Separação' && differenceInDays(new Date(), parseISO(o.data)) >= 3) || [];
  
  const criticalItems = [
    ...criticalNotas.map(n => ({ id: n.id, numero: n.numero, tipo: 'Nota Fiscal', status: n.status, d: n.data, section: 'notas' as const })),
    ...criticalOrdens.map(o => ({ id: o.id, numero: o.numero, tipo: 'Ordem', status: o.status, d: o.data, section: 'ordens' as const }))
  ];

  const criticalCount = criticalItems.length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'notas', label: 'Notas Fiscais', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'ordens', label: 'Ordem', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  if (!isGuest) navItems.push({ id: 'comentarios', label: 'Apontamentos', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' });
  
  if (!isGuest) {
    // Rótulo alterado de 'Gestão & Perfil' para 'Configuração'
    navItems.push({ id: 'admin', label: 'Configuração', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' });
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      <header className="h-16 bg-[#005c3e] flex items-center justify-between px-6 shrink-0 z-50 text-white shadow-xl border-b-4 border-emerald-950">
        <div className="flex items-center gap-6">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition-all">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-lg transform -rotate-6">
                <span className="text-[#005c3e] font-black text-xl italic">N</span>
             </div>
             <div className="text-2xl font-black tracking-tighter uppercase italic text-white">nano</div>
          </div>
        </div>

        <div className="flex items-center gap-4 relative">
          <div className="relative">
             <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className={`p-3 rounded-full transition-all relative border-2 ${showNotifications ? 'bg-white/20 border-emerald-400' : 'hover:bg-white/10 border-transparent hover:border-emerald-400'}`}
                title="Notificações"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {criticalCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-[10px] font-black flex items-center justify-center rounded-full border-2 border-[#005c3e] animate-pulse shadow-lg">{criticalCount}</span>}
             </button>

             {showNotifications && (
               <div className="absolute right-0 mt-4 w-96 bg-white rounded-[2.5rem] shadow-2xl border-4 border-gray-100 text-gray-900 z-[100] overflow-hidden animate-scaleIn">
                  <div className="p-8 bg-gray-50 border-b-2 border-gray-100 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 leading-none">Central Nano</span>
                      <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter italic">Alertas Ativos</h4>
                    </div>
                    <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="max-h-[30rem] overflow-y-auto custom-scrollbar">
                    {criticalItems.length > 0 ? (
                      criticalItems.map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => { onSectionChange(item.section); setShowNotifications(false); }}
                          className="p-6 border-b border-gray-100 hover:bg-emerald-50 cursor-pointer transition-all flex items-start gap-5 group"
                        >
                          <div className="w-12 h-12 shrink-0 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-sm font-black border-2 border-red-200 shadow-sm group-hover:scale-110 transition-transform">!</div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-black text-gray-900">#{item.numero} - {item.tipo}</p>
                              <p className="text-[10px] font-bold text-gray-400 italic">{format(parseISO(item.d), 'dd/MM')}</p>
                            </div>
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-tight mt-1 bg-red-50 px-2 py-0.5 rounded w-fit border border-red-100">Status: {item.status}</p>
                            <p className="text-[9px] font-bold text-gray-500 mt-2 leading-relaxed">Este documento está em atraso operacional Nano há mais de 3 dias.</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] leading-relaxed">Nenhum alerta crítico Nano pendente.</p>
                      </div>
                    )}
                  </div>
                  {criticalItems.length > 0 && (
                    <div className="p-6 bg-gray-50 text-center border-t border-gray-100">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Ação imediata recomendada</p>
                    </div>
                  )}
               </div>
             )}
          </div>

          <div className="h-10 border-l border-emerald-400 opacity-30 hidden sm:block mx-2"></div>

          <div className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 rounded-2xl transition-all cursor-default">
            <div className="text-right hidden sm:block">
               <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-70">Usuário Nano</p>
               <p className="text-xs font-black">{isGuest ? 'Visitante' : user?.name || 'Sistema'}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border-2 border-white/20 shadow-xl">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" /></svg>
            </div>
          </div>

          <button onClick={onLogout} className="p-3 hover:bg-red-600 rounded-xl transition-all border-2 border-white/20 shadow-lg active:scale-90" title="Desconectar">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`fixed inset-y-0 left-0 z-[60] w-64 bg-white border-r transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <div className="p-8 border-b-2 border-gray-100 flex items-center justify-center bg-gray-50/50">
               <div className="text-center">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.4em] leading-none mb-2">Plataforma</p>
                  <p className="text-2xl font-black text-gray-900 italic tracking-tighter">NANO PRO</p>
               </div>
            </div>
            <nav className="flex-1 p-6 space-y-2 overflow-y-auto mt-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onSectionChange(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border-2 ${
                    currentSection === item.id ? 'bg-[#005c3e] text-white shadow-xl border-emerald-950 scale-[1.02]' : 'text-gray-500 hover:bg-gray-100 border-transparent'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={item.icon} /></svg>
                  <span className="font-black text-[11px] uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-6 border-t-2 border-gray-100 bg-gray-50 text-center">
               <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">v3.2.0 Cloud Active</p>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 lg:p-12 relative">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
