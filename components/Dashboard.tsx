
import React, { useState, useMemo } from 'react';
import { AppState, NotaFiscal, OrdemProducao, Comentario } from '../types';
import { db } from '../services/supabase';
import { differenceInDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, format, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  data: AppState;
  analysis: string;
  onRunAnalysis: () => void;
  onRefresh?: () => void;
  isGuest?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, analysis, onRunAnalysis, onRefresh, isGuest }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'notas' | 'ordens' | 'comentarios'>('notas');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const monthStats = useMemo(() => {
    const monthStr = format(viewDate, 'yyyy-MM');
    const notasMes = data.notas.filter(n => n.data.startsWith(monthStr));
    const ordensMes = data.ordens.filter(o => o.data.startsWith(monthStr));
    const comentariosMes = data.comentarios.filter(c => c.data.startsWith(monthStr));
    const criticosMes = [
      ...notasMes.filter(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(today, parseISO(n.data)) >= 3),
      ...ordensMes.filter(o => o.status === 'Em Separação' && differenceInDays(today, parseISO(o.data)) >= 3)
    ];

    return [
      { label: 'Notas no Mês', value: notasMes.length, icon: '📄', color: 'blue' },
      { label: 'Ordem no Mês', value: ordensMes.length, icon: '⚙️', color: 'emerald' },
      { label: 'Apontamentos', value: comentariosMes.length, icon: '💬', color: 'purple' },
      { label: 'Críticos Mês', value: criticosMes.length, icon: '🚨', color: 'red' },
    ];
  }, [data, viewDate, today]);

  const allCriticalItems = useMemo(() => {
    const notasCrit = data.notas.filter(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(today, parseISO(n.data)) >= 3);
    const ordensCrit = data.ordens.filter(o => o.status === 'Em Separação' && differenceInDays(today, parseISO(o.data)) >= 3);
    return [
      ...notasCrit.map(i => ({ ...i, tipo: 'Nota Fiscal' })),
      ...ordensCrit.map(i => ({ ...i, tipo: 'Ordem' }))
    ];
  }, [data, today]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarInterval = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

  const getDayDetails = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    return {
      notas: data.notas.filter(n => n.data === dayStr),
      ordens: data.ordens.filter(o => o.data === dayStr),
      comentarios: data.comentarios.filter(c => c.data === dayStr),
    };
  };

  const getDayStatusStyle = (date: Date) => {
    const { notas, ordens } = getDayDetails(date);
    const hasActivity = notas.length > 0 || ordens.length > 0;
    let base = "border-2 shadow-sm transition-all ";
    if (isSameDay(date, today)) return base + 'bg-blue-50 border-blue-500 text-blue-900 ring-4 ring-blue-100';
    const isCritical = notas.some(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(today, date) >= 3);
    if (isCritical) return base + 'bg-red-50 border-red-500 text-red-900 shadow-lg';
    const isComplete = hasActivity && (notas.length === 0 || notas.every(n => n.status === 'Classificada')) && (ordens.length === 0 || ordens.every(o => o.status === 'Concluída'));
    if (isComplete) return base + 'bg-emerald-50 border-emerald-500 text-emerald-900';
    if (hasActivity) return base + 'bg-white border-emerald-700 text-gray-800 shadow-md';
    return base + 'bg-gray-50/50 border-gray-300 text-gray-400';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Classificada':
      case 'Concluída': return 'bg-emerald-500 text-white shadow-sm';
      case 'Pendente': return 'bg-red-500 text-white shadow-sm';
      case 'Em Conferência': return 'bg-blue-500 text-white shadow-sm';
      case 'Pré Nota': return 'bg-purple-500 text-white shadow-sm';
      case 'Em Separação': return 'bg-amber-500 text-white shadow-sm';
      default: return 'bg-gray-500 text-white shadow-sm';
    }
  };

  const selectedDayDetails = selectedDay ? getDayDetails(selectedDay) : null;

  return (
    <div className="space-y-12 pb-24 relative">
      {toast && (
        <div className="fixed top-24 right-10 z-[200] bg-emerald-900 text-white px-10 py-5 rounded-3xl shadow-2xl animate-slideInRight text-[10px] font-black uppercase tracking-widest border-4 border-emerald-700">
          {toast}
        </div>
      )}

      {/* Visão Operacional */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-12 rounded-[3.5rem] border-2 border-gray-300 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-2 h-full bg-[#005c3e]"></div>
        <div className="z-10">
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none italic">Visão Operacional</h2>
          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.4em] mt-5">Dados Referentes a {format(viewDate, 'MMMM yyyy', { locale: ptBR })}</p>
        </div>
        <button onClick={() => { onRunAnalysis(); setShowAnalysisModal(true); }} className="mt-8 lg:mt-0 flex items-center gap-6 px-12 py-6 bg-[#005c3e] text-white font-black rounded-3xl shadow-2xl hover:bg-emerald-900 transition-all text-xs tracking-[0.2em] uppercase active:scale-95 border-2 border-emerald-950">
          <span className="text-xl">✨</span> Diagnóstico IA Nano
        </button>
      </div>

      {/* Alertas Críticos */}
      {allCriticalItems.length > 0 && (
        <div className="bg-red-50 border-4 border-red-200 p-10 rounded-[3.5rem] shadow-xl animate-fadeIn">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center text-2xl animate-pulse">⚠️</div>
            <div>
              <h3 className="text-2xl font-black text-red-900 uppercase tracking-tighter italic">Alertas de Atraso Nano</h3>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em]">Existem {allCriticalItems.length} itens aguardando ação imediata há mais de 3 dias.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCriticalItems.slice(0, 6).map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border-2 border-red-100 flex items-center justify-between group hover:border-red-500 transition-all">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{(item as any).tipo}</p>
                  <p className="text-xl font-black text-gray-900 italic">#{(item as any).numero}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg ${getStatusColor((item as any).status)}`}>{(item as any).status}</span>
                  <p className="text-[9px] font-bold text-gray-400 mt-1 italic">Desde {format(parseISO((item as any).data), 'dd/MM')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {monthStats.map((stat) => (
          <div key={stat.label} className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-gray-300 flex items-center gap-8 hover:-translate-y-2 transition-all border-b-[12px] border-b-emerald-600">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl border-2 shadow-inner ${
              stat.color === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
              stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
              stat.color === 'purple' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-red-50 text-red-600 border-red-200'
            }`}>{stat.icon}</div>
            <div>
              <p className="text-5xl font-black text-gray-900 leading-none tracking-tighter italic">{stat.value}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Agenda Nano */}
      <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-2 border-gray-300">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10 mb-16">
          <div className="flex items-center gap-10">
             <div className="h-20 w-3 bg-[#005c3e] rounded-full"></div>
             <div>
                <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">Agenda Nano</h3>
                <p className="text-xl font-black text-emerald-700 mt-2 uppercase tracking-[0.2em]">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-[2.5rem] border-2 border-gray-300 shadow-inner">
            <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-4 bg-white border-2 border-gray-200 hover:border-emerald-500 rounded-2xl text-emerald-600 transition-all active:scale-90">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => setViewDate(new Date())} className="px-10 py-4 text-[10px] font-black uppercase text-gray-700 bg-white border-2 border-gray-300 rounded-2xl transition-all tracking-[0.3em] hover:border-emerald-600">Hoje</button>
            <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-4 bg-white border-2 border-gray-200 hover:border-emerald-500 rounded-2xl text-emerald-600 transition-all active:scale-90">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-6">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[11px] font-black text-gray-400 uppercase py-6 tracking-widest">{d}</div>
          ))}
          {calendarInterval.map((date, i) => {
            const { notas, ordens, comentarios } = getDayDetails(date);
            const hasItems = notas.length > 0 || ordens.length > 0 || (!isGuest && comentarios.length > 0);
            const isCurrentMonth = isSameMonth(date, viewDate);
            return (
              <div 
                key={i} 
                onClick={() => { if(isCurrentMonth && hasItems) { setSelectedDay(date); setActiveTab('notas'); } }} 
                className={`min-h-[160px] p-8 rounded-[2.5rem] flex flex-col justify-between group relative overflow-hidden
                  ${getDayStatusStyle(date)} 
                  ${hasItems && isCurrentMonth ? 'hover:scale-105 active:scale-95 cursor-pointer shadow-2xl' : ''}
                  ${!isCurrentMonth ? 'opacity-10 pointer-events-none' : 'opacity-100'}
                `}
              >
                <span className="text-4xl font-black z-10 leading-none italic">{format(date, 'd')}</span>
                <div className="flex flex-col gap-3 mt-6 z-10">
                   {notas.length > 0 && <div className="flex justify-between items-center bg-white/95 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-blue-900 border-2 border-blue-100"><span>NF</span><span className="bg-blue-600 text-white px-2 rounded-lg">{notas.length}</span></div>}
                   {ordens.length > 0 && <div className="flex justify-between items-center bg-white/95 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-emerald-900 border-2 border-emerald-100"><span>OP</span><span className="bg-emerald-600 text-white px-2 rounded-lg">{ordens.length}</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Detalhes do Dia - REESTRUTURADO MINIMALISTA */}
      {selectedDay && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-scaleIn border-2 border-gray-200 h-[80vh]">
            
            {/* Header Reduzido */}
            <div className="px-8 py-5 bg-[#005c3e] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg transform -rotate-3">
                  <span className="text-[#005c3e] font-black text-lg italic">N</span>
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight italic">Detalhamento Nano</h3>
                  <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest">{format(selectedDay, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-white/20 rounded-full transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Abas Minimalistas */}
            <div className="flex bg-gray-50 border-b border-gray-100 shrink-0">
               <button onClick={() => setActiveTab('notas')} className={`flex-1 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'notas' ? 'text-blue-600 border-blue-600 bg-white' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                 Notas ({selectedDayDetails?.notas.length})
               </button>
               <button onClick={() => setActiveTab('ordens')} className={`flex-1 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'ordens' ? 'text-emerald-600 border-emerald-600 bg-white' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                 Ordens ({selectedDayDetails?.ordens.length})
               </button>
               {!isGuest && (
                 <button onClick={() => setActiveTab('comentarios')} className={`flex-1 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'comentarios' ? 'text-purple-600 border-purple-600 bg-white' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                   Notas Nano ({selectedDayDetails?.comentarios.length})
                 </button>
               )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
              {/* Grid Ultra Clean */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
                
                {activeTab === 'notas' && selectedDayDetails?.notas.map(n => (
                  <div key={n.id} className="p-5 bg-gray-50 border border-gray-200 rounded-3xl hover:border-blue-300 transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">#{n.numero}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${getStatusColor(n.status)}`}>{n.status}</span>
                      </div>
                      <h4 className="text-xs font-black text-gray-900 line-clamp-1 uppercase tracking-tight">{n.fornecedor}</h4>
                      <div className="mt-2 space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Responsável: <span className="text-gray-700">{n.conferente}</span></p>
                      </div>
                    </div>
                    {n.observacao && (
                      <div className="mt-4 p-3 bg-white border border-gray-100 rounded-xl text-[10px] text-gray-500 italic font-medium leading-tight">
                        "{n.observacao}"
                      </div>
                    )}
                  </div>
                ))}

                {activeTab === 'ordens' && selectedDayDetails?.ordens.map(o => (
                  <div key={o.id} className="p-5 bg-gray-50 border border-gray-200 rounded-3xl hover:border-emerald-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">#{o.numero}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${getStatusColor(o.status)}`}>{o.status}</span>
                      </div>
                      <h4 className="text-xs font-black text-gray-900 line-clamp-1 uppercase tracking-tight">{o.documento}</h4>
                      <div className="mt-2 space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Responsável: <span className="text-gray-700">{o.conferente}</span></p>
                      </div>
                    </div>
                    {o.observacao && (
                      <div className="mt-4 p-3 bg-white border border-gray-100 rounded-xl text-[10px] text-gray-500 italic font-medium leading-tight">
                        "{o.observacao}"
                      </div>
                    )}
                  </div>
                ))}

                {activeTab === 'comentarios' && selectedDayDetails?.comentarios.map(c => (
                  <div key={c.id} className="col-span-full p-6 bg-purple-50/50 border border-purple-100 rounded-[2rem] italic text-gray-600 text-sm font-medium border-l-8 border-l-purple-400">
                    "{c.texto}"
                  </div>
                ))}

                {((activeTab === 'notas' && selectedDayDetails?.notas.length === 0) || 
                  (activeTab === 'ordens' && selectedDayDetails?.ordens.length === 0) || 
                  (activeTab === 'comentarios' && selectedDayDetails?.comentarios.length === 0)) && (
                    <div className="col-span-full py-20 text-center opacity-30">
                       <p className="text-[10px] font-black uppercase tracking-[0.5em]">Sem registros</p>
                    </div>
                )}
              </div>
            </div>
            
            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100">
               <button onClick={() => setSelectedDay(null)} className="w-full py-3 bg-[#005c3e] text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] shadow-lg border-b-4 border-emerald-950 active:translate-y-1 transition-all">Sair do Detalhe</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análise Nano IA */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl animate-fadeIn">
          <div className="bg-white w-full max-w-7xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-scaleIn border-4 border-gray-400 h-[85vh]">
             <div className="p-12 bg-[#005c3e] text-white flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-4xl font-black uppercase tracking-tighter italic leading-none">Relatório Estratégico Nano IA</h3>
                  <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.3em] mt-3">Diagnóstico Industrial em Tempo Real</p>
                </div>
                <button onClick={() => setShowAnalysisModal(false)} className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all border-2 border-white/20">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <div className="p-14 flex-1 overflow-y-auto custom-scrollbar">
                <div className="text-2xl font-bold text-gray-800 leading-relaxed italic bg-emerald-50 p-12 lg:p-16 rounded-[4rem] border-2 border-emerald-200 shadow-inner min-h-full whitespace-pre-wrap">
                  {analysis || "Sincronizando processamento Nano IA..."}
                </div>
             </div>
             <div className="p-10 bg-gray-50 border-t-2 border-gray-100 shrink-0">
                <button onClick={() => setShowAnalysisModal(false)} className="w-full py-8 bg-[#005c3e] text-white font-black rounded-3xl shadow-2xl hover:bg-emerald-900 transition-all uppercase tracking-widest text-xs border-b-8 border-emerald-950 active:translate-y-1">Confirmar Leitura</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
