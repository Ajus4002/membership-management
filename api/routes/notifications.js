const express = require('express');
const { Op } = require('sequelize');
const { Notification, Member, Event } = require('../../models');
const { body, validationResult } = require('express-validator');
const moment = require('moment');

const router = express.Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get member's notifications
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: member_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by notification status
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    const { member_id, page = 1, limit = 10, status } = req.query;
    
    if (!member_id) {
      return res.status(400).json({ error: 'Member ID required' });
    }

    const offset = (page - 1) * limit;
    const whereClause = {
      [Op.or]: [
        { member_id: parseInt(member_id) },
        { is_broadcast: true }
      ]
    };

    if (status) {
      whereClause.status = status;
    }

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.update({
      status: 'read',
      read_at: new Date()
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: member_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 */
router.get('/unread-count', async (req, res) => {
  try {
    const { member_id } = req.query;
    
    if (!member_id) {
      return res.status(400).json({ error: 'Member ID required' });
    }

    const count = await Notification.count({
      where: {
        [Op.or]: [
          { member_id: parseInt(member_id) },
          { is_broadcast: true }
        ],
        status: 'unread'
      }
    });

    res.json({ unread_count: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               member_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch('/mark-all-read',
  [
    body('member_id').isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { member_id } = req.body;

      await Notification.update(
        {
          status: 'read',
          read_at: new Date()
        },
        {
          where: {
            [Op.or]: [
              { member_id },
              { is_broadcast: true }
            ],
            status: 'unread'
          }
        }
      );

      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Mark all read error:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  }
);

/**
 * @swagger
 * /api/notifications/event-reminder:
 *   post:
 *     summary: Send event reminder notification
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event_id:
 *                 type: integer
 *               member_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Event reminder sent successfully
 */
router.post('/event-reminder',
  [
    body('event_id').isInt({ min: 1 }),
    body('member_ids').isArray({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, member_ids } = req.body;

      // Get event details
      const event = await Event.findByPk(event_id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Create notifications for each member
      const notifications = member_ids.map(member_id => ({
        member_id,
        title: 'Event Reminder',
        message: `Reminder: ${event.title} is scheduled for ${moment(event.event_date).format('MMMM Do YYYY, h:mm a')} at ${event.location}`,
        type: 'event_reminder',
        status: 'unread',
        scheduled_at: new Date()
      }));

      await Notification.bulkCreate(notifications);

      res.json({
        message: 'Event reminder sent successfully',
        notifications_sent: notifications.length
      });
    } catch (error) {
      console.error('Send event reminder error:', error);
      res.status(500).json({ error: 'Failed to send event reminder' });
    }
  }
);

/**
 * @swagger
 * /api/notifications/membership-expiry:
 *   post:
 *     summary: Send membership expiry notification
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               member_id:
 *                 type: integer
 *               days_until_expiry:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Membership expiry notification sent successfully
 */
router.post('/membership-expiry',
  [
    body('member_id').isInt({ min: 1 }),
    body('days_until_expiry').isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { member_id, days_until_expiry } = req.body;

      // Get member details
      const member = await Member.findByPk(member_id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      let message;
      if (days_until_expiry === 0) {
        message = `Your membership has expired today. Please renew to continue enjoying our services.`;
      } else if (days_until_expiry <= 7) {
        message = `Your membership will expire in ${days_until_expiry} day(s). Please renew to avoid interruption of services.`;
      } else {
        message = `Your membership will expire on ${moment(member.expiry_date).format('MMMM Do YYYY')}. Consider renewing early.`;
      }

      const notification = await Notification.create({
        member_id,
        title: 'Membership Expiry Notice',
        message,
        type: 'membership_expiry',
        status: 'unread',
        scheduled_at: new Date()
      });

      res.json({
        message: 'Membership expiry notification sent successfully',
        notification
      });
    } catch (error) {
      console.error('Send membership expiry notification error:', error);
      res.status(500).json({ error: 'Failed to send membership expiry notification' });
    }
  }
);

/**
 * @swagger
 * /api/notifications/announcement:
 *   post:
 *     summary: Send announcement to all members
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Announcement sent successfully
 */
router.post('/announcement',
  [
    body('title').notEmpty().trim(),
    body('message').notEmpty().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, message } = req.body;

      // Get all active members
      const members = await Member.findAll({
        where: { is_active: true },
        attributes: ['id']
      });

      // Create broadcast notification
      const notification = await Notification.create({
        title,
        message,
        type: 'announcement',
        status: 'unread',
        is_broadcast: true,
        scheduled_at: new Date()
      });

      res.json({
        message: 'Announcement sent successfully',
        notification,
        members_reached: members.length
      });
    } catch (error) {
      console.error('Send announcement error:', error);
      res.status(500).json({ error: 'Failed to send announcement' });
    }
  }
);

/**
 * @swagger
 * /api/notifications/settings:
 *   get:
 *     summary: Get notification settings for member
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: member_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification settings retrieved successfully
 */
router.get('/settings', async (req, res) => {
  try {
    const { member_id } = req.query;
    
    if (!member_id) {
      return res.status(400).json({ error: 'Member ID required' });
    }

    // For demo purposes, return default settings
    // In production, you might have a separate settings table
    res.json({
      settings: {
        event_reminders: true,
        membership_expiry: true,
        announcements: true,
        email_notifications: true,
        push_notifications: true
      }
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
});

module.exports = router; 