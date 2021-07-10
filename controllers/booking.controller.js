const stripe = require('stripe')(process.env.STRIPE_KEY)
const ObjectId = require('mongoose').Types.ObjectId

const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const Tour = require('../models/tour.model')
const Booking = require('../models/booking.model')
const { getAll, getOne, createOne, updateOne, deleteOne } = require('./handleFactory')

const YOUR_DOMAIN = 'http://localhost:3000'

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${YOUR_DOMAIN}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${YOUR_DOMAIN}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1
      }
    ]
  })

  res.status(200).json({ status: 'success', session })

})

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price } = req.body

  if(!tour || !user || !price) return next(new AppError('There was a problem booking the tour.Please try again later', 400))

  await Booking.create({ tour, user, price })

  res.status(201).json({ status: 'success', message: 'Tour booked successfully' })
})

exports.getMyBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id })

  const tourIds = bookings.map(booking => booking.tour)

  const tours = await Tour.find({ _id: { $in: tourIds } })

  res.status(200).json({ status: 'success', results: tours.length, tours })
})

exports.checkAvailableBookings = catchAsync(async (req, res, next) => {
  const bookings = await Tour.aggregate([
    { $unwind : "$startDates" },
    {
      $match: { _id: ObjectId(req.body.tour) }
    },
    {
      $match: { $and: [{'startDates.date': new Date(req.body.date)}, {'startDates.soldOut': true } ] }
    }
  ])

  if(bookings.length) return next(new AppError('Tour is sold out', 400))
  
  next()
})

exports.getAllBookings = getAll(Booking)
exports.createBooking = createOne(Booking)
exports.getBooking = getOne(Booking)
exports.updateBooking = updateOne(Booking)
exports.deleteBooking = deleteOne(Booking)