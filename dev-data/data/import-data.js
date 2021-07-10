const dotenv = require('dotenv')
const mongoose = require('mongoose')
dotenv.config({ path: '../../config.env' })

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => console.log('Database connected succefully')).catch((err) => console.log(err))

const tours = require('./tours.json')
const users = require('./users.json').map(user => ({ ...user, verified: true }))
const reviews = require('./reviews.json')

const Tour = require('../../models/tour.model')
const User = require('../../models/user.model')
const Review = require('../../models/review.model')

const importData = async () => {
  try {
    await Tour.create(tours)
    await User.create(users, { validateBeforeSave: false })
    await Review.create(reviews)
    console.log('Data imported successfully')
  } catch (error) {
    console.log(error)
  }
  process.exit(0)
}

const deleteData = async () => {
  try {
    await Tour.deleteMany()
    await User.deleteMany()
    await Review.deleteMany()
    console.log('Data deleted successfully')
  } catch (error) {
    console.log(error)
  }
  process.exit(0)
}

if(process.argv[2] == '--import') {
  importData()
} else if(process.argv[2] == '--delete') {
  deleteData()
}