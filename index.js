const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const os = require('os');
const axios = require('axios');

const app = express();
app.use(express.json());

// POST /extract-audio
// Expected JSON body: { "url": "<Google Drive share link>" }
app.post('/extract-audio', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'No URL provided in request body.' });
    }

    // Extract Google Drive file ID
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/);
    const fileId = idMatch && (idMatch[1] || idMatch[2]);
    if (!fileId) {
        return res.status(400).json({ error: 'Invalid Google Drive URL format.' });
    }

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    // Download video to temp file
    const videoPath = path.join(os.tmpdir(), `${fileId}.mp4`);
    try {
        const response = await axios({ url: downloadUrl, method: 'GET', responseType: 'stream' });
        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(videoPath);
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to download video', details: err.message });
    }

    // Extract audio
    const audioPath = path.join(os.tmpdir(), `${fileId}.mp3`);
    ffmpeg(videoPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .format('mp3')
        .save(audioPath)
        .on('end', async () => {
            res.download(audioPath, 'extracted_audio.mp3', async (err) => {
                // Cleanup temp files
                await fsPromises.unlink(videoPath).catch(() => { });
                await fsPromises.unlink(audioPath).catch(() => { });
                if (err) console.error('Error sending file:', err);
            });
        })
        .on('error', async (err) => {
            await fsPromises.unlink(videoPath).catch(() => { });
            console.error('FFmpeg error:', err);
            return res.status(500).json({ error: 'Audio extraction failed', details: err.message });
        });
});

// Start server on dynamic PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
