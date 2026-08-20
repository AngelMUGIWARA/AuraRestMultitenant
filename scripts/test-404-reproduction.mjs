#!/usr/bin/env node

/**
 * Playwright test to reproduce the 404 error on /auth/login
 * Starts backend, web-shell (dev), and 3 MFEs in parallel
 * Runs 3 times in cold conditions to isolate Turbopack compilation issues
 */

import { spawn, exec } from "child_process";
import { chromium } from "playwright";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(__dirname);
const execAsync = promisify(exec);
const resultsDir = path.join(projectRoot, ".test-results");

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const SERVICES = [
  {
    name: "backend",
    cmd: "pnpm",
    args: ["--filter", "backend", "start:dev"],
    port: 5000,
    ready: "Listening on port 5000",
  },
  {
    name: "web-shell",
    cmd: "pnpm",
    args: ["dev:shell"],
    port: 3000,
    ready: "Ready in",
  },
  {
    name: "core_auth",
    cmd: "pnpm",
    args: ["dev:core"],
    port: 5011,
    ready: "ready on",
  },
  {
    name: "orders",
    cmd: "pnpm",
    args: ["dev:orders"],
    port: 5012,
    ready: "ready on",
  },
  {
    name: "reserv",
    cmd: "pnpm",
    args: ["dev:reserv"],
    port: 5013,
    ready: "ready on",
  },
];

let processes = [];

async function startService(service) {
  return new Promise((resolve, reject) => {
    console.log(`[${service.name}] Starting...`);

    const proc = spawn(service.cmd, service.args, {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    let readyDetected = false;

    const handleOutput = (data) => {
      const output = data.toString();
      console.log(`[${service.name}]`, output.trim());

      if (!readyDetected && output.includes(service.ready)) {
        readyDetected = true;
        console.log(`[${service.name}] ✓ Ready`);
        resolve(proc);
      }
    };

    proc.stdout.on("data", handleOutput);
    proc.stderr.on("data", handleOutput);

    proc.on("error", (err) => {
      console.error(`[${service.name}] Error:`, err.message);
      reject(err);
    });

    proc.on("exit", (code) => {
      if (code !== null && code !== 0) {
        console.error(`[${service.name}] Exited with code ${code}`);
        if (!readyDetected) {
          reject(new Error(`Service failed to start: ${code}`));
        }
      }
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!readyDetected) {
        proc.kill();
        reject(new Error(`Service startup timeout: ${service.name}`));
      }
    }, 60000);
  });
}

async function waitForService(port, retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`http://localhost:${port}`, {
        timeout: 2000,
      });
      if (response.ok || response.status === 404) {
        return true;
      }
    } catch (err) {
      // Service not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Service on port ${port} did not respond in time`);
}

async function cleanDotNext() {
  const dotNextPath = path.join(projectRoot, "apps/web-shell/.next");
  if (fs.existsSync(dotNextPath)) {
    console.log("Cleaning .next directory...");
    // Use recursive deletion
    fs.rmSync(dotNextPath, { recursive: true, force: true });
    console.log("✓ .next cleaned");
  }
}

