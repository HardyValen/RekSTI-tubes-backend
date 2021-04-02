const express = require('express');
const router = express.Router();

/* GET home page. */
const initFirestore = () => {
  const admin = require("firebase-admin")
  const sa = require("../secret/firebase.json")

  admin.initializeApp({
    credential: admin.credential.cert(sa)
  })

  return admin
}

router.get('/', async function(req, res) {
  const admin = initFirestore()
  const db = admin.firestore()

  const snapshot = await db.collection('test-data').get();
  const data = []

  snapshot.forEach(doc => {
    data.push(doc.data())
  })

  res.status(200).json(data)
});

module.exports = router;
