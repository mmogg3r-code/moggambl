import next from 'next';
import { createServer } from 'node:http';
import { parse } from 'node:url';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: '.' });
const handle = app.getRequestHandler();
const port = Number(process.env.PORT || 3000);

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`MogGambl Next server running on ${port}`);
  });
});
