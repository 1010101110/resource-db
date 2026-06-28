import { promises as fs, existsSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  // 1. Extract the map coordinates from the URL
  const z = getRouterParam(event, 'z')
  const x = getRouterParam(event, 'x')
  const file = getRouterParam(event, 'file')

  if (!z || !x || !file) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid tile coordinates' })
  }

  // 2. Define where this tile should live on your VPS
  // We save them in /public/cache/tiles/... so they persist
  const cacheDir = join(process.cwd(), 'public', 'cache', 'tiles', z, x)
  const filePath = join(cacheDir, file)

  // 3. Set the correct header so the browser knows it's an image
  setHeader(event, 'Content-Type', 'image/png')

  // 4. Check if we already have this tile cached
  if (existsSync(filePath)) {
    const stats = await fs.stat(filePath)
    const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)

    // If the file is less than 7 days old, serve it directly from the VPS
    if (ageInDays < 7) {
      return await fs.readFile(filePath)
    }
  }

  // 5. If we don't have it (or it's expired), fetch it from OpenStreetMap
  try {
    // OSM randomly routes between a, b, and c subdomains
    const subdomain = ['a', 'b', 'c'][Math.floor(Math.random() * 3)]
    const osmUrl = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${file}`

    const response = await fetch(osmUrl, {
      headers: {
        // CRITICAL: OSM blocks requests without a custom User-Agent identifying your app
        'User-Agent': 'GenderCareMap.org/1.0 (Contact: admin@gendercaremap.org)'
      }
    })

    if (!response.ok) {
      throw new Error(`OSM returned ${response.status}`)
    }

    // Convert the image response into a buffer
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 6. Save the new tile to our VPS filesystem
    await fs.mkdir(cacheDir, { recursive: true })
    await fs.writeFile(filePath, buffer)

    // 7. Return the image to the user
    return buffer

  } catch (error) {
    console.error('Tile fetch error:', error)
    // Return a 404 so Leaflet knows the tile failed to load
    throw createError({ statusCode: 404, statusMessage: 'Tile not found' })
  }
})