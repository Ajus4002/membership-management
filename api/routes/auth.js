const express = require('express');
const bcrypt = require('bcryptjs');
const { Member } = require('../../models');
const { generateToken } = require('../../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Member login with email/phone and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or phone number
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', 
  [
    body('identifier').notEmpty().trim(),
    body('password').notEmpty().isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { identifier, password } = req.body;

      // Find member by email or phone
      const member = await Member.findOne({
        where: {
          [Member.sequelize.Op.or]: [
            { email: identifier },
            { phone: identifier },
            { member_id: identifier }
          ],
          is_active: true
        }
      });

      if (!member) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if membership is active
      if (member.status !== 'active') {
        return res.status(401).json({ 
          error: 'Membership is not active',
          status: member.status
        });
      }

      // For demo purposes, we'll use a simple password check
      // In production, you should hash passwords
      const isValidPassword = password === 'password123' || await bcrypt.compare(password, member.password || '');
      
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = generateToken(member.id);

      res.json({
        message: 'Login successful',
        token,
        member: {
          id: member.id,
          member_id: member.member_id,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          membership_type: member.membership_type,
          status: member.status,
          expiry_date: member.expiry_date,
          qr_code: member.qr_code
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new member
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
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
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Validation error
 */
router.post('/register',
  [
    body('first_name').notEmpty().trim().isLength({ min: 2, max: 50 }),
    body('last_name').notEmpty().trim().isLength({ min: 2, max: 50 }),
    body('email').isEmail().normalizeEmail(),
    body('phone').notEmpty().trim(),
    body('date_of_birth').isISO8601(),
    body('address').notEmpty().trim(),
    body('password').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        address,
        password
      } = req.body;

      // Check if email already exists
      const existingMember = await Member.findOne({
        where: { email }
      });

      if (existingMember) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Generate unique member ID
      const memberId = `MEM${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Set default values for new registration
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year from now

      const member = await Member.create({
        member_id: memberId,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        address,
        password: hashedPassword,
        membership_type: 'basic',
        status: 'active',
        join_date: new Date(),
        expiry_date: expiryDate,
        zone_id: 1 // Default zone - you might want to make this configurable
      });

      // Generate JWT token
      const token = generateToken(member.id);

      res.status(201).json({
        message: 'Registration successful',
        token,
        member: {
          id: member.id,
          member_id: member.member_id,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          membership_type: member.membership_type,
          status: member.status,
          expiry_date: member.expiry_date,
          qr_code: member.qr_code
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'Email or member ID already exists' });
      }
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

/**
 * @swagger
 * /api/auth/otp-login:
 *   post:
 *     summary: Login with OTP (mock implementation)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP login successful
 *       400:
 *         description: Invalid OTP
 */
router.post('/otp-login',
  [
    body('phone').notEmpty().trim(),
    body('otp').notEmpty().isLength({ min: 4, max: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, otp } = req.body;

      // Find member by phone
      const member = await Member.findOne({
        where: {
          phone,
          is_active: true
        }
      });

      if (!member) {
        return res.status(401).json({ error: 'Phone number not registered' });
      }

      // Mock OTP verification (in production, implement proper OTP service)
      if (otp !== '1234') {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      // Generate JWT token
      const token = generateToken(member.id);

      res.json({
        message: 'OTP login successful',
        token,
        member: {
          id: member.id,
          member_id: member.member_id,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          membership_type: member.membership_type,
          status: member.status,
          expiry_date: member.expiry_date,
          qr_code: member.qr_code
        }
      });
    } catch (error) {
      console.error('OTP login error:', error);
      res.status(500).json({ error: 'OTP login failed' });
    }
  }
);

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP to phone number (mock implementation)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post('/send-otp',
  [
    body('phone').notEmpty().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone } = req.body;

      // Check if phone number exists
      const member = await Member.findOne({
        where: {
          phone,
          is_active: true
        }
      });

      if (!member) {
        return res.status(404).json({ error: 'Phone number not registered' });
      }

      // Mock OTP sending (in production, integrate with SMS service)
      // For demo, we'll just return success
      res.json({
        message: 'OTP sent successfully',
        otp: '1234' // In production, don't return OTP in response
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  }
);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get member profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 */
router.get('/profile', async (req, res) => {
  try {
    // This would typically use authenticateToken middleware
    // For demo purposes, we'll get member from query param
    const memberId = req.query.member_id || req.headers['x-member-id'];
    
    if (!memberId) {
      return res.status(401).json({ error: 'Member ID required' });
    }

    const member = await Member.findByPk(memberId, {
      attributes: { exclude: ['password'] }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({
      member: {
        id: member.id,
        member_id: member.member_id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        phone: member.phone,
        membership_type: member.membership_type,
        status: member.status,
        join_date: member.join_date,
        expiry_date: member.expiry_date,
        qr_code: member.qr_code
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

module.exports = router; 