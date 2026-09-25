import React from 'react';
import { Task, TaskStatus } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Building, DollarSign, MessageSquare } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onSelect: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onSelect,
  onStatusChange,
  onDragStart,
}) => {
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const priorityConfig = {
    baixa: { label: 'Baixa', dot: 'bg-slate-400', text: 'text-slate-600' },
    media: { label: 'Média', dot: 'bg-blue-500', text: 'text-blue-700' },
    alta: { label: 'Alta', dot: 'bg-amber-500', text: 'text-amber-700' },
    urgente: { label: 'Urgente', dot: 'bg-rose-500', text: 'text-rose-700' },
  }[task.priority] || { label: 'Média', dot: 'bg-blue-500', text: 'text-blue-700' };

  // Next and previous status flow
  const getPrevStatus = (s: TaskStatus): TaskStatus | null => {
    if (s === 'finalizado') return 'em_andamento';
    if (s === 'em_andamento') return 'nao_iniciado';
    return null;
  };

  const getNextStatus = (s: TaskStatus): TaskStatus | null => {
    if (s === 'nao_iniciado') return 'em_andamento';
    if (s === 'em_andamento') return 'finalizado';
    return null;
  };

  const prevStatus = getPrevStatus(task.status);
  const nextStatus = getNextStatus(task.status);

  // Check if due date is passed
  const isOverdue = task.due_date ? new Date(task.due_date) < new Date(new Date().toDateString()) : false;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onSelect(task)}
      className="group relative bg-white border border-slate-200 rounded p-3.5 shadow-xs hover:border-slate-400 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing"
    >
      {/* Top row: Priority & Value */}
      <div className="flex items-center justify-between gap-2 text-xs mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`} />
          <span className={`font-medium ${priorityConfig.text}`}>
            {priorityConfig.label}
          </span>
        </div>

        {task.value > 0 && (
          <span className="font-mono tabular-nums font-semibold text-slate-800 text-xs">
            {formatBRL(task.value)}
          </span>
        )}
      </div>

      {/* Task Title */}
      <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 mb-1.5">
        {task.title}
      </h4>

      {/* Client / Company info */}
      {(task.client_name || task.company) && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 truncate">
          <Building className="w-3 h-3 shrink-0 text-slate-400" />
          <span className="truncate">
            {task.client_name}
            {task.client_name && task.company && ' · '}
            {task.company}
          </span>
        </div>
      )}

      {/* Description excerpt */}
      {task.description && (
        <p className="text-xs text-slate-600 line-clamp-2 mb-2.5">
          {task.description}
        </p>
      )}

      {/* Footer metadata & Quick status move */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          {task.due_date && (
            <div
              className={`flex items-center gap-1 font-mono text-[11px] tabular-nums ${
                isOverdue && task.status !== 'finalizado'
                  ? 'text-rose-600 font-medium'
                  : 'text-slate-500'
              }`}
              title={isOverdue ? 'Prazo vencido' : 'Prazo'}
            >
              <Calendar className="w-3 h-3" />
              <span>{new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
            </div>
          )}

          {task.notes && task.notes.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <MessageSquare className="w-3 h-3" />
              <span className="font-mono tabular-nums">{task.notes.length}</span>
            </div>
          )}
        </div>

        {/* Quick status advance controls */}
        <div
          className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {prevStatus && (
            <button
              onClick={() => onStatusChange(task.id, prevStatus)}
              className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
              title={`Voltar para ${prevStatus === 'nao_iniciado' ? 'Não iniciado' : 'Em Andamento'}`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {nextStatus && (
            <button
              onClick={() => onStatusChange(task.id, nextStatus)}
              className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
              title={`Avançar para ${nextStatus === 'em_andamento' ? 'Em Andamento' : 'Finalizado'}`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
