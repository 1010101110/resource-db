import db from '../../utils/db';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const token = query.token as string;

  if (!token) {
    return sendRedirect(event, '/login?error=MissingToken');
  }

  // Find the token and check validity
  const linkStmt = db.prepare(`
    SELECT * FROM magic_links
    WHERE token = ? AND used = 0 AND expires_at > datetime('now', 'localtime')
  `);
  const magicLink = linkStmt.get(token) as { user_email: string } | undefined;

  if (!magicLink) {
    return sendRedirect(event, '/login?error=InvalidOrExpired');
  }

  // Mark token as used
  const updateLinkStmt = db.prepare('UPDATE magic_links SET used = 1 WHERE token = ?');
  updateLinkStmt.run(token);

  const email = magicLink.user_email;

  // Find or create the user
  const userStmt = db.prepare('SELECT id FROM users WHERE email = ?');
  let user = userStmt.get(email) as { id: number } | undefined;

  if (!user) {
    const insertUserStmt = db.prepare('INSERT INTO users (email) VALUES (?)');
    const info = insertUserStmt.run(email);
    user = { id: info.lastInsertRowid as number };
  }

  // Set an HTTP-only cookie to maintain the session
  setCookie(event, 'auth_session', String(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/'
  });

  // Redirect to the map/dashboard
  return sendRedirect(event, '/');
});