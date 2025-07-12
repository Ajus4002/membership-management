const express = require('express');
const { Op } = require('sequelize');
const { Member, Event, Payment, EventAttendance } = require('../../models');
const { body, validationResult } = require('express-validator');
const moment = require('moment');

const router = express.Router();

/**
 * @swagger
 * /api/members/home:
 *   get:
 *     summary: Get member home page data
 *     tags: [Mobile Members]
 *     parameters:
 *       - in: query
 *         name: member_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Home page data retrieved successfully
 */
router.get('/home', async (req, res) => {
  try {
    const memberId = req.query.member_id;
    
    if (!memberId) {
      return res.status(400).json({ error: 'Member ID required' });
    }

    const member = await Member.findByPk(memberId, {
      attributes: { exclude: ['password'] }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Get next upcoming event
    const nextEvent = await Event.findOne({
      where: {
        event_date: {
          [Op.gte]: new Date()
        },
        status: 'upcoming',
        is_active: true
      },
      order: [['event_date', 'ASC']]
    });

    // Get recent payments
    const recentPayments = await Payment.findAll({
      where: {
        member_id: memberId,
        status: 'completed'
      },
      order: [['payment_date', 'DESC']],
      limit: 5
    });

    // Check membership status
    const isExpired = moment(member.expiry_date).isBefore(moment());
    const daysUntilExpiry = moment(member.expiry_date).diff(moment(), 'days');

    res.json({
      member: {
        id: member.id,
        member_id: member.member_id,
        first_name: member.first_name,
        last_name: member.last_name,
        membership_type: member.membership_type,
        status: member.status,
        expiry_date: member.expiry_date,
        qr_code: member.qr_code,
        is_expired: isExpired,
        days_until_expiry: daysUntilExpiry
      },
      next_event: nextEvent,
      recent_payments: recentPayments,
      quick_actions: [
        { id: 'renew', title: 'Renew Membership', icon: 'refresh' },
        { id: 'benefits', title: 'View Benefits', icon: 'gift' },
        { id: 'donate', title: 'Donate', icon: 'heart' },
        { id: 'events', title: 'View Events', icon: 'calendar' }
      ]
    });
  } catch (error) {
    console.error('Get home data error:', error);
    res.status(500).json({ error: 'Failed to get home data' });
  }
});

/**
 * @swagger
 * /api/members/card:
 *   get:
 *     summary: Get member card with QR code
 *     tags: [Mobile Members]
 *     parameters:
 *       - in: query
 *         name: member_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Member card retrieved successfully
 */
router.get('/card', async (req, res) => {
  try {
    const memberId = req.query.member_id;
    
    if (!memberId) {
      return res.status(400).json({ error: 'Member ID required' });
    }

    const member = await Member.findByPk(memberId, {
      attributes: ['id', 'member_id', 'first_name', 'last_name', 'membership_type', 'status', 'expiry_date', 'qr_code']
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const isExpired = moment(member.expiry_date).isBefore(moment());

    res.json({
      member_card: {
        member_id: member.member_id,
        name: `${member.first_name} ${member.last_name}`,
        membership_type: member.membership_type,
        status: member.status,
        expiry_date: member.expiry_date,
        is_expired: isExpired,
        qr_code: member.qr_code
      }
    });
  } catch (error) {
    console.error('Get member card error:', error);
    res.status(500).json({ error: 'Failed to get member card' });
  }
});

/**
 * @swagger
 * /api/members/renewal:
 *   post:
 *     summary: Renew membership
 *     tags: [Mobile Members]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               member_id:
 *                 type: integer
 *               membership_type:
 *                 type: string
 *               payment_method:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Membership renewed successfully
 */
router.post('/renewal',
  [
    body('member_id').isInt({ min: 1 }),
    body('membership_type').isIn(['basic', 'premium', 'vip', 'lifetime']),
    body('payment_method').isIn(['cash', 'card', 'bank_transfer', 'online']),
    body('amount').isFloat({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { member_id, membership_type, payment_method, amount } = req.body;

      const member = await Member.findByPk(member_id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      // Calculate new expiry date (1 year from current expiry or now)
      const currentExpiry = moment(member.expiry_date);
      const newExpiry = currentExpiry.isBefore(moment()) 
        ? moment().add(1, 'year') 
        : currentExpiry.add(1, 'year');

      // Create payment record
      const payment = await Payment.create({
        member_id,
        amount,
        payment_type: 'renewal',
        payment_method,
        status: 'completed',
        transaction_id: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
        payment_date: new Date(),
        description: `Membership renewal - ${membership_type}`
      });

      // Update member
      await member.update({
        membership_type,
        status: 'active',
        expiry_date: newExpiry.toDate()
      });

      res.json({
        message: 'Membership renewed successfully',
        payment: {
          id: payment.id,
          amount: payment.amount,
          transaction_id: payment.transaction_id,
          payment_date: payment.payment_date
        },
        member: {
          membership_type: member.membership_type,
          status: member.status,
          expiry_date: member.expiry_date
        }
      });
    } catch (error) {
      console.error('Renewal error:', error);
      res.status(500).json({ error: 'Failed to renew membership' });
    }
  }
);

/**
 * @swagger
 * /api/members/events:
 *   get:
 *     summary: Get member's events
 *     tags: [Mobile Members]
 *     parameters:
 *       - in: query
 *         name: member_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by event status
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 */
router.get('/events', async (req, res) => {
  try {
    const { member_id, status } = req.query;
    
    if (!member_id) {
      return res.status(400).json({ error: 'Member ID required' });
    }

    const whereClause = { member_id };
    if (status) {
      whereClause.status = status;
    }

    const attendances = await EventAttendance.findAll({
      where: whereClause,
      include: [
        {
          model: Event,
          as: 'event',
          where: { is_active: true },
          attributes: ['id', 'title', 'description', 'event_date', 'location', 'event_type', 'registration_fee']
        }
      ],
      order: [['registration_date', 'DESC']]
    });

    res.json({
      events: attendances.map(attendance => ({
        id: attendance.event.id,
        title: attendance.event.title,
        description: attendance.event.description,
        event_date: attendance.event.event_date,
        location: attendance.event.location,
        event_type: attendance.event.event_type,
        registration_fee: attendance.event.registration_fee,
        attendance_status: attendance.status,
        registration_date: attendance.registration_date
      }))
    });
  } catch (error) {
    console.error('Get member events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

/**
 * @swagger
 * /api/members/register-event:
 *   post:
 *     summary: Register for an event
 *     tags: [Mobile Members]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               member_id:
 *                 type: integer
 *               event_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Event registration successful
 */
router.post('/register-event',
  [
    body('member_id').isInt({ min: 1 }),
    body('event_id').isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { member_id, event_id } = req.body;

      // Check if member exists
      const member = await Member.findByPk(member_id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      // Check if event exists
      const event = await Event.findByPk(event_id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if event is full
      if (event.max_attendees) {
        const currentAttendees = await EventAttendance.count({
          where: { event_id, status: 'registered' }
        });
        if (currentAttendees >= event.max_attendees) {
          return res.status(400).json({ error: 'Event is full' });
        }
      }

      // Check if already registered
      const existingRegistration = await EventAttendance.findOne({
        where: { member_id, event_id }
      });

      if (existingRegistration) {
        return res.status(400).json({ error: 'Already registered for this event' });
      }

      // Create registration
      const registration = await EventAttendance.create({
        member_id,
        event_id,
        status: 'registered',
        registration_date: new Date()
      });

      res.json({
        message: 'Event registration successful',
        registration: {
          id: registration.id,
          status: registration.status,
          registration_date: registration.registration_date
        }
      });
    } catch (error) {
      console.error('Event registration error:', error);
      res.status(500).json({ error: 'Failed to register for event' });
    }
  }
);

/**
 * @swagger
 * /api/members/payments:
 *   get:
 *     summary: Get member's payment history
 *     tags: [Mobile Members]
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
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 */
router.get('/payments', async (req, res) => {
  try {
    const { member_id, page = 1, limit = 10 } = req.query;
    
    if (!member_id) {
      return res.status(400).json({ error: 'Member ID required' });
    }

    const offset = (page - 1) * limit;

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: { member_id },
      order: [['payment_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

module.exports = router; 