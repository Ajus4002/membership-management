const jwt = require('jsonwebtoken');
const { Member } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const member = await Member.findByPk(decoded.memberId);
    
    if (!member || !member.is_active) {
      return res.status(401).json({ error: 'Invalid or inactive member' });
    }

    req.member = member;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Check if member is admin (you can customize this based on your admin logic)
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.member) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // For demo purposes, consider members with 'vip' or 'lifetime' membership as admins
    // You can modify this logic based on your requirements
    const isAdmin = ['vip', 'lifetime'].includes(req.member.membership_type);
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authorization error' });
  }
};

// Generate JWT token
const generateToken = (memberId) => {
  return jwt.sign({ memberId }, JWT_SECRET, { expiresIn: '24h' });
};

module.exports = {
  authenticateToken,
  requireAdmin,
  generateToken
}; 