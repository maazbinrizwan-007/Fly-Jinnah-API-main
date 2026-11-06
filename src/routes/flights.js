const express = require('express');
const { receiveFlights, dumpFlights, deleteFlights } = require('../controllers/flightController');

const router = express.Router();

router.post('/flights', receiveFlights);
router.get('/dump_flyjinnah_data', dumpFlights);
router.delete('/delete_flyjinnah_data', deleteFlights);

module.exports = router;
