export default defineEventHandler(async (event) => {
  // 1. Ensure logged in
  const userId = getCookie(event, 'auth_session');
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const reviewId = getRouterParam(event, 'id');
  const body = await readBody(event);
  const { rating, content } = body;

  if (!rating || rating < 1 || rating > 5) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid rating' });
  }

  // 2. Verify Ownership
  const checkStmt = db.prepare('SELECT user_id FROM reviews WHERE id = ?');
  const existingReview = checkStmt.get(reviewId) as { user_id: number } | undefined;

  if (!existingReview) {
    throw createError({ statusCode: 404, statusMessage: 'Review not found' });
  }

  // Ensure they are editing their own review
  if (String(existingReview.user_id) !== String(userId)) {
    throw createError({ statusCode: 403, statusMessage: 'You can only edit your own reviews.' });
  }

  // 3. Update the database
  try {
    const stmt = db.prepare(`
      UPDATE reviews
      SET rating = ?, content = ?
      WHERE id = ?
    `);
    stmt.run(rating, content, reviewId);

    return { success: true };
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update review.' });
  }
});