export default defineEventHandler(async (event) => {
  // Assuming you have logic here to get current user from session
  const userId = event.context.user.id

  try {
    // 0. Clear related magic links for this user
    const stmtClearLinks = db.prepare(`DELETE FROM magic_links WHERE user_email = (SELECT email FROM users WHERE id = ?)`)
    stmtClearLinks.run(userId)

    // 1. Generate a "tombstone" email to satisfy the UNIQUE constraint
    // We use the ID to ensure it is always unique for this record
    const tombstoneEmail = `deleted_${userId}_${Date.now()}@anonymized.local`

    // 2. Clear user-identifying info
    const stmt = db.prepare(`
      UPDATE users
      SET
        email = ?,
        avatar_path = NULL
      WHERE id = ?
    `)

    stmt.run(tombstoneEmail, userId)

    return { success: true }
  } catch (error) {
    return { success: false, message: 'Could not anonymize account' }
  }
})