import { supabase, isSupabaseConfigured } from './supabase';
import { Contact } from '../types/contacts';
import { INITIAL_CONTACTS } from '../data/initialContactsData';

export function mapSupabaseToContact(row: any): Contact {
  const parts = (row.name || '').split(' ');
  const firstName = row.first_name || parts[0] || 'Unknown';
  const lastName = row.last_name || parts.slice(1).join(' ') || '';

  return {
    id: row.id,
    firstName: firstName,
    lastName: lastName,
    email: row.email || '',
    jobTitle: row.job_title || 'Colleague',
    department: row.department || 'General',
    company: row.company || 'Enterprise',
    phone: row.phone || '',
    mobile: row.mobile || '',
    officeLocation: row.office_location || '',
    notes: row.notes || '',
    avatarColor: row.avatar_color || '#0078D4',
    isFavorite: row.is_favourite || false,
    category: row.category || 'Work'
  };
}

export async function fetchContacts(): Promise<Contact[]> {
  if (!isSupabaseConfigured || !supabase) return INITIAL_CONTACTS;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return INITIAL_CONTACTS;

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      // Auto-seed for this user
      const seedRows = INITIAL_CONTACTS.map(c => ({
        user_id: session.user.id,
        name: `${c.firstName} ${c.lastName}`.trim(),
        first_name: c.firstName,
        last_name: c.lastName,
        email: c.email,
        phone: c.phone,
        mobile: c.mobile || null,
        job_title: c.jobTitle,
        department: c.department,
        company: c.company,
        office_location: c.officeLocation || null,
        notes: c.notes || null,
        avatar_color: c.avatarColor || '#0078D4',
        category: c.category || 'Work',
        is_favourite: c.isFavorite || false
      }));

      await supabase.from('contacts').insert(seedRows);
      return INITIAL_CONTACTS;
    }

    return data.map(mapSupabaseToContact);
  } catch {
    return INITIAL_CONTACTS;
  }
}

export async function insertContact(contact: Contact): Promise<Contact | null> {
  if (!isSupabaseConfigured || !supabase) return contact;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return contact;

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: session.user.id,
        name: `${contact.firstName} ${contact.lastName}`.trim(),
        first_name: contact.firstName,
        last_name: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        mobile: contact.mobile || null,
        job_title: contact.jobTitle,
        department: contact.department,
        company: contact.company,
        office_location: contact.officeLocation || null,
        notes: contact.notes || null,
        avatar_color: contact.avatarColor || '#0078D4',
        category: contact.category || 'Work',
        is_favourite: contact.isFavorite || false
      })
      .select()
      .single();

    if (error || !data) return contact;
    return mapSupabaseToContact(data);
  } catch {
    return contact;
  }
}

export async function updateContact(contact: Contact): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  try {
    const { error } = await supabase
      .from('contacts')
      .update({
        name: `${contact.firstName} ${contact.lastName}`.trim(),
        first_name: contact.firstName,
        last_name: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        mobile: contact.mobile || null,
        job_title: contact.jobTitle,
        department: contact.department,
        company: contact.company,
        office_location: contact.officeLocation || null,
        notes: contact.notes || null,
        avatar_color: contact.avatarColor || '#0078D4',
        category: contact.category || 'Work',
        is_favourite: contact.isFavorite || false
      })
      .eq('id', contact.id);

    return !error;
  } catch {
    return false;
  }
}

export async function deleteContact(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  try {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}
