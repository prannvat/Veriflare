// Focused test: Does User-Agent header fix the FETCH ERROR?
const VERIFIER_URL = "https://fdc-verifiers-testnet.flare.network/verifier/web2";
const API_KEY = "00000000-0000-0000-0000-000000000000";
const ATTESTATION_TYPE = "0x" + Buffer.from("Web2Json").toString("hex").padEnd(64, "0");
const SOURCE_ID = "0x" + Buffer.from("PublicWeb2").toString("hex").padEnd(64, "0");

const abiSignature = JSON.stringify({
  components: [
    { internalType: "string", name: "commitSha", type: "string" },
    { internalType: "string", name: "treeHash", type: "string" },
    { internalType: "string", name: "authorLogin", type: "string" },
  ],
  name: "task",
  type: "tuple",
});

async function test(label, headers) {
  console.log(`\n=== ${label} ===`);
  const body = {
    attestationType: ATTESTATION_TYPE,
    sourceId: SOURCE_ID,
    requestBody: {
      url: "https://api.github.com/repos/torvalds/linux/commits/0ad2507d5d93f39ab709a60a2fa64dfe8046e3a1",
      httpMethod: "GET",
      headers: JSON.stringify(headers),
      queryParams: "{}",
      body: "{}",
      postProcessJq: "{commitSha: .sha, treeHash: .commit.tree.sha, authorLogin: .author.login}",
      abiSignature,
    },
  };

  try {
    const resp = await fetch(`${VERIFIER_URL}/Web2Json/prepareRequest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
      body: JSON.stringify(body),
    });
    const json = await resp.json();
    console.log("Response:", JSON.stringify(json).substring(0, 400));
    if (json.abiEncodedRequest) console.log("✅ SUCCESS");
    else console.log("❌ FAILED -", json.status);
  } catch(e) {
    console.error("Network error:", e.message);
  }
}

// Test 1: No headers (current code)
await test("No headers", {});

// Test 2: With User-Agent
await test("With User-Agent", { "User-Agent": "FDC-Verifier" });

// Test 3: With Accept header
await test("With Accept + User-Agent", { 
  "User-Agent": "FDC-Verifier",
  "Accept": "application/vnd.github.v3+json"
});

console.log("\nDone.");
