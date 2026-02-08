#!/bin/bash
# Test FDC verifier prepareRequest endpoint

echo "=== Testing FDC Verifier ==="

# First test with the Star Wars example from official docs (known working)
echo ""
echo "--- Test 1: Star Wars API (from official docs) ---"
curl -s -X POST "https://fdc-verifiers-testnet.flare.network/verifier/web2/Web2Json/prepareRequest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: 00000000-0000-0000-0000-000000000000" \
  -d '{
    "attestationType": "0x576562324a736f6e000000000000000000000000000000000000000000000000",
    "sourceId": "0x5075626c69635765623200000000000000000000000000000000000000000000",
    "requestBody": {
      "url": "https://swapi.info/api/people/3",
      "httpMethod": "GET",
      "headers": "{}",
      "queryParams": "{}",
      "body": "{}",
      "postProcessJq": "{name: .name, height: .height, mass: .mass, numberOfFilms: .films | length, uid: (.url | split(\"/\") | .[-1] | tonumber)}",
      "abiSignature": "{\"components\": [{\"internalType\": \"string\", \"name\": \"name\", \"type\": \"string\"},{\"internalType\": \"uint256\", \"name\": \"height\", \"type\": \"uint256\"},{\"internalType\": \"uint256\", \"name\": \"mass\", \"type\": \"uint256\"},{\"internalType\": \"uint256\", \"name\": \"numberOfFilms\", \"type\": \"uint256\"},{\"internalType\": \"uint256\", \"name\": \"uid\", \"type\": \"uint256\"}],\"name\": \"task\",\"type\": \"tuple\"}"
    }
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('abiEncodedRequest present:', 'abiEncodedRequest' in d); print(json.dumps(d, indent=2)[:500])" 2>&1

echo ""
echo ""
echo "--- Test 2: GitHub commits API ---"
curl -s -X POST "https://fdc-verifiers-testnet.flare.network/verifier/web2/Web2Json/prepareRequest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: 00000000-0000-0000-0000-000000000000" \
  -d '{
    "attestationType": "0x576562324a736f6e000000000000000000000000000000000000000000000000",
    "sourceId": "0x5075626c69635765623200000000000000000000000000000000000000000000",
    "requestBody": {
      "url": "https://api.github.com/repos/octocat/Hello-World/commits/7fd1a60b01f91b314f59955a4e4d4e80d8edf11d",
      "httpMethod": "GET",
      "headers": "{}",
      "queryParams": "{}",
      "body": "{}",
      "postProcessJq": "{commitSha: .sha, treeHash: .commit.tree.sha, authorLogin: .author.login}",
      "abiSignature": "{\"components\": [{\"internalType\": \"string\", \"name\": \"commitSha\", \"type\": \"string\"},{\"internalType\": \"string\", \"name\": \"treeHash\", \"type\": \"string\"},{\"internalType\": \"string\", \"name\": \"authorLogin\", \"type\": \"string\"}],\"name\": \"task\",\"type\": \"tuple\"}"
    }
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('abiEncodedRequest present:', 'abiEncodedRequest' in d); print(json.dumps(d, indent=2)[:500])" 2>&1

echo ""
echo ""
echo "--- Test 3: GitHub commits API with fromdateiso8601 (as uint256) ---"
curl -s -X POST "https://fdc-verifiers-testnet.flare.network/verifier/web2/Web2Json/prepareRequest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: 00000000-0000-0000-0000-000000000000" \
  -d '{
    "attestationType": "0x576562324a736f6e000000000000000000000000000000000000000000000000",
    "sourceId": "0x5075626c69635765623200000000000000000000000000000000000000000000",
    "requestBody": {
      "url": "https://api.github.com/repos/octocat/Hello-World/commits/7fd1a60b01f91b314f59955a4e4d4e80d8edf11d",
      "httpMethod": "GET",
      "headers": "{}",
      "queryParams": "{}",
      "body": "{}",
      "postProcessJq": "{commitSha: .sha, treeHash: .commit.tree.sha, authorLogin: .author.login, commitTimestamp: (.commit.author.date | fromdateiso8601)}",
      "abiSignature": "{\"components\": [{\"internalType\": \"string\", \"name\": \"commitSha\", \"type\": \"string\"},{\"internalType\": \"string\", \"name\": \"treeHash\", \"type\": \"string\"},{\"internalType\": \"string\", \"name\": \"authorLogin\", \"type\": \"string\"},{\"internalType\": \"uint256\", \"name\": \"commitTimestamp\", \"type\": \"uint256\"}],\"name\": \"task\",\"type\": \"tuple\"}"
    }
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('abiEncodedRequest present:', 'abiEncodedRequest' in d); print(json.dumps(d, indent=2)[:500])" 2>&1

echo ""
echo "=== Done ==="
