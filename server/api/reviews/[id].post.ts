export default defineEventHandler(async (event) => {
  // 1. Ensure the user is logged in
  const userId = getCookie(event, 'auth_session');

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to leave a review.',
    });
  }

  // 2. Get the resource ID from the URL
  const resourceId = getRouterParam(event, 'id');

  // 3. Read and validate the submitted data
  const body = await readBody(event);
  const { rating, content } = body;

  if (!rating || rating < 1 || rating > 5) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Rating must be between 1 and 5.',
    });
  }

  // 4. Insert the review into SQLite
  try {
    const stmt = db.prepare(`
      INSERT INTO reviews (resource_id, user_id, rating, content)
      VALUES (?, ?, ?, ?)
    `);

    const info = stmt.run(resourceId, userId, rating, content);

    // Return success so the frontend knows it worked
    return { success: true, reviewId: info.lastInsertRowid };

  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save review.',
    });
  }
});