import Database from 'better-sqlite3';
import { join } from 'path';

// Store the DB file in the root of the project
const dbPath = join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Enable Write-Ahead Logging for concurrent reads/writes
db.pragma('journal_mode = WAL');

// MVP Helper: A function to initialize our tables if they don't exist
export function initDB() {
  db.exec(`
-- USERS: Passwordless, purely email-based
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'moderator', 'admin')),
    is_banned BOOLEAN DEFAULT 0,
    avatar_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- MAGIC LINKS: Temporary tokens for login
CREATE TABLE IF NOT EXISTS magic_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- RESOURCES: The core map data
CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT,
    website TEXT,
    phone TEXT,
    created_by INTEGER,
    is_hidden BOOLEAN DEFAULT 0, -- Used for moderator nuking
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
);

-- IMAGES: Uploaded via Sharp, linked to resources
CREATE TABLE IF NOT EXISTS resource_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL,
    file_path TEXT NOT NULL, -- e.g., '/uploads/images/abc-123.webp'
    is_hidden BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(resource_id) REFERENCES resources(id),
    FOREIGN KEY(uploaded_by) REFERENCES users(id)
);

-- REVIEWS: User feedback on resources
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    content TEXT,
    is_hidden BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(resource_id) REFERENCES resources(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- HISTORY/EDITS: Wiki-style tracking
CREATE TABLE IF NOT EXISTS resource_edits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    changes_json TEXT NOT NULL, -- Store what was changed as a JSON string
    is_hidden BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(resource_id) REFERENCES resources(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- REPORTS: The moderation queue
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL,
    resource_id INTEGER, -- Nullable in case they are reporting a review
    review_id INTEGER,   -- Nullable in case they are reporting a resource
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'dismissed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reporter_id) REFERENCES users(id),
    FOREIGN KEY(resource_id) REFERENCES resources(id),
    FOREIGN KEY(review_id) REFERENCES reviews(id)
);
`);
  console.log('Database initialized.');
}

// Initialize tables on startup
initDB();

export default db;