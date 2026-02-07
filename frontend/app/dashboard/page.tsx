"use client";

import Link from "next/link";
import { Briefcase, Package, ArrowRight, Eye, Upload, CheckCircle, DollarSign } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
      <div className="text-center mb-16">
        <h1 className="text-3xl font-light text-white mb-4 tracking-tight">Select Your Role</h1>
        <p className="text-white/40 text-lg font-light">Choose how you'd like to use Veriflare today</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Client Card */}
        <Link href="/dashboard/client" className="group">
          <div className="h-full p-10 bg-blue-500/[0.02] border border-blue-500/10 rounded-2xl hover:bg-blue-500/[0.05] hover:border-blue-500/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Briefcase className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-blue-400/60 text-xs uppercase tracking-widest font-medium">Hiring</span>
            </div>
            <h2 className="text-2xl font-medium text-white mb-3 tracking-tight">I'm a Client</h2>
            <p className="text-white/50 mb-6 leading-relaxed">
              Post jobs, review deliverables, and pay only for verified work.
            </p>
            
            {/* Workflow preview */}
            <div className="space-y-2 mb-8">
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <CheckCircle className="w-3 h-3" /> Post job with escrow deposit
              </div>
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Eye className="w-3 h-3" /> Review freelancer submissions
              </div>
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <DollarSign className="w-3 h-3" /> Approve to release payment
              </div>
            </div>
            
            <div className="flex items-center text-blue-400/80 text-sm font-medium group-hover:text-blue-400 transition-colors">
              Go to Client Dashboard <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
        
        {/* Freelancer Card */}
        <Link href="/dashboard/freelancer" className="group">
          <div className="h-full p-10 bg-green-500/[0.02] border border-green-500/10 rounded-2xl hover:bg-green-500/[0.05] hover:border-green-500/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Package className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-green-400/60 text-xs uppercase tracking-widest font-medium">Working</span>
            </div>
            <h2 className="text-2xl font-medium text-white mb-3 tracking-tight">I'm a Freelancer</h2>
            <p className="text-white/50 mb-6 leading-relaxed">
              Find work, submit deliverables, and get paid instantly on-chain.
            </p>
            
            {/* Workflow preview */}
            <div className="space-y-2 mb-8">
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <CheckCircle className="w-3 h-3" /> Browse and accept jobs
              </div>
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Upload className="w-3 h-3" /> Submit work via IPFS/GitHub
              </div>
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <DollarSign className="w-3 h-3" /> Get paid when FDC verifies
              </div>
            </div>
            
            <div className="flex items-center text-green-400/80 text-sm font-medium group-hover:text-green-400 transition-colors">
              Go to Freelancer Dashboard <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
        
      </div>
    </div>
  );
}
