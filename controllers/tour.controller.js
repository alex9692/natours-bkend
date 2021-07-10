const multer = require('multer')
const sharp = require('sharp')

const Tour = require('../models/tour.model')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const { getOne, createOne, updateOne, deleteOne, getAll } = require('./handleFactory')

const multerStorage = multer.memoryStorage()

const multerFilter = (req, file, cb) => {
  if(file.mimetype.startsWith('image')) {
    cb(null, true)
  } else {
    cb(new AppError('Please upload images only!!', 400), false)
  }
}

const upload = multer({ storage: multerStorage, fileFilter: multerFilter })

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
])

exports.resizeTourImages =catchAsync(async (req, res, next) => {
  if(!req.files.imageCover || !req.files.images) return next()
  
  const imageCoverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpeg`
  await sharp(req.files.imageCover[0].buffer).resize(2000, 1333).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/img/tours/${imageCoverFilename}`)
  req.body.imageCover = imageCoverFilename

  req.body.images = []

  await Promise.all(req.files.images.map(async (img, i) => {
    const imageFilename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`
    await sharp(img.buffer).resize(2000, 1333).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/img/tours/${imageFilename}`)
    req.body.images.push(imageFilename)
  }))

  next()
})

exports.aliasTopTours = (req, res, next) => {
  req.query = {
    ...req.query,
    sort: '-ratingsAverage,price',
    limit: 5,
    fields: 'name,price,ratingsAverage,summary,difficulty'
  }
  next()
}

exports.getAllTours = getAll(Tour)
exports.getTour = getOne(Tour, 'reviews')
exports.createTour = createOne(Tour)
exports.updateTour = updateOne(Tour)
exports.deleteTour = deleteOne(Tour)

exports.getTourStats =catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numOfTours: { $sum: 1 },
        numOfRatings: { $sum: '$ratingsQuantity' },
        averageRatings: { $avg: '$ratingsAverage' },
        averagePrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { averagePrice: 1 }
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ])
  res.status(200).json({ status: 'success', data: { stats } })
})

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = +req.params.year
  
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: { startDates: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numOfTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: { _id: 0 }
    },
    {
      $sort: { numOfTourStarts: -1 }
    }
  ])

  res.status(200).json({ status: 'success', data: { plan } })
})

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { dist, latlng, unit } = req.params

  const [lat, lng] = latlng.split(',')
  if(!lat || !lng) {
    return next(new AppError('Please provide lat and lng in the url', 400))
  }

  const radius = unit === 'mi' ? dist/3963.2 : dist/6378.1

  const tours = await Tour.find({ startLocation: { $geoWithin: { $centerSphere: [[+lng, +lat], radius] } } })

  res.status(200).json({ status: 'success', results: tours.length, data: { data: tours } })
})

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params

  const [lat, lng] = latlng.split(',')
  if(!lat || !lng) {
    return next(new AppError('Please provide lat and lng in the url', 400))
  }

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [+lng, +lat]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: { 
        distance: 1,
        name: 1
      }
    }
  ])

  res.status(200).json({ status: 'success', data: { data: distances } })
})

exports.getTourBySlug = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({ path: 'reviews', select: 'review rating user -tour' })
  if(!tour) {
    return next(new AppError('Tour not found', 404))
  }
  res.status(200).json({ status: 'success', data: { data: tour } })
})