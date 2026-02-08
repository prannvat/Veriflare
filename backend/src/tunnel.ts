import { spawn } from "child_process";

/**
 * Auto-start a Cloudflare quick tunnel and register the public URL
 * with the FDC service. This is needed because the FDC verifier
 * can't reach api.github.com directly — we proxy through our backend.
 */
export function startTunnel(port: number): void {
  const cloudflared = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${port}`], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let registered = false;

  const handleOutput = (data: Buffer) => {
    const line = data.toString();
    // Cloudflare prints the tunnel URL to stderr
    const match = line.match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
    if (match && !registered) {
      registered = true;
      const tunnelUrl = match[1];
      console.log(`\n🚇 Cloudflare tunnel active: ${tunnelUrl}`);

      // Register the tunnel URL with our own FDC service
      setTimeout(async () => {
        try {
          const resp = await fetch(`http://localhost:${port}/api/fdc/set-public-url`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: tunnelUrl }),
          });
          if (resp.ok) {
            console.log(`✅ FDC proxy URL registered: ${tunnelUrl}`);
          } else {
            console.error(`❌ Failed to register tunnel URL: ${resp.status}`);
          }
        } catch (err) {
          console.error("❌ Failed to register tunnel URL:", err);
        }
      }, 1000); // Wait 1s for the server to be fully ready
    }
  };

  cloudflared.stdout.on("data", handleOutput);
  cloudflared.stderr.on("data", handleOutput);

  cloudflared.on("error", (err) => {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn("\n⚠️  cloudflared not found — FDC GitHub proxy will not work.");
      console.warn("   Install it: brew install cloudflare/cloudflare/cloudflared");
      console.warn("   Or manually set the URL: POST /api/fdc/set-public-url\n");
    } else {
      console.error("Tunnel error:", err);
    }
  });

  cloudflared.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.warn(`⚠️  Cloudflare tunnel exited with code ${code}`);
    }
  });

  // Clean up tunnel on process exit
  const cleanup = () => {
    cloudflared.kill();
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);
}
