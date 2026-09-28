// Google Calendar API v3 Service for Casa da Lala
// Supports listing (across primary & visible calendars), creating, updating, and deleting events
// with full native Google Calendar fields (all-day, start/end time, recurrence, location, description, reminders).

import { getAccessToken } from './googleDriveSync';

export type CategoriaCalendarioApp =
  | 'uerj'
  | 'trabalho'
  | 'pets'
  | 'financas'
  | 'saude'
  | 'pessoal';

export type RecorrenciaGoogleCalendar =
  | 'nenhuma'
  | 'diaria'
  | 'semanal'
  | 'mensal';

export interface GoogleCalendarEventRaw {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  recurrence?: string[];
  htmlLink?: string;
  hangoutLink?: string;
  status?: string;
  colorId?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export interface GoogleCalendarEventMapped {
  gcalId: string;
  calendarId?: string;
  titulo: string;
  descricao: string;
  local: string;
  ano: number;
  mes: number; // 1..12
  diaMes: number; // 1..31
  horaInicio: string; // "HH:MM"
  horaFim: string; // "HH:MM"
  duracaoMin: number;
  diaInteiro: boolean;
  categoriaDetectada: CategoriaCalendarioApp;
  htmlLink?: string;
  hangoutLink?: string;
  origemApp?: boolean;
  colorId?: string;
}

export function detectarCategoriaPorTexto(
  titulo: string,
  descricao = '',
  local = '',
  extCat?: string
): CategoriaCalendarioApp {
  if (
    extCat &&
    ['uerj', 'trabalho', 'pets', 'financas', 'saude', 'pessoal'].includes(extCat)
  ) {
    return extCat as CategoriaCalendarioApp;
  }

  const lower = `${titulo} ${descricao} ${local}`.toLowerCase();

  if (
    lower.includes('uerj') ||
    lower.includes('aula') ||
    lower.includes('prova') ||
    lower.includes('fisiologia') ||
    lower.includes('biomecânica') ||
    lower.includes('biomecanica') ||
    lower.includes('faculdade') ||
    lower.includes('estudo') ||
    lower.includes('artigo') ||
    lower.includes('acadêmic')
  ) {
    return 'uerj';
  }

  if (
    lower.includes('cdt') ||
    lower.includes('rcr') ||
    lower.includes('reunião') ||
    lower.includes('reuniao') ||
    lower.includes('trabalho') ||
    lower.includes('relatório') ||
    lower.includes('projeto') ||
    lower.includes('bolsa')
  ) {
    return 'trabalho';
  }

  if (
    lower.includes('nina') ||
    lower.includes('tobias') ||
    lower.includes('pet') ||
    lower.includes('gato') ||
    lower.includes('veterin') ||
    lower.includes('vacina') ||
    lower.includes('sachê') ||
    lower.includes('ração')
  ) {
    return 'pets';
  }

  if (
    lower.includes('fatura') ||
    lower.includes('pagar') ||
    lower.includes('vencimento') ||
    lower.includes('boleto') ||
    lower.includes('nubank') ||
    lower.includes('itaú') ||
    lower.includes('pix') ||
    lower.includes('aluguel') ||
    lower.includes('finanç')
  ) {
    return 'financas';
  }

  if (
    lower.includes('treino') ||
    lower.includes('cheer') ||
    lower.includes('academia') ||
    lower.includes('musculação') ||
    lower.includes('ginástica') ||
    lower.includes('médico') ||
    lower.includes('dentista') ||
    lower.includes('terapia') ||
    lower.includes('nutri') ||
    lower.includes('dieta')
  ) {
    return 'saude';
  }

  return 'pessoal';
}

export function mapearEventoGoogle(
  ev: GoogleCalendarEventRaw,
  calendarId = 'primary'
): GoogleCalendarEventMapped | null {
  if (ev.status === 'cancelled') return null;

  const rawStart = ev.start?.dateTime || ev.start?.date;
  if (!rawStart) return null;

  const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime);
  const now = new Date();
  let ano = now.getFullYear();
  let mes = now.getMonth() + 1;
  let diaMes = now.getDate();
  let horaInicio = '09:00';
  let horaFim = '10:00';
  let duracaoMin = 60;

