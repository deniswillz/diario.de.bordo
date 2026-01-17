
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
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'notas' | 'ordens' | 'comentarios'>('notas');
  const [quickComment, setQuickComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  
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

    // Borda mais escura e sombra definida
    let base = "border-2 shadow-sm ";

    if (isSameDay(date, today)) return base + 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-200';
    
    const isCritical = notas.some(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(today, date) >= 3);
    if (isCritical) return base + 'bg-red-50 border-red-500 text-red-900 shadow-md';

    const isComplete = hasActivity && 
                       (notas.length === 0 || notas.every(n => n.status === 'Classificada')) && 
                       (ordens.length === 0 || ordens.every(o => o.status === 'Concluída'));
    if (isComplete) return base + 'bg-emerald-50 border-emerald-500 text-emerald-900';

    if (hasActivity) return base + 'bg-white border-emerald-700 text-gray-800 shadow-md';
    
    // Dia comum com borda visível em monitores ruins
    return base + 'bg-gray-50/50 border-gray-300 text-gray-400';
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
      showToast("Apontamento registrado.");
    } catch (err) {
      showToast("Erro ao gravar.");
    } finally {
      setSavingComment(false);
    }
  };

  const selectedDayInfo = selectedDay ? getDayDetails(selectedDay) : null;

  return (
    <div className="space-y-10 animate-fadeIn pb-20 relative">
      {toast && (
        <div className="fixed top-20 right-8 z-[200] bg-emerald-900 text-white px-8 py-4 rounded-2xl shadow-2xl animate-slideInRight text-xs font-bold uppercase border-2 border-emerald-700">
          {toast}
        </div>
      )}

      {/* Header Dashboard */}
      <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border-2 border-gray-300 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">Visão Geral</h2>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-3">Sistemas Logísticos Agrosystem</p>
        </div>
        <button onClick={() => { onRunAnalysis(); setShowAnalysisModal(true); }} className="flex items-center gap-4 px-10 py-5 bg-[#005c3e] text-white font-black rounded-2xl shadow-xl hover:bg-emerald-900 transition-all text-xs tracking-[0.2em] uppercase active:scale-95 border-2 border-emerald-900">
          ✨ Inteligência Gemini
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-gray-300 flex items-center gap-6 hover:shadow-lg transition-all border-b-8 border-b-emerald-600">
            <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center text-3xl border-2 ${
              stat.color === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
              stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
              stat.color === 'purple' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-red-50 text-red-600 border-red-200'
            }`}>{stat.icon}</div>
            <div>
              <p className="text-4xl font-black text-gray-900 leading-none tracking-tighter">{stat.value}</p>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-3">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calendário Reforçado */}
      <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border-2 border-gray-300">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
          <div className="flex items-center gap-8">
             <div className="h-14 w-3 bg-[#005c3e] rounded-full shadow-sm"></div>
             <div>
                <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Agenda Mensal</h3>
                <p className="text-lg font-black text-emerald-700 mt-1 uppercase tracking-widest">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-[2rem] border-2 border-gray-300 shadow-inner">
            <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-3 bg-white border-2 border-gray-200 hover:border-emerald-500 rounded-2xl text-emerald-600 transition-all active:scale-90">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => setViewDate(new Date())} className="px-8 py-3 text-xs font-black uppercase text-gray-700 bg-white border-2 border-gray-300 rounded-2xl transition-all tracking-widest hover:border-emerald-600">Hoje</button>
            <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-3 bg-white border-2 border-gray-200 hover:border-emerald-500 rounded-2xl text-emerald-600 transition-all active:scale-90">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase py-4 tracking-widest">{d}</div>
          ))}
          {calendarInterval.map((date, i) => {
            const { notas, ordens, comentarios } = getDayDetails(date);
            const hasItems = notas.length > 0 || ordens.length > 0 || (!isGuest && comentarios.length > 0);
            const isCurrentMonth = isSameMonth(date, viewDate);
            
            return (
              <div 
                key={i} 
                onClick={() => { if(isCurrentMonth) setSelectedDay(date); setActiveTab('notas'); }} 
                className={`min-h-[140px] p-6 rounded-[2rem] transition-all flex flex-col justify-between group relative overflow-hidden
                  ${getDayStatusStyle(date)} 
                  ${hasItems && isCurrentMonth ? 'hover:scale-105 active:scale-95 cursor-pointer shadow-xl' : ''}
                  ${!isCurrentMonth ? 'opacity-10 pointer-events-none' : 'opacity-100'}
                `}
              >
                <span className="text-3xl font-black z-10 leading-none">{format(date, 'd')}</span>
                
                <div className="flex flex-col gap-2.5 mt-4 z-10">
                   {notas.length > 0 && <div className="flex justify-between items-center bg-white/95 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-blue-900 border-2 border-blue-100"><span>NF</span><span className="bg-blue-600 text-white px-2 rounded-lg">{notas.length}</span></div>}
                   {ordens.length > 0 && <div className="flex justify-between items-center bg-white/95 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-emerald-900 border-2 border-emerald-100"><span>OP</span><span className="bg-emerald-600 text-white px-2 rounded-lg">{ordens.length}</span></div>}
                   {!isGuest && comentarios.length > 0 && <div className="flex justify-between items-center bg-white/95 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-purple-900 border-2 border-purple-100"><span>OBS</span><span className="bg-purple-600 text-white px-2 rounded-lg">{comentarios.length}</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Detalhes do Dia */}
      {selectedDay && selectedDayInfo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn border-4 border-gray-400">
            <div className="p-12 border-b-2 flex justify-between items-center bg-gray-50/50 border-gray-200">
              <div>
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.4em] mb-3">Relatório Diário</p>
                <h3 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">{format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}</h3>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-5 bg-white border-2 border-gray-300 text-gray-400 hover:text-red-600 hover:border-red-500 rounded-full transition-all shadow-xl active:scale-90">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex border-b-2 bg-gray-50/20 p-5 gap-5 border-gray-200">
              {(['notas', 'ordens', 'comentarios'] as const).filter(t => isGuest ? t !== 'comentarios' : true).map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={`flex-1 py-7 text-xs font-black uppercase tracking-[0.3em] rounded-3xl transition-all flex items-center justify-center gap-4 border-2 ${
                    activeTab === tab ? 'bg-white text-emerald-900 shadow-xl border-emerald-600 scale-105' : 'text-gray-400 hover:text-gray-800 border-transparent'
                  }`}
                >
                  {tab === 'notas' ? '📄 Notas' : tab === 'ordens' ? '⚙️ Ordens' : '💬 OBS'} 
                  <span className={`px-4 py-1 rounded-full text-[11px] ${activeTab === tab ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {tab === 'notas' ? selectedDayInfo.notas.length : tab === 'ordens' ? selectedDayInfo.ordens.length : selectedDayInfo.comentarios.length}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar bg-white">
              {activeTab === 'notas' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {selectedDayInfo.notas.map(n => (
                    <div key={n.id} className="p-10 bg-blue-50/30 rounded-[2.5rem] border-2 border-blue-300 hover:shadow-2xl transition-all border-l-[12px] border-l-blue-600">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">#{n.numero}</p>
                          <p className="text-[11px] font-black text-blue-600 mt-4 uppercase tracking-[0.2em]">{n.fornecedor || 'Geral'}</p>
                        </div>
                        <span className="px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-lg bg-blue-600 text-white border-2 border-blue-800">{n.status}</span>
                      </div>
                      {n.observacao && (
                        <div className="p-6 bg-white rounded-2xl shadow-inner italic text-base text-gray-700 font-medium leading-relaxed border-2 border-blue-100">"{n.observacao}"</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'ordens' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {selectedDayInfo.ordens.map(o => (
                    <div key={o.id} className="p-10 bg-emerald-50/30 rounded-[2.5rem] border-2 border-emerald-300 hover:shadow-2xl transition-all border-l-[12px] border-l-emerald-600">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">#{o.numero}</p>
                          <p className="text-[11px] font-black text-emerald-600 mt-4 uppercase tracking-[0.2em]">{o.documento || 'Geral'}</p>
                        </div>
                        <span className="px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-lg bg-emerald-600 text-white border-2 border-emerald-800">{o.status}</span>
                      </div>
                      {o.observacao && (
                        <div className="p-6 bg-white rounded-2xl shadow-inner italic text-base text-gray-700 font-medium leading-relaxed border-2 border-emerald-100">"{o.observacao}"</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'comentarios' && !isGuest && (
                <div className="space-y-12">
                  <section className="bg-gray-50 p-12 rounded-[3.5rem] border-2 border-gray-300 shadow-inner">
                    <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-8">Adicionar Comentário</h4>
                    <form onSubmit={handleSaveQuickComment} className="flex gap-5">
                      <input type="text" placeholder="Escreva aqui..." className="flex-1 px-8 py-6 bg-white border-2 border-gray-300 rounded-3xl focus:border-emerald-600 outline-none text-xl font-bold transition-all shadow-md" value={quickComment} onChange={e => setQuickComment(e.target.value)} />
                      <button type="submit" disabled={savingComment || !quickComment.trim()} className="px-14 py-6 bg-[#005c3e] text-white font-black rounded-3xl hover:bg-emerald-900 transition-all text-xs uppercase tracking-widest shadow-2xl active:scale-95 border-2 border-emerald-950">Gravar</button>
                    </form>
                  </section>
                  <div className="space-y-8">
                    {selectedDayInfo.comentarios.map(c => (
                      <div key={c.id} className="p-10 bg-gray-50/50 rounded-[3rem] border-2 border-gray-300 text-xl font-medium text-gray-900 italic border-l-12 border-emerald-500 shadow-md relative">
                        <span className="absolute -top-4 -left-4 bg-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-emerald-600 border-2 border-emerald-100 text-2xl">💬</span>
                        "{c.texto}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gemini Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-scaleIn border-4 border-gray-400">
             <div className="p-10 bg-[#005c3e] text-white flex justify-between items-center">
                <h3 className="text-3xl font-black uppercase tracking-tighter">Diagnóstico IA</h3>
                <button onClick={() => setShowAnalysisModal(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <div className="p-12 text-center">
                <div className="text-2xl font-bold text-gray-800 leading-relaxed italic bg-emerald-50 p-10 rounded-[2.5rem] border-2 border-emerald-200">
                  {analysis || "Processando registros..."}
                </div>
                <button onClick={() => setShowAnalysisModal(false)} className="w-full mt-10 py-6 bg-[#005c3e] text-white font-black rounded-2xl shadow-xl hover:bg-emerald-900 transition-all uppercase tracking-widest text-xs">Concluir Leitura</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
