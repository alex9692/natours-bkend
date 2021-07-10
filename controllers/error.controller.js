const { Error } = require('mongoose')
const AppError = require('../utils/appError')

const handleError = (err, type) => {
  if(type == 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`
    return new AppError(message, 400)
  } else if(type == 'DuplicateError') {
    const message = `Duplicate values detected.Please use another value`
    return new AppError(message, 400)
  } else if(type == 'ValidationError') {
    const errorObj = {}, errorArr = [], errmsg = []
    for(let key in err.errors) {
      errorObj[key] = err.errors[key].message
      errorArr.push({ [key]: err.errors[key].message })
      errmsg.push(err.errors[key].message)
    }
    const message = errmsg.join('. ')
    return new AppError(message, 400)
  } else if(type == 'JsonWebTokenError' || type == 'TokenExpiredError') {
    return new AppError('Invalid token.Please login again', 401)
  }
}

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({ status: err.status, message: err.message, stack: err.stack, error: err })
}

const sendErrorProd = (err, res) => {
  if(err.isOperational) {
    res.status(err.statusCode).json({ status: err.status, message: err.message })
  } else {
    console.error(err)
    res.status(500).json({ status: 'error', message: 'Something went wrong!' })
  }
}

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'
  if(process.env.NODE_ENV == 'development') {
    sendErrorDev(err, res)
  } else if (process.env.NODE_ENV == 'production') {
    let error = { ...err }
    console.log(err)
    if(err.name == 'CastError') error = handleError(error, 'CastError')
    if(err.code == 11000) error = handleError(error, 'DuplicateError')
    if(err.name == 'ValidationError') error = handleError(error, 'ValidationError')
    if(err.name == 'JsonWebTokenError') error = handleError(error, 'JsonWebTokenError')
    if(err.name == 'TokenExpiredError') error = handleError(error, 'TokenExpiredError')
    sendErrorProd(error, res)
  }
}