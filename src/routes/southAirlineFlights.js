const express = require('express');
const createFlightController = require('../controllers/createFlightController');
const SouthAirlineFlight = require('../models/SouthAirlineFlight');

const { receiveFlights } = createFlightController(SouthAirlineFlight, 'South Airline');

const router = express.Router();

router.post('/flights', receiveFlights);

module.exports = router;
