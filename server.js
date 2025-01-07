const express = require('express');
const querystring = require('querystring');
const request = require('request');
const app = express();

// Spotify Credentials
const CLIENT_ID = 'ced7feabad00473bb6bd9d8952945314';
const CLIENT_SECRET = '6f2a8e94b47a4927bf23c0c38af9d53f';
const REDIRECT_URI = 'https://delirious-golden-laugh.glitch.me/callback';

// Main page
app.get('/', (req, res) => {
    res.send(`
        <html>
            <body>
                <h1>Podcast Insight Finder</h1>
                <form action="/process" method="GET">
                    <label for="podcastLink">Enter Podcast Episode Link:</label>
                    <input type="url" id="podcastLink" name="podcastLink" required>
                    <button type="submit">Submit</button>
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
            const accessToken = body.access_token;
            res.send(`Access token received: ${accessToken}`);
        } else {
            res.send('Authorization failed');
        }
    });
});

// Process the submitted podcast link
app.get('/process', (req, res) => {
    const podcastLink = req.query.podcastLink;

    // Extract the Spotify episode ID from the link
    const episodeId = podcastLink.split('/episode/')[1]?.split('?')[0];
    if (!episodeId) {
        return res.send('Invalid podcast link. Please provide a valid Spotify episode link.');
    }

    // Call Spotify API to get episode details
    const options = {
        url: `https://api.spotify.com/v1/episodes/${episodeId}`,
        headers: {
            'Authorization': `Bearer YOUR_ACCESS_TOKEN`
        },
        json: true
    };

    request.get(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            res.send(`
                <h1>Episode Details</h1>
                <p><strong>Title:</strong> ${body.name}</p>
                <p><strong>Description:</strong> ${body.description}</p>
                <p><strong>Duration:</strong> ${Math.round(body.duration_ms / 60000)} minutes</p>
            `);
        } else {
            res.send('Failed to fetch episode details. Please try again.');
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
