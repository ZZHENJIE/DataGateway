import { Hono } from 'hono'
import ipo from './calendar/ipo';
import economic from './calendar/economic';

const calendar = new Hono()

calendar.get('/ipo', async (c) => {
  return c.json(await ipo());
})

calendar.get('/economic', async (c) => {
  const startRaw = c.req.query('start')
  const endRaw = c.req.query('end')

  if (!startRaw || !endRaw) {
    return c.json({ error: 'start and end required' }, 400)
  }

  const startMs = Number(startRaw)
  const endMs = Number(endRaw)

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return c.json({ error: 'start and end must be timestamps' }, 400)
  }

  return c.json(await economic(startMs,endMs));
})

export default calendar
