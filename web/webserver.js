const express = require('express');
const fs = require('fs');
const path = require('path');
const https = null;
const http = require('http');

const USE_PROD = false;
const USE_SSL = false;

let port = null;
let domain = null;

if(USE_PROD) {
    port = USE_SSL ? 443 : 80;
    domain = `${USE_SSL ? 'https' : 'http'}://smashtest.io`;
}
else { // local
    port = USE_SSL ? 8081 : 8080;
    domain = `${USE_SSL ? 'https' : 'http'}://localhost:${port}`;
}

let ca = null;
let privateKey = null;
let certificate = null;

if(USE_SSL) {
    https = require('https');

    if(USE_PROD) {
        ca = fs.readFileSync(path.join(__dirname, 'ssl', 'smashtest_io.ca-bundle'), 'utf8');
        privateKey = fs.readFileSync(path.join(__dirname, 'ssl', 'smashtest_io.key'), 'utf8');
        certificate = fs.readFileSync(path.join(__dirname, 'ssl', 'smashtest_io.crt'), 'utf8');
    }
    else { // local
        ca = null;
        privateKey = fs.readFileSync(path.join(__dirname, 'ssl', 'local.key'), 'utf8');
        certificate = fs.readFileSync(path.join(__dirname, 'ssl', 'local.cert'), 'utf8');
    }
}

let app = express();

// Any page (doesn't contain a .)
app.get(/^\/[^\.]*$/, (req, res) => {
    let file = fs.readFileSync(path.join(__dirname , 'index.html'), 'utf8');
    res.status(200).send(file);
});

// For serving up public-content/ directory
app.use(express.static(path.join(__dirname, 'public-content')));

// Generic error handler
app.use((err, req, res, next) => {
    res.status(404).send('404 Not Found');
});

// Start the server
if(USE_SSL) {
    var httpsServer = https.createServer({ ca: ca, key: privateKey, cert: certificate }, app);
    httpsServer.listen(port, () => {
        console.log(`HTTPS server running on port ${port}`);
    });

    // Server for redirecting http to https
    var httpServer = http.createServer((req, res) => {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
    });
    httpServer.listen(port);
}
else {
    var httpServer = http.createServer(app).listen(port, () => {
        console.log(`HTTP server running on port ${port}`);
    });
}
