export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const stmt = db.prepare('SELECT * FROM resources WHERE id = ? AND is_hidden = 0');
  const resource = stmt.get(id);

  if (!resource) {
    throw createError({ statusCode: 404, statusMessage: 'Resource not found' });
  }

  const stmt2 = db.prepare(`
    SELECT
      *
    FROM reviews
    WHERE is_hidden = 0 and resource_id = ?
  `);

  const reviews = stmt2.all(id);

  let averageRating = 0;
  if (reviews.length > 0) {
    const totalScore = reviews.reduce((sum, review) => sum + review.rating, 0);
    // Calculate average and round to 1 decimal place
    averageRating = Number((totalScore / reviews.length).toFixed(1));
  }

  return { success: true, data: {
    ...resource,
    reviews: reviews,
    average_rating: averageRating,
    review_count: reviews.length
  } };
});