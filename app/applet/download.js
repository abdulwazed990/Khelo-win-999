import https from 'https';
import fs from 'fs';

const url = 'https://raw.githubusercontent.com/abdulwazed990/Pokie-Super-Ace-/main/src/App.tsx';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    fs.writeFileSync('downloaded_app.tsx', data);
    console.log('Downloaded successfully');
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
