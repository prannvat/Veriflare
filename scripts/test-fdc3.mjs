// Test if the verifier can fetch ANY URL or if it's completely broken
const VERIFIER_URL = "https://fdc-verifiers-testnet.flare.network/verifier/web2";
const API_KEY = "00000000-0000-0000-0000-000000000000";
const ATTESTATION_TYPE = "0x" + Buffer.from("Web2Json").toString("hex").padEnd(64, "0");
const SOURCE_ID = "0x" + Buffer.from("PublicWeb2").toString("hex").padEnd(64, "0");

async function test(label, url, jq, abiSig) {
  console.log(`\n=== ${label} ===`);
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
      abiSignature: abiSig,
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
    console.log("Response:", str.substring(0, 400));
    if (json.abiEncodedRequest) console.log("✅ SUCCESS");
    else console.log("❌ FAILED -", json.status);
  } catch(e) {
    console.error("Network error:", e.message);
  }
}

const simpleSig = JSON.stringify({
  components: [{ internalType: "string", name: "value", type: "string" }],
  name: "task",
  type: "tuple",
});

const commitSig = JSON.stringify({
  components: [
    { internalType: "string", name: "commitSha", type: "string" },
    { internalType: "string", name: "treeHash", type: "string" },
    { internalType: "string", name: "authorLogin", type: "string" },
  ],
  name: "task",
  type: "tuple",
});

// Test 1: Star Wars API (known working, used in Flare docs)
await test(
  "Star Wars API", 
  "https://swapi.dev/api/people/1/?format=json",
  "{value: .name}",
  simpleSig
);

// Test 2: JSONPlaceholder (very simple public API)
await test(
  "JSONPlaceholder",
  "https://jsonplaceholder.typicode.com/posts/1",
  "{value: .title}",
  simpleSig
);

// Test 3: GitHub API - is it specifically blocked?
await test(
  "GitHub API commit",
  "https://api.github.com/repos/torvalds/linux/commits/0ad2507d5d93f39ab709a60a2fa64dfe8046e3a1",
  "{commitSha: .sha, treeHash: .commit.tree.sha, authorLogin: .author.login}",
  commitSig
);

console.log("\nDone.");
