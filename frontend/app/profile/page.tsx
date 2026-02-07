"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { AlertCircle, Globe, Palette, Music, Camera, Github } from "lucide-react";
import { LinkGitHub } from "@/components";

const LinkIcon = Globe; // re-use as link icon

export default function ProfilePage() {
  const { address, chain, isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="card">
          <AlertCircle className="w-12 h-12 text-flare-coral mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
          <p className="text-white/60">
            Please connect your wallet to view your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
      <h1 className="text-3xl font-light text-white mb-12 tracking-tight">Identity & Credentials</h1>

      {/* Wallet Info */}
      <div className="p-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl mb-8">
        <h2 className="text-[11px] font-medium text-white/40 uppercase tracking-widest mb-8">Connected Wallet</h2>
        <div className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
          <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-white/80 font-medium text-lg font-mono">
              {address?.slice(2, 4).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-white font-mono text-sm tracking-wide">{address}</p>
            <div className="flex items-center gap-2 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <p className="text-white/40 text-xs uppercase tracking-wide">{chain?.name || "Unknown network"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Identity — uses shared LinkGitHub component with real FDC */}
      <div className="mb-8">
        <LinkGitHub />
      </div>

      {/* Portfolio & External Links */}
      <div className="card">
        <div className="flex items-center gap-3 mb-8">
          <Globe className="w-5 h-5 text-white/80" />
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-widest">Portfolio & Links</h2>
        </div>

        <p className="text-white/50 text-xs mb-6 leading-relaxed">
          Add links to your portfolio, profiles, and work samples. These help clients find and trust you across disciplines.
        </p>

        <div className="space-y-3">
          {[
            { icon: <Globe className="w-4 h-4" />, label: "Portfolio Website", placeholder: "https://yoursite.com" },
            { icon: <Palette className="w-4 h-4" />, label: "Behance / Dribbble", placeholder: "https://behance.net/username" },
            { icon: <Music className="w-4 h-4" />, label: "SoundCloud / Spotify", placeholder: "https://soundcloud.com/username" },
            { icon: <Camera className="w-4 h-4" />, label: "Photography Portfolio", placeholder: "https://500px.com/username" },
          ].map((link, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg group hover:border-white/10 transition-all">
              <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40 shrink-0">
                {link.icon}
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1">{link.label}</label>
                <input
                  type="url"
                  placeholder={link.placeholder}
                  className="w-full bg-transparent text-white/80 text-sm placeholder:text-white/20 focus:outline-none font-mono"
                />
              </div>
              <LinkIcon className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
            </div>
          ))}
        </div>

        <button className="btn-secondary w-full mt-6 h-10 text-sm">
          Save Portfolio Links
        </button>
      </div>
    </div>
  );
}
