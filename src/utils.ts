import { Hono } from 'hono'
import translate from './utils/translate'

const calendar = new Hono()

calendar.get('/translate', async (c) => {
  const from = c.req.query('from')
  const to = c.req.query('to')
  const keyword = c.req.query('keyword')

  if (!from || !to || !keyword) {
    return c.json({ error: 'start and end required' }, 400)
  }

  return c.text(await translate(from,to,keyword));
})

export default calendar
