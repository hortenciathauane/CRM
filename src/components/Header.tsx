import React from 'react';
import { Database, Plus, CheckCircle2, AlertCircle, LogIn, User as UserIcon } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface HeaderProps {
  currentView: 'kanban' | 'table' | 'supabase';
  onViewChange: (view: 'kanban' | 'table' | 'supabase') => void;
  onOpenNewTask: () => void;
  onOpenSupabaseModal: () => void;
  isSupabaseConfigured: boolean;
  currentUser: User | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onOpenNewTask,
  onOpenSupabaseModal,
  isSupabaseConfigured,
  currentUser,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Brand title wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-base tracking-tighter">
              CR
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
              CRM Kanban
            </span>
          </div>
          <span className="hidden sm:inline text-slate-300">/</span>
          <span className="hidden sm:inline text-xs font-medium text-slate-500">
            Pipeline de Vendas & Tarefas
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onViewChange('kanban')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors rounded ${
              currentView === 'kanban'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Quadro Kanban
          </button>
          <button
            onClick={() => onViewChange('table')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors rounded ${
              currentView === 'table'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Tabela de Tarefas
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenSupabaseModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded transition-colors ${
              currentUser
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : isSupabaseConfigured
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 ring-1 ring-amber-300/60'
            }`}
            title="Configurar Conexão e Autenticação Supabase"
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline font-semibold">
              {currentUser
                ? `${currentUser.email?.split('@')[0]} (Supabase)`
                : isSupabaseConfigured
                ? 'Banco Conectado'
                : 'Conectar Supabase (Modo Local)'}
            </span>
            {currentUser ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : isSupabaseConfigured ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
            )}
          </button>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>
    </header>
  );
};
