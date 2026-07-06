const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const deployDir = path.join(root, 'node_modules', '.cache', 'manual-gh-pages');
const repo = 'https://github.com/techaxadi01/FSD-Activity-React.git';

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('dist/index.html was not found. Run npm run build before deploying.');
  process.exit(1);
}

fs.rmSync(deployDir, { recursive: true, force: true });
fs.mkdirSync(deployDir, { recursive: true });
fs.cpSync(distDir, deployDir, { recursive: true });

run('git', ['init'], deployDir);
run('git', ['checkout', '-B', 'gh-pages'], deployDir);
run('git', ['add', '-A'], deployDir);
run('git', ['commit', '-m', 'Deploy to GitHub Pages'], deployDir);
run('git', ['remote', 'add', 'origin', repo], deployDir);
run('git', ['push', '--force', 'origin', 'gh-pages'], deployDir);
