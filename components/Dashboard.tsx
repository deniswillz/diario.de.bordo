
import React, { useState, useMemo } from 'react';
import { AppState, NotaFiscal, Comentario } from '../types';
import { differenceInDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, format, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  data: AppState;
  analysis: string;
  onRunAnalysis: () => void;
  onRefresh?: () => void;
  isGuest?: boolean;
  onNavigateToList?: (section: 'notas' | 'comentarios') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, analysis, onRunAnalysis, onRefresh, isGuest, onNavigateToList }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'notas' | 'comentarios'>('notas');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  const monthStats = useMemo(() => {
    const monthStr = format(viewDate, 'yyyy-MM');
    const notasMes = data.notas.filter(n => n.data.startsWith(monthStr));
    const criticosMes = [
      ...notasMes.filter(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(today, parseISO(n.data)) >= 3),
    ];

    return [
      { label: 'Notas/Mês', value: notasMes.length, icon: '📄', color: 'blue' },
      { label: 'Apontam.', value: data.comentarios.filter(c => c.data.startsWith(monthStr)).length, icon: '💬', color: 'purple' },
      { label: 'Críticos', value: criticosMes.length, icon: '🚨', color: 'red' },
    ];
  }, [data, viewDate, today]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarInterval = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

  const getDayDetails = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    return {
      notas: data.notas.filter(n => n.data === dayStr),
      comentarios: data.comentarios.filter(c => c.data === dayStr),
    };
  };

  const getDayStatusStyle = (date: Date) => {
    const { notas, comentarios } = getDayDetails(date);
    const hasActivity = notas.length > 0 || comentarios.length > 0;
    let base = "border-4 shadow-sm transition-all ";
    if (isSameDay(date, today)) return base + 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-900 dark:text-blue-100 ring-4 ring-blue-100 dark:ring-blue-900/30 rounded-[2rem]';
    if (notas.some(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(today, date) >= 3)) return base + 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-900 dark:text-red-100 shadow-lg rounded-[2rem]';
    if (hasActivity) return base + 'bg-white dark:bg-gray-800 border-emerald-700 dark:border-emerald-500 text-gray-800 dark:text-gray-100 shadow-md rounded-[2rem]';
    return base + 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-600 rounded-[2rem]';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Classificada':
      case 'Concluída': return 'bg-emerald-600 text-white';
      case 'Pendente': return 'bg-red-600 text-white';
      case 'Em Conferência': return 'bg-blue-600 text-white';
      case 'Em Separação': return 'bg-amber-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const selectedDayDetails = selectedDay ? getDayDetails(selectedDay) : null;

  return (
    <div className="space-y-10 pb-24 relative">
      {/* Topo Combinado: Visão + Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Card de Visão (Ocupa 4/12) */}
        <div className="xl:col-span-4 bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] border-4 border-gray-300 dark:border-gray-700 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#005c3e] dark:bg-emerald-500"></div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none italic">Visão Operacional</h2>
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em] mt-4">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</p>
          </div>
          <button onClick={() => { onRunAnalysis(); setShowAnalysisModal(true); }} className="mt-8 px-8 py-5 bg-[#005c3e] dark:bg-emerald-600 text-white font-black rounded-2xl shadow-lg hover:bg-emerald-900 dark:hover:bg-emerald-700 transition-all text-[10px] tracking-widest uppercase border-b-6 border-emerald-950 dark:border-emerald-900 active:translate-y-1">
            ✨ Diagnóstico IA Nano
          </button>
        </div>

        {/* Grid de Stats (Ocupa 8/12) */}
        <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {monthStats.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-4 border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center hover:border-emerald-500 dark:hover:border-emerald-400 transition-all border-b-[10px] border-b-emerald-600 dark:border-b-emerald-500">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 mb-4 ${stat.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                stat.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                  stat.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                }`}>{stat.icon}</div>
              <div>
                <p className="text-3xl font-black text-gray-900 dark:text-white italic tracking-tighter leading-none">{stat.value}</p>
                <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agenda/Calendário */}
      <div className="bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-[3.5rem] shadow-2xl border-4 border-gray-300 dark:border-gray-700 animate-fadeIn relative">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-8">
          <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic border-l-[12px] border-emerald-600 dark:border-emerald-500 pl-8">Agenda Nano</h2>
          <div className="flex items-center gap-4 bg-gray-100 dark:bg-gray-700/50 p-2 rounded-[2rem] border-2 border-gray-200 dark:border-gray-700">
            <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-4 hover:bg-white dark:hover:bg-gray-600 rounded-full transition-all shadow-sm"><svg className="w-6 h-6 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg></button>
            <span className="text-sm font-black uppercase tracking-[0.3em] px-8 dark:text-gray-100">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</span>
            <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-4 hover:bg-white dark:hover:bg-gray-600 rounded-full transition-all shadow-sm"><svg className="w-6 h-6 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase py-2 tracking-[0.2em]">{d}</div>
          ))}
          {calendarInterval.map((date, i) => {
            const { notas, comentarios } = getDayDetails(date);
            const isCurrentMonth = isSameMonth(date, viewDate);
            return (
              <div
                key={i}
                onClick={() => { if (isCurrentMonth && (notas.length > 0 || comentarios.length > 0)) { setSelectedDay(date); setActiveTab(notas.length > 0 ? 'notas' : 'comentarios'); } }}
                className={`min-h-[130px] p-5 flex flex-col justify-between ${getDayStatusStyle(date)} ${!isCurrentMonth ? 'opacity-10 pointer-events-none' : 'cursor-pointer hover:scale-[1.03] active:scale-95'}`}
              >
                <span className="text-2xl font-black italic">{format(date, 'd')}</span>
                <div className="flex flex-col gap-1.5 mt-4">
                  {notas.length > 0 && <div className="flex justify-between items-center bg-white/95 dark:bg-gray-700/90 px-2.5 py-1.5 rounded-lg text-[8px] font-black border border-blue-100 dark:border-blue-900/50 uppercase dark:text-blue-100 transition-colors"><span>NF</span><span>{notas.length}</span></div>}
                  {comentarios.length > 0 && <div className="flex justify-between items-center bg-white/95 dark:bg-gray-700/90 px-2.5 py-1.5 rounded-lg text-[8px] font-black border border-purple-100 dark:border-purple-900/50 uppercase dark:text-purple-100 transition-colors"><span>💬</span><span>{comentarios.length}</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-900 w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border-4 border-gray-400 dark:border-gray-700 h-[85vh] animate-scaleIn">
            <div className="px-10 py-6 bg-[#005c3e] dark:bg-emerald-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-6">
                <span className="text-sm font-black uppercase tracking-widest">{format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}</span>
                <div className="h-4 border-l-2 border-white/30"></div>
                <span className="text-[10px] opacity-70 uppercase font-bold tracking-widest leading-none">Detalhamento Diário</span>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-3 hover:bg-white/10 rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div className="flex bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 shrink-0">
              <button onClick={() => setActiveTab('notas')} className={`flex-1 py-6 font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'notas' ? 'text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-900 border-b-4 border-blue-700 dark:border-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}>Notas ({selectedDayDetails?.notas.length})</button>
              <button onClick={() => setActiveTab('comentarios')} className={`flex-1 py-6 font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'comentarios' ? 'text-purple-700 dark:text-purple-400 bg-white dark:bg-gray-900 border-b-4 border-purple-700 dark:border-purple-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}>Apontamentos ({selectedDayDetails?.comentarios.length})</button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-gray-50/30 dark:bg-gray-900/30 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === 'notas' && selectedDayDetails?.notas.map(n => (
                  <div key={n.id} className="p-6 bg-white dark:bg-gray-800 border-4 border-gray-200 dark:border-gray-700 rounded-3xl border-l-[14px] border-l-blue-600 dark:border-l-blue-500 flex flex-col justify-between group relative overflow-hidden shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-5">
                        <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-md truncate max-w-[140px] border border-gray-200 dark:border-gray-600">NF: {n.numero}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${getStatusColor(n.status)}`}>{n.status}</span>
                      </div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase leading-tight line-clamp-2 mb-3">{n.fornecedor}</h4>
                      <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Responsável: <span className="text-gray-800 dark:text-gray-200">{n.conferente}</span></p>
                    </div>
                    {n.observacao && <div className="mt-6 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl text-[10px] italic border border-blue-100 dark:border-blue-800 line-clamp-3 dark:text-gray-300">"{n.observacao}"</div>}
                    <button
                      onClick={() => { setSelectedDay(null); onNavigateToList?.('notas'); }}
                      className="absolute bottom-4 right-4 w-10 h-10 bg-blue-600 dark:bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform opacity-0 group-hover:opacity-100 active:scale-95"
                      title="Ver na Lista"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                  </div>
                ))}

                {activeTab === 'comentarios' && selectedDayDetails?.comentarios.map(c => (
                  <div key={c.id} className="p-6 bg-white dark:bg-gray-800 border-4 border-gray-200 dark:border-gray-700 rounded-3xl border-l-[14px] border-l-purple-600 dark:border-l-purple-500 flex flex-col justify-between group relative overflow-hidden shadow-sm hover:border-purple-400 dark:hover:border-purple-500 transition-all">
                    <div>
                      <div className="flex justify-between items-center mb-5">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center text-xl shadow-inner">💬</div>
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{format(parseISO(c.data), 'HH:mm')}</span>
                      </div>
                      <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 leading-relaxed italic line-clamp-4">"{c.texto}"</p>
                    </div>
                    <p className="mt-6 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Diário de Bordo <span className="text-purple-600 dark:text-purple-400">Nano</span></p>
                    <button
                      onClick={() => { setSelectedDay(null); onNavigateToList?.('comentarios'); }}
                      className="absolute top-4 right-4 w-10 h-10 bg-purple-600 dark:bg-purple-500 text-white rounded-xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform opacity-0 group-hover:opacity-100 active:scale-95"
                      title="Ver na Lista"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shrink-0 flex justify-end">
              <button
                onClick={() => setSelectedDay(null)}
                className="px-10 py-4 bg-gray-900 dark:bg-gray-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-black dark:hover:bg-gray-600 transition-all border-b-4 border-gray-950 dark:border-gray-900 active:translate-y-1"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análise IA */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-[#005c3e]/80 dark:bg-emerald-950/90 backdrop-blur-xl">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden border-4 border-emerald-500/30 dark:border-emerald-500/20 animate-scaleIn">
            <div className="p-10 bg-gradient-to-r from-[#005c3e] to-emerald-600 text-white flex justify-between items-center shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-1 opacity-70">Nano Intelligence</p>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase">Diagnóstico Operacional</h3>
              </div>
              <button onClick={() => setShowAnalysisModal(false)} className="w-14 h-14 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all border-2 border-white/20"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-12 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="space-y-8">
                <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-[2.5rem] border-2 border-emerald-100 dark:border-emerald-800 flex gap-8 items-start relative overflow-hidden">
                  <div className="w-16 h-16 shrink-0 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-pulse border-2 border-emerald-200 dark:border-emerald-700">🤖</div>
                  <div className="relative z-10">
                    <p className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-4">Relatório do Sistema:</p>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300 leading-relaxed italic">
                      {analysis || "Gerando análise estratégica baseada nos dados do Diário de Bordo..."}
                    </p>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 dark:bg-emerald-800 opacity-20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Escopo da Análise</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase italic">Fluxo de Notas Fiscais e Apontamentos Operacionais recentes.</p>
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Período</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase italic">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-10 bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-100 dark:border-gray-700 flex justify-center">
              <button onClick={() => setShowAnalysisModal(false)} className="px-16 py-5 bg-[#005c3e] dark:bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-900 dark:hover:bg-emerald-700 transition-all text-xs tracking-[0.2em] uppercase shadow-xl border-b-6 border-emerald-950 dark:border-emerald-900 active:translate-y-1">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
