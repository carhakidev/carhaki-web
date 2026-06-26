const pngToIco = require('png-to-ico').default;
const fs = require('fs');

pngToIco(['public/favicon-16x16.png', 'public/favicon-32x32.png'])
  .then(buf => fs.writeFileSync('public/favicon.ico', buf))
  .then(() => console.log('favicon.ico generated'))
