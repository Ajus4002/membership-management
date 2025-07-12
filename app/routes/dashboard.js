const express = require('express');
const { Op } = require('sequelize');
const { Member, Payment, Event, Zone } = require('../../models');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const moment = require('moment');

const router = express.Router();

/**
 * @swagger
 * /app/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalMembers:
 *                   type: integer
 *                 activeMembers:
 *                   type: integer
 *                 pendingRenewals:
 *                   type: integer
 *                 recentPayments:
 *                   type: array
 *                 membershipDistribution:
 *                   type: object
 *                 monthlyStats:
 *                   type: array
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = moment().add(30, 'days').toDate();

    // Total members
    const totalMembers = await Member.count({
      where: { is_active: true }
    });

    // Active members
    const activeMembers = await Member.count({
      where: {
        is_active: true,
        status: 'active',
        expiry_date: {
          [Op.gte]: today
        }
      }
    });

    // Pending renewals (expiring in 30 days)
    const pendingRenewals = await Member.count({
      where: {
        is_active: true,
        status: 'active',
        expiry_date: {
          [Op.between]: [today, thirtyDaysFromNow]
        }
      }
    });

    // Recent payments (last 10)
    const recentPayments = await Payment.findAll({
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'first_name', 'last_name', 'member_id']
        }
      ],
      where: {
        status: 'completed',
        payment_date: {
          [Op.gte]: moment().subtract(30, 'days').toDate()
        }
      },
      order: [['payment_date', 'DESC']],
      limit: 10
    });

    // Membership distribution by type
    const membershipDistribution = await Member.findAll({
      attributes: [
        'membership_type',
        [Member.sequelize.fn('COUNT', Member.sequelize.col('id')), 'count']
      ],
      where: { is_active: true },
      group: ['membership_type']
    });

    // Monthly membership stats (last 12 months)
    const monthlyStats = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = moment().subtract(i, 'months').startOf('month');
      const monthEnd = moment().subtract(i, 'months').endOf('month');
      
      const newMembers = await Member.count({
        where: {
          join_date: {
            [Op.between]: [monthStart.toDate(), monthEnd.toDate()]
          },
          is_active: true
        }
      });

      const totalRevenue = await Payment.sum('amount', {
        where: {
          status: 'completed',
          payment_date: {
            [Op.between]: [monthStart.toDate(), monthEnd.toDate()]
          }
        }
      });

      monthlyStats.push({
        month: monthStart.format('YYYY-MM'),
        newMembers,
        revenue: totalRevenue || 0
      });
    }

    res.json({
      totalMembers,
      activeMembers,
      pendingRenewals,
      recentPayments,
      membershipDistribution,
      monthlyStats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * @swagger
 * /app/dashboard/zone-stats:
 *   get:
 *     summary: Get zone-wise statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Zone statistics retrieved successfully
 */
router.get('/zone-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const zoneStats = await Zone.findAll({
      include: [
        {
          model: Member,
          as: 'members',
          attributes: [],
          where: { is_active: true }
        }
      ],
      attributes: [
        'id',
        'name',
        [Member.sequelize.fn('COUNT', Member.sequelize.col('members.id')), 'memberCount']
      ],
      group: ['Zone.id', 'Zone.name'],
      order: [[Member.sequelize.fn('COUNT', Member.sequelize.col('members.id')), 'DESC']]
    });

    res.json(zoneStats);
  } catch (error) {
    console.error('Zone stats error:', error);
    res.status(500).json({ error: 'Failed to fetch zone statistics' });
  }
});

/**
 * @swagger
 * /app/dashboard/revenue-stats:
 *   get:
 *     summary: Get revenue statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue statistics retrieved successfully
 */
router.get('/revenue-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const currentMonth = moment().startOf('month');
    const lastMonth = moment().subtract(1, 'month').startOf('month');

    // Current month revenue
    const currentMonthRevenue = await Payment.sum('amount', {
      where: {
        status: 'completed',
        payment_date: {
          [Op.gte]: currentMonth.toDate()
        }
      }
    });

    // Last month revenue
    const lastMonthRevenue = await Payment.sum('amount', {
      where: {
        status: 'completed',
        payment_date: {
          [Op.between]: [lastMonth.toDate(), currentMonth.toDate()]
        }
      }
    });

    // Revenue by payment type
    const revenueByType = await Payment.findAll({
      attributes: [
        'payment_type',
        [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
      ],
      where: {
        status: 'completed',
        payment_date: {
          [Op.gte]: moment().subtract(6, 'months').toDate()
        }
      },
      group: ['payment_type']
    });

    res.json({
      currentMonthRevenue: currentMonthRevenue || 0,
      lastMonthRevenue: lastMonthRevenue || 0,
      revenueByType
    });
  } catch (error) {
    console.error('Revenue stats error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue statistics' });
  }
});

module.exports = router; 