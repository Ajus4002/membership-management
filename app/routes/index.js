const express = require('express');
const dashboardRoutes = require('./dashboard');
const memberRoutes = require('./members');
const eventRoutes = require('./events');

const router = express.Router();

// Admin web app routes
router.use('/dashboard', dashboardRoutes);
router.use('/members', memberRoutes);
router.use('/events', eventRoutes);

module.exports = router; 