const dotenv = require('dotenv')
const mongoose = require('mongoose')
const http = require('http')

require('./utils/initRedis').connectToRedis()

dotenv.config({path: './config.env'})

process.on('uncaughtException', err => {
  console.log(err.name, err.message)
  process.exit(1)
})

const app = require('./app')

mongoose.connect(process.env.DB_URL, { useUnifiedTopology: true }).then(() => console.log('Conneted to MongoDB Database.')).catch(err => console.log(err))

const server = http.createServer(app)

server.listen(process.env.PORT, () => {
  console.log('Server listening on port: ' + process.env.PORT)
})
process.on('unhandledRejection', err => {
  console.log(err.name, err.message)
  server.close(() => {
    process.exit(1)
  })
})


