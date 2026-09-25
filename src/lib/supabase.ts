import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Task, SupabaseConfig } from '../types';

const STORAGE_KEY_URL = 'crm_supabase_url';
const STORAGE_KEY_KEY = 'crm_supabase_anon_key';
const STORAGE_KEY_LOCAL_TASKS = 'crm_kanban_tasks_local';

export const SUPABASE_SQL_SCHEMA = `-- Copie e execute este script no SQL Editor do seu projeto Supabase:

-- ================================================================
-- 1. TABELA DE TAREFAS DO CRM (DATABASE)
-- ================================================================
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade, -- Nullable para suportar acesso via Anon Key ou com Login
  title text not null,
  client_name text default '',
  company text default '',
  email text default '',
  phone text default '',
  value numeric default 0,
  priority text check (priority in ('baixa', 'media', 'alta', 'urgente')) default 'media',
  status text check (status in ('nao_iniciado', 'em_andamento', 'finalizado')) default 'nao_iniciado',
  due_date date,
  description text default '',
  notes jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Garantir que user_id seja nullable caso a tabela tenha sido criada com NOT NULL anteriormente
alter table public.tasks alter column user_id drop not null;

-- Habilitação do Row Level Security (RLS) na tabela tasks
alter table public.tasks enable row level security;

-- Limpeza de políticas anteriores para evitar duplicidade
drop policy if exists "Usuários autenticados podem ver suas tarefas" on public.tasks;
drop policy if exists "Usuários autenticados podem criar tarefas" on public.tasks;
drop policy if exists "Usuários autenticados podem atualizar suas tarefas" on public.tasks;
drop policy if exists "Usuários autenticados podem excluir suas tarefas" on public.tasks;
drop policy if exists "Acesso anonimo pode ver tarefas" on public.tasks;
drop policy if exists "Acesso anonimo pode criar tarefas" on public.tasks;
drop policy if exists "Acesso anonimo pode atualizar tarefas" on public.tasks;
drop policy if exists "Acesso anonimo pode excluir tarefas" on public.tasks;

-- Políticas para usuários autenticados (Login com E-mail no Supabase)
create policy "Usuários autenticados podem ver suas tarefas"
  on public.tasks for select
  to authenticated
  using (auth.uid() = user_id or user_id is null);

create policy "Usuários autenticados podem criar tarefas"
  on public.tasks for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

create policy "Usuários autenticados podem atualizar suas tarefas"
  on public.tasks for update
  to authenticated
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

create policy "Usuários autenticados podem excluir suas tarefas"
  on public.tasks for delete
  to authenticated
  using (auth.uid() = user_id or user_id is null);

-- Políticas para acesso anônimo com a Chave Pública (Anon Key)
create policy "Acesso anonimo pode ver tarefas"
  on public.tasks for select
  to anon
  using (true);

create policy "Acesso anonimo pode criar tarefas"
  on public.tasks for insert
  to anon
  with check (true);

create policy "Acesso anonimo pode atualizar tarefas"
  on public.tasks for update
  to anon
  using (true)
  with check (true);

create policy "Acesso anonimo pode excluir tarefas"
  on public.tasks for delete
  to anon
  using (true);

-- Índices de performance
create index if not exists idx_tasks_user_status on public.tasks(user_id, status);
create index if not exists idx_tasks_created_at on public.tasks(created_at desc);

-- ================================================================
-- 2. POLÍTICAS DE ARMAZENAMENTO (SUPABASE STORAGE)
-- ================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crm-attachments',
  'crm-attachments',
  false,
  52428800, -- Limite de 50MB por arquivo
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800;

-- Política 1: Usuários autenticados podem visualizar/baixar apenas seus próprios arquivos
drop policy if exists "Storage: Usuários autenticados podem ler seus arquivos" on storage.objects;
create policy "Storage: Usuários autenticados podem ler seus arquivos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'crm-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política 2: Usuários autenticados podem fazer upload apenas na sua própria pasta
drop policy if exists "Storage: Usuários autenticados podem enviar arquivos" on storage.objects;
create policy "Storage: Usuários autenticados podem enviar arquivos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'crm-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política 3: Usuários autenticados podem atualizar/substituir apenas seus próprios arquivos
drop policy if exists "Storage: Usuários autenticados podem atualizar seus arquivos" on storage.objects;
create policy "Storage: Usuários autenticados podem atualizar seus arquivos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'crm-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'crm-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política 4: Usuários autenticados podem deletar apenas seus próprios arquivos
drop policy if exists "Storage: Usuários autenticados podem excluir seus arquivos" on storage.objects;
create policy "Storage: Usuários autenticados podem excluir seus arquivos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'crm-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
`;

