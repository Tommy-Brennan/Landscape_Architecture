import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createClient } from "@libsql/client";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('Loaded DB URL:', process.env.TURSO_DATABASE_URL);

// Create the Turso client
export const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure the table exists on Turso (libSQL)
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
        const rows = result.rows; // Extract rows from the result
        res.json(rows);
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get a specific project by ID
app.get('/projects/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await turso.execute("SELECT * FROM projects WHERE id = ?", [id]);
        const project = result.rows[0]; // Extract the first row from the result
        if (project) {
            res.json(project);
        } else {
            res.status(404).json({ error: "Project not found" });
        }
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Add a new project
app.post('/projects', async (req, res) => {
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
        const result = await turso.execute(`
            INSERT INTO projects (
                projectName, mainPartner, otherpartners, projectType, areaScope,
                deliverables, link, lat, lng
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        `, [
            projectName,
            mainPartner,
            otherpartners,
            projectType,
            areaScope,
            deliverables,
            link,
            lat,
            lng
        ]);
        const insertedId = result.rows[0]?.id;
        
        console.log(`Project added with ID: ${insertedId}`);
        res.status(201).json({ id: insertedId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/projects/delete', async (req, res) => {
    const { ids } = req.body; // Expecting: { ids: [1, 2, 3] }

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No project IDs provided" });
    }

    try {
        const placeholders = ids.map(() => '?').join(',');
        const sql = `DELETE FROM projects WHERE id IN (${placeholders})`;
        await turso.execute(sql, ids);
        res.status(200).json({ message: 'Projects deleted successfully' });
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ error: err.message });
    }
});


app.put('/projects/update', async (req, res) => {
    const {
        id,
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
        await turso.execute(
            `
            UPDATE projects SET
                projectName = ?,
                mainPartner = ?,
                otherpartners = ?,
                projectType = ?,
                areaScope = ?,
                deliverables = ?,
                link = ?,
                lat = ?,
                lng = ?
            WHERE id = ?
            `,
            [projectName, mainPartner, otherpartners, projectType, areaScope, deliverables, link, lat, lng, id] // note 'id' is last
        );
        res.status(200).json({ message: 'Project updated successfully' });
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ error: err.message });
    }
});


// Serve dashboard page
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
