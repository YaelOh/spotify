const express = require('express');
const multer = require('multer');
const fs = require('fs');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const app = express();
const ASSEMBLYAI_API_KEY = 'a4abd1d78e83426b9a1876ec65fa80d7';

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Main page with options
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <style>
                    .spinner {
                        border: 8px solid #f3f3f3;
                        border-top: 8px solid #3498db;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 2s linear infinite;
                        margin: 20px auto;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
                <script>
                    function showSpinner() {
                        document.getElementById('loading').style.display = 'block';
                    }
                </script>
            </head>
            <body>
                <h1>Podcast Insight Finder</h1>
                <form action="/process" method="POST" enctype="multipart/form-data" onsubmit="showSpinner()">
                    <h2>Option 1: Upload an Audio File</h2>
                    <label for="audioFile">Upload Podcast Audio File:</label>
                    <input type="file" id="audioFile" name="audioFile" accept="audio/*"><br><br>
                    
                    <h2>Option 2: Provide a Spotify Link</h2>
                    <label for="podcastLink">Enter Podcast Episode Link:</label>
                    <input type="url" id="podcastLink" name="podcastLink" placeholder="https://open.spotify.com/episode/..."><br><br>
                    
                    <button type="submit">Process</button>
                </form>
                <div id="loading" style="display: none; text-align: center;">
                    <div class="spinner"></div>
                    <p>Please wait, processing your request. This might take a few minutes...</p>
                </div>
            </body>
        </html>
    `);
});

// Process route
app.post('/process', upload.single('audioFile'), async (req, res) => {
    const podcastLink = req.body.podcastLink;
    const audioPath = req.file ? req.file.path : null;

    if (podcastLink) {
        const episodeId = podcastLink.split('/episode/')[1]?.split('?')[0];
        if (!episodeId) {
            return res.send('Invalid Spotify link.');
        }

        try {
            const options = {
                url: `https://api.spotify.com/v1/episodes/${episodeId}`,
                headers: { 'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}` }
            };

            const response = await axios.get(options.url, { headers: options.headers });
            const body = response.data;

            res.send(`
                <h1>Episode Details</h1>
                <p><strong>Title:</strong> ${body.name}</p>
                <p><strong>Description:</strong> ${body.description}</p>
                <audio controls src="${body.audio_preview_url}"></audio>
            `);
        } catch (error) {
            console.error('Failed to fetch episode details:', error.message);
            res.send('Failed to fetch episode details.');
        }
    } else if (audioPath) {
        try {
            const transcriptText = await transcribeAudio(audioPath);
            const references = await extractReferences(transcriptText);

            res.send(`
                <h1>Transcription</h1>
                <p>${transcriptText}</p>
                <h2>Extracted References</h2>
                <ul>${references.map((ref) => `<li>${ref}</li>`).join('')}</ul>
            `);
        } catch (error) {
            res.send('Failed to process audio file. Please try again.');
        } finally {
            fs.unlinkSync(audioPath);
        }
    } else {
        res.send('Please upload a file or provide a Spotify link.');
    }
});

// Function to extract references using Python script
function extractReferences(transcriptText) {
    return new Promise((resolve, reject) => {
        const pythonProcess = exec('python3 extract_references.py', (error, stdout, stderr) => {
            if (error) {
                console.error('Error extracting references:', error);
                reject(error);
            } else {
                resolve(JSON.parse(stdout));
            }
        });

        pythonProcess.stdin.write(transcriptText);
        pythonProcess.stdin.end();
    });
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const axios = require('axios');

// Transcribe Audio File
async function transcribeAudio(filePath) {
    try {
        const uploadResponse = await axios.post(
            'https://api.assemblyai.com/v2/upload',
            fs.createReadStream(filePath),
            {
                headers: {
                    'authorization': ASSEMBLYAI_API_KEY,
                    'Transfer-Encoding': 'chunked'
                }
            }
        );
        const audioUrl = uploadResponse.data.upload_url;

        const transcriptResponse = await axios.post(
            'https://api.assemblyai.com/v2/transcript',
            { audio_url: audioUrl },
            { headers: { authorization: ASSEMBLYAI_API_KEY } }
        );

        const transcriptId = transcriptResponse.data.id;

        let status = 'processing';
        let transcriptText = '';

        while (status === 'processing' || status === 'queued') {
            const pollingResponse = await axios.get(
                `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
                { headers: { authorization: ASSEMBLYAI_API_KEY } }
            );
            status = pollingResponse.data.status;

            if (status === 'completed') {
                transcriptText = pollingResponse.data.text;
            } else if (status === 'failed') {
                throw new Error('Transcription failed');
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        return transcriptText;
    } catch (error) {
        console.error('Error during transcription:', error.message);
        throw error;
    }
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});