
import React, { useState, useRef } from 'react';
import { UserRole } from '../types';
import { format, subDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ListManagerProps<T> {
  title: string;
  items: T[];
  role: UserRole;
  type: 'nota' | 'ordem' | 'comentario';
  onSave: (item: Partial<T>) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export const ListManager = <T extends { id: string, data: string, numero?: string, status?: string, texto?: string, observacao?: string, fornecedor?: string, documento?: string }>({ 
  title, items, role, type, onSave, onDelete, onRefresh 
}: ListManagerProps<T>) => {
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  const canEdit = role === 'admin' || role === 'editor';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setLoading(true);
    try {
      await onSave(editing);
      setEditing(null);
      onRefresh();
    } catch (e) {
      alert("Erro ao salvar: " + (e as any).message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'Classificada':
      case 'Concluída': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Pendente': return 'bg-red-100 text-red-700 border-red-200';
      case 'Em Conferência': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Pré Nota': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Em Separação': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const fieldLabel = type === 'nota' ? 'Nota Fiscal' : type === 'ordem' ? 'Ordem de Produção' : 'Comentário';
  
  // Ajuste do gênero gramatical solicitado: "Nova Nota Fiscal"
  const formActionLabel = editing?.id ? 'Editar' : (type === 'comentario' ? 'Novo' : 'Nova');

  const filteredItems = items.filter(item => 
    (item.numero?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.texto?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.documento?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.data.includes(searchTerm))
  );

  // Lógica do Mini Calendário Popover
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentCalendarDate)),
    end: endOfWeek(endOfMonth(currentCalendarDate))
  });

  const selectDay = (day: Date) => {
    setEditing({ ...editing, data: format(day, 'yyyy-MM-dd') } as any);
    setCalendarOpen(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10">
      {canEdit && (
        <div className="xl:col-span-1">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 sticky top-8">
            <h3 className="text-lg font-black mb-6 text-gray-800 uppercase tracking-tight">
              {formActionLabel} {fieldLabel}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-6">
              {/* SELETOR DE DATA ESTILIZADO (POPOVER) */}
              <div className="relative">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Data do Registro</label>
                <div 
                  onClick={() => setCalendarOpen(!isCalendarOpen)}
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:border-emerald-500 transition-all shadow-inner"
                >
                  <span className="text-sm font-bold text-gray-700">
                    {editing?.data ? format(parseISO(editing.data), 'dd/MM/yyyy') : 'Selecionar data...'}
                  </span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>

                {/* CALENDÁRIO POPOVER (FIEL À IMAGEM DE REFERÊNCIA) */}
                {isCalendarOpen && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 shadow-2xl rounded-2xl z-[100] p-4 animate-fadeIn">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h4 className="text-sm font-black text-gray-700 capitalize">
                        {format(currentCalendarDate, 'MMMM yyyy', { locale: ptBR })}
                      </h4>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setCurrentCalendarDate(subMonths(currentCalendarDate, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button type="button" onClick={() => setCurrentCalendarDate(addMonths(currentCalendarDate, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                        <div key={d} className="text-center text-[10px] font-black text-gray-300 py-1">{d}</div>
                      ))}
                      {calendarDays.map((day, idx) => {
                        const isCurrentMonth = isSameMonth(day, currentCalendarDate);
                        const isSelected = editing?.data && isSameDay(day, parseISO(editing.data));
                        const isToday = isSameDay(day, new Date());
                        
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectDay(day)}
                            className={`h-8 w-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center
                              ${!isCurrentMonth ? 'text-gray-200' : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'}
                              ${isSelected ? 'bg-[#005c3e] text-white shadow-lg scale-110 !text-white' : ''}
                              ${isToday && !isSelected ? 'border border-emerald-200 text-emerald-600' : ''}
                            `}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-between mt-4 pt-3 border-t border-gray-50">
                       <button type="button" onClick={() => { setEditing({...editing, data: ''}); setCalendarOpen(false); }} className="text-[10px] font-black text-blue-500 hover:underline uppercase tracking-widest">Limpar</button>
                       <button type="button" onClick={() => selectDay(new Date())} className="text-[10px] font-black text-blue-500 hover:underline uppercase tracking-widest">Hoje</button>
                    </div>
                  </div>
                )}
              </div>

              {type !== 'comentario' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{fieldLabel}</label>
                    <input type="text" placeholder={`Número da ${fieldLabel}`} value={editing?.numero || ''} onChange={e => setEditing({ ...editing, numero: e.target.value } as any)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{type === 'nota' ? 'Fornecedor' : 'Documento / Referência'}</label>
                    <input type="text" value={type === 'nota' ? (editing?.fornecedor || '') : (editing?.documento || '')} onChange={e => setEditing({ ...editing, [type === 'nota' ? 'fornecedor' : 'documento']: e.target.value } as any)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium" placeholder={type === 'nota' ? 'Ex: Agro Nutri S.A.' : 'Ex: Talhão 08'} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Status</label>
                    <select value={editing?.status || ''} onChange={e => setEditing({ ...editing, status: e.target.value } as any)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold" required>
                      <option value="">Selecione...</option>
                      {type === 'nota' ? (
                        <><option value="Pendente">Pendente</option><option value="Em Conferência">Em Conferência</option><option value="Pré Nota">Pré Nota</option><option value="Classificada">Classificada ✅</option></>
                      ) : (
                        <><option value="Em Separação">Em Separação</option><option value="Concluída">Concluída ✅</option></>
                      )}
                    </select>
                  </div>
                </>
              )}

              {type === 'comentario' ? (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Observação</label>
                  <textarea value={editing?.texto || ''} onChange={e => setEditing({ ...editing, texto: e.target.value } as any)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none h-40 text-sm font-medium leading-relaxed" required />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Observações Internas</label>
                  <textarea value={editing?.observacao || ''} onChange={e => setEditing({ ...editing, observacao: e.target.value } as any)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none h-24 text-sm font-medium leading-relaxed" />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setEditing(null); setCalendarOpen(false); }} className="flex-1 py-3 text-gray-500 font-bold text-[10px] uppercase hover:bg-gray-100 rounded-xl transition-all tracking-widest">Limpar</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-[#005c3e] text-white font-black text-[10px] uppercase rounded-xl shadow-lg hover:bg-emerald-900 tracking-widest transition-all">{loading ? '...' : 'Salvar Registro'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seção da Listagem */}
      <div className={`${canEdit ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4 bg-gray-50/20">
            <h3 className="text-base font-black text-gray-800 uppercase tracking-widest border-l-4 border-[#005c3e] pl-4">{title}</h3>
            <div className="flex items-center bg-white rounded-xl px-4 border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Pesquisar registros..." className="bg-transparent border-none outline-none p-3 text-sm font-medium w-48 sm:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-white text-gray-400 text-[9px] font-black uppercase tracking-[0.2em]"><th className="px-8 py-5">Data</th>{type !== 'comentario' && <th className="px-8 py-5">{fieldLabel}</th>}<th className="px-8 py-5">{type === 'comentario' ? 'Conteúdo' : 'Situação'}</th>{canEdit && <th className="px-8 py-5 text-right">Ações</th>}</tr></thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6 font-black text-gray-400 text-[11px] align-top whitespace-nowrap">{format(new Date(item.data + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                    {type !== 'comentario' && (
                      <td className="px-8 py-6 align-top">
                        <p className="text-sm font-black text-gray-900 leading-none">#{item.numero}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{item.fornecedor || item.documento || '-'}</p>
                      </td>
                    )}
                    <td className="px-8 py-6 align-top">
                      {type === 'comentario' ? (
                        <p className="text-gray-600 text-sm font-medium italic line-clamp-3">"{item.texto}"</p>
                      ) : (
                        <div className="space-y-3">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border shadow-sm ${getStatusColor(item.status)}`}>{item.status}</span>
                          {item.observacao && <div className="text-[10px] text-gray-500 font-medium bg-gray-50/50 p-2 rounded-lg border-l-2 border-[#005c3e] leading-tight italic">{item.observacao}</div>}
                        </div>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-8 py-6 text-right align-top opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditing(item); setCalendarOpen(false); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                          <button onClick={async () => { if(confirm('Remover registro?')) { await onDelete(item.id); onRefresh(); }}} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
