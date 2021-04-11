const express = require('express');
const wLogger = require('../config/winston-logger');
const router = express.Router();
const admin = require('firebase-admin');
const moment = require('moment');
const ss = require("simple-statistics");
const momentRandom = require("moment-random");

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
      created_at: new admin.firestore.Timestamp(docData.created_at._seconds, docData.created_at._nanoseconds).toDate()

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
      data.statistics[entry[0]]["Nilai Minimal"] = ss.min(entry[1])
      data.statistics[entry[0]]["Nilai Maksimal"] = ss.max(entry[1])
      data.statistics[entry[0]]["Rentang"] = ss.max(entry[1]) - ss.min(entry[1])
      data.statistics[entry[0]]["Rata-Rata"] = ss.mean(entry[1])
      data.statistics[entry[0]]["Nilai Tengah"] = ss.median(entry[1])
      data.statistics[entry[0]]["Standar Deviasi"] = ss.standardDeviation(entry[1])
    }
  })
  
  return data;
}

// F-01, GET DATA BY DATE
async function getAllDataByDate({
  db, 
  sensor_node, 
  startDate, 
  endDate, 
  limit = null
} = {}) {
  
  const data = {
    objSeries: [],
    statistics: {}
  }

  let m1 = moment(startDate || new Date())
  let m2 = moment(endDate || new Date())

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
      created_at: new admin.firestore.Timestamp(docData.created_at._seconds, docData.created_at._nanoseconds).toDate()
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
      data.statistics[entry[0]]["Nilai Minimal"] = ss.min(entry[1])
      data.statistics[entry[0]]["Nilai Maksimal"] = ss.max(entry[1])
      data.statistics[entry[0]]["Rentang"] = ss.max(entry[1]) - ss.min(entry[1])
      data.statistics[entry[0]]["Rata-Rata"] = ss.mean(entry[1])
      data.statistics[entry[0]]["Nilai Tengah"] = ss.median(entry[1])
      data.statistics[entry[0]]["Standar Deviasi"] = ss.standardDeviation(entry[1])
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
router.get('', async function(req, res) {
  const db = admin.firestore()
  const {
    sensor_node = 'sensor_1',
    start_date = "",
    end_date = "",
    type = "",
    limit= null,
  } = req.query || {};

  switch (type) {
    case "by_start_end_date":  // 01 - GET DATA BY START TO END DATE
      var data = await getAllDataByDate({db, sensor_node, startDate: start_date, endDate: end_date, limit})
      res.status(200).json(data)
      break;

    case "by_start_date": // 02 - GET DATA BY START DATE
      var data = await getAllDataByDate({db, sensor_node, startDate: start_date, endDate: new Date(), limit})
      res.status(200).json(data)
      break;

    case "by_end_date": // 03 - GET DATA BY END DATE, DEFAULT DATE FROM 1st January 2021
      var data = await getAllDataByDate({db, sensor_node, startDate: new Date("January 1, 2021 00:00:00"), endDate: end_date, limit})
      res.status(200).json(data)
      break;
  
    default:  // 00 - GET ALL DATA BY DEFAULT
      var data = await getAllData({db, sensor_node, limit})
      res.status(200).json(data)
      break;
  }

});

// 01. POST IOT DATA
router.post('/iot_listener', function(req, res) {
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
router.post('/faker', function(req, res) {
  const {sensor_node = 'sensor_1'} = req.body || {};
  const db = admin.firestore()
  const batch = db.batch()

  for(let i = 0; i < 50; i++) {
    let m1 = moment();
    let m2 = moment();

    m1.add(-5, "days");
    m1.startOf("day");
    m2.endOf("day");
    
    let date = momentRandom(m2, m1)
    
    const data = {
      suhu: (16 + Math.random() * 20).toFixed(2),
      kelembaban_tanah: (40 + Math.random() * 55).toFixed(2),
      kelembaban_udara: (60 + Math.random() * 40).toFixed(2),
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
