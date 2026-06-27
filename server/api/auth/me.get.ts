export default defineEventHandler(async (event) => {
  const userId = getCookie(event, 'auth_session');

  if (!userId) return { user: null };

  const user = db.prepare('SELECT id, email, avatar_path FROM users WHERE id = ?').get(userId);
  return { user };
});