const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const Schema = mongoose.Schema

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
    minLength: [3, 'A user must be atleast 3 characters long'],
    maxLength: [20, 'A user must be atmost 20 characters long'],
  },
  email: {
    type: String,
    required: [true, 'A user must have an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Enter a valid email address']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  password: {
    type: String,
    required: [true, 'A user must have a password'],
    minLength: [8, 'Password should be atleast 8 characters long'],
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function(val) {
        return val == this.password
      },
      message: 'Passwords do not match'
    }
  },
  passwordChangedAt: Date,
  role: {
    type: String,
    enum: ['admin', 'lead-guide', 'guide', 'user'],
    default: 'user'
  },
  passwordResetToken: String,
  passwordResetTokenExpires: Date,
  verificationToken: String,
  verificationTokenExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpires: Date
})

userSchema.pre('save', async function(next) {
  if(!this.isModified('password')) return next()

  this.password = await bcrypt.hash(this.password, 12)
  this.passwordConfirm = undefined
})

userSchema.pre('save', async function(next) {
  if(!this.isModified('password') || this.isNew) return next()

  this.passwordChangedAt = Date.now() - 1000
  next()
})

userSchema.pre(/^find/, function(next) {
  this.find({ active:  { $ne: false } })
  next()
})

userSchema.methods.comparePassword = async function(dbPassword, inputPassword) {
  return await bcrypt.compare(inputPassword, dbPassword)
}

userSchema.methods.isPasswordChangedAfter = function(jwtTimestamp) {
  if(this.passwordChangedAt) {
    const passwordChangedAt = parseInt(this.passwordChangedAt.getTime() / 1000, 10)
    return jwtTimestamp < passwordChangedAt
  }
  return false
}

userSchema.methods.generateToken = function(mode) {
  const tokenString = crypto.randomBytes(32).toString('hex')
  
  const hashedtoken = crypto.createHash('sha256').update(tokenString).digest('hex')
  const hashedTokenExpiration = mode == 'verifyAccount' ? Date.now() + 24 * 60 * 60 * 1000 : Date.now() + 10 * 60 * 1000
  
  if(mode == 'resetPassword') {
    this.passwordResetToken = hashedtoken
    this.passwordResetTokenExpires = hashedTokenExpiration
  } else if(mode == 'verifyAccount') {
    this.verificationToken = hashedtoken
    this.verificationTokenExpires = hashedTokenExpiration
  }

  return tokenString
}

module.exports = mongoose.model('User', userSchema)