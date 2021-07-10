const express = require('express')
const router = express.Router()

const { signUp, signIn, forgotPassword, resetPassword, updatePassword, protect, restrictTo, logout, verifyAccountStart, verifyAccountEnd, verifyRefreshToken } = require('../controllers/auth.controller')
const { updateMe, deleteMe, getAllUsers, updateUser, deleteUser, getUser, getMe, uploadUserPhoto, resizePhoto } = require('../controllers/user.controller')

const bookingRouter = require('./booking.routes')

router.use('/:userId/bookings', bookingRouter)

router.post('/signup', signUp)
router.post('/signin', signIn)
router.get('/signout', logout)

router.post('/forgotPassword', forgotPassword)
router.patch('/resetPassword/:token', resetPassword)

router.post('/refresh-token', verifyRefreshToken)

router.use(protect)

router.get('/verify', verifyAccountStart)
router.patch('/verifyAccount/:token', verifyAccountEnd)

router.patch('/updatePassword', updatePassword)
router.get('/me', getMe, getUser)
router.patch('/updateMe', uploadUserPhoto, resizePhoto, updateMe)
router.delete('/deleteMe', deleteMe)

router.use(restrictTo('admin'))

router.route('/').get(getAllUsers)
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser)

module.exports = router