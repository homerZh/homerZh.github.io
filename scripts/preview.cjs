const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
// Serve only public site files, never repository, SQL or dependency files.
const routes = {
  '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'],
  '/admin.html': ['admin.html', 'text/html'],
  '/calories.html': ['calories.html', 'text/html'],
  '/blood-pressure.html': ['blood-pressure.html', 'text/html'],
  '/assets/calories.js': ['assets/calories.js', 'text/javascript'],
  '/assets/calories.css': ['assets/calories.css', 'text/css'],
  '/assets/blood-pressure.js': ['assets/blood-pressure.js', 'text/javascript'],
  '/assets/blood-pressure.css': ['assets/blood-pressure.css', 'text/css'],
  '/cloudbase.config.js': ['cloudbase.config.js', 'text/javascript'],
  '/assets/admin.js': ['assets/admin.js', 'text/javascript'],
  '/assets/admin.css': ['assets/admin.css', 'text/css']
};
http.createServer((req, res) => {
  const file = routes[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(root, file[0]), (error, data) => {
    if (error) { res.writeHead(500); return res.end('File unavailable'); }
    res.writeHead(200, { 'Content-Type': file[1] + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(4173, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4173'));
