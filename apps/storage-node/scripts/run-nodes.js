const { spawn, execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

const nodes = [
  { name: 'node-1', port: 5001 },
  { name: 'node-2', port: 5002 },
  { name: 'node-3', port: 5003 },
  { name: 'node-4', port: 5004 },
  { name: 'node-5', port: 5005 },
];

const children = [];

function pipePrefixed(stream, prefix, targetStream) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const cleanLine = line.endsWith('\r') ? line.slice(0, -1) : line;
      targetStream.write(`${prefix} ${cleanLine}\n`);
    }
  });
  stream.on('end', () => {
    if (buffer.length > 0) {
      const cleanLine = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer;
      targetStream.write(`${prefix} ${cleanLine}\n`);
      buffer = '';
    }
  });
}

function killChildren() {
  for (const child of children) {
    if (child && !child.killed) {
      if (isWindows && child.pid) {
        try {
          execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
        } catch {
          try {
            child.kill('SIGINT');
          } catch {}
        }
      } else {
        try {
          child.kill('SIGINT');
        } catch {}
      }
    }
  }
}

let isShuttingDown = false;
function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  killChildren();
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('==================================================');
console.log('Starting 5 local storage nodes:');
nodes.forEach(({ name, port }) => {
  console.log(`  - [${name}] http://localhost:${port} (storage: ./storage)`);
});
console.log('Press Ctrl+C to stop all nodes.');
console.log('==================================================\n');

for (const node of nodes) {
  const child = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(node.port),
      NODE_NAME: node.name,
      STORAGE_DIR: './storage',
    },
    shell: isWindows,
  });

  const prefix = `[${node.name}]`;
  pipePrefixed(child.stdout, prefix, process.stdout);
  pipePrefixed(child.stderr, prefix, process.stderr);

  child.on('error', (err) => {
    console.error(`${prefix} Failed to start process:`, err.message);
  });

  child.on('exit', (code) => {
    if (!isShuttingDown && code !== 0 && code !== null) {
      console.error(`${prefix} Process exited with code ${code}`);
    }
  });

  children.push(child);
}
