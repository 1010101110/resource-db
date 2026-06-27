export default defineEventHandler(async (event) => {
  // 1. Authentication Check
  // Read the cookie we set during the magic link login
  const userId = getCookie(event, 'auth_session');

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to add a resource.'
    });
  }

  // 2. Read and Validate the incoming data
  const body = await readBody(event);
  const { name, category, latitude, longitude, address, description, website, phone } = body;

  if (!name || !category || !latitude || !longitude) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name, category, and a valid location are required.'
    });
  }

  try {
    // 3. Insert into SQLite
    const stmt = db.prepare(`
      INSERT INTO resources (
        name, category, latitude, longitude, address, description, website, phone, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      name.trim(),
      category.trim(),
      latitude,
      longitude,
      address?.trim() || null,
      description?.trim() || null,
      website?.trim() || null,
      phone?.trim() || null,
      parseInt(userId) // The ID from the cookie
    );

    return { success: true, message: 'Resource added successfully!' };
  } catch (error) {
    console.error('Failed to insert resource:', error);
    throw createError({ statusCode: 500, statusMessage: 'Database error while saving.' });
  }
});