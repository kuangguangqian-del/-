// download_assets.js
import fs from 'fs';
import https from 'https';
import path from 'path';

const dirs = ['libs', 'assets'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const files = [
  // Libraries
  {
    url: 'https://cdn.tailwindcss.com',
    dest: 'libs/tailwindcss.js'
  },
  {
    url: 'https://esm.sh/react@18.2.0?bundle',
    dest: 'libs/react.js'
  },
  {
    url: 'https://esm.sh/react-dom@18.2.0?bundle',
    dest: 'libs/react-dom.js'
  },
  {
    url: 'https://esm.sh/react-webcam@7.2.0?external=react,react-dom&bundle',
    dest: 'libs/react-webcam.js'
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js',
    dest: 'libs/camera_utils.js'
  },
  {
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

  const request = https.get(url, (response) => {
    if (response.statusCode === 301 || response.statusCode === 302) {
      // ✅ 正确解析重定向 URL（支持相对路径）
      const redirectUrl = new URL(response.headers.location, url).href;
      file.destroy(); // 中止当前写入
      download(redirectUrl, dest); // 递归下载新地址
      return;
    }

    response.pipe(file);

    file.on('finish', () => {
      file.close();
      console.log(`✅ Finished: ${dest}`);
    });
  });

  request.on('error', (err) => {
    file.destroy();
    fs.unlink(dest, () => {});
    console.error(`❌ Error downloading ${url}: ${err.message}`);
  });
};
console.log("Starting download of assets...");
files.forEach(f => download(f.url, f.dest));