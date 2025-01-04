const express = require('express');
const app = express();

// Serve the main page
app.get('/', (req, res) => {
    res.send(`
        <html>
            <body>
                <h1>Podcast Reference Extractor</h1>
                <form action="/process" method="GET">
                    <label for="podcastLink">Enter Podcast Episode Link:</label>
                    <input type="url" id="podcastLink" name="podcastLink" required>
                    <button type="submit">Submit</button>
                </form>
            </body>
        </html>
    `);
});

// Handle the form submission
app.get('/process', (req, res) => {
    const podcastLink = req.query.podcastLink;
    res.send(`You entered: ${podcastLink}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
