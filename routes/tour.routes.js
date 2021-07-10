const express = require('express')
const router = express.Router()

const { aliasTopTours, getTourStats, getMonthlyPlan, createTour, getAllTours, deleteTour, getTour, updateTour, getDistances, getToursWithin, getTourBySlug, uploadTourImages, resizeTourImages } = require('../controllers/tour.controller')
const { protect, restrictTo } = require('../controllers/auth.controller')
const reviewRouter = require('./review.routes')
const bookingRouter = require('./booking.routes')

router.use('/:tourId/reviews', reviewRouter)
router.use('/:tourId/bookings', bookingRouter)

router.route('/top-five-cheapest').get(aliasTopTours, getAllTours)
router.route('/stats').get(getTourStats)
router.route('/monthly-plan/:year').get(protect, restrictTo('admin', 'lead-guide', 'guide'), getMonthlyPlan)

router.route('/tours-within/:dist/center/:latlng/unit/:unit').get(getToursWithin)
router.route('/distances/:latlng/unit/:unit').get(getDistances)

router.route('/').get(getAllTours).post(protect, restrictTo('admin', 'lead-guide'), createTour)
router
  .route('/:id')
  .get(getTour)
  .patch(protect, restrictTo('admin', 'lead-guide'), uploadTourImages, resizeTourImages, updateTour)
  .delete(protect, restrictTo('admin', 'lead-guide'), deleteTour)
router.route('/s/:slug').get(getTourBySlug)

module.exports = router