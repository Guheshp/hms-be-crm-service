const db = require("../config/database");
const { statusCode } = require("../constants/common");

const getDashboard = async (req, res, next) => {
  try {
    const queries = {
      enquiries: `
        SELECT COUNT(*) AS total
        FROM enquiries
        WHERE status = 1;
      `,

      leads: `
        SELECT COUNT(*) AS total
        FROM leads
        WHERE status = 1;
      `,

      wonLeads: `
        SELECT COUNT(*) AS total
        FROM leads l
        INNER JOIN leadstatus ls
          ON ls.id = l.leadstatusid
        WHERE
          l.status = 1
          AND LOWER(ls.name) = 'won';
      `,

      followups: `
        SELECT COUNT(*) AS total
        FROM leadfollowups
        WHERE status = 1;
      `,

      todayFollowups: `
        SELECT COUNT(*) AS total
        FROM leadfollowups
        WHERE
          status = 1
          AND DATE(to_timestamp(followupdate / 1000)) = CURRENT_DATE;
      `,

      overdueFollowups: `
        SELECT COUNT(*) AS total
        FROM leadfollowups
        WHERE
          status = 1
          AND followupdate < EXTRACT(EPOCH FROM CURRENT_DATE) * 1000;
      `,

      subscriptions: `
        SELECT COUNT(*) AS total
        FROM subscriptions
        WHERE status = 1;
      `,

      activeSubscriptions: `
        SELECT COUNT(*) AS total
        FROM subscriptions
        WHERE
          status = 1
          AND subscriptionstatus = 1;
      `,

      payments: `
        SELECT
          COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE status = 1;
      `,

      todayPayments: `
        SELECT
          COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE
          status = 1
          AND DATE(to_timestamp(paymentdate / 1000)) = CURRENT_DATE;
      `,

      users: `
        SELECT COUNT(*) AS total
        FROM users
        WHERE status = 1;
      `,

      plans: `
        SELECT COUNT(*) AS total
        FROM plans
        WHERE status = 1;
      `,
    };

    const [
      enquiries,
      leads,
      wonLeads,
      followups,
      todayFollowups,
      overdueFollowups,
      subscriptions,
      activeSubscriptions,
      payments,
      todayPayments,
      users,
      plans,
    ] = await Promise.all([
      db.runQuery(queries.enquiries),
      db.runQuery(queries.leads),
      db.runQuery(queries.wonLeads),
      db.runQuery(queries.followups),
      db.runQuery(queries.todayFollowups),
      db.runQuery(queries.overdueFollowups),
      db.runQuery(queries.subscriptions),
      db.runQuery(queries.activeSubscriptions),
      db.runQuery(queries.payments),
      db.runQuery(queries.todayPayments),
      db.runQuery(queries.users),
      db.runQuery(queries.plans),
    ]);

    return res.status(statusCode.OK).json({
      success: true,
      data: {
        enquiries: {
          total: Number(enquiries.rows[0].total),
        },

        leads: {
          total: Number(leads.rows[0].total),
          won: Number(wonLeads.rows[0].total),
        },

        followups: {
          total: Number(followups.rows[0].total),
          today: Number(todayFollowups.rows[0].total),
          overdue: Number(overdueFollowups.rows[0].total),
        },

        subscriptions: {
          total: Number(subscriptions.rows[0].total),
          active: Number(activeSubscriptions.rows[0].total),
        },

        payments: {
          total: Number(payments.rows[0].total),
          today: Number(todayPayments.rows[0].total),
        },

        users: {
          total: Number(users.rows[0].total),
        },

        plans: {
          total: Number(plans.rows[0].total),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
};
