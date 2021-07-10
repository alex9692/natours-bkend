const e = require('express')
const redis = require('redis')

class SingletonRedis {
  constructor() {
    if(this.constructor.instance) {
      return this.constructor.instance
    }
    this.isConfig = false
    this.constructor.instance = this
  }

  connectRedis(host='localhost', port=6379) {
    if(!this.isConfig) {
    this.client = redis.createClient({
      host,
      port
    })

    this.client.on('connect', () => {
      console.log('Client connected to redis....')
    })
    
    this.client.on('ready', () => {
      console.log('Redis is ready to use.')
    })
    
    this.client.on('error', (error) => {
      console.log(error.message)
    })
    
    this.client.on('end', () => {
      console.log('Client disconnected from redis')
    })
    
    process.on('SIGINT', () => {
      this.client.quit()
    })
    
    this.isConfig = true
    } else {
      // console.log('skip')
    }
    
    return this
  }

  getClient() {
    return this.client
  }
}

// const r1 = new SingletonRedis().connectRedis().getClient().options
// const r2 = new SingletonRedis().connectRedis(null, 1212).getClient().options
// console.log(r1)
// console.log(r2)

const redisInstance =  new SingletonRedis()
module.exports = {
  connectToRedis: redisInstance.connectRedis,
  redisClient: redisInstance.getClient
}