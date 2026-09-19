import { supabase, isSupabaseConfigured } from './supabase';
import { EmailMessage, FolderItem } from '../types/mail';
import { INITIAL_FOLDERS, INITIAL_MESSAGES } from '../data/initialMailData';

export interface SupabaseFolderRow {
  id: string;
  user_id: string;
  name: string;
  parent_id?: string | null;
  created_at?: string;
}

export interface SupabaseMessageRow {
  id: string;
  user_id: string;
  folder_id: string | null;
  thread_id?: string | null;
  sender: string;
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  subject: string | null;
  body: string | null;
  is_read: boolean;
  is_flagged: boolean;
  is_focused: boolean;
  has_attachments: boolean;
  created_at: string;
}

// Convert Supabase Message Row to Application EmailMessage
export function mapSupabaseToEmailMessage(row: SupabaseMessageRow): EmailMessage {
  const senderMatch = row.sender.match(/^(.*?)\s*<(.+)>$/);
  const senderName = senderMatch ? senderMatch[1].trim() : (row.sender.split('@')[0] || 'Unknown');
  const senderEmail = senderMatch ? senderMatch[2].trim() : row.sender;

  return {
    id: row.id,
    threadId: row.thread_id || row.id,
    folder: row.folder_id || 'inbox',
    tab: row.is_focused ? 'focused' : 'other',
    from: {
      name: senderName,
      email: senderEmail,
    },
    to: (row.recipients || []).map(r => ({ name: r.split('@')[0], email: r })),
    cc: (row.cc || []).map(r => ({ name: r.split('@')[0], email: r })),
    bcc: (row.bcc || []).map(r => ({ name: r.split('@')[0], email: r })),
    subject: row.subject || '(No subject)',
    preview: row.body ? row.body.slice(0, 90).replace(/\n/g, ' ') : '',
    body: row.body || '',
    date: row.created_at ? new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today',
    timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    read: row.is_read,
    flagged: row.is_flagged,
    hasAttachments: row.has_attachments,
  };
}

/**
 * Fetch Mail folders for current user. If Supabase is unconfigured or empty, fallback gracefully.
 */
export async function fetchMailFolders(): Promise<FolderItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    return INITIAL_FOLDERS;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return INITIAL_FOLDERS;

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return INITIAL_FOLDERS;
    }

    // Merge system folders with user-created folders
    const userFolders: FolderItem[] = data.map((f: SupabaseFolderRow) => ({
      id: f.id,
      name: f.name,
      unreadCount: 0,
      parentId: f.parent_id || null,
    }));

    return [...INITIAL_FOLDERS, ...userFolders];
  } catch {
    return INITIAL_FOLDERS;
  }
}

/**
 * Fetch Mail messages for current user
 */
export async function fetchMailMessages(): Promise<EmailMessage[]> {
  if (!isSupabaseConfigured || !supabase) {
    return INITIAL_MESSAGES;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return INITIAL_MESSAGES;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return INITIAL_MESSAGES;
    }

    if (data.length === 0) {
      // Seed default welcome messages for new users into Supabase
      const seedItems = INITIAL_MESSAGES.map(m => ({
        user_id: session.user.id,
        folder_id: m.folder,
        thread_id: m.threadId,
        sender: `${m.from.name} <${m.from.email}>`,
        recipients: m.to.map(t => t.email),
        subject: m.subject,
        body: m.body,
        is_read: m.read,
        is_flagged: m.flagged,
        is_focused: m.tab === 'focused',
        has_attachments: Boolean(m.hasAttachments),
      }));

      await supabase.from('messages').insert(seedItems);
      return INITIAL_MESSAGES;
    }

    return data.map(mapSupabaseToEmailMessage);
  } catch {
    return INITIAL_MESSAGES;
  }
}

/**
 * Insert a new message (e.g. Sent message or reply)
 */
export async function insertMailMessage(msg: {
  folder_id?: string;
  folder?: string;
  sender?: string;
  from?: { name?: string; email: string };
  recipients?: string[];
  to?: Array<{ name?: string; email: string }>;
  subject: string;
  body: string;
  has_attachments?: boolean;
  hasAttachments?: boolean;
}): Promise<EmailMessage | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const senderEmail = msg.sender || msg.from?.email || session.user.email || 'alex.bennett@outlook.com';
    const recipientEmails = msg.recipients || msg.to?.map(r => r.email) || [];
    const folderId = msg.folder_id || msg.folder || 'sent';

    const { data, error } = await supabase
      .from('messages')
      .insert({
        user_id: session.user.id,
        folder_id: folderId,
        sender: senderEmail,
        recipients: recipientEmails,
        subject: msg.subject,
        body: msg.body,
        is_read: true,
        is_flagged: false,
        is_focused: true,
        has_attachments: msg.has_attachments ?? msg.hasAttachments ?? false,
      })
      .select()
      .single();

    if (error || !data) return null;
    return mapSupabaseToEmailMessage(data);
  } catch {
    return null;
  }
}

/**
 * Update message fields (read, flagged, folder_id, etc.)
 */
export async function updateMailMessages(
  ids: string[], 
  updates: Partial<{ 
    is_read: boolean; 
    read: boolean;
    is_flagged: boolean; 
    flagged: boolean;
    pinned: boolean;
    folder_id: string;
    folder: string;
  }>
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || ids.length === 0) return false;

  try {
    const dbPayload: Record<string, any> = {};
    if (updates.is_read !== undefined) dbPayload.is_read = updates.is_read;
    if (updates.read !== undefined) dbPayload.is_read = updates.read;
    if (updates.is_flagged !== undefined) dbPayload.is_flagged = updates.is_flagged;
    if (updates.flagged !== undefined) dbPayload.is_flagged = updates.flagged;
    if (updates.folder_id !== undefined) dbPayload.folder_id = updates.folder_id;
    if (updates.folder !== undefined) dbPayload.folder_id = updates.folder;

    if (Object.keys(dbPayload).length === 0) return true;

    const { error } = await supabase
      .from('messages')
      .update(dbPayload)
      .in('id', ids);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Delete message(s) permanently
 */
export async function deleteMailMessagesPermanently(ids: string[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || ids.length === 0) return false;

  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .in('id', ids);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Create user custom folder in Supabase
 */
export async function insertUserFolder(name: string, parentId?: string | null): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await supabase
      .from('folders')
      .insert({
        user_id: session.user.id,
        name,
        parent_id: parentId || null,
      })
      .select('id')
      .single();

    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
}
