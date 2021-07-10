const slugify = require('slugify')
const mongoose = require('mongoose')
const validator = require('validator')
const Schema = mongoose.Schema

const tourSchema = new Schema({
  name: {
    type: String,
    required: [true, 'A tour must have a name'],
    unique: true,
    trim: true,
    maxLength: [40, 'A tour name must have atmost 40 characters'],
    minLength: [10, 'A tour name must have atleast 10 characters']
    // validate: [validator.isAlpha, 'Tour name must only contain character']
  },
  duration: {
    type: Number,
    required: [true, 'A tour must have a duration']
  },
  maxGroupSize: {
    type: Number,
    required: [true, 'A tour must have a maxGroupSize']
  },
  difficulty: {
    type: String,
    required: [true, 'A tour must have a difficulty'],
    enum: {
      values: ['easy', 'medium', 'difficult'],
      message: 'Set a valid difficulty level from [easy, medium, difficult]'
    }
  },
  ratingsAverage: {
    type: Number,
    default: 4.5,
    max: [5, 'A tour rating must not be above 5'],
    min: [1, 'A tour rating must be above 1'],
    set: val => Math.round(val *   10) / 10
  },
  ratingsQuantity: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    required: [true, 'A tour must have a price']
  },
  priceDiscount: {
    type: Number,
    validate: {
      validator: function(val) {
        return val < this.price // only work during creation of new doc
      },
      message: 'PriceDiscount({VALUE}) must be lower than the actual price'
    }
  },
  summary: {
    type: String,
    trim: true,
    required: [true, 'A tour must have a summary']
  },
  description: {
    type: String,
    trim: true,
  },
  imageCover: {
    type: String,
    required: [true, 'A tour must have an image']
  },
  images: [String],
  startDates: [
    {
      date: Date,
      participants: {
        type: Number,
        default: 0
      },
      soldOut: {
        type: Boolean,
        default: false
      }
    }
  ],
  slug: String,
  secretTour: {
    type: Boolean,
    default: false
  },
  startLocation: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: [Number],
    address: String,
    description: String
  },
  locations: [{
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: [Number],
    address: String,
    description: String,
    day: Number
  }],
  guides: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  ]
}, { timestamps: true, id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } })

// tourSchema.index({ price: 1 })
tourSchema.index({ price: 1, ratingsAverage: -1 })
tourSchema.index({ slug: 1 })
tourSchema.index({ startLocation: '2dsphere' })

tourSchema.virtual('durationWeeks').get(function() {
  if(this.duration) return this.duration / 7
})

tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
})

tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true })
  next()
})

tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true }})
  next()
})

tourSchema.pre(/^find/, function(next) {
  this.populate({ path: 'guides', select: '-__v -passwordChangedAt' })
  next()
})

tourSchema.pre('aggregate', function(next) {
  const key = Object.keys(this.pipeline()[0])[0]
  if(!key.startsWith('$geo')) {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } })
  }
  console.log(this.pipeline())
  next()
})

module.exports = mongoose.model('Tour', tourSchema)