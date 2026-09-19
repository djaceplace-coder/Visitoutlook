import { supabase, isSupabaseConfigured } from './supabase';
import { Task, TaskListId, TaskStep } from '../types/tasks';

export const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    listId: 'my-day',
    title: 'Review weekly performance metrics and container SLA',
    completed: false,
    important: true,
    dueDate: new Date().toISOString().split('T')[0],
    category: 'Work',
    notes: 'Verify CPU throttling and cloud egress latency in dashboard.',
    steps: [
      { id: 's1', title: 'Export Cloud Run logs', completed: true },
      { id: 's2', title: 'Check percentile p99 response times', completed: false }
    ],
    createdAt: Date.now() - 3600000
  },
  {
    id: '2',
    listId: 'my-day',
    title: 'Design review with Sarah Jenkins for navigation ribbons',
    completed: true,
    important: false,
    dueDate: new Date().toISOString().split('T')[0],
    category: 'Work',
    createdAt: Date.now() - 7200000
  },
  {
    id: '3',
    listId: 'tasks',
    title: 'Review and merge dependabot security pull requests',
    completed: false,
    important: true,
    dueDate: '2026-09-18',
    category: 'Work',
    createdAt: Date.now() - 86400000
  }
];

export function mapSupabaseToTask(row: any): Task {
  let listId: TaskListId = 'tasks';
  if (row.in_my_day) listId = 'my-day';
  else if (row.priority === 'urgent' || row.priority === 'important') listId = 'important';
  else if (row.due_at) listId = 'planned';

  return {
    id: row.id,
    listId: listId,
    title: row.title || 'Untitled Task',
    completed: row.is_completed || false,
    important: row.priority === 'urgent' || row.priority === 'important',
    dueDate: row.due_at ? row.due_at.split('T')[0] : undefined,
    notes: row.notes || undefined,
    category: 'Work',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export async function fetchTasks(): Promise<Task[]> {
  if (!isSupabaseConfigured || !supabase) return INITIAL_TASKS;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return INITIAL_TASKS;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      // Auto-seed initial tasks for user
      const seedRows = INITIAL_TASKS.map(t => ({
        user_id: session.user.id,
        title: t.title,
        notes: t.notes || null,
        due_at: t.dueDate ? new Date(t.dueDate).toISOString() : null,
        priority: t.important ? 'urgent' : 'none',
        is_completed: t.completed,
        in_my_day: t.listId === 'my-day',
        show_on_calendar: false,
      }));

      await supabase.from('tasks').insert(seedRows);
      return INITIAL_TASKS;
    }

    return data.map(mapSupabaseToTask);
  } catch {
    return INITIAL_TASKS;
  }
}

export async function insertTask(task: Task): Promise<Task | null> {
  if (!isSupabaseConfigured || !supabase) return task;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return task;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: session.user.id,
        title: task.title,
        notes: task.notes || null,
        due_at: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        priority: task.important ? 'urgent' : 'none',
        is_completed: task.completed,
        in_my_day: task.listId === 'my-day',
        show_on_calendar: false,
      })
      .select()
      .single();

    if (error || !data) return task;
    return mapSupabaseToTask(data);
  } catch {
    return task;
  }
}

export async function updateTask(id: string, updates: Partial<{ completed: boolean; important: boolean; title: string; notes: string; dueDate?: string }>): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  try {
    const dbPayload: Record<string, any> = {};
    if (updates.completed !== undefined) dbPayload.is_completed = updates.completed;
    if (updates.important !== undefined) dbPayload.priority = updates.important ? 'urgent' : 'none';
    if (updates.title !== undefined) dbPayload.title = updates.title;
    if (updates.notes !== undefined) dbPayload.notes = updates.notes;
    if (updates.dueDate !== undefined) dbPayload.due_at = updates.dueDate ? new Date(updates.dueDate).toISOString() : null;

    const { error } = await supabase
      .from('tasks')
      .update(dbPayload)
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}