let clientInstance: SupabaseClient | null = null;
let currentConfig: SupabaseConfig = {
  url: '',
  anonKey: '',
  isConfigured: false,
};

// Obter configuração atual (env ou localStorage)
export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  let savedUrl = (localStorage.getItem(STORAGE_KEY_URL) || '').trim();
  let savedKey = (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();

  let url = savedUrl || envUrl;
  let anonKey = savedKey || envKey;

  // Remove trailing slashes
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  const isConfigured = Boolean(
    url &&
    anonKey &&
    (url.startsWith('https://') || url.startsWith('http://')) &&
    anonKey.length > 20
  );

  currentConfig = { url, anonKey, isConfigured };
  return currentConfig;
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  let cleanUrl = url.trim();
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  const cleanKey = anonKey.trim();

  localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
  localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
  clientInstance = null; // reset client instance
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  clientInstance = null;
}

// Obter cliente Supabase
export function getSupabaseClient(): SupabaseClient | null {
  if (clientInstance) return clientInstance;

  const config = getStoredSupabaseConfig();
  if (!config.isConfigured) return null;

  try {
    clientInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return clientInstance;
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

// Testar conexão geral e tabela tasks
export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string; tableStatus?: 'ready' | 'missing' | 'unknown' }> {
  try {
    let testUrl = (url || getStoredSupabaseConfig().url).trim();
    if (testUrl.endsWith('/')) testUrl = testUrl.slice(0, -1);
    const testKey = (anonKey || getStoredSupabaseConfig().anonKey).trim();

    if (!testUrl || !testKey) {
      return { success: false, message: 'URL e Chave Anônima do Supabase são obrigatórias.' };
    }

    const testClient = createClient(testUrl, testKey);
    // 1. Testar auth api
    const { error: sessionError } = await testClient.auth.getSession();
    if (sessionError) {
      return { success: false, message: `Erro ao conectar na API do Supabase: ${sessionError.message}` };
    }

    // 2. Testar acesso à tabela public.tasks
    const { data, error: tableError } = await testClient.from('tasks').select('id').limit(1);

    if (tableError) {
      if (tableError.code === '42P01' || tableError.message.includes('relation "public.tasks" does not exist')) {
        return {
          success: true,
          tableStatus: 'missing',
          message: 'Conexão com Supabase OK! Porém a tabela "tasks" ainda não existe. Execute o script na aba "Script SQL".',
        };
      }
      return {
        success: true,
        tableStatus: 'unknown',
        message: `Conectado ao Supabase, mas a tabela tasks retornou: ${tableError.message}. Verifique o script SQL.`,
      };
    }

    return {
      success: true,
      tableStatus: 'ready',
      message: 'Conexão e tabela "tasks" verificadas com sucesso! O banco está pronto para gravação e leitura.',
    };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Falha ao conectar ao Supabase.' };
  }
}

// Gerenciamento de Tarefas no LocalStorage (fallback de segurança)
export function getLocalTasks(): Task[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_LOCAL_TASKS);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveLocalTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.error('Erro ao salvar tarefas localmente:', err);
  }
}

