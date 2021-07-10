const express = require('express')
const router = express.Router({ mergeParams: true })

const { setIds, createReview, getAllReviews, updateReview, deleteReview, getReview, allowReviewWrite } = require('../controllers/review.controller')
const { protect, restrictTo } =require('../controllers/auth.controller')

router.use(protect)

router.route('/').get(getAllReviews).post(restrictTo('user'), allowReviewWrite, setIds, createReview)
router
  .route('/:id')
  .get(getReview)
  .patch(restrictTo('user', 'admin'), updateReview)
  .delete(restrictTo('user', 'admin'), deleteReview)

module.exports = router