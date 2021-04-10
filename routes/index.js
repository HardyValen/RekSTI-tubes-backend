const express = require('express');
const wLogger = require('../config/winston-logger');
const router = express.Router();
const admin = require('firebase-admin');
const moment = require('moment');
const ss = require("simple-statistics");
const { data } = require('../config/winston-logger');

// F-00, GET ALL DATA
async function getAllData({db, sensor_node, limit = null} = {}) {
  const data = {
    objSeries: [],
    statistics: {}
  }

  let snapshot = await db.collection(sensor_node)
    .orderBy("created_at", "desc");
  
  if (limit) {
    snapshot = await snapshot.limit(parseInt(limit, 10))
  }

  snapshot = await snapshot.get();
  
  let seriesTemp = {
    suhu: [],
    kelembaban_tanah: [],
    kelembaban_udara: []
  }

  snapshot.forEach(doc => {
    let docData = doc.data();
    
    // Parse Int
    docData = {
      suhu: parseFloat(docData.suhu),
      kelembaban_tanah: parseFloat(docData.kelembaban_tanah),
      kelembaban_udara: parseFloat(docData.kelembaban_udara),
      created_at: docData.created_at
    }

    // Push Data
    data.objSeries.push(docData)

    // Push Series Temp
    seriesTemp.suhu.push(docData.suhu)
    seriesTemp.kelembaban_tanah.push(docData.kelembaban_tanah)
    seriesTemp.kelembaban_udara.push(docData.kelembaban_udara)
  })

  // Determine statistics
  Object.entries(seriesTemp).forEach(entry => {
    if (entry[1].length > 0) {
      data.statistics[entry[0]] = {}
      data.statistics[entry[0]].min = ss.min(entry[1])
      data.statistics[entry[0]].max = ss.max(entry[1])
      data.statistics[entry[0]].range = ss.max(entry[1]) - ss.min(entry[1])
      data.statistics[entry[0]].mean = ss.mean(entry[1])
      data.statistics[entry[0]].median = ss.median(entry[1])
      data.statistics[entry[0]].standardDeviation = ss.standardDeviation(entry[1])
    }
  })
  
  return data;
}

// F-01, GET DATA BY DATE
async function getAllDataByDate({db, sensor_node, date, limit = null} = {}) {
  const data = {
    objSeries: [],
    statistics: {}
  }

  let m1 = moment(date || new Date())
  let m2 = moment(date || new Date())

  m1.startOf("day")
  m2.endOf("day")
  
  let snapshot = await db.collection(sensor_node)
    .orderBy("created_at", "desc")
    .where("created_at", ">", m1.toDate())
    .where("created_at", "<=", m2.toDate())
  
  if (limit) {
    snapshot = await snapshot.limit(parseInt(limit, 10))
  }

  snapshot = await snapshot.get();

  let seriesTemp = {
    suhu: [],
    kelembaban_tanah: [],
    kelembaban_udara: []
  }

  snapshot.forEach(doc => {
    let docData = doc.data();
    
     // Parse Int
     docData = {
      suhu: parseFloat(docData.suhu),
      kelembaban_tanah: parseFloat(docData.kelembaban_tanah),
      kelembaban_udara: parseFloat(docData.kelembaban_udara),
      created_at: docData.created_at
    }

    // Push Data
    data.objSeries.push(docData)

    // Push Series Temp
    seriesTemp.suhu.push(docData.suhu)
    seriesTemp.kelembaban_tanah.push(docData.kelembaban_tanah)
    seriesTemp.kelembaban_udara.push(docData.kelembaban_udara)
  })

  // Determine statistics
  Object.entries(seriesTemp).forEach(entry => {
    if (entry[1].length > 0) {
      data.statistics[entry[0]] = {}
      data.statistics[entry[0]].min = ss.min(entry[1])
      data.statistics[entry[0]].max = ss.max(entry[1])
      data.statistics[entry[0]].range = ss.max(entry[1]) - ss.min(entry[1])
      data.statistics[entry[0]].mean = ss.mean(entry[1])
      data.statistics[entry[0]].median = ss.median(entry[1])
      data.statistics[entry[0]].standardDeviation = ss.standardDeviation(entry[1])
    }
  })

  // snapshot.forEach(doc => {
  //   data.push(doc.data())
  // })

  // let data = 0;
  // snapshot.forEach(doc => {data++})

  return data
}

// 00. GET DATA FROM CERTAIN COLLECTION WITH QUERY
router.get('/', async function(req, res) {
  const db = admin.firestore()
  const {
    sensor_node = 'sensor_1',
    date = "",
    type = "",
    limit= null,
  } = req.query || {};

  switch (type) {
    case "day":  // 01 - GET DATA BY DAY
      var data = await getAllDataByDate({db, sensor_node, date, limit})
      res.status(200).json(data)
      break;
  
    default:  // 00 - GET ALL DATA BY DEFAULT
      var data = await getAllData({db, sensor_node, limit})
      res.status(200).json(data)
      break;
  }

});

// 01. POST IOT DATA
router.post('/data/iot_listener', function(req, res) {
  const {suhu = 0, kelembaban_tanah = 0, kelembaban_udara = 0, sensor_node = 'sensor_1'} = req.body || {};
  let date = new Date()

  date.setDate(date.getDate() + 2)

  // Send Data to Server
  const data = {
    suhu,
    kelembaban_tanah,
    kelembaban_udara,
    created_at: admin.firestore.Timestamp.fromDate(date).toDate()
  }

  const db = admin.firestore()

  db.collection(sensor_node).add(data)
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

// 02. GENERATE FAKER DATA
router.post('/data/faker', function(req, res) {
  const {sensor_node = 'sensor_1'} = req.body || {};
  const db = admin.firestore()
  const batch = db.batch()

  for(let i = 0; i < 50; i++) {
    let date = new Date()
    date.setDate(date.getDate() - (Math.floor(Math.random() * 6)))
    
    const data = {
      suhu: (16 + Math.random() * 20).toFixed(2),
      kelembaban_tanah: (Math.random() * 100).toFixed(2),
      kelembaban_udara: (Math.random() * 100).toFixed(2),
      created_at: date
    }
    
    var docRef = db.collection(sensor_node).doc()
    batch.set(docRef, data)
  }

  batch.commit()
  .then(() => {
    res.status(200).send("Faker Generated Successfully");
  })
  .catch(err => {
    res.status(500).send(err)
  })
}) 

module.exports = router;
