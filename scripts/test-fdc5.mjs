// Test if the issue is response time (>1s) or content-type
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

async function test(label, url, jq, sig) {
  console.log(`\n=== ${label} ===`);
  
  // First check response time and content-type locally
  const start = Date.now();
  try {
    const localResp = await fetch(url, { 
      headers: { "User-Agent": "Veriflare", "Accept": "application/json" },
      signal: AbortSignal.timeout(5000)
    });
    const elapsed = Date.now() - start;
    console.log(`Local fetch: ${elapsed}ms, Content-Type: ${localResp.headers.get('content-type')}, Status: ${localResp.status}`);
  } catch(e) {
    const elapsed = Date.now() - start;
    console.log(`Local fetch failed: ${elapsed}ms - ${e.message}`);
  }

  // Then test verifier
  const body = {
    attestationType: ATTESTATION_TYPE,
    sourceId: SOURCE_ID,
    requestBody: {
      url,
      httpMethod: "GET",
      headers: "{}",
      queryParams: "{}",
      body: "{}",
      postProcessJq: jq,
      abiSignature: sig,
    },
  };

  try {
    const resp = await fetch(`${VERIFIER_URL}/Web2Json/prepareRequest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
      body: JSON.stringify(body),
    });
    const json = await resp.json();
    if (json.abiEncodedRequest) console.log("✅ VERIFIER: SUCCESS");
    else console.log("❌ VERIFIER:", json.status);
  } catch(e) {
    console.error("Verifier error:", e.message);
  }
}

// Test 1: Small GitHub repo
await test(
  "Small repo (hello-world)",
  "https://api.github.com/repos/octocat/Hello-World/commits/7fd1a60b01f91b314f59955a4e4d4e80d8edf11d",
  "{commitSha: .sha, treeHash: .commit.tree.sha, authorLogin: .author.login}",
  commitSig
);

// Test 2: Try with Accept header to ensure application/json
await test(
  "Small repo + Accept header",
  "https://api.github.com/repos/octocat/Hello-World/commits/7fd1a60b01f91b314f59955a4e4d4e80d8edf11d",
  "{commitSha: .sha, treeHash: .commit.tree.sha, authorLogin: .author.login}",
  commitSig
);

// Test 3: JSONPlaceholder (known working)
const simpleSig = JSON.stringify({
  components: [{ internalType: "string", name: "value", type: "string" }],
  name: "task",
  type: "tuple",
});
await test(
  "JSONPlaceholder (baseline - works)",
  "https://jsonplaceholder.typicode.com/posts/1",
  "{value: .title}",
  simpleSig
);

// Test 4: GitHub but with Accept header forcing application/json
const body4 = {
  attestationType: ATTESTATION_TYPE,
  sourceId: SOURCE_ID,
  requestBody: {
    url: "https://api.github.com/repos/octocat/Hello-World/commits/7fd1a60b01f91b314f59955a4e4d4e80d8edf11d",
    httpMethod: "GET",
    headers: JSON.stringify({ 
      "Accept": "application/json",
      "User-Agent": "FDC-Verifier"
    }),
    queryParams: "{}",
    body: "{}",
    postProcessJq: "{commitSha: .sha, treeHash: .commit.tree.sha, authorLogin: .author.login}",
    abiSignature: commitSig,
  },
};
console.log("\n=== Test 4: With Accept+UserAgent headers ===");
try {
  const resp4 = await fetch(`${VERIFIER_URL}/Web2Json/prepareRequest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
    body: JSON.stringify(body4),
  });
  const json4 = await resp4.json();
  if (json4.abiEncodedRequest) console.log("✅ VERIFIER: SUCCESS");
  else console.log("❌ VERIFIER:", json4.status);
} catch(e) {
  console.error("Error:", e.message);
}

console.log("\nDone.");
