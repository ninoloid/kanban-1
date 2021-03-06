const { User } = require('../models')
const { compare } = require('../helpers/hash')
const { sign } = require('../helpers/jwt')
const { Op } = require('sequelize')
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client(process.env.CLIENT_ID)

module.exports = {
  register(req, res, next) {
    const { username, email, password } = req.body
    User.create({
      username,
      email,
      password
    })
      .then(user => {
        const payload = {
          id: user.id
        }
        const access_token = sign(payload)
        res
          .status(200)
          .json({ token: access_token, username: user.username })
      })
      .catch(next)
  },

  login(req, res, next) {
    const { identification, password } = req.body
    User.findOne({
      where: {
        [Op.or]: [
          { username: identification },
          { email: identification }
        ]
      }
    })
      .then(user => {
        const valid = compare(password, user.password)
        if (!valid) {
          // invalid password
          next({ msg: "Invalid Username, Email, or Password" })
        } else {
          const payload = {
            id: user.id
          }
          const access_token = sign(payload)
          res
            .status(200)
            .json({ token: access_token, username: user.username })
        }
      })
      .catch(err => {
        // invalid email
        next({ msg: "Invalid Username, Email, or Password" })
      })
  },

  googleSignIn(req, res, next) {
    let email

    client.verifyIdToken({
      idToken: req.body.google_token,
      audience: process.env.CLIENT_ID
    })
      .then(ticket => {
        email = ticket.getPayload().email
        return User.findOne({ where: { email } })
      })
      .then(userData => {
        if (!userData) {
          return User.create({
            username: email,
            email,
            password: process.env.SECRET_PASSWORD
          })
        }
        else {
          return userData
        }
      })
      .then(user => {
        const payload = {
          id: user.id
        }
        const access_token = sign(payload)
        res
          .status(200)
          .json({ token: access_token, username: user.username })
      })
      .catch(next)
  }
}