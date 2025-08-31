// src/routes/domainRoutes.js
const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domainController');


router.get('/majors', domainController.getMajorDomains);

module.exports = router;