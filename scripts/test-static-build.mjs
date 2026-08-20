#!/usr/bin/env node

/**
 * Test the static build with MFEs available
 * Starts: preview:shell + preview:core + preview:orders + preview:reserv
 * Then navigates to /auth/login to test MFE loading
 */

import { spawn } from "child_process";
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(__dirname);
const resultsDir = path.join(projectRoot, ".test-results");

if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const SERVICES = [
  {
    name: "preview:shell",
    cmd: "pnpm",
    args: ["preview:shell"],
    port: 3030,
    ready: "Accepting connections",
  },
  {
    name: "preview:core",
    cmd: "pnpm",
    args: ["preview:core"],
    port: 5011,
    ready: "ready",
  },
  {
    name: "preview:orders",
    cmd: "pnpm",
    args: ["preview:orders"],
    port: 5012,
    ready: "ready",
  },
  {
    name: "preview:reserv",
    cmd: "pnpm",
    args: ["preview:reserv"],
    port: 5013,
    ready: "ready",
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
      return true;
    } catch (err) {
      // Not ready
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Service on port ${port} did not respond`);
}

async function cleanup() {
  console.log("\nCleaning up...");
  for (const proc of processes) {
    try {
      proc.kill("SIGTERM");
    } catch (err) {
      // Already dead
    }
  }
  processes = [];
  await new Promise((r) => setTimeout(r, 2000));
}

async function main() {
  try {
    console.log("Testing Static Build with MFEs\n");
    console.log("Starting services...\n");

    for (const service of SERVICES) {
      try {
        const proc = await startService(service);
        processes.push(proc);
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        console.error(`Failed to start ${service.name}:`, err.message);
        throw err;
      }
    }

    console.log("\nWaiting for all services to be responsive...\n");

    for (const service of SERVICES) {
      try {
        await waitForService(service.port);
        console.log(`✓ ${service.name} (port ${service.port}) is responsive`);
      } catch (err) {
        console.error(`Service ${service.name} failed:`, err);
        throw err;
      }
    }

    console.log("\n✓ All services ready. Testing /auth/login...\n");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleLogs = [];
    const networkErrors = [];

    page.on("console", (msg) => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
      });
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[CONSOLE ${msg.type()}]`, msg.text());
      }
    });

    page.on("response", (response) => {
      if (response.status() === 404 || response.status() >= 500) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          resourceType: response.request().resourceType(),
        });
        console.log(
          `[NETWORK ${response.status()}] ${response.request().method()} ${response.url()}`
        );
      }
    });

    console.log("Navigating to http://localhost:3030/auth/login...\n");

    const response = await page.goto("http://localhost:3030/auth/login", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const finalStatus = response?.status() || "Unknown";
    const finalUrl = page.url();
    const title = await page.title();

    console.log(`\n✓ Navigation completed`);
    console.log(`  Status: ${finalStatus}`);
    console.log(`  URL: ${finalUrl}`);
    console.log(`  Title: ${title}`);
    console.log(`  Console Errors: ${consoleLogs.filter((l) => l.type === "error").length}`);
    console.log(`  Network Errors (404/5xx): ${networkErrors.length}`);

    if (networkErrors.length > 0) {
      console.log("\n  Errors found:");
      networkErrors.forEach((err) => {
        console.log(`    - ${err.status} ${err.url}`);
      });
    }

    const results = {
      timestamp: new Date().toISOString(),
      testType: "static-build-with-mfes",
      navigationStatus: finalStatus,
      finalUrl,
      pageTitle: title,
      consoleErrors: consoleLogs.filter((l) => l.type === "error").length,
      networkErrors: networkErrors.length,
      success: finalStatus === 200 && networkErrors.length === 0,
    };

    fs.writeFileSync(
      path.join(resultsDir, "static-build-test.json"),
      JSON.stringify(results, null, 2)
    );

    console.log(
      `\n✓ Results saved to ${path.relative(process.cwd(), resultsDir)}/static-build-test.json`
    );

    await browser.close();
  } catch (err) {
    console.error("Test error:", err);
    process.exit(1);
  } finally {
    await cleanup();
    process.exit(0);
  }
}

main();
