// Test FDC verifier directly to diagnose FETCH ERROR
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

async function testVerifier(label, url) {
  console.log(`\n=== ${label} ===`);
  console.log(`URL: ${url}`);

  const body = {
    attestationType: ATTESTATION_TYPE,
    sourceId: SOURCE_ID,
    requestBody: {
      url,
      httpMethod: "GET",
      headers: "{}",
      queryParams: "{}",
      body: "{}",
      postProcessJq: "{commitSha: .sha, treeHash: .commit.tree.sha, authorLogin: .author.login}",
      abiSignature,
    },
  };

  console.log("Request body:", JSON.stringify(body, null, 2));

  const resp = await fetch(`${VERIFIER_URL}/Web2Json/prepareRequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": API_KEY,
    },
    body: JSON.stringify(body),
  });

  console.log(`HTTP Status: ${resp.status}`);
  const json = await resp.json();
  console.log("Response:", JSON.stringify(json).substring(0, 500));
  
  if (json.abiEncodedRequest) {
    console.log("✅ SUCCESS - got abiEncodedRequest");
  } else {
    console.log("❌ FAILED -", json.status || "unknown error");
  }
}

// Test 1: A well-known public repo commit (Linux kernel)
await testVerifier(
  "Test 1: Linux kernel commit",
  "https://api.github.com/repos/torvalds/linux/commits/0ad2507d5d93f39ab709a60a2fa64dfe8046e3a1"
);

// Test 2: A simple public repo (Node.js)
// First get a recent commit
const nodeResp = await fetch("https://api.github.com/repos/nodejs/node/commits?per_page=1", {
  headers: { "User-Agent": "Veriflare-Test" }
});
const nodeCommits = await nodeResp.json();
const nodeSha = nodeCommits[0]?.sha;
if (nodeSha) {
  await testVerifier(
    "Test 2: Node.js recent commit",
    `https://api.github.com/repos/nodejs/node/commits/${nodeSha}`
  );
}

// Test 3: Test with the Star Wars API (non-GitHub) to see if verifier can fetch anything
await testVerifier(
  "Test 3: Non-GitHub URL (httpbin)",
  "https://httpbin.org/json"
);

// Test 4: Try with User-Agent header in the request
console.log("\n=== Test 4: With User-Agent header ===");
const body4 = {
  attestationType: ATTESTATION_TYPE,
  sourceId: SOURCE_ID,
  requestBody: {
    url: "https://api.github.com/repos/torvalds/linux/commits/0ad2507d5d93f39ab709a60a2fa64dfe8046e3a1",
    httpMethod: "GET",
    headers: JSON.stringify({ "User-Agent": "FDC-Verifier" }),
    queryParams: "{}",
    body: "{}",
    postProcessJq: "{commitSha: .sha, treeHash: .commit.tree.sha, authorLogin: .author.login}",
    abiSignature,
  },
};

const resp4 = await fetch(`${VERIFIER_URL}/Web2Json/prepareRequest`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-KEY": API_KEY,
  },
  body: JSON.stringify(body4),
});

const json4 = await resp4.json();
console.log("Response:", JSON.stringify(json4).substring(0, 500));
if (json4.abiEncodedRequest) {
  console.log("✅ SUCCESS - User-Agent header helped!");
} else {
  console.log("❌ FAILED -", json4.status || "unknown error");
}
