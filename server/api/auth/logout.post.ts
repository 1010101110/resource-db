// server/api/auth/logout.post.ts
export default defineEventHandler((event) => {
  // Delete the session cookie
  deleteCookie(event, 'auth_session', {
    path: '/', // Must match the path used when creating the cookie
  });

  return { success: true };
});