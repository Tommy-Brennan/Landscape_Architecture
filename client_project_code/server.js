const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const dbPath = path.join(__dirname, 'db', 'projects.db');

// Ensure the data folder exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Open or create the SQLite database
const db = new Database(dbPath);

// Create the table if it doesn't exist
db.exec(`CREATE TABLE IF NOT EXISTS projects (
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
)`);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Get all projects
app.get('/projects', (req, res) => {
    try {
        const stmt = db.prepare("SELECT * FROM projects");
        const rows = stmt.all();
        res.json(rows);
    } catch (err) {
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
