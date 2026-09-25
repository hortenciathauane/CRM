export type TaskStatus = 'nao_iniciado' | 'em_andamento' | 'finalizado';

export type Priority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface TaskNote {
  id: string;
  text: string;
  author?: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id?: string;
  title: string;
  client_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  value: number;
  priority: Priority;
  status: TaskStatus;
  due_date?: string;
  description?: string;
  notes?: TaskNote[];
  created_at: string;
  updated_at: string;
}

export interface StatusColumnConfig {
  id: TaskStatus;
  title: string;
  description: string;
  borderAccent: string;
  badgeDot: string;
}

export const TASK_COLUMNS: StatusColumnConfig[] = [
  {
    id: 'nao_iniciado',
    title: 'Não iniciado',
    description: 'Tarefas planejadas e novos contatos',
    borderAccent: 'border-slate-300 dark:border-slate-700',
    badgeDot: 'bg-slate-400',
  },
  {
    id: 'em_andamento',
    title: 'Em Andamento',
    description: 'Em negociação ou execução ativa',
    borderAccent: 'border-blue-300 dark:border-blue-700',
    badgeDot: 'bg-blue-500',
  },
  {
    id: 'finalizado',
    title: 'Finalizado',
    description: 'Tarefas concluídas e negócios fechados',
    borderAccent: 'border-emerald-300 dark:border-emerald-700',
    badgeDot: 'bg-emerald-500',
  },
];

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export interface UserSession {
  id: string;
  email: string;
  role?: string;
}
