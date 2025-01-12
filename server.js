const express = require('express');
const querystring = require('querystring');
const request = require('request');
const multer = require('multer');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const ASSEMBLYAI_API_KEY = 'a4abd1d78e83426b9a1876ec65fa80d7';


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Spotify Credentials
const CLIENT_ID = 'ced7feabad00473bb6bd9d8952945314';
const CLIENT_SECRET = '6f2a8e94b47a4927bf23c0c38af9d53f';
const REDIRECT_URI = 'https://delirious-golden-laugh.glitch.me/callback';

// Tokens
let accessToken = 'BQBN8GFr5MLJWeJSuF23ZhR04yEU-8i1hwOxUZXMYdJpRwUsaLuAjaQhI67n1_LhVwJs85B-BdMVZD13pBzmUYGWP2oP3Zwr5RC0rYjZDrwwTga8aDCeAonpGhZCW1PyAItvkf770cUAiFKnkPlF7pWSRhIXvh4_BvtdqsDvitqh6HVS3GT0t6RyoBFnY9NISLITEUuGos2atk19C1-PHQ';
let refreshToken = 'AQCfFSEtzIolWOpX1vsA1VHmfwIIEl_Hi8TEMko1df2CrhFlVw9g3iCt8RY8vX1FijiTukgW6onvv-gor1ec482TKr9H8QSPjXOeKQIttciaPugQA_BHUNSYUfahF4p5p0U';

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Main page with options
app.get('/', (req, res) => {
    res.send(`
        <html>
            <body>
                <h1>Podcast Insight Finder</h1>
                <form action="/process" method="POST" enctype="multipart/form-data">
                    <h2>Option 1: Upload an Audio File</h2>
                    <label for="audioFile">Upload Podcast Audio File:</label>
                    <input type="file" id="audioFile" name="audioFile" accept="audio/*"><br><br>
                    
                    <h2>Option 2: Provide a Spotify Link</h2>
                    <label for="podcastLink">Enter Podcast Episode Link:</label>
                    <input type="url" id="podcastLink" name="podcastLink" placeholder="https://open.spotify.com/episode/..."><br><br>
                    
                    <button type="submit">Process</button>
                </form>
            </body>
        </html>
    `);
});

// Refresh Access Token
function refreshAccessToken(callback) {
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        },
        headers: {
            'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
        },
        json: true
    };

    request.post(authOptions, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            accessToken = body.access_token;
            console.log('Access token refreshed:', accessToken);
            callback(null, accessToken);
        } else {
            console.error('Failed to refresh access token:', error || body);
            callback(error || body);
        }
    });
}

// Process route
app.post('/process', upload.single('audioFile'), async (req, res) => {
    const podcastLink = req.body.podcastLink;
    const audioPath = req.file ? req.file.path : null;

    if (podcastLink) {
        // Handle Spotify link (already implemented)
        const episodeId = podcastLink.split('/episode/')[1]?.split('?')[0];
        if (!episodeId) {
            return res.send('Invalid Spotify link.');
        }

        refreshAccessToken((err, token) => {
            if (err) return res.send('Failed to refresh access token.');

            const options = {
                url: `https://api.spotify.com/v1/episodes/${episodeId}`,
                headers: { 'Authorization': `Bearer ${token}` },
                json: true
            };

            request.get(options, (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    res.send(`
                        <h1>Episode Details</h1>
                        <p><strong>Title:</strong> ${body.name}</p>
                        <p><strong>Description:</strong> ${body.description}</p>
                        <audio controls src="${body.audio_preview_url}"></audio>
                    `);
                } else {
                    res.send('Failed to fetch episode details.');
                }
            });
        });
    } else if (audioPath) {
        // Handle file upload
        try {
            const transcriptText = await transcribeAudio(audioPath);
            res.send(`
                <h1>Transcription</h1>
                <p>${transcriptText}</p>
            `);
        } catch (error) {
            res.send('Failed to transcribe audio file. Please try again.');
        } finally {
            // Clean up uploaded file
            fs.unlinkSync(audioPath);
        }
    } else {
        res.send('Please upload a file or provide a Spotify link.');
    }
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const axios = require('axios');

// Transcribe Audio File
async function transcribeAudio(filePath) {
    try {
        // Step 1: Upload the audio file to AssemblyAI
        const uploadResponse = await axios.post(
            'https://api.assemblyai.com/v2/upload',
            require('fs').createReadStream(filePath),
            {
                headers: {
                    'authorization': ASSEMBLYAI_API_KEY,
                    'Transfer-Encoding': 'chunked'
                }
            }
        );
        const audioUrl = uploadResponse.data.upload_url;

        // Step 2: Request transcription
        const transcriptResponse = await axios.post(
            'https://api.assemblyai.com/v2/transcript',
            {
                audio_url: audioUrl
            },
            {
                headers: {
                    authorization: ASSEMBLYAI_API_KEY
                }
            }
        );

        const transcriptId = transcriptResponse.data.id;

        // Step 3: Poll for transcription completion
        let status = 'processing';
        let transcriptText = '';

        while (status === 'processing' || status === 'queued') {
            const pollingResponse = await axios.get(
                `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
                {
                    headers: {
                        authorization: ASSEMBLYAI_API_KEY
                    }
                }
            );
            status = pollingResponse.data.status;

            if (status === 'completed') {
                transcriptText = pollingResponse.data.text;
            } else if (status === 'failed') {
                throw new Error('Transcription failed');
            }

            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before polling again
        }

        return transcriptText;
    } catch (error) {
        console.error('Error during transcription:', error);
        throw error;
    }
}

