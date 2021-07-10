const jwt = require('jsonwebtoken')
const { promisify } = require('util')
const crypto = require('crypto')
const client = require('../utils/initRedis').redisClient()
const randToken = require('rand-token')

const User = require('../models/user.model')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const SendMail = require('../utils/sendMail')

const getToken = (id) => (new Promise((resolve, reject) => {
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION }, function(err, token) {
    if(err) reject(err)
    else resolve(token)
  })
}))

const getRefToken = async (id, next) => {
  let token, res
  id = id.toString()

  try {
    res = await promisify(client.GET).call(client, id)
    token = res
  } catch (error) {
    console.log(error)
    return next(new AppError(error.message, 500))
  }
  if(!res) {
    try {
      token = randToken.uid(256)
      await promisify(client.SET).call(client, id, token, 'EX', parseInt(process.env.REFRESH_TOKEN_EXPIRATION))
    } catch (error) {  
      console.log(error)
      return next(new AppError(error.message, 500))
    }
  }
  return token
}

const cookieOptions = {
  expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRATION * 1000),
  httpOnly: true
}

exports.signUp = catchAsync(async (req, res, next) => {
  const user = await User.create({
    // name: req.body.name,
    // email: req.body.email,
    // password: req.body.password,
    // passwordConfirm: req.body.passwordConfirm,
    ...req.body
  })
  // req.protocol://req.get('host')/
  await new SendMail({ name: user.name, email: user.email }, 'http://localhost:3000/user').sendWelcome()

  const token = await getToken(user._id)
  
  const refreshToken = await getRefToken(user._id, next)

  user.password = undefined

  if (process.env.NODE_ENV == 'production') cookieOptions.secure = true

  res.cookie('jwt', token, cookieOptions)

  res.status(201).json({
    status: 'success',
    token,
    refreshToken,
    data: {
      user
    }
  })
})

exports.signIn = catchAsync(async (req, res, next) => {
  const { email, password } = req.body

  if(!email || !password) {
    return next(new AppError('Please provide email or password', 400))
  }

  const user = await User.findOne({ email }).select('+password')

  if(!user || !await user.comparePassword(user.password, password)) {
    return next(new AppError('Incorrect email or password', 401))
  }

  const token = await getToken(user._id)

  const refreshToken = await getRefToken(user._id, next)
  
  user.password = undefined
  
  if (process.env.NODE_ENV == 'production') cookieOptions.secure = true

  res.cookie('jwt', token, cookieOptions)

  res.status(200).json({
    status: 'success',
    token,
    refresh_token: refreshToken
  })
})

