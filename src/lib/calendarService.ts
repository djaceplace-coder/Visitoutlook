import { supabase, isSupabaseConfigured } from './supabase';
import { CalendarEvent } from '../types/calendar';

export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: 'Executive Design Review: Fluent Web Overhaul',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:30',
    location: 'Conference Room 4B / Microsoft Teams',
    isTeamsMeeting: true,
    attendees: ['sarah.jenkins@acmecorp.com', 'david.chen@acmecorp.com'],
    category: 'Blue',
    notes: 'Presenting the high-contrast light shell and unified ribbon controls.'
  },
  {
    id: '2',
    title: '1:1 Sync with Sarah Jenkins',
    date: new Date().toISOString().split('T')[0],
    startTime: '13:00',
    endTime: '14:00',
    location: 'Cafe Terra & Teams',
    isTeamsMeeting: true,
    attendees: ['sarah.jenkins@acmecorp.com'],
    category: 'Green',
    notes: 'Catch up on typography scale decisions and spacing tokens.'
  },
  {
    id: '3',
    title: 'Cloud Run SLA & Egress Review',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    startTime: '14:30',
    endTime: '15:30',
    location: 'Executive Suite 8A',
    isTeamsMeeting: false,
    attendees: ['david.chen@acmecorp.com', 'marcus.v@acmecorp.com'],
    category: 'Purple',
    notes: 'Deep dive into container cold-start times and cache hit ratio.'
  }
];

export function mapSupabaseToCalendarEvent(row: any): CalendarEvent {
  const startDate = row.start_at ? new Date(row.start_at) : new Date();
  const endDate = row.end_at ? new Date(row.end_at) : new Date();

  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
  const startTime = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
  const endTime = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;

  return {
    id: row.id,
    title: row.title || 'Untitled Event',
    date: dateStr,
    startTime: startTime,
    endTime: endTime,
    location: row.location || undefined,
    isTeamsMeeting: row.location?.includes('Teams') || false,
    attendees: Array.isArray(row.attendees) ? row.attendees : [],
    category: (row.status === 'busy' ? 'Blue' : 'Green') as any,
    allDay: row.is_all_day || false,
    notes: row.description || '',
  };
}

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  if (!isSupabaseConfigured || !supabase) return INITIAL_CALENDAR_EVENTS;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return INITIAL_CALENDAR_EVENTS;

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', session.user.id)
      .order('start_at', { ascending: true });

    if (error || !data || data.length === 0) {
      // Auto-seed for this user
      const seedRows = INITIAL_CALENDAR_EVENTS.map(ev => {
        const start = new Date(`${ev.date}T${ev.startTime}:00`);
        const end = new Date(`${ev.date}T${ev.endTime}:00`);
        return {
          user_id: session.user.id,
          title: ev.title,
          description: ev.notes,
          location: ev.location || (ev.isTeamsMeeting ? 'Microsoft Teams' : ''),
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          is_all_day: ev.allDay || false,
          status: 'busy'
        };
      });

      await supabase.from('events').insert(seedRows);
      return INITIAL_CALENDAR_EVENTS;
    }

    return data.map(mapSupabaseToCalendarEvent);
  } catch {
    return INITIAL_CALENDAR_EVENTS;
  }
}

export async function insertCalendarEvent(event: CalendarEvent): Promise<CalendarEvent | null> {
  if (!isSupabaseConfigured || !supabase) return event;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return event;

    const start = new Date(`${event.date}T${event.startTime}:00`);
    const end = new Date(`${event.date}T${event.endTime}:00`);

    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id: session.user.id,
        title: event.title,
        description: event.notes,
        location: event.location || (event.isTeamsMeeting ? 'Microsoft Teams' : ''),
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        is_all_day: event.allDay || false,
        status: 'busy'
      })
      .select()
      .single();

    if (error || !data) return event;
    return mapSupabaseToCalendarEvent(data);
  } catch {
    return event;
  }
}

export async function updateCalendarEvent(event: CalendarEvent): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  try {
    const start = new Date(`${event.date}T${event.startTime}:00`);
    const end = new Date(`${event.date}T${event.endTime}:00`);

    const { error } = await supabase
      .from('events')
      .update({
        title: event.title,
        description: event.notes,
        location: event.location || '',
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        is_all_day: event.allDay || false,
      })
      .eq('id', event.id);

    return !error;
  } catch {
    return false;
  }
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}
