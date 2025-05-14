import express from 'express';
import cors from 'cors';
import path from 'path';
import { createClient } from "@libsql/client";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('Loaded DB URL:', process.env.TURSO_DATABASE_URL);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const PERMISSIONS = {
    ADD_EDIT: 'add/edit',
    ADD_EDIT_DELETE: 'add/edit/delete',
    ADMIN: 'admin'
};

// Create the Turso client
export const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const app = express();
app.use(cookieParser());
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
        const rows = result.rows; 
        res.json(rows);
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get a specific project by ID
app.get('/projects/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await turso.execute("SELECT * FROM projects WHERE id = ?", [id]);
        const project = result.rows[0]; 
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
app.post('/projects', authenticateToken, authorize(PERMISSIONS.ADD_EDIT, PERMISSIONS.ADD_EDIT_DELETE, PERMISSIONS.ADMIN),async (req, res) => {
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

app.post('/projects/delete/', authenticateToken, authorize(PERMISSIONS.ADD_EDIT_DELETE, PERMISSIONS.ADMIN),async (req, res) => {
    const { ids } = req.body; 

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


app.put('/projects/update', authenticateToken, authorize(PERMISSIONS.ADD_EDIT, PERMISSIONS.ADD_EDIT_DELETE, PERMISSIONS.ADMIN),async (req, res) => {
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
            [projectName, mainPartner, otherpartners, projectType, areaScope, deliverables, link, lat, lng, id] 
        );
        res.status(200).json({ message: 'Project updated successfully' });
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ error: err.message });
    }
});


// get all users (Turso/libSQL)
app.get('/users', authenticateToken, async (req, res) => {

    try {
        const result = await turso.execute("SELECT * FROM users");
        const rows = result.rows; 
        res.json(rows);
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ error: err.message });
    }

});

app.post('/users', authenticateToken, authorize(PERMISSIONS.ADMIN),async (req, res) => {
    const { email, permissions } = req.body;

    try {
        const result = await turso.execute(`
            INSERT INTO users (email, permissions) VALUES (?, ?)
            RETURNING user_id
        `, [email, permissions]);
        const insertedId = result.rows[0]?.user_id;
        
        console.log(`User added with ID: ${insertedId}`);
        res.status(201).json({ id: insertedId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/users/update', authenticateToken, authorize(PERMISSIONS.ADMIN), ensureAtLeastOneAdmin,async (req, res) => {
    const { user_id, email, permissions } = req.body;

    try {
        await turso.execute(
            `
            UPDATE users SET
                email = ?,
                permissions = ?
            WHERE user_id = ?
            `,
            [email, permissions, user_id] 
        );
        res.status(200).json({ message: 'User updated successfully' });
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/users/delete', authenticateToken, authorize(PERMISSIONS.ADMIN), ensureAtLeastOneAdmin,async (req, res) => {
    const { ids } = req.body; 

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No user IDs provided" });
    }

    try {
        const placeholders = ids.map(() => '?').join(',');
        const sql = `DELETE FROM users WHERE user_id IN (${placeholders})`;
        await turso.execute(sql, ids);
        res.status(200).json({ message: 'Users deleted successfully' });
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await turso.execute("SELECT * FROM users WHERE user_id = ?", [id]);
        const user = result.rows[0]; 
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: "Project not found" });
        }
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/auth/google', async (req, res) => {
    const { credential } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload?.email;

        if (!email) {
            return res.status(400).json({ error: 'Invalid token payload' });
        }

        const result = await turso.execute("SELECT * FROM users WHERE email = ?", [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Unauthorized email' });
        }

        const user = result.rows[0];

        const token = jwt.sign(
            { email: user.email, id: user.user_id, permissions: user.permissions },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        // Set the JWT token as a cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000 // 2 hours
        });

        // Send the user data and token as a JSON response
        res.json({
            message: 'Login successful',
            user: {
                email: user.email,
                id: user.user_id,
                permissions: user.permissions
            },
            token
        });

    } catch (err) {
        console.error("Google auth error:", err);
        res.status(401).json({ error: 'Authentication failed' });
    }
});



// Middleware to verify JWT
function authenticateToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/login'); // Or res.status(401).json({ error: 'No token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user info to request
        next();
    } catch (err) {
        console.error('JWT error:', err);
        return res.redirect('/login'); // Or res.status(403).json({ error: 'Invalid token' });
    }
}

// Middleware to check permissions
function authorize(...requiredPermissions) {
    return (req, res, next) => {
        const userPermissions = req.user?.permissions;

        if (!userPermissions) {
            return res.status(403).json({ error: 'No permissions found' });
        }

        // Ensure that the userPermissions is always an array
        const perms = typeof userPermissions === 'string' ? [userPermissions] : userPermissions;
        const hasPermission = requiredPermissions.some(p => perms.includes(p) || perms.includes('admin'));

        if (!hasPermission) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        return next();
    };
}

async function ensureAtLeastOneAdmin(req, res, next) {
    try {
        // Handle deletions
        if (req.body.ids) {
            const ids = req.body.ids;
            const placeholders = ids.map(() => '?').join(',');
            const sql = `SELECT COUNT(*) as adminCount FROM users WHERE permissions = ? AND user_id NOT IN (${placeholders})`;
            const result = await turso.execute(sql, ['admin', ...ids]);

            if (result.rows[0].adminCount === 0) {
                return res.status(400).json({ error: 'Cannot remove the last admin user' });
            }
        }

        // Handle updates
        if (req.body.permissions !== undefined && req.body.user_id !== undefined) {
            const { user_id, permissions } = req.body;

            // If this user is currently an admin and we're trying to remove that role
            const current = await turso.execute("SELECT permissions FROM users WHERE user_id = ?", [user_id]);
            const wasAdmin = current.rows[0]?.permissions === 'admin';
            const willBeAdmin = permissions === 'admin';

            if (wasAdmin && !willBeAdmin) {
                // Count how many other admins remain
                const result = await turso.execute(
                    "SELECT COUNT(*) as adminCount FROM users WHERE permissions = 'admin' AND user_id != ?",
                    [user_id]
                );

                if (result.rows[0].adminCount === 0) {
                    return res.status(400).json({ error: 'Cannot remove the last admin user' });
                }
            }
        }

        next();
    } catch (err) {
        console.error('Admin check error:', err);
        res.status(500).json({ error: 'Internal server error during admin check' });
    }
}



// Serve dashboard page
app.get('/dashboard', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'dashboard.html'));
});

// Serve users page
app.get('/dashboard/users', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'users.html'));
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/auth/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
    res.json({ message: 'Logged out successfully' });
});

app.get('/auth/status', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ loggedIn: false });

    res.json({ loggedIn: true });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
