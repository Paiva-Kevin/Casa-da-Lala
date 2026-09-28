// Google Calendar API v3 Service for Casa da Lala
// Supports listing, creating, updating, and deleting events on the user's primary Google Calendar
// with automatic category detection for Casa da Lala filters and colors.

import { getAccessToken } from './googleDriveSync';

export type CategoriaCalendarioApp =
  | 'uerj'
  | 'trabalho'
  | 'pets'
  | 'financas'
  | 'saude'
  | 'pessoal';

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
  htmlLink?: string;
  status?: string;
  colorId?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export interface GoogleCalendarEventMapped {
  gcalId: string;
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
  origemApp?: boolean;
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
  ev: GoogleCalendarEventRaw
): GoogleCalendarEventMapped | null {
  if (ev.status === 'cancelled') return null;

  const rawStart = ev.start?.dateTime || ev.start?.date;
  if (!rawStart) return null;

  const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime);
  let ano = 2026;
  let mes = 9;
  let diaMes = 27;
  let horaInicio = '09:00';
  let horaFim = '10:00';
  let duracaoMin = 60;

  if (isAllDay && ev.start?.date) {
    const [y, m, d] = ev.start.date.split('-').map(Number);
    ano = y || 2026;
    mes = m || 9;
    diaMes = d || 1;
    horaInicio = '08:00';
    horaFim = '18:00';
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
        duracaoMin = Math.max(15, Math.min(720, diff || 60));
      }
    }
  }

  const titulo = ev.summary || '(Sem título)';
  const descricao = ev.description || '';
  const local = ev.location || '';
  const extCat = ev.extendedProperties?.private?.lalaCategory;

  return {
    gcalId: ev.id,
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
    categoriaDetectada: detectarCategoriaPorTexto(titulo, descricao, local, extCat),
    htmlLink: ev.htmlLink,
    origemApp: ev.extendedProperties?.private?.createdBy === 'casa_da_lala',
  };
}

export async function listarEventosGoogleCalendarMes(
  ano: number,
  mes: number // 1..12
): Promise<GoogleCalendarEventMapped[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const startOfMonth = new Date(ano, mes - 1, 1, 0, 0, 0);
  const endOfMonth = new Date(ano, mes, 0, 23, 59, 59);

  const params = new URLSearchParams({
    timeMin: startOfMonth.toISOString(),
    timeMax: endOfMonth.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
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
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erro ao carregar Google Agenda: ${txt}`);
  }

  const data = (await res.json()) as { items?: GoogleCalendarEventRaw[] };
  const items = data.items || [];
  return items
    .map(mapearEventoGoogle)
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
  duracaoMin: number;
  categoria: CategoriaCalendarioApp;
}

export async function criarEventoGoogleCalendar(
  input: NovoEventoGoogleInput
): Promise<GoogleCalendarEventMapped> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const [hh, mm] = (input.horaInicio || '09:00').split(':').map(Number);
  const startDt = new Date(
    input.ano,
    input.mes - 1,
    input.diaMes,
    hh || 9,
    mm || 0,
    0
  );
  const endDt = new Date(startDt.getTime() + (input.duracaoMin || 60) * 60000);

  const body = {
    summary: input.titulo,
    description:
      input.descricao ||
      `Agendado pelo app Casa da Lala (${input.categoria.toUpperCase()})`,
    location: input.local || '',
    start: {
      dateTime: startDt.toISOString(),
    },
    end: {
      dateTime: endDt.toISOString(),
    },
    extendedProperties: {
      private: {
        createdBy: 'casa_da_lala',
        lalaCategory: input.categoria,
      },
    },
  };

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

  const [hh, mm] = (input.horaInicio || '09:00').split(':').map(Number);
  const startDt = new Date(
    input.ano,
    input.mes - 1,
    input.diaMes,
    hh || 9,
    mm || 0,
    0
  );
  const endDt = new Date(startDt.getTime() + (input.duracaoMin || 60) * 60000);

  const body = {
    summary: input.titulo,
    description: input.descricao || '',
    location: input.local || '',
    start: {
      dateTime: startDt.toISOString(),
    },
    end: {
      dateTime: endDt.toISOString(),
    },
    extendedProperties: {
      private: {
        createdBy: 'casa_da_lala',
        lalaCategory: input.categoria,
      },
    },
  };

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

export async function excluirEventoGoogleCalendar(gcalId: string): Promise<void> {
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
