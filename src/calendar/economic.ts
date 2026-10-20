interface RawEvent {
  event_id: number
  short_name: string
  event_translated: string
  event_cycle_suffix?: string
  importance: string
  currency: string
  country_id: number
  [k: string]: unknown
}

interface RawOccurrence {
  event_id: number
  occurrence_time: string
  precision: number
  previous?: number
  forecast?: number
  actual?: number
  unit?: string
  [k: string]: unknown
}

interface ApiResponse {
  events: RawEvent[]
  occurrences: RawOccurrence[]
  next_page_cursor: string | null
}

export interface SlimEvent {
  time: number
  name: string
  precision: number
  Previous: number | null
  Forecast: number | null
  Actual: number | null
  unit: string | null
}

export default async (start: number, end: number): Promise<SlimEvent[]> => {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('start/end must be valid millisecond timestamps')
  }
  if (start >= end) {
    throw new Error('start must be less than end')
  }

  const params = new URLSearchParams({
    domain_id: '1',
    limit: '200',
    start_date: new Date(start).toISOString(),
    end_date: new Date(end).toISOString(),
    country_ids: '5',
  })

  const url =
    `https://endpoints.investing.com/pd-instruments/v1/calendars/economic/events/occurrences?${params}`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'yaak',
      Accept: '*/*',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Investing API ${response.status}: ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as ApiResponse

  const metaMap = new Map<number, RawEvent>()
  for (const e of data.events ?? []) {
    metaMap.set(e.event_id, e)
  }

  const result: SlimEvent[] = []
  for (const occ of data.occurrences ?? []) {
    const meta = metaMap.get(occ.event_id)
    if (!meta) continue

    result.push({
      time: new Date(occ.occurrence_time).getTime(),
      name: meta.event_translated,
      precision: occ.precision,
      Previous: occ.previous ?? null,
      Forecast: occ.forecast ?? null,
      Actual: occ.actual ?? null,
      unit: occ.unit ?? null,
    })
  }

  result.sort((a, b) => a.time - b.time)

  return result
}
