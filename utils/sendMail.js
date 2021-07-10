const nodemailer = require('nodemailer')
const pug = require('pug')
const { htmlToText } = require('html-to-text')

const SendMail = class {
  constructor(user, url) {
    this.to = user.email
    this.from = `Admin@Natours <${process.env.EMAIL_FROM}>`
    this.firstname = user.name.split(' ')[0]
    this.url = url
  }

  transport() {
    if(process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      })
    }
    
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: process.env.MAILTRAP_PORT,
      auth: {
        user: process.env.MAILTRAP_USERNAME,
        pass: process.env.MAILTRAP_PASSWORD
      }
    })
  }

  async send(template, subject) {
    const html = pug.renderFile(`${__dirname}/../views/emails/${template}.pug`, {
      firstname: this.firstname,
      url: this.url,
      subject
    })
    
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html)
    }
    
    await this.transport().sendMail(mailOptions) 
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to Natours')
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Reset your password(valid for 10 mins)')
  }

  async sendVerificationEmail() {
    await this.send('verifyAccount', 'Verify your Natours Account(valid for a 24 hours)')
  }
}

module.exports = SendMail