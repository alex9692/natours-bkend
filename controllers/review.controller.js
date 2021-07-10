const Review = require('../models/review.model')
const Booking = require('../models/booking.model')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const { createOne, updateOne, deleteOne, getOne, getAll } = require('./handleFactory')

exports.setIds = (req, res, next) => {
  if(!req.body.tour) req.body.tour = req.params.tourId
  if(!req.body.user) req.body.user = req.user.id
  next()
}

exports.allowReviewWrite = catchAsync(async (req, res, next) => {
  const bookingExist = await Booking.find({ $and: [{ tour: req.params.tourId }, { user: req.user.id }] })
  if(!bookingExist.length) return next(new AppError('You must book the tour to write a review', 404))
  next()
})

exports.getAllReviews = getAll(Review)
exports.createReview = createOne(Review)
exports.getReview = getOne(Review)
exports.updateReview = updateOne(Review)
exports.deleteReview = deleteOne(Review)