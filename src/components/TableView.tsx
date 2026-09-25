import React from 'react';
import { Task, TaskStatus, Priority } from '../types';
import { Building, Calendar, DollarSign, Edit, Trash2 } from 'lucide-react';

interface TableViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TableView: React.FC<TableViewProps> = ({
  tasks,
  onSelectTask,
  onStatusChange,
  onDeleteTask,
}) => {
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const priorityLabels: Record<Priority, { label: string; dot: string }> = {
    baixa: { label: 'Baixa', dot: 'bg-slate-400' },
    media: { label: 'Média', dot: 'bg-blue-500' },
    alta: { label: 'Alta', dot: 'bg-amber-500' },
    urgente: { label: 'Urgente', dot: 'bg-rose-500' },
  };

  const statusLabels: Record<TaskStatus, { label: string; dot: string }> = {
    nao_iniciado: { label: 'Não iniciado', dot: 'bg-slate-400' },
    em_andamento: { label: 'Em Andamento', dot: 'bg-blue-500' },
    finalizado: { label: 'Finalizado', dot: 'bg-emerald-500' },
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
        <p className="text-sm font-medium text-slate-700 mb-1">
          Nenhuma tarefa cadastrada
        </p>
        <p className="text-xs text-slate-500">
          Crie tarefas pelo botão "+ Nova Tarefa" para visualizá-las aqui na tabela.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-3 px-4">Tarefa / Oportunidade</th>
              <th className="py-3 px-4">Cliente & Empresa</th>
              <th className="py-3 px-4 text-right">Valor Estimado</th>
              <th className="py-3 px-4">Prioridade</th>
              <th className="py-3 px-4">Status Kanban</th>
              <th className="py-3 px-4">Prazo</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="hover:bg-slate-50/80 cursor-pointer transition-colors"
              >
                {/* Title */}
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900 line-clamp-1">
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-slate-500 line-clamp-1 text-[11px] mt-0.5">
                      {task.description}
                    </div>
                  )}
                </td>

                {/* Client / Company */}
                <td className="py-3 px-4 text-slate-600">
                  <div className="font-medium text-slate-800">
                    {task.client_name || '—'}
                  </div>
                  {task.company && (
                    <div className="text-[11px] text-slate-500">
                      {task.company}
                    </div>
                  )}
                </td>

                {/* Value */}
                <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                  {formatBRL(task.value)}
                </td>

                {/* Priority */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        priorityLabels[task.priority]?.dot || 'bg-slate-400'
                      }`}
                    />
                    <span className="text-slate-700">
                      {priorityLabels[task.priority]?.label || task.priority}
                    </span>
                  </div>
                </td>

                {/* Status Dropdown */}
                <td
                  className="py-3 px-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                    className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="nao_iniciado">Não iniciado</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </td>

                {/* Due Date */}
                <td className="py-3 px-4 text-slate-600 font-mono tabular-nums text-[11px]">
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString('pt-BR')
                    : '—'}
                </td>

                {/* Actions */}
                <td
                  className="py-3 px-4 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => onSelectTask(task)}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
