import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const net of entries || []) {
      if (net && net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

const port = 3000;
const lanIp = getLanIp();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viteBin = path.resolve(__dirname, '../node_modules/vite/bin/vite.js');

console.log('Frontend started');
console.log(`Open locally: http://localhost:${port}`);
console.log(`Open from other devices on the LAN: http://${lanIp}:${port}`);

const child = spawn(process.execPath, [viteBin, '--host', '0.0.0.0', '--port', String(port)], {
  stdio: 'inherit',
  shell: false,
});

child.on('exit', code => process.exit(code ?? 0));
