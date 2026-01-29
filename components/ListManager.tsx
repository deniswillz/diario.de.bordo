
import React, { useState, useMemo } from 'react';
import { UserRole } from '../types';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ListManagerProps<T> {
  title: string;
  items: T[];
  role: UserRole;
  type: 'nota' | 'comentario';
  onSave: (item: Partial<T>) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export const ListManager = <T extends { id: string, data: string, numero?: string, status?: string, tipo?: string, texto?: string, observacao?: string, fornecedor?: string, documento?: string, conferente?: string }>({
  title, items, role, type, onSave, onDelete, onRefresh
}: ListManagerProps<T>) => {
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dayFilter, setDayFilter] = useState<'all' | '1' | '7' | '30'>('all');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<Partial<T> | null>(null);

  const canEdit = role === 'admin' || role === 'editor';

  const openNewForm = () => {
    const initialData: any = {
      data: format(new Date(), 'yyyy-MM-dd'),
    };
    if (type === 'nota') {
      initialData.status = 'Pendente';
    }
    setEditing(initialData);
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: T) => {
    setEditing(item);
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const handleSave = async (e?: React.FormEvent, force: boolean = false) => {
    if (e) e.preventDefault();
    if (!editing) return;

    if (type === 'nota' && (!editing.numero || !editing.fornecedor)) {
      setErrorMessage("Número da Nota e Fornecedor são obrigatórios.");
      return;
    }

    // Duplicate Check
    if (!force && !editing.id) {
      const isDuplicate = items.some(item => {
        if (type === 'nota') {
          return item.numero === editing.numero;
        }
        return false;
      });
      if (isDuplicate) {
        setDuplicateWarning(editing);
        return;
      }
    }

    setLoading(true);
    try {
      // Sanitize payload to avoid Supabase schema errors
      const payload: any = { ...editing };
      if (type === 'comentario') {
        // Fields only for 'notas_fiscais'
        delete payload.status;
        delete payload.numero;
        delete payload.fornecedor;
        delete payload.conferente;
        delete payload.observacao;
        delete payload.tipo;
        delete payload.documento;
      } else if (type === 'nota') {
        // Fields only for 'comentarios'
        delete payload.texto;
      }

      await onSave(payload);
      setEditing(null);
      setDuplicateWarning(null);
      setIsFormOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro no salvamento.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDuplicateSave = () => {
    if (duplicateWarning) {
      handleSave(undefined, true);
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
      setErrorMessage("Erro ao remover.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'Classificada': return 'bg-emerald-600 text-white shadow-sm';
      case 'Pendente': return 'bg-red-600 text-white shadow-sm';
      case 'Em Conferência': return 'bg-blue-600 text-white shadow-sm';
      case 'Pré Nota': return 'bg-purple-600 text-white shadow-sm';
      default: return 'bg-gray-600 text-white shadow-sm';
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch =
        (item.numero?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.texto?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.documento?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.conferente?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.data.includes(searchTerm));

      if (dayFilter === 'all') return matchesSearch;

      const itemDate = parseISO(item.data);
      const cutoff = subDays(new Date(), parseInt(dayFilter));
      return matchesSearch && isAfter(itemDate, cutoff);
    });
  }, [items, searchTerm, dayFilter]);

  const supplierSuggestions = useMemo(() => {
    if (type !== 'nota') return [];
    const suppliers = items.map(i => i.fornecedor).filter(Boolean) as string[];
    return Array.from(new Set(suppliers)).sort();
  }, [items, type]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header com Filtros e Busca */}
      <div className="bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-[2.5rem] shadow-xl border-4 border-gray-300 dark:border-gray-700 flex flex-col gap-10">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic border-l-[12px] border-emerald-600 dark:border-emerald-500 pl-8">{title}</h2>
          {canEdit && (
            <button onClick={openNewForm} className="w-full sm:w-auto px-10 py-5 bg-[#005c3e] dark:bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-900 dark:hover:bg-emerald-700 transition-all text-xs tracking-[0.2em] uppercase border-b-6 border-emerald-950 dark:border-emerald-900 active:translate-y-1">
              {type === 'nota' ? '+ Nova Nota Fiscal' : '+ Novo Apontamento'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-emerald-500 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder={`Pesquisar por ${type === 'nota' ? 'número ou fornecedor...' : 'conteúdo ou responsável...'}`}
              className="w-full pl-16 pr-10 py-5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="lg:col-span-4 flex bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded-2xl border-2 border-gray-100 dark:border-gray-700 shadow-inner">
            {(['all', '1', '7', '30'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDayFilter(filter)}
                className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${dayFilter === filter
                  ? 'bg-white dark:bg-gray-600 text-emerald-700 dark:text-emerald-400 shadow-md border border-gray-100 dark:border-gray-500'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
              >
                {filter === 'all' ? 'Tudo' : filter === '1' ? 'Hoje' : `${filter}d`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isFormOpen && editing && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-emerald-950/80 dark:bg-black/80 backdrop-blur-xl">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden border-4 border-emerald-500/30 flex flex-col h-[85vh] animate-scaleIn">
            <form onSubmit={handleSave} className="flex flex-col h-full">
              <div className="p-10 bg-[#005c3e] dark:bg-emerald-700 text-white flex justify-between items-center shrink-0">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-1 opacity-70">Nano System Process</p>
                  <h3 className="text-3xl font-black italic tracking-tighter uppercase">{editing.id ? 'Editar Registro' : type === 'nota' ? 'Nova Nota Fiscal' : 'Novo Apontamento'}</h3>
                </div>
                <button type="button" onClick={() => setIsFormOpen(false)} className="w-14 h-14 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all border-2 border-white/20"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>

              <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-8 max-h-[60vh] bg-white dark:bg-gray-900">
                {errorMessage && <div className="p-5 bg-red-50 text-red-600 rounded-2xl border-2 border-red-200 font-black text-[10px] uppercase tracking-widest">{errorMessage}</div>}

                {/* Linha 1: Data e Identificação (Compacto) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4 mb-2 block">Data</label>
                    <input
                      type="date"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-gray-900 dark:text-gray-100 focus:border-emerald-500 transition-all"
                      value={editing.data}
                      onChange={(e) => setEditing({ ...editing, data: e.target.value })}
                    />
                  </div>
                  {type === 'nota' && (
                    <div>
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4 mb-2 block">Número da Nota</label>
                      <input
                        type="text"
                        placeholder="Ex: NF-12345"
                        value={editing?.numero || ''}
                        onChange={e => setEditing({ ...editing, numero: e.target.value } as any)}
                        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-gray-900 dark:text-gray-100 focus:border-emerald-500 transition-all shadow-inner"
                        required
                      />
                    </div>
                  )}
                  {type === 'comentario' && (
                    <div className="opacity-50">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4 mb-2 block">Sistema Nano</label>
                      <div className="px-6 py-4 bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-gray-500 dark:text-gray-400 text-sm italic">
                        Registro vinculado à cronologia do sistema.
                      </div>
                    </div>
                  )}
                </div>

                {/* FORMULÁRIO: NOTA FISCAL (Campos restantes) */}
                {type === 'nota' && (
                  <div className="space-y-8">
                    {/* Linha 2: Fornecedor (Full Width) */}
                    <div>
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4 mb-2 block">Fornecedor</label>
                      <input
                        type="text"
                        placeholder="Nome completo do fornecedor"
                        list="suppliers-list"
                        value={editing?.fornecedor || ''}
                        onChange={e => setEditing({ ...editing, fornecedor: e.target.value } as any)}
                        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-gray-900 dark:text-gray-100 focus:border-emerald-500 transition-all shadow-inner"
                        required
                      />
                      <datalist id="suppliers-list">
                        {supplierSuggestions.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                    {/* Linha 3: Conferente, Status e Tipo (Compacto) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4 mb-2 block">Conferente</label>
                        <input type="text" placeholder="Nome do conferente responsável" value={editing?.conferente || ''} onChange={e => setEditing({ ...editing, conferente: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-gray-900 dark:text-gray-100 focus:border-emerald-500 transition-all shadow-inner" required />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4 mb-2 block">Status</label>
                        <select value={editing?.status || 'Pendente'} onChange={e => setEditing({ ...editing, status: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-gray-900 dark:text-gray-100 focus:border-emerald-500 transition-all shadow-inner">
                          <option value="Pendente">Pendente</option>
                          <option value="Em Conferência">Em Conferência</option>
                          <option value="Pré Nota">Pré Nota</option>
                          <option value="Classificada">Classificada</option>
                        </select>
                      </div>
                      <div className="md:col-span-2 lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4 mb-2 block">Tipo</label>
                        <select value={editing?.tipo || ''} onChange={e => setEditing({ ...editing, tipo: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-gray-900 dark:text-gray-100 focus:border-emerald-500 transition-all shadow-inner">
                          <option value="">Selecione...</option>
                          <option value="Nacional">Nacional</option>
                          <option value="Importado">Importado</option>
                          <option value="Retorno">Retorno</option>
                          <option value="Devolução">Devolução</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}


                {/* CAMPO COMENTÁRIO COMUM */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4 mb-2 block">Comentário</label>
                  <textarea value={type === 'comentario' ? (editing?.texto || '') : (editing?.observacao || '')} onChange={e => setEditing({ ...editing, [type === 'comentario' ? 'texto' : 'observacao']: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-gray-900 dark:text-gray-100 outline-none min-h-[120px] resize-none focus:border-emerald-500 transition-all shadow-inner" required />
                </div>
              </div>

              <div className="p-10 border-t-4 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-6 shrink-0">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-5 text-gray-400 dark:text-gray-300 font-black text-[10px] uppercase tracking-widest bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-[2] py-5 bg-[#005c3e] dark:bg-emerald-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl tracking-widest border-b-6 border-emerald-950 dark:border-emerald-900 active:translate-y-1 transition-all">Sincronizar Dados Nano</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-red-500 animate-scaleIn">
            <div className="p-12 text-center bg-red-50 dark:bg-red-900/20">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-red-200 dark:border-red-800 text-3xl">!</div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none mb-4">Remover Registro?</h3>
              <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Ação irreversível no sistema Nano</p>
            </div>
            <div className="p-8 flex gap-4 bg-white dark:bg-gray-800 border-t-4 border-gray-100 dark:border-gray-700">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 font-black rounded-2xl text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600">Cancelar</button>
              <button onClick={confirmDeleteAction} className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Confirmar Exclusão</button>
            </div>
          </div>
        </div>
      )}

      {duplicateWarning && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-amber-500 animate-scaleIn">
            <div className="p-12 text-center bg-amber-50 dark:bg-amber-900/20">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-amber-200 dark:border-amber-800 text-3xl">?</div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none mb-4">Número Duplicado!</h3>
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">O número {duplicateWarning.numero || duplicateWarning.documento} já existe no sistema Nano. Deseja continuar?</p>
            </div>
            <div className="p-8 flex gap-4 bg-white dark:bg-gray-800 border-t-4 border-gray-100 dark:border-gray-700">
              <button onClick={() => setDuplicateWarning(null)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 font-black rounded-2xl text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600">Corrigir</button>
              <button onClick={confirmDuplicateSave} className="flex-1 py-4 bg-amber-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Sim, Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Registros */}
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border-4 border-gray-300 dark:border-gray-700 overflow-hidden relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] border-b-4 border-gray-100 dark:border-gray-700">
                <th className="px-10 py-8">Cronologia</th>
                {type !== 'comentario' && <th className="px-10 py-8">Identificação Nano</th>}
                <th className="px-10 py-8">Status / Detalhamento</th>
                {canEdit && <th className="px-10 py-8 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-50 dark:divide-gray-700">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-emerald-50/20 dark:hover:bg-emerald-900/10 group transition-all">
                  <td className="px-10 py-10 font-black text-gray-800 dark:text-gray-300 text-sm italic">{item.data ? format(parseISO(item.data), 'dd/MM/yyyy') : '-'}</td>
                  {type !== 'comentario' ? (
                    <td className="px-10 py-10">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-baseline gap-3">
                          <span className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter italic">#{item.numero || item.documento}</span>
                          <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{item.fornecedor}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{item.conferente}</span>
                          {item.tipo && <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-[7px] font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700">{item.tipo}</span>}
                        </div>
                      </div>
                    </td>
                  ) : (
                    <td className="px-10 py-10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center text-sm">💬</div>
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Apontamento</span>
                      </div>
                    </td>
                  )}
                  <td className="px-10 py-10">
                    <div className="flex flex-col gap-4 items-start">
                      {type !== 'comentario' && <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${getStatusColor(item.status)}`}>{item.status}</span>}
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 italic font-medium leading-relaxed max-w-xl">"{item.texto || item.observacao}"</p>
                    </div>
                  </td>
                  {canEdit && (
                    <td className="px-10 py-10 text-right">
                      <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <button onClick={() => handleEdit(item)} className="p-3.5 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-700 dark:hover:bg-emerald-600 hover:text-white rounded-xl border-2 border-gray-200 dark:border-gray-700 transition-all active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => setDeleteConfirm({ id: item.id })} className="p-3.5 text-red-600 hover:bg-red-600 hover:text-white rounded-xl border-2 border-gray-200 dark:border-gray-700 transition-all active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 4 : 3} className="px-10 py-24 text-center">
                    <p className="text-[11px] font-black uppercase text-gray-300 tracking-[0.4em]">Nenhum registro encontrado para este período</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
