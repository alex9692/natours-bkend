const mongoose = require('mongoose')
const Schema = mongoose.Schema
const Tour = require('./tour.model')

const bookingSchema = new Schema({
  tour: {
    type: Schema.Types.ObjectId,
    ref: 'Tour',
    required: [true, 'A booking must have a tour']
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A booking must have a user']
  },
  price: {
    type: Number,
    required: [true, 'A booking must have a price']
  },
  date: {
    type: Date,
    required: [true, 'A booking must have a date']
  },
  paid: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

bookingSchema.pre('save', async function(next) {
  const { tour, date } = this
  await Tour.findOneAndUpdate({_id: tour }, [
    {
      $set: { 
        startDates: { 
          $map: {
            input: "$startDates",
            in: { 
              $cond: [ 
                { $eq: ["$$this.date", date] },
                { $mergeObjects: ["$$this", { participants: { $add: ["$$this.participants", 1] }, soldOut: { $cond: [{ $eq: ["$$this.participants", { $subtract: ["$maxGroupSize", 1] }] }, true, false] } }] },
                "$$this"
              ]
            }
          }
        }
      }
    }
  ])
  next()
})

bookingSchema.pre(/^find/, function(next) {
  this.populate({ path: 'tour', select: 'name' }).populate({ path: 'user '})
  next()
})

module.exports = mongoose.model('Booking', bookingSchema)