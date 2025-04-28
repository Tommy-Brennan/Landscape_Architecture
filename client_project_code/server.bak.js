import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createClient } from "@libsql/client";
import dotenv from 'dotenv';
dotenv.config();

console.log('Loaded DB URL:', process.env.TURSO_DATABASE_URL);

export const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
    });

const app = express();
//const dbPath = path.join(__dirname, 'db', 'projects.db');

// Ensure the data folder exists
//fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Open or create the SQLite database
// const db = new Database(dbPath);

// Create the table if it doesn't exist
// db.exec(`CREATE TABLE IF NOT EXISTS projects (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     projectName TEXT NOT NULL,
//     mainPartner TEXT,
//     otherpartners TEXT,
//     projectType TEXT NOT NULL,
//     areaScope TEXT NOT NULL,
//     deliverables TEXT NOT NULL,
//     link TEXT NOT NULL,
//     lat REAL,
//     lng REAL
// )`);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure the table exists
(async () => {
    await turso.execute(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projectName TEXT NOT NULL,
            mainPartner TEXT,
            otherpartners TEXT,
            projectType TEXT NOT NULL,
            areaScope TEXT NOT NULL,
            deliverables TEXT NOT NULL,
            link TEXT NOT NULL,
            lat REAL,
            lng REAL
        )
    `);
})();

// Get all projects (Turso/libSQL)
app.get('/projects', async (req, res) => {
    try {
        const result = await turso.execute("SELECT * FROM projects");
        const rows = result.rows.map(row => row); // Optional: extract values if needed
        res.json(rows);
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Add a new project
app.post('/projects', (req, res) => {
    const {
        projectName,
        mainPartner,
        otherpartners,
        projectType,
        areaScope,
        deliverables,
        link,
        lat,
        lng
    } = req.body;

    try {
        const stmt = db.prepare(`INSERT INTO projects (
            projectName, mainPartner, otherpartners, projectType, areaScope,
            deliverables, link, lat, lng
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        const result = stmt.run(
            projectName,
            mainPartner,
            otherpartners,
            projectType,
            areaScope,
            deliverables,
            link,
            lat,
            lng
        );

        res.status(201).json({ id: result.lastInsertRowid });
        console.log(`Project added with ID: ${result.lastInsertRowid}`);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
