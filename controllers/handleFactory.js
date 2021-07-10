const catchAsync = require('../utils/catchAsync')
const APIFeatures = require('../utils/apiFeatures')
const AppError = require('../utils/appError')

exports.getAll = Model => catchAsync(async (req, res, next) => {
  // let queryStr = { ...req.query }
  // const fieldsToExclude = ['sort', 'limit', 'page', 'fields']
  // fieldsToExclude.forEach(el => delete queryStr[el])

  // queryStr = JSON.stringify(queryStr)
  // queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`)
  // queryStr = JSON.parse(queryStr)

  // let query = Tour.find(queryStr)

  // if(req.query.sort) {
  //   const sortStr = req.query.sort.split(',').join(' ')
  //   query = query.sort(sortStr)
  // } else {
  //   query = query.sort({ 'createdAt': -1 })
  // }

  // if(req.query.fields) {
  //   const fieldStr = req.query.fields.split(',').join(' ')
  //   query = query.select(fieldStr)
  // } else {
  //   query = query.select('-__v -createdAt -updatedAt')
  // }

  // const page = +req.query.page || 1
  // const limit = +req.query.limit || 50

  // const skip = (page - 1) * limit

  // if(req.query.page) {
  //   const totalDocs = await Tour.countDocuments()
  //   if(skip >= totalDocs) throw new Error('This page doesn\'t exist')
  // }

  // query = query.skip(skip).limit(limit)
  const filter = {}
  
  if(req.params.tourId) filter.tour = req.params.tourId
  if(req.params.userId) filter.user = req.params.userId

  const query = new APIFeatures(Model.find(filter), req.query).filter().sort().addFields().pagination()
  const docs = await query //.explain()
  res.status(200).json({ status: 'success', results: docs.length, data: { data: docs } })
})

exports.createOne = Model => catchAsync(async (req, res, next) => {
  const doc = await Model.create(req.body)

  res.status(201).json({ status: 'success', data: { data: doc } })
})

exports.getOne = (Model, populateOpts) => catchAsync(async (req, res, next) => {
  let query = Model.findById(req.params.id)
  if(populateOpts) {
    query = query.populate(populateOpts)
  }
  const doc = await query
  if(!doc) return next(new AppError('Document doesn\'t exist', 404))
  res.status(200).json({ status: 'success', data: { data: doc } })
})

exports.updateOne = Model => {
  return catchAsync(async (req, res, next) => {
    const updatedDoc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    
    if(!updatedDoc) return next(new AppError('Document doesn\'t exist', 404))

    res.status(200).json({ status: 'success', data: { data: updatedDoc } })
  })
}

exports.deleteOne = Model => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id)
    if(!doc) return next(new AppError('Document doesn\'t exist', 404))
    res.status(204).json({ status: 'success', data: null })
  })
}