exports.protect = catchAsync(async (req, res, next) => {
  let token = null
  if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  } else if(req.cookies.jwt) {
    token = req.cookies.jwt
  }

  if(!token) {
    return next(new AppError('No token found', 401))
  }

  const decodedToken = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
  
  const currentUser = await User.findById(decodedToken.id)

  if(!currentUser) {
    return next(new AppError('User associated with this token does not exist', 401))
  }

  const passwordChanged = currentUser.isPasswordChangedAfter(decodedToken.iat)
  if(passwordChanged) {
    return next(new AppError('Password was changed recently.Please login again', 401))
  }

  req.user = currentUser
  next()
})

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if(!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403))
    }
    next()
  }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body
  if(!email) {
    return next(new AppError('Please enter your email address', 400))
  }

  const user = await User.findOne({ email })
  if(!user) {
    return next(new AppError('User does not exist', 404))
  }

  const resetTokenString = user.generateToken('resetPassword')
  await user.save({ validateBeforeSave: false})

  const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetTokenString}`
  
  const options = {
    name: user.name,
    email: user.email
  }

  try {
    await new SendMail(options, resetUrl).sendPasswordReset()

    res.status(200).json({ status: 'success', message: 'Token sent to email' })
  } catch (error) {
    user.passwordResetToken = undefined,
    user.passwordResetTokenExpires = undefined
    await user.save({ validateBeforeSave: false })

    return next(new AppError('Error sending the mail.Try again later', 500))
  }

})

exports.resetPassword =catchAsync(async (req, res, next) => {
  const { token: resetToken } = req.params

  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')

  const user = await User.findOne({ $and: [{ passwordResetToken: hashedToken }, { passwordResetTokenExpires: { $gt: Date.now() } }] })

  if(!user) {
    return next(new AppError('Token has expired.Please try again later', 400))
  }

  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm
  user.passwordResetToken = undefined
  user.passwordResetTokenExpires = undefined

  await user.save()
  
  const token = await getToken(user._id)

  res.status(200).json({
    status: 'success',
    token
  })
})

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { password, newPassword, newPasswordConfirm } = req.body

  const user = await User.findById(req.user.id).select('+password')
  if(!user || !await user.comparePassword(user.password, password)) {
    return next(new AppError('Please enter correct current password', 400))
  }

  if(newPassword !== newPasswordConfirm) {
    return next(new AppError('Passwords do not match.', 400))
  }

  user.password = newPassword
  user.passwordConfirm = newPasswordConfirm
  
  await user.save()

  // const token = await getToken(user._id)

  res.status(200).json({
    status: 'success'
    // token
  })

})

exports.logout = (req, res, next) => {
  res.cookie('jwt', '', { expires: new Date(Date.now() + 5 * 1000), httpOnly: true })
  res.status(200).json({ status: 'success' })
}

exports.verifyAccountStart = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
  if(!user) {
    return next(new AppError('User does not exist', 404))
  }
  if(user.verified) {
    return next(new AppError('Account is verified already', 400))
  }

  const verifyToken = user.generateToken('verifyAccount')
  await user.save({ validateBeforeSave: false })

  const verifyUrl = `${req.protocol}://${req.get('host')}/api/v1/users/verifyAccount/${verifyToken}`
  
  const options = {
    name: user.name,
    email: user.email
  }

  try {
    await new SendMail(options, verifyUrl).sendVerificationEmail()

    res.status(200).json({ status: 'success', message: 'Token sent to email' })
  } catch (error) {
    user.verificationToken = undefined,
    user.verificationTokenExpires = undefined
    await user.save({ validateBeforeSave: false })

    return next(new AppError('Error sending the mail.Try again later', 500))
  }
})

exports.verifyAccountEnd = catchAsync(async (req, res, next) => {
  const { token } = req.params

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  
  const user = await User.findOne({ $and: [{ verificationToken: hashedToken }, { verificationTokenExpires: { $gt: Date.now() } }] })

  if(!user) {
    return next(new AppError('Token has expired.Please try again later', 400))
  }

  user.verified = true
  user.verificationToken = undefined
  user.verificationTokenExpires = undefined

  await user.save({ validateBeforeSave: false })

  res.status(200).json({
    status: 'success',
    message: 'Account Verified'
  })
})

exports.verifyRefreshToken = catchAsync(async (req, res, next) => {
  let { refresh_token, userId } = req.body

  if(!refresh_token) {
    return next(new AppError('Missing refresh token', 400))
  }
  const user = await User.findById(userId)

  if(!user) {
    return next(new AppError('User doesnot exist', 404))
  }

  let response = await promisify(client.GET).call(client, userId)

  if(!response || response !== refresh_token) {
    console.log('creating new refresh token')
    refresh_token = randToken.uid(256)
    await promisify(client.SET).call(client, refresh_token, userId, 'EX', parseInt(process.env.REFRESH_TOKEN_EXPIRATION))
  } else {
    console.log('refresh token is valid')
  }

  let token = await getToken(userId)

  if (process.env.NODE_ENV == 'production') cookieOptions.secure = true
  
  res.cookie('jwt', token, cookieOptions)

  res.status(200).json({
    status: 'success',
    token,
    refresh_token
  })
})