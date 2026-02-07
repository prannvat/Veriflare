"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { ContractStatus, LiveBadge } from "@/components/ContractStatus";
import {
  Shield,
  FileCheck,
  Zap,
  ArrowRight,
  CheckCircle,
  Package,
  Eye,
  Lock,
  Palette,
  Music,
  Camera,
  Code,
  Megaphone,
  PenTool,
} from "lucide-react";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center gap-3 mb-8">
              <LiveBadge />
            </div>
            <div className="flex justify-center gap-3 mb-4">
              {["💻", "🎨", "🎵", "📸", "🎬", "✍️"].map((emoji, i) => (
                <span key={i} className="text-2xl opacity-40">{emoji}</span>
              ))}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 tracking-tight">
              <span className="text-white">Freelance with</span>
              <br />
              <span className="text-white/40">Verified Delivery</span>
            </h1>
            <p className="text-xl text-white/50 max-w-2xl mx-auto mb-10 font-light">
              Code, art, music, photography, video — any deliverable. <br />
              Verified on-chain via Flare Data Connector. Pay only for what's proven.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isConnected ? (
                <>
                  <Link href="/jobs/create" className="btn-primary flex items-center gap-2 justify-center min-w-[160px]">
                    Post a Job
                  </Link>
                  <Link href="/jobs" className="btn-secondary flex items-center gap-2 justify-center min-w-[160px]">
                    Browse Jobs
                  </Link>
                </>
              ) : (
                <ConnectButton />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contract Status Section */}
      <section className="py-8 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <ContractStatus />
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Problem */}
            <div className="card border-white/[0.05]">
              <h3 className="text-xl font-medium text-white/40 mb-6 uppercase tracking-wider">
                The Problem
              </h3>
              <div className="space-y-6 text-white/60">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center flex-shrink-0">
                    <span className="text-white/40 text-sm">?</span>
                  </div>
                  <p className="font-light">
                    <strong className="text-white font-medium block mb-1">Client Hesitation</strong>
                    "What if the deliverable doesn't meet my standards after I pay?"
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center flex-shrink-0">
                    <span className="text-white/40 text-sm">?</span>
                  </div>
                  <p className="font-light">
                    <strong className="text-white font-medium block mb-1">Freelancer Risk</strong>
                    "What if they disappear after I hand over my work?"
                  </p>
                </div>
              </div>
            </div>

            {/* Solution */}
            <div className="card bg-white/[0.02] border-white/[0.1]">
              <h3 className="text-xl font-medium text-white mb-6 uppercase tracking-wider">
                The Solution
              </h3>
              <div className="space-y-6 text-white/80">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-1 opacity-50" />
                  <p className="font-light">Client previews & tests the deliverable before committing</p>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-1 opacity-50" />
                  <p className="font-light">Freelancer delivers files — to a repo, IPFS, or verified URL</p>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-1 opacity-50" />
                  <p className="font-light">Flare Data Connector cryptographically verifies the delivery</p>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-1 opacity-50" />
                  <p className="font-light">Payment released automatically — no trust required</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-light text-center text-white mb-16 tracking-wide">
            HOW IT WORKS
          </h2>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                icon: Lock,
                title: "Escrow",
                description: "Client posts a job and deposits payment into a smart contract",
              },
              {
                icon: Eye,
                title: "Preview",
                description: "Freelancer uploads a preview — demo, sample, watermarked file, etc.",
              },
              {
                icon: Package,
                title: "Deliver",
                description: "After approval, final files are delivered via GitHub, IPFS, or URL",
              },
              {
                icon: Zap,
                title: "Verify & Pay",
                description: "FDC verifies the delivery on-chain, payment released instantly",
              },
            ].map((step, index) => (
              <div key={index} className="card text-center group hover:bg-white/[0.04] transition-colors">
                <div className="w-12 h-12 mx-auto mb-6 rounded-full bg-white/[0.03] border border-white/[0.1] flex items-center justify-center group-hover:border-white/20 transition-colors">
                  <step.icon className="w-5 h-5 text-white/70" />
                </div>
                <h3 className="text-lg font-medium text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-white/40 text-sm font-light leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card border-none bg-transparent pl-0">
              <Shield className="w-8 h-8 text-white/80 mb-6" />
              <h3 className="text-lg font-medium text-white mb-3">
                Flare Data Connector
              </h3>
              <p className="text-white/50 text-sm font-light leading-relaxed">
                Cryptographic verification of deliveries — GitHub commits, IPFS pins,
                or live URL attestation — all proven on-chain.
              </p>
            </div>
            <div className="card border-none bg-transparent pl-0">
              <FileCheck className="w-8 h-8 text-white/80 mb-6" />
              <h3 className="text-lg font-medium text-white mb-3">
                Hash Binding
              </h3>
              <p className="text-white/50 text-sm font-light leading-relaxed">
                Deliverable hash is locked when client accepts. Ensures the final
                files match exactly what was previewed.
              </p>
            </div>
            <div className="card border-none bg-transparent pl-0">
              <Zap className="w-8 h-8 text-white/80 mb-6" />
              <h3 className="text-lg font-medium text-white mb-3">
                Instant Settlement
              </h3>
              <p className="text-white/50 text-sm font-light leading-relaxed">
                Payment released automatically upon verified delivery. No
                waiting, no disputes, no middlemen.
              </p>
            </div>
          </div>

          {/* Category showcase */}
          <div className="mt-20 text-center">
            <h3 className="text-xs font-medium text-white/30 uppercase tracking-[0.2em] mb-8">Works for every creative discipline</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { icon: Code, label: "Software" },
                { icon: Palette, label: "Design" },
                { icon: Music, label: "Music" },
                { icon: Camera, label: "Photography" },
                { icon: PenTool, label: "Writing" },
                { icon: Megaphone, label: "Marketing" },
              ].map((cat, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/50 text-sm">
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto px-4">
          {/* Testnet Banner */}
          <div className="mb-16 p-8 rounded-2xl bg-gradient-to-br from-orange-500/10 via-transparent to-pink-500/10 border border-orange-500/20">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-orange-400" />
                  <span className="text-orange-400 font-medium text-sm uppercase tracking-wider">Demo Mode</span>
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Try it on Coston2 Testnet</h3>
                <p className="text-white/50 text-sm mb-4">
                  Get free testnet tokens to experience the full flow — no real money needed.
                </p>
                <ol className="space-y-2 text-white/60 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">1</span>
                    Connect your wallet (MetaMask recommended)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">2</span>
                    Get free C2FLR from the faucet
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">3</span>
                    Accept a job, submit work, get paid!
                  </li>
                </ol>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href="https://faucet.flare.network/coston2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center gap-2 justify-center"
                >
                  Get Free Tokens
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="https://coston2-explorer.flare.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center gap-2 justify-center"
                >
                  View Explorer
                </a>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-light text-white mb-6">
              Ready to freelance trustlessly?
            </h2>
            <div className="flex justify-center mt-8">
            {isConnected ? (
              <Link href="/jobs" className="btn-primary inline-flex items-center gap-2">
                Explore Jobs
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="[&_button]:!bg-white [&_button]:!text-black [&_button]:!font-medium [&_button]:!rounded-lg [&_button]:!px-8 [&_button]:!py-4 [&_button]:hover:!bg-white/90">
                 <ConnectButton />
              </div>
            )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 text-center text-white/20 text-xs font-light tracking-widest uppercase">
          <p>Built for Flare Hackathon 2026 • FDC Powered</p>
        </div>
      </footer>
    </div>
  );
}
