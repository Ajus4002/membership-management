const express = require('express');
const { Op } = require('sequelize');
const { Member, Zone, Payment } = require('../../models');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
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
 * /app/members:
 *   get:
 *     summary: Get all members with filtering and pagination
 *     tags: [Members]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or member ID
 *       - in: query
 *         name: zone
 *         schema:
 *           type: integer
 *         description: Filter by zone ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: membership_type
 *         schema:
 *           type: string
 *         description: Filter by membership type
 *     responses:
 *       200:
 *         description: Members retrieved successfully
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      zone,
      status,
      membership_type
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { is_active: true };

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { member_id: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by zone
    if (zone) {
      whereClause.zone_id = zone;
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by membership type
    if (membership_type) {
      whereClause.membership_type = membership_type;
    }

    const { count, rows: members } = await Member.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Zone,
          as: 'zone',
          attributes: ['id', 'name']
        }
      ],
      attributes: { exclude: ['qr_code'] }, // Don't include QR code in list
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      members,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

/**
 * @swagger
 * /app/members/{id}:
 *   get:
 *     summary: Get member by ID with full details
 *     tags: [Members]
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
 *         description: Member details retrieved successfully
 */
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id, {
      include: [
        {
          model: Zone,
          as: 'zone',
          attributes: ['id', 'name']
        },
        {
          model: Payment,
          as: 'payments',
          attributes: ['id', 'amount', 'payment_type', 'status', 'payment_date'],
          order: [['payment_date', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(member);
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ error: 'Failed to fetch member details' });
  }
});

/**
 * @swagger
 * /app/members:
 *   post:
 *     summary: Create a new member
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *               address:
 *                 type: string
 *               membership_type:
 *                 type: string
 *               zone_id:
 *                 type: integer
 *               expiry_date:
 *                 type: string
 *               profile_image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Member created successfully
 */
router.post('/', 
  authenticateToken, 
  requireAdmin,
  upload.single('profile_image'),
  [
    body('first_name').notEmpty().trim().isLength({ min: 2, max: 50 }),
    body('last_name').notEmpty().trim().isLength({ min: 2, max: 50 }),
    body('email').isEmail().normalizeEmail(),
    body('phone').notEmpty().trim(),
    body('date_of_birth').isISO8601(),
    body('address').notEmpty().trim(),
    body('membership_type').isIn(['basic', 'premium', 'vip', 'lifetime']),
    body('zone_id').isInt({ min: 1 }),
    body('expiry_date').isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Generate unique member ID
      const memberId = `MEM${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const memberData = {
        ...req.body,
        member_id: memberId,
        profile_image: req.file ? `/uploads/${req.file.filename}` : null
      };

      const member = await Member.create(memberData);

      res.status(201).json({
        message: 'Member created successfully',
        member: {
          id: member.id,
          member_id: member.member_id,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          qr_code: member.qr_code
        }
      });
    } catch (error) {
      console.error('Create member error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'Email or member ID already exists' });
      }
      res.status(500).json({ error: 'Failed to create member' });
    }
  }
);

/**
 * @swagger
 * /app/members/{id}:
 *   put:
 *     summary: Update member details
 *     tags: [Members]
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
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *               address:
 *                 type: string
 *               membership_type:
 *                 type: string
 *               zone_id:
 *                 type: integer
 *               expiry_date:
 *                 type: string
 *               status:
 *                 type: string
 *               profile_image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Member updated successfully
 */
router.put('/:id',
  authenticateToken,
  requireAdmin,
  upload.single('profile_image'),
  [
    body('first_name').optional().trim().isLength({ min: 2, max: 50 }),
    body('last_name').optional().trim().isLength({ min: 2, max: 50 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('date_of_birth').optional().isISO8601(),
    body('address').optional().trim(),
    body('membership_type').optional().isIn(['basic', 'premium', 'vip', 'lifetime']),
    body('zone_id').optional().isInt({ min: 1 }),
    body('expiry_date').optional().isISO8601(),
    body('status').optional().isIn(['active', 'inactive', 'suspended', 'expired'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const member = await Member.findByPk(req.params.id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const updateData = { ...req.body };
      if (req.file) {
        updateData.profile_image = `/uploads/${req.file.filename}`;
      }

      await member.update(updateData);

      res.json({
        message: 'Member updated successfully',
        member: {
          id: member.id,
          member_id: member.member_id,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          qr_code: member.qr_code
        }
      });
    } catch (error) {
      console.error('Update member error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: 'Failed to update member' });
    }
  }
);

/**
 * @swagger
 * /app/members/{id}/disable:
 *   patch:
 *     summary: Disable a member
 *     tags: [Members]
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
 *         description: Member disabled successfully
 */
router.patch('/:id/disable', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await member.update({ 
      is_active: false,
      status: 'inactive'
    });

    res.json({ message: 'Member disabled successfully' });
  } catch (error) {
    console.error('Disable member error:', error);
    res.status(500).json({ error: 'Failed to disable member' });
  }
});

/**
 * @swagger
 * /app/members/{id}/qr-code:
 *   get:
 *     summary: Get member QR code
 *     tags: [Members]
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
 *         description: QR code retrieved successfully
 */
router.get('/:id/qr-code', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id, {
      attributes: ['id', 'member_id', 'first_name', 'last_name', 'membership_type', 'qr_code']
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({
      member_id: member.member_id,
      name: `${member.first_name} ${member.last_name}`,
      membership_type: member.membership_type,
      qr_code: member.qr_code
    });
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

module.exports = router; 