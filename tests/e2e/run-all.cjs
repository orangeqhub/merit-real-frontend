/* eslint-disable */
const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

/**
 * `devServer.kill()` alone only signals the `npm` wrapper process — with
 * `shell: true` on Windows, npm spawns Vite as a detached grandchild that
 * survives, leaving a zombie dev server bound to PORT after every run
 * (crash or not). Left unchecked across repeated runs these accumulate and
 * starve the machine of memory, causing seemingly random timeouts in
 * unrelated later runs. `taskkill /T /F` kills the whole process tree.
 */
function killDevServerTree(devServer) {
  if (!devServer.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${devServer.pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-devServer.pid, 'SIGKILL');
    }
  } catch {
    // Already exited — nothing to clean up.
  }
}

const PORT = 5183;
const BASE_URL = `http://localhost:${PORT}`;

function waitForServer(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on('error', () => {
          if (Date.now() - start > timeoutMs) reject(new Error('Dev server did not start in time'));
          else setTimeout(check, 500);
        });
    };
    check();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Each spec closes its own browser, but on a memory-constrained machine the
// OS needs a moment to actually reclaim that RAM before the next
// chromium.launch() — without this pause, specs later in the list see
// increasingly slow page loads and can time out even though nothing in the
// app itself is broken (verified independently in isolation).
const SPEC_SETTLE_MS = 1500;

async function main() {
  console.log('Starting dev server for e2e tests...');
  const devServer = spawn('npm', ['run', 'dev', '--', '--port', String(PORT)], {
    cwd: path.resolve(__dirname, '..', '..'),
    stdio: 'ignore',
    shell: true,
  });

  let exitCode = 1;
  try {
    await waitForServer(BASE_URL, 30000);
    console.log('Dev server is up. Running employee dashboard acceptance tests...\n');
    const { runEmployeeDashboardTests } = require('./employee-dashboard.spec.cjs');
    const employeeDashboardExitCode = await runEmployeeDashboardTests(BASE_URL);
    await sleep(SPEC_SETTLE_MS);

    console.log('\nRunning admin assignment acceptance tests...\n');
    const { runAdminAssignmentTests } = require('./admin-assignment.spec.cjs');
    const adminAssignmentExitCode = await runAdminAssignmentTests(BASE_URL);
    await sleep(SPEC_SETTLE_MS);

    console.log('\nRunning navbar/hero acceptance tests...\n');
    const { runNavbarHeroTests } = require('./navbar-hero.spec.cjs');
    const navbarHeroExitCode = await runNavbarHeroTests(BASE_URL);
    await sleep(SPEC_SETTLE_MS);

    console.log('\nRunning about/contact acceptance tests...\n');
    const { runAboutContactTests } = require('./about-contact.spec.cjs');
    const aboutContactExitCode = await runAboutContactTests(BASE_URL);
    await sleep(SPEC_SETTLE_MS);

    console.log('\nRunning auth portal acceptance tests...\n');
    const { runAuthPortalsTests } = require('./auth-portals.spec.cjs');
    const authPortalsExitCode = await runAuthPortalsTests(BASE_URL);
    await sleep(SPEC_SETTLE_MS);

    console.log('\nRunning UI refinement acceptance tests...\n');
    const { runUiRefinementTests } = require('./ui-refinement.spec.cjs');
    const uiRefinementExitCode = await runUiRefinementTests(BASE_URL);
    await sleep(SPEC_SETTLE_MS);

    console.log('\nRunning final refinement acceptance tests...\n');
    const { runFinalRefinementsTests } = require('./final-refinements.spec.cjs');
    const finalRefinementsExitCode = await runFinalRefinementsTests(BASE_URL);

    exitCode =
      employeeDashboardExitCode === 0 &&
      adminAssignmentExitCode === 0 &&
      navbarHeroExitCode === 0 &&
      aboutContactExitCode === 0 &&
      authPortalsExitCode === 0 &&
      uiRefinementExitCode === 0 &&
      finalRefinementsExitCode === 0
        ? 0
        : 1;
  } catch (err) {
    console.error('E2E test run failed to start:', err);
    exitCode = 1;
  } finally {
    killDevServerTree(devServer);
  }
  process.exit(exitCode);
}

main();
