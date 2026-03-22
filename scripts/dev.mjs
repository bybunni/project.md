import http from 'node:http';
import { spawn } from 'node:child_process';

const host = '127.0.0.1';
const port = 5173;
const devServerUrl = `http://${host}:${port}`;

const children = new Set();
let shuttingDown = false;

function spawnChild(command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  children.add(child);
  child.on('exit', (code) => {
    children.delete(child);

    if (!shuttingDown && code && code !== 0) {
      shutdown(code);
    }
  });

  return child;
}

function waitForServer(url) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startedAt > 30000) {
          reject(new Error(`Timed out waiting for Vite at ${url}`));
          return;
        }

        setTimeout(attempt, 250);
      });
    };

    attempt();
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    child.kill('SIGTERM');
  }

  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  spawnChild('vite', ['--host', host, '--port', String(port)]);
  await waitForServer(devServerUrl);

  const electron = spawnChild('electron', ['.'], {
    VITE_DEV_SERVER_URL: devServerUrl,
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
  });

  electron.on('exit', (code) => {
    shutdown(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error.message);
  shutdown(1);
});
