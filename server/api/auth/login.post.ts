import db from '../../utils/db';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const email = body.email?.toLowerCase().trim();

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' });
  }

  // Check if user is banned before sending anything
  const userStmt = db.prepare('SELECT is_banned FROM users WHERE email = ?');
  const user = userStmt.get(email) as { is_banned: number } | undefined;

  if (user?.is_banned) {
    throw createError({ statusCode: 403, statusMessage: 'Account disabled' });
  }

  // Generate a secure 32-character hex token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60000).toISOString(); // 30 mins from now

  // Insert token into database
  const insertStmt = db.prepare(`
    INSERT INTO magic_links (user_email, token, expires_at)
    VALUES (?, ?, ?)
  `);
  insertStmt.run(email, token, expiresAt);

  // Send the email via Resend
  const magicLink = `${process.env.BASE_URL}/api/auth/verify?token=${token}`;

  try {
    await resend.emails.send({
      from: 'Auth <noreply@gendercaremap.org>',
      to: email,
      subject: 'Log in to Gender Care Map',
      html: `<p>Click the link below to log in. This link expires in 15 minutes.</p>
             <a href="${magicLink}"><strong>Log In Now</strong></a>`
    });
    console.log(magicLink);

    return { success: true, message: 'Check your email for the login link.' };
  } catch (error) {
    console.error('Email failed:', error);
    throw createError({ statusCode: 500, statusMessage: 'Failed to send email' });
  }
});