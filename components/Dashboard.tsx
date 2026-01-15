
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
  subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  data: AppState;
  analysis: string;
  onRunAnalysis: () => void;
  onRefresh?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, analysis, onRunAnalysis, onRefresh }) => {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'notas' | 'ordens' | 'comentarios'>('notas');
  const [quickComment, setQuickComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  
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

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
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
    } catch (err) {
      alert("Erro ao salvar comentário.");
    } finally {
      setSavingComment(false);
    }
  };

  const selectedDayInfo = selectedDay ? getDayDetails(selectedDay) : null;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header do Dashboard */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-black text-gray-800 tracking-tight uppercase">Dashboard Operacional</h2>
        <button onClick={() => { onRunAnalysis(); setShowAnalysisModal(true); }} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 text-white font-black rounded-xl shadow-lg hover:bg-emerald-800 transition-all text-xs tracking-widest uppercase">
          <span className="text-lg leading-none">✨</span> ANÁLISE INTELIGENTE
        </button>
      </div>

      {/* Alertas de Pendências (Fiel à imagem, abaixo do header) */}
      {criticalItems.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔔</span>
              <h3 className="text-sm font-black text-red-600 uppercase tracking-tight">Alertas de Pendências</h3>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Itens pendentes há 3+ dias</span>
          </div>
          
          <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
            {criticalItems.map((item: any) => {
              const days = differenceInDays(new Date(), new Date(item.data + 'T12:00:00'));
              return (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-red-50 flex justify-between items-center hover:shadow-md transition-shadow group">
                  <div>
                    <p className="text-sm font-black text-gray-800 leading-none">
                      {item.type} <span className="text-emerald-700">{item.numero}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1.5 uppercase tracking-wide">
                      {item.fornecedor || item.documento || 'Sem detalhes'} • <span className="text-red-400">{item.status}</span>
                    </p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black shadow-sm transition-transform group-hover:scale-105 ${
                    days >= 6 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {days} dias
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
          <div key={stat.label} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
              stat.color === 'blue' ? 'bg-blue-50' : 
              stat.color === 'emerald' ? 'bg-emerald-50' : 
              stat.color === 'purple' ? 'bg-purple-50' : 'bg-red-50'
            }`}>{stat.icon}</div>
            <div>
              <p className="text-2xl font-black text-gray-900 leading-none">{stat.value}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6 border-l-4 border-emerald-600 pl-4">Calendário de Atividade - {format(today, 'MMMM yyyy', { locale: ptBR })}</h3>
        <div className="grid grid-cols-7 gap-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[9px] font-black text-gray-300 uppercase py-1">{d}</div>
          ))}
          {calendarInterval.map((date, i) => {
            const { notas, ordens, comentarios } = getDayDetails(date);
            const hasItems = notas.length > 0 || ordens.length > 0 || comentarios.length > 0;
            return (
              <div key={i} onClick={() => { setSelectedDay(date); setActiveTab('notas'); }} className={`min-h-[85px] p-2 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${getDayStatusStyle(date)} ${hasItems ? 'hover:scale-[1.03] active:scale-95 shadow-sm' : 'opacity-60'}`}>
                <span className="text-sm font-black">{format(date, 'd')}</span>
                <div className="flex flex-col gap-0.5 mt-1">
                   {notas.length > 0 && <div className="flex justify-between bg-white/40 px-1 py-0.5 rounded text-[8px] font-black uppercase"><span>NF</span><span>({notas.length})</span></div>}
                   {ordens.length > 0 && <div className="flex justify-between bg-white/40 px-1 py-0.5 rounded text-[8px] font-black uppercase"><span>OP</span><span>({ordens.length})</span></div>}
                   {comentarios.length > 0 && <div className="flex justify-between bg-white/40 px-1 py-0.5 rounded text-[8px] font-black uppercase"><span>Obs</span><span>({comentarios.length})</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Análise */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b bg-emerald-900 text-white flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight">Análise Executiva IA</h3>
              <button onClick={() => setShowAnalysisModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-10">
              <p className="text-gray-700 text-lg leading-relaxed italic font-medium bg-gray-50 p-6 rounded-3xl border border-gray-100">{analysis || "Processando dados operacionais..."}</p>
              <button onClick={() => setShowAnalysisModal(false)} className="w-full mt-8 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700 transition-all uppercase tracking-widest">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Dia (Sistema de Abas) */}
      {selectedDay && selectedDayInfo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}</h3>
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">{format(selectedDay, "eeee", { locale: ptBR })}</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* Sistema de Abas */}
            <div className="flex border-b bg-gray-50/30">
              {(['notas', 'ordens', 'comentarios'] as const).map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all ${
                    activeTab === tab ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'notas' ? 'Notas' : tab === 'ordens' ? 'Ordens' : 'Observações'} ({tab === 'notas' ? selectedDayInfo.notas.length : tab === 'ordens' ? selectedDayInfo.ordens.length : selectedDayInfo.comentarios.length})
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {activeTab === 'notas' && (
                <div className="space-y-3">
                  {selectedDayInfo.notas.map(n => (
                    <div key={n.id} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex justify-between items-center hover:bg-blue-50 transition-colors">
                      <div>
                        <p className="text-sm font-black text-gray-900 leading-none">NF #{n.numero}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{n.fornecedor}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${n.status === 'Classificada' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>{n.status}</span>
                    </div>
                  ))}
                  {selectedDayInfo.notas.length === 0 && <p className="text-center py-10 text-gray-300 font-black uppercase text-xs">Nenhuma nota registrada</p>}
                </div>
              )}

              {activeTab === 'ordens' && (
                <div className="space-y-3">
                  {selectedDayInfo.ordens.map(o => (
                    <div key={o.id} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex justify-between items-center hover:bg-emerald-50 transition-colors">
                      <div>
                        <p className="text-sm font-black text-gray-900 leading-none">OP #{o.numero}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{o.documento}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${o.status === 'Concluída' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>{o.status}</span>
                    </div>
                  ))}
                  {selectedDayInfo.ordens.length === 0 && <p className="text-center py-10 text-gray-300 font-black uppercase text-xs">Nenhuma ordem registrada</p>}
                </div>
              )}

              {activeTab === 'comentarios' && (
                <div className="space-y-4">
                  <section className="bg-purple-50 p-5 rounded-2xl border border-purple-100 mb-6 shadow-inner">
                    <h4 className="text-[9px] font-black text-purple-700 uppercase tracking-widest mb-3">Registrar Evento</h4>
                    <form onSubmit={handleSaveQuickComment} className="flex gap-2">
                      <input type="text" placeholder="Algo a destacar hoje?" className="flex-1 px-4 py-2.5 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium" value={quickComment} onChange={e => setQuickComment(e.target.value)} />
                      <button type="submit" disabled={savingComment || !quickComment.trim()} className="px-6 py-2.5 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-700 transition-all text-[10px] uppercase">Salvar</button>
                    </form>
                  </section>
                  {selectedDayInfo.comentarios.map(c => (
                    <div key={c.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-sm"><p className="text-sm font-medium text-gray-700 leading-relaxed italic">"{c.texto}"</p></div>
                  ))}
                  {selectedDayInfo.comentarios.length === 0 && <p className="text-center py-6 text-gray-300 font-black uppercase text-xs tracking-widest">Sem observações adicionais</p>}
                </div>
              )}
            </div>
            
            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <button onClick={() => setSelectedDay(null)} className="flex-1 py-4 bg-gray-900 text-white font-black text-xs rounded-xl hover:bg-black transition-all shadow-lg uppercase tracking-widest">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
