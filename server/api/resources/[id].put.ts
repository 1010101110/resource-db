export default defineEventHandler(async (event) => {
  const resourceId = getRouterParam(event, 'id');
  const userId = getCookie(event, 'auth_session');

  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in to edit.' });
  }

  const body = await readBody(event);
  const { name, category, latitude, longitude, address, description, website, phone } = body;

  try {
    // 1. Update the main resource record
    const updateStmt = db.prepare(`
      UPDATE resources SET
        name = ?, category = ?, latitude = ?, longitude = ?,
        address = ?, description = ?, website = ?, phone = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_hidden = 0
    `);

    updateStmt.run(
      name.trim(), category.trim(), latitude, longitude,
      address?.trim() || null, description?.trim() || null,
      website?.trim() || null, phone?.trim() || null,
      resourceId
    );

    // 2. Log the edit in the history table (Wiki style)
    const logStmt = db.prepare(`
      INSERT INTO resource_edits (resource_id, user_id, changes_json)
      VALUES (?, ?, ?)
    `);

    // Save the entire updated payload as a JSON string so mods can review it later
    const changesString = JSON.stringify(body);
    logStmt.run(resourceId, parseInt(userId), changesString);

    return { success: true, message: 'Resource updated successfully!' };
  } catch (error) {
    console.error('Failed to update resource:', error);
    throw createError({ statusCode: 500, statusMessage: 'Database error while updating.' });
  }
});