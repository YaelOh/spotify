const express = require('express');
const querystring = require('querystring');
const request = require('request');
const app = express();

// Spotify Credentials
const CLIENT_ID = 'ced7feabad00473bb6bd9d8952945314';
const CLIENT_SECRET = '6f2a8e94b47a4927bf23c0c38af9d53f';
const REDIRECT_URI = 'https://delirious-golden-laugh.glitch.me/callback';

// Global variables for tokens
let accessToken = 'BQBN8GFr5MLJWeJSuF23ZhR04yEU-8i1hwOxUZXMYdJpRwUsaLuAjaQhI67n1_LhVwJs85B-BdMVZD13pBzmUYGWP2oP3Zwr5RC0rYjZDrwwTga8aDCeAonpGhZCW1PyAItvkf770cUAiFKnkPlF7pWSRhIXvh4_BvtdqsDvitqh6HVS3GT0t6RyoBFnY9NISLITEUuGos2atk19C1-PHQ';
let refreshToken = 'AQCfFSEtzIolWOpX1vsA1VHmfwIIEl_Hi8TEMko1df2CrhFlVw9g3iCt8RY8vX1FijiTukgW6onvv-gor1ec482TKr9H8QSPjXOeKQIttciaPugQA_BHUNSYUfahF4p5p0U';

// Main page
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


// Spotify Authorization
app.get('/login', (req, res) => {
    const scope = 'user-read-playback-state';
    const authUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: scope,
            redirect_uri: REDIRECT_URI
        });
    res.redirect(authUrl);
});

// Spotify Callback
app.get('/callback', (req, res) => {
    const code = req.query.code || null;

    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code: code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
        },
        headers: {
            'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
        },
        json: true
    };

    request.post(authOptions, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            accessToken = body.access_token; // Save the access token
            refreshToken = body.refresh_token; // Save the refresh token
            res.send(`Access token received: ${accessToken}`);
        } else {
            res.send('Authorization failed');
        }
    });
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
            accessToken = body.access_token; // Update the access token
            console.log('Access token refreshed:', accessToken);
            callback(null, accessToken);
        } else {
            console.error('Failed to refresh access token:', error || body);
            callback(error || body);
        }
    });
}

// Process the submitted podcast link
app.post('/process', upload.single('audioFile'), (req, res) => {
    const podcastLink = req.body.podcastLink; // Get the Spotify link from the form
    const audioPath = req.file ? req.file.path : null; // Get the uploaded file (if any)

    if (podcastLink) {
        // Handle the Spotify link option
        const episodeId = podcastLink.split('/episode/')[1]?.split('?')[0];
        if (!episodeId) {
            return res.send('Invalid Spotify link. Please provide a valid podcast episode link.');
        }

        // Fetch episode details from Spotify API
        const options = {
            url: `https://api.spotify.com/v1/episodes/${episodeId}`,
            headers: {
                'Authorization': `Bearer ${accessToken}` // Use the access token
            },
            json: true
        };

        request.get(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                const audioPreviewUrl = body.audio_preview_url;
                res.send(`
                    <h1>Spotify Episode Details</h1>
                    <p><strong>Title:</strong> ${body.name}</p>
                    <p><strong>Description:</strong> ${body.description}</p>
                    <p><strong>Duration:</strong> ${Math.round(body.duration_ms / 60000)} minutes</p>
                    <h3>Audio Preview</h3>
                    ${audioPreviewUrl ? `<audio controls src="${audioPreviewUrl}"></audio>` : 'No audio preview available.'}
                `);
            } else {
                res.send('Failed to fetch episode details from Spotify. Please try again.');
            }
        });
    } else if (audioPath) {
        // Handle the file upload option
        res.send(`
            <h1>File Uploaded Successfully</h1>
            <p>Path: ${audioPath}</p>
            <p>Next step: Transcribe the uploaded file.</p>
        `);

        // TODO: Add transcription logic here (next step)
        fs.unlinkSync(audioPath); // Clean up the uploaded file after processing
    } else {
        res.send('Please provide either a Spotify link or upload a file.');
    }
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
