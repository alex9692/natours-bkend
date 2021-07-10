const express = require('express')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')
const cors = require('cors')
const path = require('path')
const cookieParser = require('cookie-parser')

const AppError = require('./utils/appError')
const errorController = require('./controllers/error.controller')
const tourRouter = require('./routes/tour.routes')
const userRouter = require('./routes/user.routes')
const reviewRouter = require('./routes/review.routes')
const bookingRouter = require('./routes/booking.routes')
// const client = require('./utils/initRedis').redisClient()
// client.set('bar', 123)
// client.get('bar', (err, val) => {
//   if(err) console.log(err)
//   console.log(val)
// })

const app = express()

app.use(express.static(path.resolve(__dirname, 'public')))

app.use(helmet())

app.use(cors({ origin: 'http://localhost:3000', credentials: true }))

if(process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this ip.'
})
app.use('/api', limiter)

app.use(express.json({ limit: '10kb' }))

app.use(express.urlencoded({ extended: true }))

app.use(cookieParser())

app.use(mongoSanitize())

app.use(xss())

app.use(hpp({
  whitelist: [
    'duration',
    'ratingsAverage',
    'ratingsQuantity',
    'maxGroupSize',
    'difficulty',
    'price'
  ],
}))

app.use((req, res, next) => {
  console.log(req.cookies)
  next()
})

app.use('/api/v1/tours', tourRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/reviews', reviewRouter)
app.use('/api/v1/bookings', bookingRouter)

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`, 404))
})

app.use(errorController)

module.exports = app