  if (isAllDay && ev.start?.date) {
    const [y, m, d] = ev.start.date.split('-').map(Number);
    ano = y || ano;
    mes = m || mes;
    diaMes = d || 1;
    horaInicio = '08:00';
    horaFim = '23:59';
    duracaoMin = 60;
  } else {
    const dtStart = new Date(rawStart);
    if (!isNaN(dtStart.getTime())) {
      ano = dtStart.getFullYear();
      mes = dtStart.getMonth() + 1;
      diaMes = dtStart.getDate();
      const hh = String(dtStart.getHours()).padStart(2, '0');
      const mm = String(dtStart.getMinutes()).padStart(2, '0');
      horaInicio = `${hh}:${mm}`;
    }

    const rawEnd = ev.end?.dateTime;
    if (rawEnd) {
      const dtEnd = new Date(rawEnd);
      if (!isNaN(dtEnd.getTime()) && !isNaN(dtStart.getTime())) {
        const hhEnd = String(dtEnd.getHours()).padStart(2, '0');
        const mmEnd = String(dtEnd.getMinutes()).padStart(2, '0');
        horaFim = `${hhEnd}:${mmEnd}`;
        const diff = Math.round((dtEnd.getTime() - dtStart.getTime()) / 60000);
        duracaoMin = Math.max(5, Math.min(1440, diff || 60));
      }
    }
  }

  const titulo = ev.summary || '(Sem título)';
  const descricao = ev.description || '';
  const local = ev.location || '';
  const extCat = ev.extendedProperties?.private?.lalaCategory;

  return {
    gcalId: ev.id,
    calendarId,
    titulo,
    descricao,
    local,
    ano,
    mes,
    diaMes,
    horaInicio,
    horaFim,
    duracaoMin,
    diaInteiro: isAllDay,
    categoriaDetectada: detectarCategoriaPorTexto(
      titulo,
      descricao,
      local,
      extCat
    ),
    htmlLink: ev.htmlLink,
    hangoutLink: ev.hangoutLink,
    origemApp: ev.extendedProperties?.private?.createdBy === 'casa_da_lala',
    colorId: ev.colorId,
  };
}

