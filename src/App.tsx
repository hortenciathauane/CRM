/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus, Priority } from './types';
import {
  getStoredSupabaseConfig,
  getSupabaseClient,
  fetchAuthenticatedTasks,
  createPersistentTask,
  updatePersistentTask,
  deletePersistentTask,
} from './lib/supabase';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { KanbanBoard } from './components/KanbanBoard';
import { TableView } from './components/TableView';
import { TaskModal } from './components/TaskModal';
import { SupabaseModal } from './components/SupabaseModal';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  AlertTriangle,
  Database,
  CheckCircle,
  X,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'kanban' | 'table' | 'supabase'>('kanban');

  // Supabase & Auth state
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ isSupabase: boolean; error?: string }>({
    isSupabase: false,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [initialStatusForNewTask, setInitialStatusForNewTask] = useState<TaskStatus>('nao_iniciado');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Carregar sessão Supabase e tarefas
  const loadData = useCallback(async () => {
    setLoading(true);
    const config = getStoredSupabaseConfig();
    setIsSupabaseConfigured(config.isConfigured);

    const client = getSupabaseClient();
    let user: User | null = null;

    if (client) {
      try {
        const { data: sessionData } = await client.auth.getSession();
        user = sessionData?.session?.user || null;
        setCurrentUser(user);
      } catch (err) {
        console.error('Erro ao verificar sessão Supabase:', err);
      }
    } else {
      setCurrentUser(null);
    }

    const result = await fetchAuthenticatedTasks(user);
    setTasks(result.tasks);
    setSyncStatus({ isSupabase: result.fromSupabase, error: result.error });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Listener para mudanças no estado de autenticação Supabase
    const client = getSupabaseClient();
    let authListener: { unsubscribe: () => void } | null = null;

    if (client) {
      const { data } = client.auth.onAuthStateChange(async (_event, session) => {
        const user = session?.user || null;
        setCurrentUser(user);
        const result = await fetchAuthenticatedTasks(user);
        setTasks(result.tasks);
        setSyncStatus({ isSupabase: result.fromSupabase, error: result.error });
      });
      authListener = data.subscription;
    }

    return () => {
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, [loadData]);

  // Handler para criar/atualizar tarefa
  const handleSaveTask = async (
    taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>,
    id?: string
  ) => {
    if (id) {
      // Atualizar tarefa existente
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...taskData, updated_at: new Date().toISOString() } : t))
      );
      const res = await updatePersistentTask(id, taskData, currentUser);
      if (res.error) {
        setSyncStatus({ isSupabase: false, error: res.error });
        showToast(`Aviso: ${res.error}`, 'error');
      } else if (res.fromSupabase) {
        setSyncStatus({ isSupabase: true });
        showToast('✓ Tarefa atualizada no Banco de Dados Supabase!', 'success');
      } else {
        showToast('Tarefa atualizada com sucesso!', 'success');
      }
    } else {
      // Criar nova tarefa (sem dados modelo)
      const res = await createPersistentTask(taskData, currentUser);
      setTasks((prev) => [res.task, ...prev.filter((t) => t.id !== res.task.id)]);
      if (res.error) {
        setSyncStatus({ isSupabase: false, error: res.error });
        showToast(res.error, 'error');
      } else if (res.fromSupabase) {
        setSyncStatus({ isSupabase: true });
        showToast('✓ Tarefa gravada diretamente no Banco de Dados Supabase!', 'success');
      } else {
        showToast('Tarefa salva apenas localmente no navegador.', 'info');
      }
    }
  };

  // Mudança rápida de status (arrastar ou clicar nas setas)
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t))
    );

    const res = await updatePersistentTask(taskId, { status: newStatus }, currentUser);
    if (res.error) {
      showToast(`Status atualizado (Supabase: ${res.error})`, 'info');
    }
  };

  // Excluir tarefa
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const res = await deletePersistentTask(taskId, currentUser);
    if (res.error) {
      showToast(`Excluída localmente. Supabase: ${res.error}`, 'info');
    } else {
      showToast('Tarefa excluída.', 'info');
    }
  };

  // Filtros aplicados
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      !searchTerm ||
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.client_name && task.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.company && task.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.email && task.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPriority =
      selectedPriority === 'all' || task.priority === selectedPriority;

    return matchesSearch && matchesPriority;
  });

  const openNewTaskWithStatus = (status: TaskStatus) => {
    setSelectedTask(null);
    setInitialStatusForNewTask(status);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Header */}
      <Header
        currentView={currentView}
        onViewChange={(v) => {
          if (v === 'supabase') {
            setIsSupabaseModalOpen(true);
          } else {
            setCurrentView(v);
          }
        }}
        onOpenNewTask={() => {
          setSelectedTask(null);
          setInitialStatusForNewTask('nao_iniciado');
          setIsTaskModalOpen(true);
        }}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        isSupabaseConfigured={isSupabaseConfigured}
        currentUser={currentUser}
      />

      {/* Persistence / Supabase Alert Bar */}
      {syncStatus.error && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-4xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Atenção Supabase:</strong> {syncStatus.error}
            </span>
          </div>
          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className="underline font-semibold hover:text-amber-950 text-xs shrink-0 ml-3"
          >
            Ver Script SQL / Configurar
          </button>
        </div>
      )}

      {!isSupabaseConfigured && (
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-xs text-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              O CRM está pronto para conectar ao <strong>Supabase</strong> com autenticação e Row Level Security (RLS).
            </span>
          </div>
          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            Configurar Chaves Supabase
          </button>
        </div>
      )}

      {/* Metrics Bar */}
      <MetricsBar tasks={tasks} />

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* Controls Bar: Search, Filters, Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar tarefa, cliente, empresa..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="all">Todas as prioridades</option>
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 bg-white transition-colors"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                setSelectedTask(null);
                setInitialStatusForNewTask('nao_iniciado');
                setIsTaskModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors shadow-2xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        {/* View Content: Kanban or Table */}
        {loading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-slate-400" />
            <span className="text-xs font-medium">Carregando tarefas do CRM...</span>
          </div>
        ) : currentView === 'kanban' ? (
          <KanbanBoard
            tasks={filteredTasks}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setIsTaskModalOpen(true);
            }}
            onStatusChange={handleStatusChange}
            onAddTaskWithStatus={openNewTaskWithStatus}
          />
        ) : (
          <TableView
            tasks={filteredTasks}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setIsTaskModalOpen(true);
            }}
            onStatusChange={handleStatusChange}
            onDeleteTask={handleDeleteTask}
          />
        )}
      </main>

      {/* Task Creation / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        initialStatus={initialStatusForNewTask}
        isSupabaseConfigured={isSupabaseConfigured}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      {/* Supabase Connection & Auth Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        currentUser={currentUser}
        onAuthChange={loadData}
        onConfigSaved={() => {
          loadData();
          showToast('Configurações do Supabase atualizadas!', 'success');
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded shadow-lg text-xs font-medium flex items-center gap-2 border animate-fade-in ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : toast.type === 'error'
              ? 'bg-rose-900 text-white border-rose-800'
              : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
