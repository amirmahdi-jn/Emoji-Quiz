const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.post('/api/register', async (req, res) => {
    const { username } = req.body;
    if (!username || username.length > 20) {
        return res.status(400).json({ error: 'نام باید بین ۱ تا ۲۰ کاراکتر باشد' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO users (username) VALUES ($1) ON CONFLICT (username) DO NOTHING RETURNING *',
            [username]
        );
        if (result.rows.length === 0) {
            return res.status(409).json({ error: 'این آیدی قبلاً گرفته شده' });
        }
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'خطای سرور' });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT username, solved_count, coins, diamonds FROM users ORDER BY solved_count DESC LIMIT 50'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'خطای سرور' });
    }
});

io.on('connection', (socket) => {
    socket.on('chat message', async (data) => {
        const { username, text } = data;
        if (!text || text.trim().length === 0) return;
        try {
            await pool.query(
                'INSERT INTO messages (username, text) VALUES ($1, $2)',
                [username, text.trim()]
            );
            io.emit('chat message', { username, text: text.trim(), time: new Date().toISOString() });
        } catch (err) {}
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
