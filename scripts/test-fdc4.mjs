// Test if headers in requestBody are forwarded by the verifier to the target URL
const VERIFIER_URL = "https://fdc-verifiers-testnet.flare.network/verifier/web2";
const API_KEY = "00000000-0000-0000-0000-000000000000";
const ATTESTATION_TYPE = "0x" + Buffer.from("Web2Json").toString("hex").padEnd(64, "0");
const SOURCE_ID = "0x" + Buffer.from("PublicWeb2").toString("hex").padEnd(64, "0");

const commitSig = JSON.stringify({
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
  console.log("Headers:", headers);
  
  const body = {
    attestationType: ATTESTATION_TYPE,
    sourceId: SOURCE_ID,
    requestBody: {
      url: "https://api.github.com/repos/torvalds/linux/commits/0ad2507d5d93f39ab709a60a2fa64dfe8046e3a1",
      httpMethod: "GET",
      headers,
      queryParams: "{}",
      body: "{}",
      postProcessJq: "{commitSha: .sha, treeHash: .commit.tree.sha, authorLogin: .author.login}",
      abiSignature: commitSig,
    },
  };

  try {
    const resp = await fetch(`${VERIFIER_URL}/Web2Json/prepareRequest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
      body: JSON.stringify(body),
    });
    const json = await resp.json();
    const str = JSON.stringify(json);
    console.log("Response:", str.substring(0, 300));
    if (json.abiEncodedRequest) console.log("✅ SUCCESS");
    else console.log("❌ FAILED -", json.status);
  } catch(e) {
    console.error("Error:", e.message);
  }
}

// The headers field is a JSON STRING containing headers for the verifier to send
// GitHub requires User-Agent and Accept headers

// Test 1: Empty headers (current - fails)
await test("Empty headers", "{}");

// Test 2: User-Agent only (GitHub requires this)
await test("User-Agent only", JSON.stringify({"User-Agent": "FDC-Verifier"}));

// Test 3: Full GitHub API headers 
await test("Full GitHub headers", JSON.stringify({
  "User-Agent": "FDC-Verifier",
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28"
}));

// Test 4: Accept application/json
await test("Accept json", JSON.stringify({
  "User-Agent": "Veriflare",
  "Accept": "application/json"
}));

console.log("\nDone.");
