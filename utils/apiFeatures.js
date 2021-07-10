module.exports = class {
  constructor(query, queryObj) {
    this.query = query
    this.queryObj = queryObj
  }

  filter() {
    let queryStr = { ...this.queryObj }
    const fieldsToExclude = ['sort', 'limit', 'page', 'fields']
    fieldsToExclude.forEach(el => delete queryStr[el])

    queryStr = JSON.stringify(queryStr)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`)
    queryStr = JSON.parse(queryStr)

    this.query = this.query.find(queryStr)
    return this
  }

  sort() {
    if(this.queryObj.sort) {
      const sortStr = this.queryObj.sort.split(',').join(' ')
      this.query = this.query.sort(sortStr)
    } else {
      this.query = this.query.sort({ 'createdAt': -1 })
    }
    return this
  }

  addFields() {
    if(this.queryObj.fields) {
      const fieldStr = this.queryObj.fields.split(',').join(' ')
      this.query = this.query.select(fieldStr)
    } else {
      this.query = this.query.select('-__v -createdAt -updatedAt')
    }
    return this
  }

  // async pagination() {
  pagination() {
    const page = +this.queryObj.page || 1
    const limit = +this.queryObj.limit || 50

    const skip = (page - 1) * limit

    // if(this.queryObj.page) {
    //   const totalDocs = await Tour.countDocuments()
    //   if(skip >= totalDocs) throw new Error('This page doesn\'t exist')
    // }

    this.query = this.query.skip(skip).limit(limit)
    return this.query
  }
}