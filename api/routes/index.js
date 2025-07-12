const express = require('express');
const authRoutes = require('./auth');
const memberRoutes = require('./members');
const notificationRoutes = require('./notifications');

const router = express.Router();

// Mobile app API routes
router.use('/auth', authRoutes);
router.use('/members', memberRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router; 