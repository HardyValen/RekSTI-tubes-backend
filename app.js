const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs')
const cors = require('cors')

// Router
const indexRouter = require('./routes/index');

// Init Express
const app = express();

app.use(
  cors({
    methods: "GET,POST,PATCH,DELETE,OPTIONS",
    origin: `http://localhost:3000`,
    // credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Morgan and Winston Logging
// Automatically generate logfile if doesn't exist
let logFolder = path.join(__dirname, 'logs');
!fs.existsSync(logFolder) && fs.mkdirSync(logFolder)

// Winston Logging (UTC + 0, nanti masukin ke system constraint)
// Ada di config/winston-logger.js

// Morgan HTTP Logging

// comment this on dev
// let accessLogStream = fs.createWriteStream(path.join(__dirname, 'logs/http.log'), {flags: 'a'})
// app.use(logger('combined', {stream: accessLogStream}))

// comment this on production
app.use(logger('dev'));

// Init Firestore
const admin = require("firebase-admin")
const sa = require("./secret/firebase.json")

admin.initializeApp({
  credential: admin.credential.cert(sa)
})

// Express Routers
app.use('/', indexRouter);

module.exports = app;
