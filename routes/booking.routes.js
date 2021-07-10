const express = require('express')
const router = express.Router({ mergeParams: true })

const { getCheckoutSession, createBookingCheckout, getMyBookings, getAllBookings, createBooking, getBooking, updateBooking, deleteBooking, checkAvailableBookings } = require('../controllers/booking.controller')
const { protect, restrictTo } =require('../controllers/auth.controller')

router.use(protect)

router.get('/checkout-session/:tourId', getCheckoutSession)

router.route('/checkout-session-bookings').get(getMyBookings).post(createBookingCheckout)

router.use(restrictTo('admin', 'lead-guide'))

router.route('/').get(getAllBookings).post(checkAvailableBookings, createBooking)

router.route('/:id').get(getBooking).patch(updateBooking).delete(deleteBooking)

module.exports = router
