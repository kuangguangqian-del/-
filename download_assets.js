
const fs = require('fs');
const https = require('https');
const path = require('path');

const dirs = ['libs', 'assets'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
});

const files = [
    // Libraries
    {
        url: 'https://cdn.tailwindcss.com',
        dest: 'libs/tailwindcss.js'
    },
    {
        // React bundled
        url: 'https://esm.sh/react@18.2.0?bundle',
        dest: 'libs/react.js'
    },
    {
        // React DOM bundled
        url: 'https://esm.sh/react-dom@18.2.0?bundle',
        dest: 'libs/react-dom.js'
    },
    {
        // React Webcam bundled, externalizing react
        url: 'https://esm.sh/react-webcam@7.2.0?external=react,react-dom&bundle',
        dest: 'libs/react-webcam.js'
    },
    {
        // MediaPipe Camera Utils
        url: 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js',
        dest: 'libs/camera_utils.js'
    },
    {
        // MediaPipe Face Mesh
        url: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js',
        dest: 'libs/face_mesh.js'
    },
    // Audio Assets
    {
        url: 'https://actions.google.com/sounds/v1/holiday/deck_the_halls.ogg',
        dest: 'assets/deck_the_halls.ogg'
    },
    {
        url: 'https://actions.google.com/sounds/v1/tools/ratchet_wrench.ogg',
        dest: 'assets/ratchet_wrench.ogg'
    },
    {
        url: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg',
        dest: 'assets/cartoon_boing.ogg'
    }
];

const download = (url, dest) => {
    const file = fs.createWriteStream(dest);
    console.log(`Downloading ${url} to ${dest}...`);
    https.get(url, (response) => {
        // Handle redirects if any
        if (response.statusCode === 301 || response.statusCode === 302) {
             download(response.headers.location, dest);
             return;
        }
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`✅ Finished: ${dest}`);
        });
    }).on('error', (err) => {
        fs.unlink(dest, () => {});
        console.error(`❌ Error downloading ${url}: ${err.message}`);
    });
};

console.log("Starting download of assets...");
files.forEach(f => download(f.url, f.dest));
