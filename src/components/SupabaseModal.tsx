import React, { useState } from 'react';
import {
  X,
  Database,
  Key,
  ShieldCheck,
  Check,
  Copy,
  Terminal,
  LogIn,
  LogOut,
  UserPlus,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  UploadCloud,
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  getSupabaseClient,
  getLocalTasks,
  syncLocalTasksToSupabase,
  SUPABASE_SQL_SCHEMA,
} from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAuthChange: () => void;
  onConfigSaved: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthChange,
  onConfigSaved,
}) => {
  const currentConfig = getStoredSupabaseConfig();
  const [activeTab, setActiveTab] = useState<'config' | 'auth' | 'sql'>('config');

  // Config tab state
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tableStatus?: string } | null>(null);

  // Sync / Migration state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ message: string; success: boolean } | null>(null);
  const localTasks = getLocalTasks();

  // Auth tab state
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // SQL tab state
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(url, anonKey);
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    saveSupabaseConfig(url, anonKey);
    onConfigSaved();
    setTestResult({
      success: true,
      message: 'Configurações do Supabase salvas com sucesso!',
    });
  };

  const handleClearConfig = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    onConfigSaved();
  };

  const handleSyncLocalTasks = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncLocalTasksToSupabase(currentUser);
      if (res.error) {
        setSyncResult({ success: false, message: `Erro ao sincronizar: ${res.error}` });
      } else {
        setSyncResult({ success: true, message: `Sucesso! ${res.syncedCount} tarefa(s) foram migradas para a tabela 'tasks' do Supabase.` });
        onConfigSaved();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);
    setAuthLoading(true);

    const client = getSupabaseClient();
    if (!client) {
      setAuthError('Configure primeiro a URL e a Chave do Supabase na aba "Conexão".');
      setAuthLoading(false);
      return;
    }

    try {
      if (authMode === 'signin') {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setAuthSuccessMsg('Login realizado com sucesso! Suas tarefas agora serão sincronizadas com seu usuário.');
        onAuthChange();
      } else {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.session) {
          setAuthSuccessMsg('Conta criada e logada com sucesso!');
          onAuthChange();
        } else {
          setAuthSuccessMsg('Conta criada! Se a confirmação de e-mail estiver ativada no seu Supabase, verifique sua caixa de entrada.');
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Falha ao autenticar.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
      onAuthChange();
      setAuthSuccessMsg('Desconectado com sucesso.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center">
              <Database className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Integração com Supabase
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 gap-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Conexão & Credenciais
          </button>
          <button
            onClick={() => setActiveTab('auth')}
            className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'auth'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Autenticação {currentUser && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'sql'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Script SQL (Tabela & RLS)
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Config */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 leading-relaxed">
                Insira as credenciais do seu projeto Supabase encontradas em <strong>Project Settings &gt; API</strong> no painel do Supabase. Os dados persistirão diretamente no seu banco de dados PostgreSQL.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project URL (URL do Projeto)
                </label>
                <div className="relative">
                  <Database className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Anon / Public API Key (Chave Anônima)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded border text-xs flex items-start gap-2 ${
                    testResult.success
                      ? testResult.tableStatus === 'missing'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testResult.success && testResult.tableStatus !== 'missing' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Local Tasks Migration Section */}
              {localTasks.length > 0 && currentConfig.isConfigured && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-blue-900 block">
                        Tarefas Salvas no Navegador ({localTasks.length})
                      </span>
                      <span className="text-[11px] text-blue-700">
                        Você possui tarefas criadas antes da conexão com o banco. Deseja enviá-las agora para a tabela tasks do Supabase?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSyncLocalTasks}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-xs transition-colors shrink-0 shadow-xs disabled:opacity-50"
                    >
                      <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                      <span>{isSyncing ? 'Migrando...' : 'Migrar para o Banco'}</span>
                    </button>
                  </div>
                  {syncResult && (
                    <div className={`p-2 rounded text-xs ${syncResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {syncResult.message}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClearConfig}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                >
                  Limpar credenciais
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !url || !anonKey}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                  >
                    Salvar Conexão
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Auth */}
          {activeTab === 'auth' && (
            <div className="space-y-4">
              {currentUser ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-emerald-900 block">
                        Usuário Autenticado
                      </span>
                      <span className="text-sm font-medium text-emerald-800">
                        {currentUser.email}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded text-[11px] font-mono">
                      UID: {currentUser.id.slice(0, 8)}...
                    </span>
                  </div>

                  <p className="text-xs text-emerald-700">
                    Todas as consultas ao banco de dados agora são autenticadas via RLS (Row Level Security). Novas tarefas criadas serão vinculadas exclusivamente à sua conta.
                  </p>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className={`pb-2 text-xs font-medium border-b-2 mr-4 ${
                        authMode === 'signin'
                          ? 'border-slate-900 text-slate-900 font-semibold'
                          : 'border-transparent text-slate-500'
                      }`}
                    >
                      Entrar com E-mail
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className={`pb-2 text-xs font-medium border-b-2 ${
                        authMode === 'signup'
                          ? 'border-slate-900 text-slate-900 font-semibold'
                          : 'border-transparent text-slate-500'
                      }`}
                    >
                      Criar Nova Conta no Supabase
                    </button>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Senha
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                      />
                    </div>

                    {authError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded">
                        {authError}
                      </div>
                    )}

                    {authSuccessMsg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded">
                        {authSuccessMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                    >
                      {authLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processando...</span>
                        </>
                      ) : authMode === 'signin' ? (
                        <>
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Entrar no CRM</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Criar Conta</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SQL Script */}
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Script SQL: Tabela, RLS e Políticas de Armazenamento (Storage)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Inclui bucket <code>crm-attachments</code> e políticas de segurança RLS para banco e arquivos.
                  </span>
                </div>
                <button
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-3 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block">Como aplicar no painel do Supabase:</span>
                <div>1. Acesse o console do seu projeto no Supabase (<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">dashboard <ExternalLink className="w-2.5 h-2.5" /></a>).</div>
                <div>2. No menu lateral esquerdo, clique no ícone <strong>SQL Editor</strong>.</div>
                <div>3. Clique em <strong>New Query</strong>, cole todo o código SQL acima e clique em <strong>Run</strong> (Executar).</div>
                <div>4. O script criará automaticamente a tabela <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px]">public.tasks</code> com RLS e o bucket de armazenamento <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px]">crm-attachments</code> na tabela <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px]">storage.objects</code> com todas as 4 políticas de segurança para cada usuário autenticado.</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
