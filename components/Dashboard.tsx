
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

    if (isSameDay(date, today)) return 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 ring-inset text-blue-700';
    
    const isCritical = notas.some(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(today, date) >= 3);
    if (isCritical) return 'bg-red-50 border-red-500 text-red-700 shadow-sm shadow-red-100';

    const isComplete = hasActivity && 
                       (notas.length === 0 || notas.every(n => n.status === 'Classificada')) && 
                       (ordens.length === 0 || ordens.every(o => o.status === 'Concluída'));
    if (isComplete) return 'bg-emerald-50 border-emerald-500 text-emerald-800';

    const isWarning = notas.some(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(today, date) >= 2);
    if (isWarning) return 'bg-amber-50 border-amber-500 text-amber-700';

    if (isSameDay(date, yesterday)) return 'bg-slate-50 border-slate-400 text-slate-700';
    if (hasActivity) return 'bg-indigo-50 border-indigo-200 text-indigo-700';
    return 'bg-white border-gray-100 text-gray-400';
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
    <div className="space-y-6 animate-fadeIn pb-12 relative">
      {/* Mini Toast */}
      {toast && (
        <div className="fixed top-20 right-8 z-[200] bg-emerald-900 text-white px-6 py-3 rounded-full shadow-2xl animate-slideInRight text-[10px] font-black uppercase tracking-widest border border-emerald-700">
          ✅ {toast}
        </div>
      )}

      {/* Header do Dashboard */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-black text-gray-800 tracking-tight uppercase leading-none">Visão Operacional</h2>
        <button onClick={() => { onRunAnalysis(); setShowAnalysisModal(true); }} className="flex items-center gap-2 px-6 py-3 bg-[#005c3e] text-white font-black rounded-xl shadow-lg hover:bg-emerald-900 transition-all text-[10px] tracking-widest uppercase">
          <span className="text-sm">✨</span> Analisar com Gemini
        </button>
      </div>

      {/* Alertas de Pendências */}
      {criticalItems.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-[2rem] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <h3 className="text-sm font-black text-red-600 uppercase tracking-widest">Atenção Imediata</h3>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prioridade Crítica</span>
          </div>
          
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-4 custom-scrollbar">
            {criticalItems.map((item: any) => {
              const days = differenceInDays(new Date(), new Date(item.data + 'T12:00:00'));
              return (
                <div key={item.id} className="bg-white p-5 rounded-2xl border border-red-100 flex justify-between items-center hover:shadow-lg transition-all group cursor-pointer border-l-8 border-l-red-500">
                  <div>
                    <p className="text-sm font-black text-gray-800 leading-none">
                      {item.type} <span className="text-red-600">#{item.numero}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-tight">
                      {item.fornecedor || item.documento || 'Sem identificação'} • <span className="text-red-400">{item.status}</span>
                    </p>
                  </div>
                  <div className={`px-5 py-2 rounded-xl text-[10px] font-black shadow-inner transition-transform group-hover:scale-110 ${
                    days >= 6 ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'
                  }`}>
                    {days} dias atrás
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-lg transition-all group">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform ${
              stat.color === 'blue' ? 'bg-blue-50' : 
              stat.color === 'emerald' ? 'bg-emerald-50' : 
              stat.color === 'purple' ? 'bg-purple-50' : 'bg-red-50'
            }`}>{stat.icon}</div>
            <div>
              <p className="text-3xl font-black text-gray-900 leading-none tracking-tighter">{stat.value}</p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest border-l-8 border-emerald-600 pl-4">
            Calendário Operacional <span className="text-emerald-700 ml-2">[{format(viewDate, 'MMMM yyyy', { locale: ptBR })}]</span>
          </h3>
          <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 shadow-inner">
            <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-2 hover:bg-white hover:shadow-md rounded-xl text-gray-400 hover:text-emerald-600 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => setViewDate(new Date())} className="px-6 py-2 text-[10px] font-black uppercase text-gray-500 hover:text-emerald-600 bg-white shadow-sm border border-gray-100 rounded-xl transition-all">Mês Atual</button>
            <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2 hover:bg-white hover:shadow-md rounded-xl text-gray-400 hover:text-emerald-600 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-gray-300 uppercase py-2 tracking-widest">{d}</div>
          ))}
          {calendarInterval.map((date, i) => {
            const { notas, ordens, comentarios } = getDayDetails(date);
            const hasItems = notas.length > 0 || ordens.length > 0 || (!isGuest && comentarios.length > 0);
            const isCurrentMonth = isSameMonth(date, viewDate);
            
            return (
              <div 
                key={i} 
                onClick={() => { setSelectedDay(date); setActiveTab('notas'); }} 
                className={`min-h-[100px] p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group
                  ${getDayStatusStyle(date)} 
                  ${hasItems ? 'hover:scale-105 active:scale-95 shadow-lg border-opacity-100' : 'opacity-60 border-opacity-20'}
                  ${!isCurrentMonth ? 'opacity-20 pointer-events-none' : ''}
                `}
              >
                <span className="text-sm font-black group-hover:scale-125 transition-transform">{format(date, 'd')}</span>
                <div className="flex flex-col gap-1 mt-2">
                   {notas.length > 0 && <div className="flex justify-between bg-white/50 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase"><span>NF</span><span>{notas.length}</span></div>}
                   {ordens.length > 0 && <div className="flex justify-between bg-white/50 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase"><span>OP</span><span>{ordens.length}</span></div>}
                   {!isGuest && comentarios.length > 0 && <div className="flex justify-between bg-white/50 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase"><span>OBS</span><span>{comentarios.length}</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Análise IA Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-scaleIn">
            <div className="p-10 border-b bg-[#005c3e] text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Análise Estratégica Gemini</h3>
                <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-1">Inteligência Operacional Agrosystem</p>
              </div>
              <button onClick={() => setShowAnalysisModal(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-10">
              <div className="text-gray-700 text-lg leading-relaxed italic font-medium bg-gray-50 p-8 rounded-[2rem] border-2 border-emerald-100 shadow-inner">
                {analysis || "Consultando bases operacionais e processando indicadores..."}
              </div>
              <button onClick={() => setShowAnalysisModal(false)} className="w-full mt-10 py-5 bg-[#005c3e] text-white font-black rounded-2xl shadow-xl hover:bg-emerald-900 transition-all uppercase tracking-widest text-xs">Continuar Gestão</button>
            </div>
          </div>
        </div>
      )}

      {/* Detalhes do Dia Modal */}
      {selectedDay && selectedDayInfo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/80">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">{format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}</h3>
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-2 bg-emerald-100 px-3 py-1 rounded-full inline-block">{format(selectedDay, "eeee", { locale: ptBR })}</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-3 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-full transition-all group">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex border-b bg-gray-50/50 p-2 gap-2">
              {(['notas', 'ordens', 'comentarios'] as const).filter(t => isGuest ? t !== 'comentarios' : true).map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${
                    activeTab === tab ? 'bg-white text-emerald-700 shadow-md ring-1 ring-gray-100' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab === 'notas' ? 'NFs' : tab === 'ordens' ? 'OPs' : 'Obs'} 
                  <span className="ml-2 opacity-40">({tab === 'notas' ? selectedDayInfo.notas.length : tab === 'ordens' ? selectedDayInfo.ordens.length : selectedDayInfo.comentarios.length})</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-white">
              {activeTab === 'notas' && (
                <div className="space-y-4">
                  {selectedDayInfo.notas.map(n => (
                    <div key={n.id} className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 hover:bg-blue-50 transition-all border-l-8 border-l-blue-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-lg font-black text-gray-900 leading-none tracking-tight">NF #{n.numero}</p>
                          <p className="text-[11px] font-bold text-gray-400 mt-2 uppercase tracking-tight">{n.fornecedor}</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-sm ${n.status === 'Classificada' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>{n.status}</span>
                      </div>
                      {n.observacao && (
                        <div className="mt-4 p-4 bg-white/80 rounded-2xl shadow-inner italic text-sm text-gray-600 font-medium">"{n.observacao}"</div>
                      )}
                    </div>
                  ))}
                  {selectedDayInfo.notas.length === 0 && <div className="text-center py-20 opacity-20 font-black uppercase text-sm">Vazio</div>}
                </div>
              )}

              {activeTab === 'ordens' && (
                <div className="space-y-4">
                  {selectedDayInfo.ordens.map(o => (
                    <div key={o.id} className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 hover:bg-emerald-50 transition-all border-l-8 border-l-emerald-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-lg font-black text-gray-900 leading-none tracking-tight">OP #{o.numero}</p>
                          <p className="text-[11px] font-bold text-gray-400 mt-2 uppercase tracking-tight">{o.documento}</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-sm ${o.status === 'Concluída' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>{o.status}</span>
                      </div>
                      {o.observacao && (
                        <div className="mt-4 p-4 bg-white/80 rounded-2xl shadow-inner italic text-sm text-gray-600 font-medium">"{o.observacao}"</div>
                      )}
                    </div>
                  ))}
                  {selectedDayInfo.ordens.length === 0 && <div className="text-center py-20 opacity-20 font-black uppercase text-sm">Vazio</div>}
                </div>
              )}

              {activeTab === 'comentarios' && !isGuest && (
                <div className="space-y-6">
                  <section className="bg-gray-50 p-6 rounded-[2rem] border border-gray-200 shadow-inner">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Novo Apontamento</h4>
                    <form onSubmit={handleSaveQuickComment} className="flex gap-3">
                      <input type="text" placeholder="Descreva o evento de hoje..." className="flex-1 px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm font-medium shadow-sm" value={quickComment} onChange={e => setQuickComment(e.target.value)} />
                      <button type="submit" disabled={savingComment || !quickComment.trim()} className="px-8 py-4 bg-[#005c3e] text-white font-black rounded-2xl hover:bg-emerald-900 transition-all text-[10px] uppercase shadow-lg">Salvar</button>
                    </form>
                  </section>
                  {selectedDayInfo.comentarios.map(c => (
                    <div key={c.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-sm font-medium text-gray-700 leading-relaxed italic border-l-4 border-emerald-300 shadow-sm">"{c.texto}"</div>
                  ))}
                  {selectedDayInfo.comentarios.length === 0 && <div className="text-center py-10 text-gray-300 font-black uppercase text-[10px] tracking-widest">Sem notas adicionais</div>}
                </div>
              )}
            </div>
            
            <div className="p-8 bg-gray-50 border-t">
              <button onClick={() => setSelectedDay(null)} className="w-full py-5 bg-gray-900 text-white font-black text-xs rounded-2xl hover:bg-black transition-all shadow-xl uppercase tracking-widest">Sair dos Detalhes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
