const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const util = require('util');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = 3000;

// Use CORS middleware
app.use(cors());

const videoDir = '/var/media/kanelsnurr/videos/';
const thumbnailDir = '/var/media/kanelsnurr/thumbnails/';

// Initialize SQLite database
let db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the in-memory SQlite database.');
    }
});

function create_thumbnail(name) {
    const videoPath = path.join(videoDir, `${name}.mp4`);
    const thumbnailPath = path.join(thumbnailDir, `${name}.png`);

    // Check if the thumbnail already exists
    fs.promises.access(thumbnailPath, fs.constants.F_OK)
        .then(() => {
            console.log(`Thumbnail for ${name} already exists.`);
        })
        .catch(() => {
            // Thumbnail does not exist, create it
            ffmpeg(videoPath)
                .screenshots({
                    timestamps: ['00:00:01'],
                    filename: `${name}.png`,
                    folder: thumbnailDir,
                    size: '320x240'
                })
                .on('end', () => {
                    console.log(`Thumbnail created for ${name}.`);
                })
                .on('error', (err) => {
                    console.error(`Error creating thumbnail for ${name}:`, err);
                });
        });
}
//
// Convert db.run and db.all to promise-based functions
const dbRun = util.promisify(db.run.bind(db));
const dbAll = util.promisify(db.all.bind(db));

function initializeDatabase() {
    dbRun(`CREATE TABLE videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        owner TEXT NOT NULL,
        metadata BLOB
    )`)
        .then(() => {
            dbRun(`CREATE INDEX idx_name ON videos (name)`)
            console.log('Table and index created successfully.');
        })
        .then(() => {
            return fs.promises.readdir(videoDir);
        })
        .then((files) => {
            const videoFiles = files.filter(file => file.endsWith('.mp4'));
            const insertPromises = videoFiles.map(file => {
                return dbRun(`INSERT INTO videos (name, owner, metadata) VALUES (?, ?, ?)`, [file, 'unknown', null])
                    .then(() => {
                        console.log(`Inserted ${file} into the database.`);
                    });
            });
            return Promise.all(insertPromises);
        })
        .then(() => {
            return dbAll(`SELECT * FROM videos`);
        })
        .then((rows) => {
            console.log('Videos:');
            rows.forEach((row) => {
                console.log(row.name);
                create_thumbnail(row.name.replace(".mp4", ""))
            });
        })
        .catch((err) => {
            console.error('Database initialization error:', err);
        });
}

initializeDatabase();


// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/videos', (req, res) => {
    const sql = `SELECT name FROM videos`;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).send('Error reading video database');
        }
        const videoFiles = rows.map(row => row.name);
        res.json(videoFiles);
    });
});

app.get('/video/:name', (req, res) => {
    const videoPath = path.join(videoDir, req.params.name);
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
            'Accept-Ranges': 'bytes',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
});

app.get('/thumbnail/:name', (req, res) => {
    const thumbnailPath = path.join(thumbnailDir, `${req.params.name}.png`);
    fs.access(thumbnailPath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('Thumbnail not found');
        }

        res.sendFile(thumbnailPath);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Serve the index.html file at the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Close the database connection when the app is terminated
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Close the database connection.');
        process.exit(0);
    });
});

