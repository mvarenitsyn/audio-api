const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// POST /extract-audio
app.post('/extract-audio', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded.' });
    }

    const inputPath = req.file.path;
    const outputFilename = `${path.parse(req.file.originalname).name}.mp3`;
    const outputPath = path.join('outputs', outputFilename);

    // Ensure outputs folder exists
    fs.mkdirSync('outputs', { recursive: true });

    ffmpeg(inputPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .format('mp3')
        .save(outputPath)
        .on('end', () => {
            // Send the file and then cleanup
            res.download(outputPath, outputFilename, err => {
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
            });
        })
        .on('error', err => {
            fs.unlinkSync(inputPath);
            return res.status(500).json({ error: 'Audio extraction failed', details: err.message });
        });
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});