// Lists events for a given month (plus adjacent days so week view across month boundaries works seamlessly)
export async function listarEventosGoogleCalendarMes(
  ano: number,
  mes: number // 1..12
): Promise<GoogleCalendarEventMapped[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  // Query from 7 days before the 1st of the month to 7 days after the end of the month
  const startWindow = new Date(ano, mes - 1, -6, 0, 0, 0);
  const endWindow = new Date(ano, mes, 7, 23, 59, 59);

  const params = new URLSearchParams({
    timeMin: startWindow.toISOString(),
    timeMax: endWindow.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '500',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    let detail = '';
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || '';
    } catch {
      // ignore
    }
    if (
      detail.toLowerCase().includes('insufficient authentication scopes') ||
      detail.toLowerCase().includes('scope')
    ) {
      throw new Error('SCOPE_REQUIRED');
    }
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erro ao carregar Google Agenda: ${txt}`);
  }

  const data = (await res.json()) as { items?: GoogleCalendarEventRaw[] };
  const items = data.items || [];
  return items
    .map((item) => mapearEventoGoogle(item, 'primary'))
    .filter((x): x is GoogleCalendarEventMapped => x !== null);
}

export interface NovoEventoGoogleInput {
  titulo: string;
  descricao?: string;
  local?: string;
  ano: number;
  mes: number; // 1..12
  diaMes: number; // 1..31
  horaInicio: string; // "HH:MM"
  horaFim?: string; // "HH:MM"
  duracaoMin: number;
  diaInteiro?: boolean;
  recorrencia?: RecorrenciaGoogleCalendar;
  lembreteMin?: number;
  categoria: CategoriaCalendarioApp;
}

function buildGoogleEventBody(input: NovoEventoGoogleInput) {
  const timeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

  let startObj: { date?: string; dateTime?: string; timeZone?: string };
  let endObj: { date?: string; dateTime?: string; timeZone?: string };

  if (input.diaInteiro) {
    const startStr = `${input.ano}-${String(input.mes).padStart(
      2,
      '0'
    )}-${String(input.diaMes).padStart(2, '0')}`;
    const nextDay = new Date(input.ano, input.mes - 1, input.diaMes + 1);
    const endStr = `${nextDay.getFullYear()}-${String(
      nextDay.getMonth() + 1
    ).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
    startObj = { date: startStr };
    endObj = { date: endStr };
  } else {
    const [hh, mm] = (input.horaInicio || '09:00').split(':').map(Number);
    const startDt = new Date(
      input.ano,
      input.mes - 1,
      input.diaMes,
      hh ?? 9,
      mm ?? 0,
      0
    );
    let endDt: Date;
    if (input.horaFim) {
      const [eh, em] = input.horaFim.split(':').map(Number);
      endDt = new Date(
        input.ano,
        input.mes - 1,
        input.diaMes,
        eh ?? (hh ?? 9) + 1,
        em ?? 0,
        0
      );
      if (endDt <= startDt) {
        endDt = new Date(startDt.getTime() + (input.duracaoMin || 60) * 60000);
      }
    } else {
      endDt = new Date(startDt.getTime() + (input.duracaoMin || 60) * 60000);
    }
    startObj = { dateTime: startDt.toISOString(), timeZone };
    endObj = { dateTime: endDt.toISOString(), timeZone };
  }

  const recurrence: string[] = [];
  if (input.recorrencia === 'diaria') {
    recurrence.push('RRULE:FREQ=DAILY');
  } else if (input.recorrencia === 'semanal') {
    recurrence.push('RRULE:FREQ=WEEKLY');
  } else if (input.recorrencia === 'mensal') {
    recurrence.push('RRULE:FREQ=MONTHLY');
  }

  const body: Record<string, unknown> = {
    summary: input.titulo,
    description: input.descricao || '',
    location: input.local || '',
    start: startObj,
    end: endObj,
    extendedProperties: {
      private: {
        createdBy: 'casa_da_lala',
        lalaCategory: input.categoria,
      },
    },
  };

  if (recurrence.length > 0) {
    body.recurrence = recurrence;
  }

  if (typeof input.lembreteMin === 'number' && input.lembreteMin >= 0) {
    body.reminders = {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: input.lembreteMin }],
    };
  }

  return body;
}

export async function criarEventoGoogleCalendar(
  input: NovoEventoGoogleInput
): Promise<GoogleCalendarEventMapped> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const body = buildGoogleEventBody(input);

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erro ao criar evento no Google Agenda: ${txt}`);
  }

  const created = (await res.json()) as GoogleCalendarEventRaw;
  const mapped = mapearEventoGoogle(created);
  if (!mapped) {
    throw new Error('Evento criado, mas não foi possível mapear o retorno.');
  }
  return mapped;
}

export async function atualizarEventoGoogleCalendar(
  gcalId: string,
  input: NovoEventoGoogleInput
): Promise<GoogleCalendarEventMapped> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const body = buildGoogleEventBody(input);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      gcalId
    )}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erro ao atualizar evento no Google Agenda: ${txt}`);
  }

  const updated = (await res.json()) as GoogleCalendarEventRaw;
  const mapped = mapearEventoGoogle(updated);
  if (!mapped) {
    throw new Error('Erro ao mapear evento atualizado.');
  }
  return mapped;
}

export async function excluirEventoGoogleCalendar(
  gcalId: string
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      gcalId
    )}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const txt = await res.text();
    throw new Error(`Erro ao excluir evento no Google Agenda: ${txt}`);
  }
}
