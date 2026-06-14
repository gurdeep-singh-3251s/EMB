/**
 * Smoke-check a deployed ExtractPilot stack.
 *
 * Usage:
 *   WEB_URL=https://app.example.com API_URL=https://api.example.com bun run verify:deploy
 */

const webUrl = (process.env.WEB_URL ?? "").replace(/\/$/, "");
const apiUrl = (process.env.API_URL ?? "").replace(/\/$/, "");

if (!webUrl || !apiUrl) {
  console.error("Set WEB_URL and API_URL environment variables.");
  process.exit(1);
}

async function check(name: string, url: string, expectJson?: boolean): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    const ok = res.ok;
    if (!ok) {
      console.error(`✗ ${name} — HTTP ${res.status} (${url})`);
      return false;
    }
    if (expectJson) {
      await res.json();
    }
    console.log(`✓ ${name}`);
    return true;
  } catch (e) {
    console.error(`✗ ${name} — ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

let passed = 0;
let failed = 0;

async function run(name: string, url: string, expectJson?: boolean) {
  if (await check(name, url, expectJson)) passed++;
  else failed++;
}

console.log(`Checking ExtractPilot deploy\n  Web: ${webUrl}\n  API: ${apiUrl}\n`);

await run("API health", `${apiUrl}/health`, true);
await run("API plans (public)", `${apiUrl}/api/v1/plans`, true);
await run("API usage (public)", `${apiUrl}/api/v1/usage`, true);
await run("Web home", webUrl, false);
await run("Web dashboard", `${webUrl}/dashboard`, false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
