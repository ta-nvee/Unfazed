
const mongoose = require("mongoose");

const Client = require("../models/Client");
const Session = require("../models/Session");
const Payment = require("../models/Payment");
const Lead = require("../models/Lead");

const {
  getTherapistEntitlements,
  hasFeatureAccess,
} = require("../services/entitlementService");

// ==========================================
// GET DASHBOARD ANALYTICS
// ==========================================

const getDashboardAnalytics = async (req, res, next) => {
  try {
    const therapistId = new mongoose.Types.ObjectId(
      req.therapist._id || req.therapist.id
    );

    const hasBasicAnalytics = await hasFeatureAccess(
      therapistId,
      "basicAnalytics"
    );

    if (!hasBasicAnalytics) {
      return res.status(403).json({
        success: false,
        code: "FEATURE_UPGRADE_REQUIRED",
        feature: "basicAnalytics",
        message:
          "Basic analytics are not included in your subscription. Please upgrade your plan.",
      });
    }

    const now = new Date();

    const [
      clientAnalytics,
      sessionAnalytics,
      leadAnalytics,
      paymentAnalytics,
      entitlements,
    ] = await Promise.all([
      // CLIENT ANALYTICS
      Client.aggregate([
        {
          $match: {
            therapist: therapistId,
          },
        },
        {
          $facet: {
            total: [{ $count: "count" }],
            active: [
              {
                $match: {
                  status: "active",
                },
              },
              { $count: "count" },
            ],
          },
        },
      ]),

      // SESSION ANALYTICS
      Session.aggregate([
        {
          $match: {
            therapist: therapistId,
          },
        },
        {
          $facet: {
            total: [{ $count: "count" }],

            upcoming: [
              {
                $match: {
                  status: "scheduled",
                  startTime: { $gte: now },
                },
              },
              { $count: "count" },
            ],

            completed: [
              {
                $match: {
                  status: "completed",
                },
              },
              { $count: "count" },
            ],

            noShow: [
              {
                $match: {
                  status: "no-show",
                },
              },
              { $count: "count" },
            ],

            // Cancelled sessions are excluded from no-show rate.
            finalised: [
              {
                $match: {
                  status: {
                    $in: ["completed", "no-show"],
                  },
                },
              },
              { $count: "count" },
            ],
          },
        },
      ]),

      // LEAD ANALYTICS
      Lead.aggregate([
        {
          $match: {
            therapist: therapistId,
          },
        },
        {
          $count: "count",
        },
      ]),

      // PAYMENT ANALYTICS
      Payment.aggregate([
        {
          $match: {
            therapist: therapistId,
            status: "paid",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: "$amount",
            },
            totalPaidPayments: {
              $sum: 1,
            },
          },
        },
      ]),

      // SUBSCRIPTION ENTITLEMENTS
      getTherapistEntitlements(therapistId),
    ]);

    const clientData = clientAnalytics[0] || {};
    const sessionData = sessionAnalytics[0] || {};
    const revenueData = paymentAnalytics[0] || {};

    const totalClients =
      clientData.total?.[0]?.count || 0;

    const activeClients =
      clientData.active?.[0]?.count || 0;

    const totalSessions =
      sessionData.total?.[0]?.count || 0;

    const upcomingSessions =
      sessionData.upcoming?.[0]?.count || 0;

    const completedSessions =
      sessionData.completed?.[0]?.count || 0;

    const noShowSessions =
      sessionData.noShow?.[0]?.count || 0;

    const finalisedSessions =
      sessionData.finalised?.[0]?.count || 0;

    const noShowRate =
      finalisedSessions > 0
        ? Number(
            (
              (noShowSessions / finalisedSessions) *
              100
            ).toFixed(2)
          )
        : 0;

    const totalLeads =
      leadAnalytics[0]?.count || 0;

    const totalRevenue =
      revenueData.totalRevenue || 0;

    const totalPaidPayments =
      revenueData.totalPaidPayments || 0;

    return res.status(200).json({
      success: true,

      analytics: {
        totalClients,
        activeClients,
        totalSessions,
        upcomingSessions,
        completedSessions,
        noShowSessions,
        noShowRate,
        totalLeads,
        totalRevenue,
        totalPaidPayments,
        currency: "INR",
      },

      subscription: {
        tier: entitlements.tier.name,
        tierKey: entitlements.tier.tierKey,
        features: entitlements.features,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET ADVANCED ANALYTICS
// ==========================================

const getAdvancedAnalytics = async (req, res, next) => {
  try {
    const therapistId = new mongoose.Types.ObjectId(
      req.therapist._id || req.therapist.id
    );

    const allowed = await hasFeatureAccess(
      therapistId,
      "advancedAnalytics"
    );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        code: "FEATURE_UPGRADE_REQUIRED",
        feature: "advancedAnalytics",
        message:
          "Advanced analytics require a Professional subscription. Please upgrade your plan.",
      });
    }

    const [
      sessionsByStatus,
      monthlyRevenue,
      monthlySessions,
      leadsByStatus,
      clientsByStatus,
    ] = await Promise.all([
      // SESSIONS GROUPED BY STATUS
      Session.aggregate([
        {
          $match: {
            therapist: therapistId,
          },
        },
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),

      // MONTHLY REVENUE
      Payment.aggregate([
        {
          $match: {
            therapist: therapistId,
            status: "paid",
            paidAt: {
              $ne: null,
            },
          },
        },
        {
          $group: {
            _id: {
              year: {
                $year: "$paidAt",
              },
              month: {
                $month: "$paidAt",
              },
            },
            revenue: {
              $sum: "$amount",
            },
            payments: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),

      // MONTHLY SESSIONS
      Session.aggregate([
        {
          $match: {
            therapist: therapistId,
          },
        },
        {
          $group: {
            _id: {
              year: {
                $year: "$startTime",
              },
              month: {
                $month: "$startTime",
              },
            },
            sessions: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),

      // LEADS GROUPED BY STATUS
      Lead.aggregate([
        {
          $match: {
            therapist: therapistId,
          },
        },
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),

      // CLIENTS GROUPED BY STATUS
      Client.aggregate([
        {
          $match: {
            therapist: therapistId,
          },
        },
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,

      advancedAnalytics: {
        sessionsByStatus,
        monthlyRevenue,
        monthlySessions,
        leadsByStatus,
        clientsByStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getDashboardAnalytics,
  getAdvancedAnalytics,
};
