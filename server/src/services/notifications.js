const db = require('../config/db');

/**
 * Notification Service
 * Handles in-app notifications + stubs for email/SMS/WhatsApp
 */
const notifications = {
  /**
   * Create an in-app notification
   */
  async create({ userId, type, title, message, projectId }) {
    const result = await db.query(
      `INSERT INTO notifications (user_id, type, title, message, project_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, type, title, message, projectId]
    );
    return result.rows[0];
  },

  /**
   * Notify all users of an organization
   */
  async notifyOrg({ orgId, type, title, message, projectId }) {
    const users = await db.query(
      'SELECT id FROM users WHERE org_id = $1 AND is_active = true',
      [orgId]
    );

    const created = [];
    for (const user of users.rows) {
      const notif = await this.create({
        userId: user.id, type, title, message, projectId
      });
      created.push(notif);
    }
    return created;
  },

  /**
   * Notify about geo-conflict
   */
  async notifyConflict(projectId, projectTitle, affectedOrgs) {
    for (const org of affectedOrgs) {
      await this.notifyOrg({
        orgId: org.id,
        type: 'conflict_alert',
        title: 'Utility Conflict Detected',
        message: `Your ${org.conflicting_assets.map(a => a.asset_type.replace('_', ' ')).join(', ')} may be affected by "${projectTitle}". Please join the coordination room.`,
        projectId
      });

      // Email stub
      this.sendEmail({
        to: org.contact_email,
        subject: `[Gati] Utility Conflict Alert - ${projectTitle}`,
        body: `Your infrastructure assets near the project "${projectTitle}" may be affected. Please log in to Gati to review and join the coordination.`
      });
    }
  },

  /**
   * Notify coordination invite
   */
  async notifyCoordinationInvite(projectId, projectTitle, orgId) {
    await this.notifyOrg({
      orgId,
      type: 'coordination_invite',
      title: 'Coordination Invite',
      message: `You have been invited to join the coordination for "${projectTitle}".`,
      projectId
    });
  },

  /**
   * Notify deadline reminder
   */
  async notifyDeadlineReminder(projectId, projectTitle, orgId, daysLeft) {
    await this.notifyOrg({
      orgId,
      type: 'deadline_reminder',
      title: 'Deadline Approaching',
      message: `The coordination deadline for "${projectTitle}" is in ${daysLeft} days.`,
      projectId
    });
  },

  /**
   * Notify violation filed
   */
  async notifyViolation(projectId, projectTitle, description) {
    // Notify admins
    const admins = await db.query(
      "SELECT id FROM users WHERE role = 'admin' AND is_active = true"
    );

    for (const admin of admins.rows) {
      await this.create({
        userId: admin.id,
        type: 'violation_filed',
        title: 'Violation Report Filed',
        message: `A violation has been reported for "${projectTitle}": ${description.substring(0, 100)}...`,
        projectId
      });
    }
  },

  // ========================================
  // External notification stubs
  // ========================================

  /**
   * Send email (Nodemailer stub)
   */
  sendEmail({ to, subject, body }) {
    console.log(`📧 [EMAIL STUB] To: ${to} | Subject: ${subject}`);
    // In production, use Nodemailer:
    // const transporter = nodemailer.createTransport({ ... });
    // await transporter.sendMail({ from, to, subject, html: body });
  },

  /**
   * Send SMS (Twilio stub)
   */
  sendSMS({ to, message }) {
    console.log(`📱 [SMS STUB] To: ${to} | Message: ${message}`);
    // In production:
    // const client = twilio(accountSid, authToken);
    // await client.messages.create({ body: message, from, to });
  },

  /**
   * Send WhatsApp (Meta Business API stub)
   */
  sendWhatsApp({ to, message }) {
    console.log(`💬 [WHATSAPP STUB] To: ${to} | Message: ${message}`);
    // In production, use WhatsApp Business API
  }
};

module.exports = notifications;
