const Tour = require('./tour.model')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const reviewSchema = new Schema({
  review: {
    type: String,
    requried: [true, 'Review cannot be empty']
  },
  rating: {
    type: Number,
    required: [true, 'A review must have a rating'],
    min: 1,
    max: 5
  },
  tour: {
    type: Schema.Types.ObjectId,
    ref: 'Tour',
    required: [true, 'A review must have a tour']
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A review must have a user']
  }
}, { timestamps: true, id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } })

reviewSchema.index({ tour: 1, user: 1 }, { unique: true })

reviewSchema.statics.calcRatings = async function(tourId)  {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ])
  
  if(stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRatings,
      ratingsAverage: stats[0].avgRating
    })
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    })
  }
}

reviewSchema.pre(/^find/, function(next) {
  this.populate({ path: 'user', select: 'name photo' })
  next()
})

reviewSchema.post('save', async function() {
  await this.constructor.calcRatings(this.tour)
})

reviewSchema.post(/^findOneAnd/, async function(doc) {
  await doc.constructor.calcRatings(doc.tour)
})

module.exports = mongoose.model('Review', reviewSchema)