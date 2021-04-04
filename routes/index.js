const express = require('express');
const wLogger = require('../config/winston-logger');
const router = express.Router();
const admin = require('firebase-admin');

/* GET home page. */

router.get('/', async function(req, res) {
  const db = admin.firestore()

  const snapshot = await db.collection('iot_readings').get();
  const data = []

  snapshot.forEach(doc => {
    data.push(doc.data())
  })

  res.status(200).json(data)
});

router.post('/data/iot_listener', function(req, res) {
  const {suhu = 0, kelembaban_tanah = 0, kelembaban_udara = 0} = req.body || {};

  // Send Data to Server
  const data = {
    suhu,
    kelembaban_tanah,
    kelembaban_udara
  }

  const db = admin.firestore()

  db.collection('iot_readings').add(data)
    .then(
      (docRef) => {
        let msg = `Document added with ID: ${docRef.id}`
        wLogger.info(msg);
        res.status(200).send(msg);
      }
    ).catch(
      error => {
        wLogger.info(`Error adding document: ${error}`);
        res.status(500).send(`Error Message: ${error}. The error has been documented in the server.`)
      }
    )
}) 

module.exports = router;
