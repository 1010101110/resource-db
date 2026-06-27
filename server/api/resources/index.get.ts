export default defineEventHandler((event) => {
  try {
    const query = getQuery(event)
    const { minLat, maxLat, minLng, maxLng } = query

    // We define the SELECT portion as a reusable string so we don't repeat it
    // IFNULL handles resources that have 0 reviews, returning 0 instead of null
    const selectClause = `
      SELECT
        resources.*,
        IFNULL(ROUND(AVG(reviews.rating), 1), 0) as average_rating,
        COUNT(reviews.id) as review_count
      FROM resources
      LEFT JOIN reviews ON resources.id = reviews.resource_id AND reviews.is_hidden = 0
    `

    if (!minLat || !maxLat || !minLng || !maxLng) {
      // Fallback query needs GROUP BY added before LIMIT
      const stmt = db.prepare(`
        ${selectClause}
        GROUP BY resources.id
        LIMIT 500
      `)
      const data = stmt.all()
      return { success: true, data }
    }

    const lat1 = parseFloat(minLat as string)
    const lat2 = parseFloat(maxLat as string)
    let lng1 = parseFloat(minLng as string)
    let lng2 = parseFloat(maxLng as string)

    let stmt;
    let data;

    // Edge Case: The International Date Line
    if (lng1 > lng2) {
      stmt = db.prepare(`
        ${selectClause}
        WHERE resources.latitude BETWEEN ? AND ?
        AND (resources.longitude >= ? OR resources.longitude <= ?)
        GROUP BY resources.id
      `)
      data = stmt.all(lat1, lat2, lng1, lng2)
    } else {
      // Standard bounding box query
      stmt = db.prepare(`
        ${selectClause}
        WHERE resources.latitude BETWEEN ? AND ?
        AND resources.longitude BETWEEN ? AND ?
        GROUP BY resources.id
      `)
      data = stmt.all(lat1, lat2, lng1, lng2)
    }

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Database query error:', error)
    return {
      success: false,
      message: 'Failed to fetch resources'
    }
  }
})