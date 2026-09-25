import React from 'react';
import { Task } from '../types';

interface MetricsBarProps {
  tasks: Task[];
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ tasks }) => {
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const totalTasks = tasks.length;
  const totalValue = tasks.reduce((sum, t) => sum + (Number(t.value) || 0), 0);

  const notStarted = tasks.filter((t) => t.status === 'nao_iniciado');
  const inProgress = tasks.filter((t) => t.status === 'em_andamento');
  const completed = tasks.filter((t) => t.status === 'finalizado');

  const notStartedVal = notStarted.reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  const inProgressVal = inProgress.reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  const completedVal = completed.reduce((sum, t) => sum + (Number(t.value) || 0), 0);

  const completionRate = totalTasks > 0 ? Math.round((completed.length / totalTasks) * 100) : 0;

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Total Tasks */}
          <div className="pt-2 md:pt-0">
            <span className="text-xs font-medium text-slate-500 block">Total de Tarefas</span>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
                {totalTasks}
              </span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {completionRate}% concluídas
              </span>
            </div>
          </div>

          {/* Não Iniciado */}
          <div className="pt-2 md:pt-0 md:pl-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-xs font-medium text-slate-500">Não iniciado</span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
                {notStarted.length}
              </span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {formatBRL(notStartedVal)}
              </span>
            </div>
          </div>

          {/* Em Andamento */}
          <div className="pt-2 md:pt-0 md:pl-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-slate-500">Em Andamento</span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
                {inProgress.length}
              </span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {formatBRL(inProgressVal)}
              </span>
            </div>
          </div>

          {/* Finalizado */}
          <div className="pt-2 md:pt-0 md:pl-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-500">Finalizado</span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
                {completed.length}
              </span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {formatBRL(completedVal)}
              </span>
            </div>
          </div>

          {/* Pipeline Total */}
          <div className="pt-2 md:pt-0 md:pl-4 col-span-2 md:col-span-1">
            <span className="text-xs font-medium text-slate-500 block">Pipeline Total</span>
            <div className="mt-0.5">
              <span className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
                {formatBRL(totalValue)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
