
import React, { useState } from 'react';
import { AppState, NotaFiscal, OrdemProducao, Comentario } from '../types';
import { db } from '../services/supabase';
import { 
  differenceInDays, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  startOfWeek, 
  endOfWeek,
  subDays,
  addMonths,
  subMonths,
  isSameMonth
} from 'date-fns';
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
  const yesterday = subDays(today, 1);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'notas' | 'ordens' | 'comentarios'>('notas');
  const [quickComment, setQuickComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  
  // Feedback UI State
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const criticalItems = [
    ...(data?.notas.filter(n => 
      ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && 
      differenceInDays(new Date(), new Date(n.data + 'T12:00:00')) >= 3
    ).map(n => ({ ...n, type: 'Nota' })) || []),
    ...(data?.ordens.filter(o => 
      o.status === 'Em Separação' && 
      differenceInDays(new Date(), new Date(o.data + 'T12:00:00')) >= 3
    ).map(o => ({ ...o, type: 'Ordem' })) || [])
  ].sort((a, b) => differenceInDays(new Date(), new Date(b.data + 'T12:00:00')) - differenceInDays(new Date(), new Date(a.data + 'T12:00:00')));

  const stats = [
    { label: 'Notas Fiscais', value: data.notas.length, icon: '📄', color: 'blue' },
    { label: 'Ordens de Produção', value: data.ordens.length, icon: '⚙️', color: 'emerald' },
    { label: 'Comentários', value: data.comentarios.length, icon: '💬', color: 'purple' },
    { label: 'Alertas Críticos', value: criticalItems.length, icon: '🚨', color: 'red' },
  ];

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarInterval = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd)
  });

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

    if (isSameDay(date, today)) return 'bg-blue-50 border-blue-600 ring-4 ring-blue-100 ring-inset text-blue-900';
    
    const isCritical = notas.some(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(today, date) >= 3);
    if (isCritical) return 'bg-red-50 border-red-500 text-red-900 shadow-xl shadow-red-100/50';

    const isComplete = hasActivity && 
                       (notas.length === 0 || notas.every(n => n.status === 'Classificada')) && 
                       (ordens.length === 0 || ordens.every(o => o.status === 'Concluída'));
    if (isComplete) return 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-lg shadow-emerald-100/30';

    const isWarning = notas.some(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(today, date) >= 2);
    if (isWarning) return 'bg-amber-50 border-amber-600 text-amber-900';

    if (hasActivity) return 'bg-white border-emerald-200 text-gray-800 shadow-md';
    return 'bg-gray-50/50 border-gray-100 text-gray-300';
  };

  const handleSaveQuickComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || !quickComment.trim()) return;
    setSavingComment(true);
    try {
      await db.comentarios.save({
        data: format(selectedDay, 'yyyy-MM-dd'),
        texto: quickComment.trim()
      });
      setQuickComment('');
      if (onRefresh) onRefresh();
      showToast("Evento registrado com sucesso!");
    } catch (err) {
      showToast("Falha ao salvar observação.");
    } finally {
      setSavingComment(false);
    }
  };

  const selectedDayInfo = selectedDay ? getDayDetails(selectedDay) : null;

  return (
    <div className="space-y-8 animate-fadeIn pb-20 relative">
      {/* Mini Toast */}
      {toast && (
        <div className="fixed top-20 right-8 z-[200] bg-emerald-900 text-white px-8 py-4 rounded-2xl shadow-2xl animate-slideInRight text-xs font-black uppercase tracking-[0.2em] border border-emerald-700">
          ✅ {toast}
        </div>
      )}

      {/* Header do Dashboard */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase leading-none">Painel Operacional</h2>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">Agrosystem Inteligência Logística</p>
        </div>
        <button onClick={() => { onRunAnalysis(); setShowAnalysisModal(true); }} className="flex items-center gap-3 px-8 py-4 bg-[#005c3e] text-white font-black rounded-2xl shadow-xl hover:bg-emerald-900 transition-all text-xs tracking-[0.2em] uppercase active:scale-95">
          <span className="text-xl">✨</span> Analisar com IA
        </button>
      </div>

      {/* Alertas Críticos */}
      {criticalItems.length > 0 && (
        <div className="bg-white border-l-[12px] border-l-red-600 border border-red-100 rounded-[2.5rem] p-10 shadow-xl shadow-red-100/40">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <span className="text-4xl animate-pulse">🚩</span>
              <h3 className="text-xl font-black text-red-700 uppercase tracking-tighter">Prioridades em Atraso</h3>
            </div>
            <span className="bg-red-600 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-lg">Ação Necessária</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
            {criticalItems.map((item: any) => {
              const days = differenceInDays(new Date(), new Date(item.data + 'T12:00:00'));
              return (
                <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-red-50 flex justify-between items-center hover:shadow-2xl hover:border-red-200 transition-all group cursor-pointer border-l-4 border-red-400">
                  <div className="flex-1">
                    <p className="text-base font-black text-gray-900 leading-none">
                      {item.type} <span className="text-red-600">#{item.numero}</span>
                    </p>
                    <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-tight">
                      {item.fornecedor || item.documento || 'ID GERAL'} • {item.status}
                    </p>
                  </div>
                  <div className={`ml-4 px-6 py-3 rounded-2xl text-xs font-black shadow-inner transition-all group-hover:scale-110 ${
                    days >= 6 ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'
                  }`}>
                    {days}D ATRASO
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center gap-6 hover:shadow-2xl transition-all group border-b-8 border-b-transparent hover:border-b-emerald-600">
            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-4xl group-hover:scale-110 transition-transform shadow-inner ${
              stat.color === 'blue' ? 'bg-blue-50 text-blue-600' : 
              stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 
              stat.color === 'purple' ? 'bg-purple-50 text-purple-600' : 'bg-red-50 text-red-600'
            }`}>{stat.icon}</div>
            <div>
              <p className="text-4xl font-black text-gray-900 leading-none tracking-tighter">{stat.value}</p>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-3">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calendário Ampliado */}
      <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
          <div className="flex items-center gap-6">
             <div className="h-16 w-3 bg-emerald-600 rounded-full"></div>
             <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Cronograma Operacional</h3>
                <p className="text-base font-bold text-emerald-700 mt-1 uppercase tracking-widest bg-emerald-50 px-4 py-1 rounded-full inline-block">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-[2rem] border border-gray-100 shadow-inner">
            <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-3 hover:bg-white hover:shadow-xl rounded-2xl text-emerald-600 transition-all active:scale-90">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => setViewDate(new Date())} className="px-10 py-3 text-xs font-black uppercase text-gray-600 hover:text-emerald-800 bg-white shadow-md border border-gray-100 rounded-2xl transition-all tracking-widest">Mês Atual</button>
            <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-3 hover:bg-white hover:shadow-xl rounded-2xl text-emerald-600 transition-all active:scale-90">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-6">
          {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(d => (
            <div key={d} className="text-center text-xs font-black text-gray-400 uppercase py-4 tracking-[0.25em]">{d}</div>
          ))}
          {calendarInterval.map((date, i) => {
            const { notas, ordens, comentarios } = getDayDetails(date);
            const hasItems = notas.length > 0 || ordens.length > 0 || (!isGuest && comentarios.length > 0);
            const isCurrentMonth = isSameMonth(date, viewDate);
            
            return (
              <div 
                key={i} 
                onClick={() => { setSelectedDay(date); setActiveTab('notas'); }} 
                className={`min-h-[160px] p-6 rounded-[2.5rem] border-[3px] transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden
                  ${getDayStatusStyle(date)} 
                  ${hasItems ? 'hover:scale-105 active:scale-95 shadow-2xl border-opacity-100' : 'opacity-60 border-opacity-20'}
                  ${!isCurrentMonth ? 'opacity-20 pointer-events-none' : ''}
                `}
              >
                <span className="text-2xl font-black group-hover:scale-125 transition-transform z-10">{format(date, 'd')}</span>
                
                <div className="flex flex-col gap-2 mt-4 z-10">
                   {notas.length > 0 && <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-xl text-[10px] font-black uppercase text-blue-900 shadow-sm border border-blue-100"><span>NF</span><span className="bg-blue-600 text-white px-2 rounded-lg">{notas.length}</span></div>}
                   {ordens.length > 0 && <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-xl text-[10px] font-black uppercase text-emerald-900 shadow-sm border border-emerald-100"><span>OP</span><span className="bg-emerald-600 text-white px-2 rounded-lg">{ordens.length}</span></div>}
                   {!isGuest && comentarios.length > 0 && <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-xl text-[10px] font-black uppercase text-purple-900 shadow-sm border border-purple-100"><span>OBS</span><span className="bg-purple-600 text-white px-2 rounded-lg">{comentarios.length}</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Detalhes do Dia (Ampliado) */}
      {selectedDay && selectedDayInfo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn">
            <div className="p-12 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.4em] mb-3">Agenda Detalhada</p>
                <h3 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">{format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}</h3>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-5 bg-white border border-gray-100 text-gray-400 hover:text-red-600 hover:border-red-500 rounded-full transition-all shadow-xl active:scale-90 group">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex border-b bg-gray-50/20 p-4 gap-4">
              {(['notas', 'ordens', 'comentarios'] as const).filter(t => isGuest ? t !== 'comentarios' : true).map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={`flex-1 py-6 text-xs font-black uppercase tracking-[0.2em] rounded-3xl transition-all flex items-center justify-center gap-3 ${
                    activeTab === tab ? 'bg-white text-emerald-800 shadow-2xl ring-2 ring-gray-100 scale-105' : 'text-gray-400 hover:text-gray-800'
                  }`}
                >
                  {tab === 'notas' ? '📄 Notas Fiscais' : tab === 'ordens' ? '⚙️ Ordens' : '💬 Comentários'} 
                  <span className={`px-3 py-1 rounded-full text-[10px] ${activeTab === tab ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {tab === 'notas' ? selectedDayInfo.notas.length : tab === 'ordens' ? selectedDayInfo.ordens.length : selectedDayInfo.comentarios.length}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar bg-white">
              {activeTab === 'notas' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedDayInfo.notas.map(n => (
                    <div key={n.id} className="p-8 bg-blue-50/30 rounded-[2.5rem] border border-blue-100 hover:shadow-xl transition-all border-l-[10px] border-l-blue-600">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">#{n.numero}</p>
                          <p className="text-[10px] font-black text-blue-600 mt-3 uppercase tracking-widest">{n.fornecedor || 'FORNECEDOR INDEFINIDO'}</p>
                        </div>
                        <span className="px-5 py-2 rounded-2xl text-[10px] font-black uppercase shadow-lg bg-blue-600 text-white">{n.status}</span>
                      </div>
                      {n.observacao && (
                        <div className="p-6 bg-white/80 rounded-2xl shadow-inner italic text-sm text-gray-600 font-medium leading-relaxed">"{n.observacao}"</div>
                      )}
                    </div>
                  ))}
                  {selectedDayInfo.notas.length === 0 && <div className="col-span-full text-center py-20 opacity-10 font-black uppercase text-2xl tracking-tighter">Nenhum Registro</div>}
                </div>
              )}

              {activeTab === 'ordens' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedDayInfo.ordens.map(o => (
                    <div key={o.id} className="p-8 bg-emerald-50/30 rounded-[2.5rem] border border-emerald-100 hover:shadow-xl transition-all border-l-[10px] border-l-emerald-600">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">#{o.numero}</p>
                          <p className="text-[10px] font-black text-emerald-600 mt-3 uppercase tracking-widest">{o.documento || 'ORDEM GERAL'}</p>
                        </div>
                        <span className="px-5 py-2 rounded-2xl text-[10px] font-black uppercase shadow-lg bg-emerald-600 text-white">{o.status}</span>
                      </div>
                      {o.observacao && (
                        <div className="p-6 bg-white/80 rounded-2xl shadow-inner italic text-sm text-gray-600 font-medium leading-relaxed">"{o.observacao}"</div>
                      )}
                    </div>
                  ))}
                  {selectedDayInfo.ordens.length === 0 && <div className="col-span-full text-center py-20 opacity-10 font-black uppercase text-2xl tracking-tighter">Sem Ordens Ativas</div>}
                </div>
              )}

              {activeTab === 'comentarios' && !isGuest && (
                <div className="space-y-10">
                  <section className="bg-gray-50 p-10 rounded-[3rem] border border-gray-200 shadow-inner">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                       <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> Novo Apontamento Operacional
                    </h4>
                    <form onSubmit={handleSaveQuickComment} className="flex gap-4">
                      <input type="text" placeholder="Descreva eventos críticos ou observações do dia..." className="flex-1 px-8 py-6 bg-white border border-gray-200 rounded-3xl focus:ring-4 focus:ring-emerald-500/20 outline-none text-base font-bold shadow-md transition-all" value={quickComment} onChange={e => setQuickComment(e.target.value)} />
                      <button type="submit" disabled={savingComment || !quickComment.trim()} className="px-12 py-6 bg-[#005c3e] text-white font-black rounded-3xl hover:bg-emerald-900 transition-all text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95">Salvar OBS</button>
                    </form>
                  </section>
                  <div className="space-y-6">
                    {selectedDayInfo.comentarios.map(c => (
                      <div key={c.id} className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 text-lg font-medium text-gray-800 leading-relaxed italic border-l-8 border-emerald-400 shadow-sm relative group">
                        <span className="absolute -top-3 -left-3 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-md text-emerald-600 group-hover:scale-110 transition-transform">💬</span>
                        "{c.texto}"
                      </div>
                    ))}
                  </div>
                  {selectedDayInfo.comentarios.length === 0 && <div className="text-center py-12 text-gray-300 font-black uppercase text-xs tracking-[0.5em]">Nenhuma anotação</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Análise Gemini Modal (Inalterado Layout Base, Reforçado Visibilidade) */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-scaleIn border border-white/20">
            <div className="p-14 border-b bg-[#005c3e] text-white flex justify-between items-center relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="relative z-10">
                <h3 className="text-4xl font-black uppercase tracking-tighter">Diagnóstico Gemini</h3>
                <p className="text-xs font-black opacity-60 uppercase tracking-[0.4em] mt-3">Inteligência Estratégica Agrosystem</p>
              </div>
              <button onClick={() => setShowAnalysisModal(false)} className="relative z-10 p-5 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-14">
              <div className="text-gray-800 text-2xl leading-relaxed italic font-medium bg-emerald-50/50 p-12 rounded-[3.5rem] border-2 border-emerald-100 shadow-inner min-h-[300px] flex items-center justify-center text-center">
                {analysis || "Consultando bases operacionais..."}
              </div>
              <button onClick={() => setShowAnalysisModal(false)} className="w-full mt-12 py-8 bg-[#005c3e] text-white font-black rounded-3xl shadow-2xl hover:bg-emerald-900 transition-all uppercase tracking-[0.3em] text-sm active:scale-95">Retornar à Gestão</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
