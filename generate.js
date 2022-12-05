// run as: node index.js --port=1234 --count=512 --threads=18 --res=2400

const { Cluster } = require('puppeteer-cluster');
const fs = require('fs');
var argv = require('yargs/yargs')(process.argv.slice(2)).argv;

(async () => {
  let maxConc = argv.threads || 8;
  let mutliples = argv.count || 100;
  let res = argv.scale || 2;
  let meta = argv.meta || false;
  let port = argv.port || 8080;
  let hashFilePath = argv.hashList || null;
  let size = argv.res || 3000;
  let hashMap = null;

  if (hashFilePath) {
    let data = fs.readFileSync(hashFilePath);
    hashMap = JSON.parse(Buffer.from(data).toString());
  }

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_BROWSER,
    maxConcurrency: maxConc,
    puppeteerOptions: {
      headless: true,
      args: [
        '--proxy-server="direct://"',
        '--proxy-bypass-list=*',
        // `--window-size=${1},${1}`,
        '--use-gl=egl',
      ],
      // args: [`--window-size=${500},${500}`],
    },
    monitor: true,
    timeout: 999999999,
  });

  await cluster.task(async ({ page, data }) => {
    // console.log(data);
    const { url, id } = data;
    page.setViewport({ width: size, height: size });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
    );
    await page.goto(url);

    let hash = await page.evaluate(() => window?.tokenData?.hash || window.fxhash);

    await page.waitForFunction(
      () => {
        console.log('hello');
        console.log(document.complete);
        return document.complete === true;
      },
      {
        polling: 500,
        timeout: 0,
      }
    );

    const type = await page.evaluate(() => {
      return document.querySelector('#defaultCanvas0').nodeName;
    });

    const dataUrl = await page.evaluate(() => {
      let c = document.querySelector('#defaultCanvas0');
      if (c.nodeName == 'CANVAS') {
        return c.toDataURL();
      } else {
        return c.innerHTML;
      }
    });

    hash = await page.evaluate(() => window?.tokenData?.hash || window.fxhash);
    // console.log('starting ', hash);

    const metaObj = await page.evaluate(() => window.metadata || window.$fxhashFeatures);

    if (type == 'CANVAS') {
      let base64String = dataUrl.substr(dataUrl.indexOf(',') + 1);
      let imageBuffer = Buffer.from(base64String, 'base64');
      fs.writeFileSync('out/' + (id ? id : hash) + '.png', imageBuffer);
      if (meta) fs.writeFileSync('out/' + (id ? id : hash) + '.json', JSON.stringify(metaObj));
    } else {
      fs.writeFileSync('out/' + (id ? id : hash) + '.svg', dataUrl);
    }

    return hash;
  });

  // Use try-catch block as "execute" will throw instead of using events

  if (!hashMap) {
    try {
      for (i = 0; i < mutliples; i++) {
        // Execute the tasks one after another via execute
        cluster.execute({
          // url: `http://localhost:8080`,
          url: `https://teal-boba-ea0e66.netlify.app/`,
          id: null,
        });
        //   .then(result => console.log('finished', result));
      }
    } catch (err) {
      // Handle crawling error
      console.log(err);
    }
  } else {
    try {
      console.log(Object.keys(hashMap));
      for (i = 0; i < Object.keys(hashMap).length; i++) {
        // Execute the tasks one after another via execute
        let id = Object.keys(hashMap)[i];
        cluster.execute({
          url: `http://localhost:${port}&hash=${hashMap[i]}`,
          id: id,
        });
        //   .then(result => console.log('finished', result));
      }
    } catch (err) {
      // Handle crawling error
      console.log(err);
    }
  }

  await cluster.idle();
  await cluster.close();
})();
