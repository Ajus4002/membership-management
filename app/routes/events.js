const express = require('express');
const { Op } = require('sequelize');
const { Event, EventAttendance, Member, Payment } = require('../../models');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for event image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/events/');
  },
  filename: (req, file, cb) => {
    cb(null, `event_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * @swagger
 * /app/events:
 *   get:
 *     summary: Get all events with filtering and pagination
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Filter by event status
 *       - in: query
 *         name: event_type
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *         description: Filter events from date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *         description: Filter events to date
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      event_type,
      date_from,
      date_to
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { is_active: true };

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by event type
    if (event_type) {
      whereClause.event_type = event_type;
    }

    // Filter by date range
    if (date_from || date_to) {
      whereClause.event_date = {};
      if (date_from) {
        whereClause.event_date[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        whereClause.event_date[Op.lte] = new Date(date_to);
      }
    }

    const { count, rows: events } = await Event.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: EventAttendance,
          as: 'attendances',
          attributes: ['id', 'status'],
          include: [
            {
              model: Member,
              as: 'member',
              attributes: ['id', 'first_name', 'last_name', 'member_id']
            }
          ]
        }
      ],
      order: [['event_date', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Add attendance count to each event
    const eventsWithStats = events.map(event => {
      const eventData = event.toJSON();
      eventData.total_registrations = event.attendances.length;
      eventData.attended_count = event.attendances.filter(a => a.status === 'attended').length;
      eventData.no_show_count = event.attendances.filter(a => a.status === 'no_show').length;
      return eventData;
    });

    res.json({
      events: eventsWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * @swagger
 * /app/events/{id}:
 *   get:
 *     summary: Get event by ID with full details
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Event details retrieved successfully
 */
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [
        {
          model: EventAttendance,
          as: 'attendances',
          include: [
            {
              model: Member,
              as: 'member',
              attributes: ['id', 'first_name', 'last_name', 'member_id', 'email', 'phone']
            },
            {
              model: Payment,
              as: 'payment',
              attributes: ['id', 'amount', 'status', 'payment_method']
            }
          ]
        }
      ]
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

/**
 * @swagger
 * /app/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               event_date:
 *                 type: string
 *               end_date:
 *                 type: string
 *               location:
 *                 type: string
 *               event_type:
 *                 type: string
 *               max_attendees:
 *                 type: integer
 *               registration_fee:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Event created successfully
 */
router.post('/', 
  authenticateToken, 
  requireAdmin,
  upload.single('image'),
  [
    body('title').notEmpty().trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim(),
    body('event_date').isISO8601(),
    body('end_date').optional().isISO8601(),
    body('location').notEmpty().trim(),
    body('event_type').isIn(['meeting', 'workshop', 'social', 'training', 'conference']),
    body('max_attendees').optional().isInt({ min: 1 }),
    body('registration_fee').optional().isFloat({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const eventData = {
        ...req.body,
        image_url: req.file ? `/uploads/events/${req.file.filename}` : null
      };

      const event = await Event.create(eventData);

      res.status(201).json({
        message: 'Event created successfully',
        event
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);

/**
 * @swagger
 * /app/events/{id}:
 *   put:
 *     summary: Update event details
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               event_date:
 *                 type: string
 *               end_date:
 *                 type: string
 *               location:
 *                 type: string
 *               event_type:
 *                 type: string
 *               max_attendees:
 *                 type: integer
 *               registration_fee:
 *                 type: number
 *               status:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Event updated successfully
 */
router.put('/:id',
  authenticateToken,
  requireAdmin,
  upload.single('image'),
  [
    body('title').optional().trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim(),
    body('event_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('location').optional().trim(),
    body('event_type').optional().isIn(['meeting', 'workshop', 'social', 'training', 'conference']),
    body('max_attendees').optional().isInt({ min: 1 }),
    body('registration_fee').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['upcoming', 'ongoing', 'completed', 'cancelled'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const event = await Event.findByPk(req.params.id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const updateData = { ...req.body };
      if (req.file) {
        updateData.image_url = `/uploads/events/${req.file.filename}`;
      }

      await event.update(updateData);

      res.json({
        message: 'Event updated successfully',
        event
      });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

/**
 * @swagger
 * /app/events/{id}/attendance:
 *   post:
 *     summary: Record event attendance
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               member_id:
 *                 type: integer
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Attendance recorded successfully
 */
router.post('/:id/attendance', 
  authenticateToken, 
  requireAdmin,
  [
    body('member_id').isInt({ min: 1 }),
    body('status').isIn(['registered', 'attended', 'no_show', 'cancelled']),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { member_id, status, notes } = req.body;
      const event_id = req.params.id;

      // Check if event exists
      const event = await Event.findByPk(event_id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if member exists
      const member = await Member.findByPk(member_id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      // Check if attendance already exists
      const existingAttendance = await EventAttendance.findOne({
        where: { event_id, member_id }
      });

      if (existingAttendance) {
        // Update existing attendance
        await existingAttendance.update({
          status,
          notes,
          attendance_date: status === 'attended' ? new Date() : null
        });
      } else {
        // Create new attendance record
        await EventAttendance.create({
          event_id,
          member_id,
          status,
          notes,
          attendance_date: status === 'attended' ? new Date() : null
        });
      }

      res.json({ message: 'Attendance recorded successfully' });
    } catch (error) {
      console.error('Record attendance error:', error);
      res.status(500).json({ error: 'Failed to record attendance' });
    }
  }
);

/**
 * @swagger
 * /app/events/{id}/attendance:
 *   get:
 *     summary: Get event attendance list
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Event attendance list retrieved successfully
 */
router.get('/:id/attendance', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const attendances = await EventAttendance.findAll({
      where: { event_id: req.params.id },
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'first_name', 'last_name', 'member_id', 'email', 'phone']
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'amount', 'status', 'payment_method']
        }
      ],
      order: [['registration_date', 'ASC']]
    });

    res.json(attendances);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance list' });
  }
});

/**
 * @swagger
 * /app/events/{id}/payments:
 *   get:
 *     summary: Get event payment tracking
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Event payment tracking retrieved successfully
 */
router.get('/:id/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const payments = await Payment.findAll({
      include: [
        {
          model: EventAttendance,
          as: 'eventAttendance',
          where: { event_id: req.params.id },
          include: [
            {
              model: Member,
              as: 'member',
              attributes: ['id', 'first_name', 'last_name', 'member_id']
            }
          ]
        }
      ],
      where: {
        payment_type: 'event_fee',
        status: 'completed'
      },
      order: [['payment_date', 'DESC']]
    });

    const totalRevenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    res.json({
      payments,
      totalRevenue,
      totalPayments: payments.length
    });
  } catch (error) {
    console.error('Get event payments error:', error);
    res.status(500).json({ error: 'Failed to fetch event payments' });
  }
});

module.exports = router; 