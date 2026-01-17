
import React, { useState } from 'react';
import { UserRole } from '../types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
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
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<Partial<T> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canEdit = role === 'admin' || role === 'editor';

  const handleSave = async (e?: React.FormEvent, forceSave: boolean = false) => {
    if (e) e.preventDefault();
    if (!editing) return;

    if (type !== 'comentario' && !forceSave && editing.numero) {
      const isDuplicate = items.find(item => 
        item.numero?.trim() === editing.numero?.trim() && item.id !== editing.id
      );

      if (isDuplicate) {
        setDuplicateConfirm(editing);
        return;
      }
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await onSave(editing);
      setEditing(null);
      setDuplicateConfirm(null);
      onRefresh();
    } catch (e: any) {
      setErrorMessage("Erro ao salvar dados.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm) return;
    setLoading(true);
    try {
      await onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
      onRefresh();
    } catch (e: any) {
      setErrorMessage("Erro ao remover registro.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'Classificada':
      case 'Concluída': return 'bg-emerald-600 text-white border-2 border-emerald-800 shadow-sm';
      case 'Pendente': return 'bg-red-600 text-white border-2 border-red-800 shadow-sm';
      case 'Em Conferência': return 'bg-blue-600 text-white border-2 border-blue-800 shadow-sm';
      case 'Pré Nota': return 'bg-purple-600 text-white border-2 border-purple-800 shadow-sm';
      case 'Em Separação': return 'bg-amber-500 text-white border-2 border-amber-700 shadow-sm';
      default: return 'bg-gray-600 text-white border-2 border-gray-800 shadow-sm';
    }
  };

  const fieldLabel = type === 'nota' ? 'Nota Fiscal' : type === 'ordem' ? 'Ordem de Produção' : 'Comentário';
  const formActionLabel = editing?.id ? 'Editar' : 'Nova';

  const filteredItems = items.filter(item => 
    (item.numero?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.texto?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.documento?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.data.includes(searchTerm))
  );

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentCalendarDate)),
    end: endOfWeek(endOfMonth(currentCalendarDate))
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10 relative">
      
      {duplicateConfirm && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-amber-500 animate-scaleIn">
            <div className="p-10 text-center bg-amber-50">
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-md border-2 border-amber-200">⚠️</div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Já Cadastrado</h3>
              <p className="text-base text-gray-700 font-bold mt-4 leading-relaxed">
                O documento <span className="text-amber-800 font-black">#{duplicateConfirm.numero}</span> já existe. Deseja prosseguir?
              </p>
            </div>
            <div className="p-8 flex gap-4 bg-white border-t-2 border-gray-100">
              <button onClick={() => setDuplicateConfirm(null)} className="flex-1 py-5 bg-gray-100 text-gray-600 font-black rounded-2xl text-xs uppercase tracking-widest border-2 border-gray-300">Não</button>
              <button onClick={() => handleSave(undefined, true)} className="flex-1 py-5 bg-amber-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl border-2 border-amber-800 transition-all">Sim, Salvar</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-red-500 animate-scaleIn">
            <div className="p-10 text-center bg-red-50">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-md border-2 border-red-200">🗑️</div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Excluir Permanente?</h3>
              <p className="text-base text-gray-700 font-bold mt-4">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="p-8 flex gap-4 bg-white border-t-2 border-gray-100">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-5 bg-gray-100 text-gray-600 font-black rounded-2xl text-xs uppercase tracking-widest border-2 border-gray-300">Cancelar</button>
              <button onClick={confirmDeleteAction} className="flex-1 py-5 bg-red-600 text-white font-black rounded-2xl text-xs uppercase shadow-xl border-2 border-red-800">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="xl:col-span-1">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-gray-300 sticky top-8">
            <h3 className="text-2xl font-black mb-10 text-gray-900 uppercase tracking-tighter border-l-8 border-emerald-600 pl-8 leading-none">
              {formActionLabel} {fieldLabel}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-8">
              <div className="relative">
                <label className="block text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Data Operacional</label>
                <div onClick={() => setCalendarOpen(!isCalendarOpen)} className="flex items-center justify-between px-6 py-4 bg-gray-50 border-2 border-gray-400 rounded-2xl cursor-pointer hover:border-emerald-600 transition-all shadow-md group">
                  <span className="text-lg font-black text-gray-800">
                    {editing?.data ? format(parseISO(editing.data), 'dd/MM/yyyy') : 'Escolher data...'}
                  </span>
                  <svg className="w-7 h-7 text-gray-400 group-hover:text-emerald-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>

                {isCalendarOpen && (
                  <div className="absolute top-full left-0 mt-4 w-full bg-white border-2 border-gray-400 shadow-2xl rounded-[2.5rem] z-[100] p-8 animate-fadeIn">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-lg font-black text-gray-900 capitalize">{format(currentCalendarDate, 'MMMM yyyy', { locale: ptBR })}</h4>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setCurrentCalendarDate(subMonths(currentCalendarDate, 1))} className="p-2 border-2 border-gray-200 hover:bg-gray-100 rounded-xl text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg></button>
                        <button type="button" onClick={() => setCurrentCalendarDate(addMonths(currentCalendarDate, 1))} className="p-2 border-2 border-gray-200 hover:bg-gray-100 rounded-xl text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <div key={d} className="text-center text-xs font-black text-gray-400">{d}</div>)}
                      {calendarDays.map((day, idx) => (
                        <button key={idx} type="button" onClick={() => { setEditing({ ...editing, data: format(day, 'yyyy-MM-dd') } as any); setCalendarOpen(false); }} className={`h-11 w-11 rounded-2xl text-sm font-bold border-0 transition-all flex items-center justify-center ${!isSameMonth(day, currentCalendarDate) ? 'text-gray-200 bg-transparent' : 'text-gray-800 hover:bg-emerald-50'} ${editing?.data && isSameDay(day, parseISO(editing.data)) ? 'bg-[#005c3e] text-white' : ''}`}>
                          {format(day, 'd')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {type !== 'comentario' && (
                <>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Número</label>
                    <input type="text" value={editing?.numero || ''} onChange={e => setEditing({ ...editing, numero: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-400 rounded-2xl outline-none text-xl font-black focus:border-emerald-600 transition-all shadow-inner" placeholder="Ex: 10425" required />
                  </div>
                  
                  {type === 'nota' && (
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Fornecedor</label>
                      <input type="text" value={editing?.fornecedor || ''} onChange={e => setEditing({ ...editing, fornecedor: e.target.value } as any)} placeholder="Ex: Agrosystem S.A." className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-400 rounded-2xl outline-none text-xl font-bold focus:border-emerald-600 transition-all shadow-inner" required />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Status</label>
                    <select value={editing?.status || ''} onChange={e => setEditing({ ...editing, status: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-400 rounded-2xl outline-none text-lg font-black focus:border-emerald-600 transition-all cursor-pointer appearance-none shadow-inner" required>
                      <option value="">Definir Status...</option>
                      {type === 'nota' ? (
                        <><option value="Pendente">Pendente ⏳</option><option value="Em Conferência">Em Conferência 📋</option><option value="Pré Nota">Pré Nota 📄</option><option value="Classificada">Classificada ✅</option></>
                      ) : (
                        <><option value="Em Separação">Em Separação 📦</option><option value="Concluída">Concluída ✅</option></>
                      )}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Detalhes Operacionais</label>
                <textarea value={type === 'comentario' ? (editing?.texto || '') : (editing?.observacao || '')} onChange={e => setEditing({ ...editing, [type === 'comentario' ? 'texto' : 'observacao']: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-400 rounded-3xl outline-none text-lg font-medium h-40 focus:border-emerald-600 transition-all resize-none shadow-inner" required />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 py-5 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-2xl transition-all border-2 border-transparent">Limpar</button>
                <button type="submit" disabled={loading} className="flex-[2] py-5 bg-[#005c3e] text-white font-black text-xs uppercase rounded-2xl shadow-xl tracking-widest hover:bg-emerald-900 transition-all active:scale-95 border-2 border-emerald-950">{loading ? 'Gravando...' : 'Salvar Registro'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={`${canEdit ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
        <div className="bg-white rounded-[3.5rem] shadow-xl border-2 border-gray-300 overflow-hidden">
          <div className="p-10 border-b-2 border-gray-200 bg-gray-50/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter border-l-8 border-emerald-600 pl-8 leading-none">{title}</h3>
            <div className="relative w-full sm:w-80">
              <input type="text" placeholder="Filtrar dados..." className="w-full bg-white border-2 border-gray-400 outline-none p-5 pl-12 text-lg font-bold rounded-2xl shadow-sm focus:border-emerald-600 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-white text-gray-400 text-[11px] font-black uppercase tracking-widest border-b-2 border-gray-100"><th className="px-10 py-8">Calendário</th>{type !== 'comentario' && <th className="px-10 py-8">Documento / Fornecedor</th>}<th className="px-10 py-8">Status e Detalhes</th>{canEdit && <th className="px-10 py-8 text-right">Controle</th>}</tr></thead>
              <tbody className="divide-y-2 divide-gray-100 bg-white">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-emerald-50/30 group transition-all">
                    <td className="px-10 py-10 font-black text-gray-600 text-sm">{format(new Date(item.data + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                    {type !== 'comentario' && (
                      <td className="px-10 py-10">
                        <p className="text-2xl font-black text-gray-900 leading-none tracking-tight">#{item.numero}</p>
                        <p className="text-[11px] font-black text-emerald-700 mt-3 uppercase tracking-widest bg-emerald-100/50 px-3 py-1.5 rounded-xl inline-block border-2 border-emerald-200">{item.fornecedor || item.documento || 'Geral'}</p>
                      </td>
                    )}
                    <td className="px-10 py-10">
                      {type === 'comentario' ? <p className="text-gray-800 text-lg font-medium italic border-l-8 border-emerald-300 pl-6 py-2">"{item.texto}"</p> : (
                        <div className="space-y-6">
                          <span className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-md inline-block ${getStatusColor(item.status)}`}>{item.status}</span>
                          {item.observacao && <div className="text-sm text-gray-700 italic bg-gray-50 p-6 rounded-2xl border-2 border-emerald-500 leading-relaxed font-bold shadow-inner">"{item.observacao}"</div>}
                        </div>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-10 py-10 text-right">
                        <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => setEditing(item)} className="p-3 text-emerald-800 hover:bg-emerald-700 hover:text-white rounded-2xl border-2 border-gray-300 shadow-md bg-white active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                          <button onClick={() => setDeleteConfirm({ id: item.id })} className="p-3 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl border-2 border-gray-300 shadow-md bg-white active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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
