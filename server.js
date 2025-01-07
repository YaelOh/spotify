app.get('/process', (req, res) => {
    const podcastLink = req.query.podcastLink;
    console.log('Received podcast link:', podcastLink);

    // Extract the Spotify episode ID from the link
    const episodeId = podcastLink.split('/episode/')[1]?.split('?')[0];
    console.log('Extracted episode ID:', episodeId);

    if (!episodeId) {
        return res.send('Invalid podcast link. Please provide a valid Spotify episode link.');
    }

    // Call Spotify API to get episode details
    const options = {
        url: `https://api.spotify.com/v1/episodes/${episodeId}`,
        headers: {
            'Authorization': `Bearer BQAZ07eL3jDykI8meSc_HwlzR9txU7cDjgcmgNjm44RxD0coTeyb8PFonshm2y7fcGE5-iUyzL-nE-Bgx7zsyPgYHwEXqVSXa5iOuZ4RN3cEJbk5kdwt8a57FugBGb3qzYpq-DL5EvtEGjCCptF4dhDufB4mVoPtu9a09qPiuTavRZ_JDD5haKNIR5k1PCNTg14XDfSCHYeqphAmA5JSgw`
        },
        json: true
    };

    require('request').get(options, (error, response, body) => {
        console.log('Spotify API response:', response && response.statusCode, body);

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