async function runTest(runNumber) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`RUN #${runNumber} - Testing /auth/login`);
  console.log(`${"=".repeat(60)}\n`);

  // Clean .next before each run to simulate cold start
  await cleanDotNext();

  // Start all services
  console.log("Starting services...\n");
  for (const service of SERVICES) {
    try {
      const proc = await startService(service);
      processes.push(proc);
      await new Promise((r) => setTimeout(r, 2000)); // Small delay between starts
    } catch (err) {
      console.error(`Failed to start ${service.name}:`, err.message);
      throw err;
    }
  }

  console.log("\n✓ All services started, waiting for full readiness...\n");

  // Wait for all services to be responsive
  for (const service of SERVICES) {
    try {
      await waitForService(service.port);
      console.log(`✓ ${service.name} (port ${service.port}) is responsive`);
    } catch (err) {
      console.error(`Service ${service.name} failed responsiveness check:`, err);
      throw err;
    }
  }

  // Give extra time for all startup to complete
  console.log("\nWaiting 5 seconds for full stabilization...\n");
  await new Promise((r) => setTimeout(r, 5000));

  // Launch browser and test
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages and errors
  const consoleLogs = [];
  page.on("console", (msg) => {
    const entry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    };
    consoleLogs.push(entry);
    console.log(`[PAGE CONSOLE ${msg.type().toUpperCase()}]`, msg.text());
  });

  // Capture network requests
  const networkLog = [];
  page.on("request", (request) => {
    networkLog.push({
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
    });
  });

  page.on("response", (response) => {
    const entry = {
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      resourceType: response.request().resourceType(),
    };
    networkLog.push(entry);
    if (response.status() === 404) {
      console.log(
        `[NETWORK 404] ${response.request().method()} ${response.url()}`
      );
    }
  });

  try {
    console.log("Navigating to http://localhost:3000/auth/login...\n");

    const response = await page.goto("http://localhost:3000/auth/login", {
      waitUntil: "domcontentloaded",
    });

    const finalStatus = response?.status() || "Unknown";
    const finalUrl = page.url();

    console.log(`\n✓ Navigation complete`);
    console.log(`  Final Status: ${finalStatus}`);
    console.log(`  Final URL: ${finalUrl}`);

    // Get page title and check for error indicators
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.textContent);

    console.log(`\n  Page Title: ${title}`);
    console.log(`  Body contains "404": ${bodyText.includes("404")}`);
    console.log(`  Body contains "Error": ${bodyText.includes("Error")}`);

    // Save detailed results
    const results = {
      runNumber,
      timestamp: new Date().toISOString(),
      navigationStatus: finalStatus,
      finalUrl,
      pageTitle: title,
      consoleMessages: consoleLogs,
      networkLog: networkLog.slice(0, 50), // First 50 for brevity
      has404InConsole: consoleLogs.some((log) => log.text.includes("404")),
      has404InNetwork: networkLog.some((log) => log.status === 404),
      bodyHas404: bodyText.includes("404"),
    };

    fs.writeFileSync(
      path.join(resultsDir, `run-${runNumber}-details.json`),
      JSON.stringify(results, null, 2)
    );

    console.log(
      `\n✓ Results saved to ${resultsDir}/run-${runNumber}-details.json`
    );

    // Summary
    console.log(`\n${"-".repeat(40)}`);
    console.log("SUMMARY:");
    console.log(
      `  Navigation Status: ${finalStatus} ${finalStatus === 200 ? "✓" : "✗"}`
    );
    console.log(
      `  404 in Network: ${results.has404InNetwork ? "YES ✗" : "NO ✓"}`
    );
    console.log(
      `  404 in Console: ${results.has404InConsole ? "YES ✗" : "NO ✓"}`
    );
    console.log(
      `  404 in Body: ${results.bodyHas404 ? "YES ✗" : "NO ✓"}`
    );
    console.log(`${"-".repeat(40)}\n`);

    return results;
  } catch (err) {
    console.error("Test error:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

async function cleanup() {
  console.log("\nCleaning up processes...");
  for (const proc of processes) {
    try {
      proc.kill("SIGTERM");
    } catch (err) {
      // Already dead
    }
  }
  processes = [];

  // Wait a bit for graceful shutdown
  await new Promise((r) => setTimeout(r, 2000));
}

async function main() {
  try {
    console.log("404 Reproduction Test Script");
    console.log("============================\n");

    const allResults = [];

    for (let run = 1; run <= 3; run++) {
      try {
        const result = await runTest(run);
        allResults.push(result);

        // Cleanup between runs
        await cleanup();

        if (run < 3) {
          console.log("\nWaiting 10 seconds before next run...\n");
          await new Promise((r) => setTimeout(r, 10000));
        }
      } catch (err) {
        console.error(`\n✗ Run ${run} failed:`, err.message);
        await cleanup();
        if (run < 3) {
          console.log("\nWaiting 10 seconds before retry...\n");
          await new Promise((r) => setTimeout(r, 10000));
        }
      }
    }

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("FINAL RESULTS SUMMARY");
    console.log("=".repeat(60) + "\n");

    for (const result of allResults) {
      console.log(`Run #${result.runNumber}:`);
      console.log(
        `  Status: ${result.navigationStatus} | 404 Found: ${result.has404InNetwork || result.has404InConsole}`
      );
    }

    fs.writeFileSync(
      path.join(resultsDir, "summary.json"),
      JSON.stringify(allResults, null, 2)
    );

    console.log(
      `\n✓ All results saved to: ${path.relative(process.cwd(), resultsDir)}`
    );
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  } finally {
    await cleanup();
    process.exit(0);
  }
}

main();
