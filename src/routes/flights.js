const express = require('express');
const createFlightController = require('../controllers/createFlightController');
const FlyJinnahFlight = require('../models/FlyJinnahFlight');

const { receiveFlights } = createFlightController(FlyJinnahFlight, 'Fly Jinnah');

const router = express.Router();

router.post('/flights', receiveFlights);

module.exports = router;