// Consulta persistente autenticada de tarefas
export async function fetchAuthenticatedTasks(currentUser: User | null): Promise<{ tasks: Task[]; fromSupabase: boolean; error?: string }> {
  const client = getSupabaseClient();
  const config = getStoredSupabaseConfig();

  if (!config.isConfigured || !client) {
    return {
      tasks: getLocalTasks(),
      fromSupabase: false,
      error: 'Supabase não conectado. Insira sua URL e Anon Key para persistir no banco.',
    };
  }

  try {
    let query = client.from('tasks').select('*');

    if (currentUser) {
      query = query.or(`user_id.eq.${currentUser.id},user_id.is.null`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao consultar tabela tasks no Supabase:', error);
      return {
        tasks: getLocalTasks(),
        fromSupabase: false,
        error: `Erro no Supabase: ${error.message}. Execute o script SQL no painel do Supabase.`,
      };
    }

    const tasks: Task[] = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      client_name: row.client_name || '',
      company: row.company || '',
      email: row.email || '',
      phone: row.phone || '',
      value: Number(row.value) || 0,
      priority: row.priority || 'media',
      status: row.status || 'nao_iniciado',
      due_date: row.due_date || '',
      description: row.description || '',
      notes: Array.isArray(row.notes) ? row.notes : [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    // Atualiza cache local
    saveLocalTasks(tasks);
    return { tasks, fromSupabase: true };
  } catch (err: any) {
    return {
      tasks: getLocalTasks(),
      fromSupabase: false,
      error: err.message || 'Falha ao buscar dados no Supabase',
    };
  }
}

// Criar tarefa persistente diretamente no banco de dados
export async function createPersistentTask(
  taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>,
  currentUser: User | null
): Promise<{ task: Task; fromSupabase: boolean; error?: string }> {
  const now = new Date().toISOString();
  const client = getSupabaseClient();
  const config = getStoredSupabaseConfig();

  if (client && config.isConfigured) {
    try {
      const payload: Record<string, any> = {
        title: taskData.title,
        client_name: taskData.client_name || '',
        company: taskData.company || '',
        email: taskData.email || '',
        phone: taskData.phone || '',
        value: Number(taskData.value) || 0,
        priority: taskData.priority || 'media',
        status: taskData.status || 'nao_iniciado',
        due_date: taskData.due_date ? taskData.due_date : null,
        description: taskData.description || '',
        notes: taskData.notes || [],
        created_at: now,
        updated_at: now,
      };

      if (currentUser?.id) {
        payload.user_id = currentUser.id;
      } else {
        payload.user_id = null;
      }

      const { data, error } = await client.from('tasks').insert([payload]).select().single();

      if (error) {
        throw new Error(`Falha no banco Supabase: ${error.message} (Código ${error.code || 'RLS'}). Execute o Script SQL na aba do Supabase.`);
      }

      const newTask: Task = {
        id: data.id,
        user_id: data.user_id,
        title: data.title,
        client_name: data.client_name || '',
        company: data.company || '',
        email: data.email || '',
        phone: data.phone || '',
        value: Number(data.value) || 0,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date || '',
        description: data.description || '',
        notes: Array.isArray(data.notes) ? data.notes : [],
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      const localTasks = getLocalTasks();
      saveLocalTasks([newTask, ...localTasks.filter((t) => t.id !== newTask.id)]);
      return { task: newTask, fromSupabase: true };
    } catch (err: any) {
      console.error('Erro ao inserir tarefa no Supabase:', err);
      // Fallback local para segurança dos dados do usuário
      const fallbackTask: Task = {
        ...taskData,
        id: crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`,
        user_id: currentUser?.id,
        created_at: now,
        updated_at: now,
      };
      const local = [fallbackTask, ...getLocalTasks()];
      saveLocalTasks(local);
      return { task: fallbackTask, fromSupabase: false, error: err.message };
    }
  }

  // Supabase não configurado
  const localTask: Task = {
    ...taskData,
    id: crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`,
    user_id: currentUser ? currentUser.id : undefined,
    created_at: now,
    updated_at: now,
  };
  const local = [localTask, ...getLocalTasks()];
  saveLocalTasks(local);
  return {
    task: localTask,
    fromSupabase: false,
    error: 'Atenção: Supabase NÃO configurado. A tarefa foi salva apenas localmente no navegador.',
  };
}

// Atualizar tarefa persistente
export async function updatePersistentTask(
  taskId: string,
  updates: Partial<Task>,
  currentUser: User | null
): Promise<{ success: boolean; fromSupabase: boolean; error?: string }> {
  const now = new Date().toISOString();
  const client = getSupabaseClient();
  const config = getStoredSupabaseConfig();

  // Atualizar cache local
  const localTasks = getLocalTasks();
  const updatedLocal = localTasks.map((t) => (t.id === taskId ? { ...t, ...updates, updated_at: now } : t));
  saveLocalTasks(updatedLocal);

  if (client && config.isConfigured) {
    try {
      const payload: Record<string, any> = {
        ...updates,
        updated_at: now,
      };
      if (payload.due_date === '') {
        payload.due_date = null;
      }
      delete payload.id; // não altera PK

      let query = client.from('tasks').update(payload).eq('id', taskId);

      const { error } = await query;

      if (error) {
        return { success: true, fromSupabase: false, error: `Supabase: ${error.message}` };
      }

      return { success: true, fromSupabase: true };
    } catch (err: any) {
      return { success: true, fromSupabase: false, error: err.message };
    }
  }

  return { success: true, fromSupabase: false };
}

// Excluir tarefa persistente
export async function deletePersistentTask(
  taskId: string,
  currentUser: User | null
): Promise<{ success: boolean; fromSupabase: boolean; error?: string }> {
  const localTasks = getLocalTasks();
  const updatedLocal = localTasks.filter((t) => t.id !== taskId);
  saveLocalTasks(updatedLocal);

  const client = getSupabaseClient();
  const config = getStoredSupabaseConfig();

  if (client && config.isConfigured) {
    try {
      const { error } = await client.from('tasks').delete().eq('id', taskId);

      if (error) {
        return { success: true, fromSupabase: false, error: error.message };
      }

      return { success: true, fromSupabase: true };
    } catch (err: any) {
      return { success: true, fromSupabase: false, error: err.message };
    }
  }

  return { success: true, fromSupabase: false };
}

// Sincronizar tarefas locais salvas no navegador diretamente para o Supabase
export async function syncLocalTasksToSupabase(currentUser: User | null): Promise<{ syncedCount: number; error?: string }> {
  const client = getSupabaseClient();
  const config = getStoredSupabaseConfig();

  if (!client || !config.isConfigured) {
    return { syncedCount: 0, error: 'Configure primeiro a URL e Chave do Supabase.' };
  }

  const localTasks = getLocalTasks();
  if (localTasks.length === 0) {
    return { syncedCount: 0 };
  }

  let count = 0;
  try {
    for (const t of localTasks) {
      const payload: Record<string, any> = {
        title: t.title,
        client_name: t.client_name || '',
        company: t.company || '',
        email: t.email || '',
        phone: t.phone || '',
        value: Number(t.value) || 0,
        priority: t.priority || 'media',
        status: t.status || 'nao_iniciado',
        due_date: t.due_date ? t.due_date : null,
        description: t.description || '',
        notes: t.notes || [],
        user_id: currentUser ? currentUser.id : null,
      };

      // Se o ID for UUID válido, preserva; se não, deixa o Supabase gerar
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id);
      if (isUuid) {
        payload.id = t.id;
      }

      const { error } = await client.from('tasks').upsert([payload], { onConflict: 'id' });
      if (!error) {
        count++;
      }
    }
    return { syncedCount: count };
  } catch (err: any) {
    return { syncedCount: count, error: err.message };
  }
}

