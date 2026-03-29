import https from 'https';
import fs from 'fs';

const files = [
  { url: 'https://raw.githubusercontent.com/abdulwazed990/Pokie-Super-Ace-/main/src/constants.ts', dest: 'src/components/PokieSuperAceConstants.ts' },
  { url: 'https://raw.githubusercontent.com/abdulwazed990/Pokie-Super-Ace-/main/src/services/audioManager.ts', dest: 'src/components/PokieSuperAceAudioManager.ts' },
  { url: 'https://raw.githubusercontent.com/abdulwazed990/Pokie-Super-Ace-/main/src/index.css', dest: 'src/components/PokieSuperAceStyles.css' }
];

files.forEach(file => {
  https.get(file.url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      fs.writeFileSync(file.dest, data);
      console.log('Downloaded', file.dest);
    });
  });
});
