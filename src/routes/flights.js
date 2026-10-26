const express = require('express');
const { receiveFlights } = require('../controllers/flightController');

const router = express.Router();

router.post('/flights', receiveFlights);

module.exports = router;
