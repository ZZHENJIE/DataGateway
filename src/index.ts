import { Hono } from 'hono'
import calendar from './calendar'
import utils from './utils'

const app = new Hono()

// Route
app.route('/calendar', calendar)
app.route('/utils', utils)

export default app
