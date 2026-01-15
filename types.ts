
export type UserRole = 'admin' | 'editor' | 'operador' | 'guest';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  created_at?: string;
}

export interface NotaFiscal {
  id: string;
  data: string;
  numero: string;
  fornecedor: string;
  status: 'Pendente' | 'Em Conferência' | 'Pré Nota' | 'Classificada';
  tipo: 'Entrada' | 'Saída' | 'Devolução' | '';
  observacao: string;
  created_by?: string;
}

export interface OrdemProducao {
  id: string;
  data: string;
  numero: string;
  documento: string;
  status: 'Em Separação' | 'Concluída';
  observacao: string;
  created_by?: string;
}

export interface Comentario {
  id: string;
  data: string;
  texto: string;
  created_by?: string;
}

export interface AppState {
  notas: NotaFiscal[];
  ordens: OrdemProducao[];
  comentarios: Comentario[];
}
