import React, { useState } from 'react';
import { Task, TaskStatus, TASK_COLUMNS } from '../types';
import { TaskCard } from './TaskCard';
import { Plus, Inbox } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTaskWithStatus: (status: TaskStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onSelectTask,
  onStatusChange,
  onAddTaskWithStatus,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (dragOverColumn === status) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      onStatusChange(taskId, status);
    }
    setDraggedTaskId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {TASK_COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.id);
        const columnTotalValue = columnTasks.reduce(
          (sum, t) => sum + (Number(t.value) || 0),
          0
        );
        const isDragOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={(e) => handleDragLeave(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
            className={`flex flex-col rounded-lg border bg-slate-100/60 p-3 min-h-[520px] transition-colors ${
              isDragOver
                ? 'border-slate-800 bg-slate-200/70 ring-2 ring-slate-800/10'
                : 'border-slate-200'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3 px-1">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${column.badgeDot}`} />
                  <h3 className="text-sm font-semibold text-slate-900">
                    {column.title}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    ({columnTasks.length})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                  {formatBRL(columnTotalValue)}
                </div>
              </div>

              <button
                onClick={() => onAddTaskWithStatus(column.id)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                title={`Adicionar tarefa em ${column.title}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Column Body / Cards List */}
            <div className="flex-1 flex flex-col gap-3">
              {columnTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-slate-300 rounded bg-white/40">
                  <Inbox className="w-6 h-6 text-slate-300 mb-2" />
                  <p className="text-xs font-medium text-slate-600 mb-1">
                    Nenhuma tarefa em {column.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Arraste um card para cá ou crie uma nova tarefa.
                  </p>
                  <button
                    onClick={() => onAddTaskWithStatus(column.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar tarefa</span>
                  </button>
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onSelect={onSelectTask}
                    onStatusChange={onStatusChange}
                    onDragStart={handleDragStart}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
