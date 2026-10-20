import { Hono } from 'hono'
import calendar from './calendar'

const app = new Hono()

// Route
app.route('/calendar', calendar)

export default app
