"use client";

import Link from "next/link";
import { Briefcase, Package, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-white mb-8">Role Selection</h1>
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Client Card */}
        <Link href="/dashboard/client" className="group">
          <div className="card h-full p-8 hover:bg-white/[0.05] transition-all duration-300 border border-white/10 hover:border-white/20">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Briefcase className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">I am a Client</h2>
            <p className="text-white/60 mb-8 text-lg leading-relaxed">
              I want to post jobs, hire freelancers, and pay for verified deliverables.
            </p>
            <div className="flex items-center text-blue-400 font-medium opacity-60 group-hover:opacity-100 transition-opacity">
              Start Hiring <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
        
        {/* Freelancer Card */}
        <Link href="/dashboard/freelancer" className="group">
          <div className="card h-full p-8 hover:bg-white/[0.05] transition-all duration-300 border border-white/10 hover:border-white/20">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Package className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">I am a Freelancer</h2>
            <p className="text-white/60 mb-8 text-lg leading-relaxed">
              I want to find verify work, submit deliverables, and get paid securely.
            </p>
            <div className="flex items-center text-purple-400 font-medium opacity-60 group-hover:opacity-100 transition-opacity">
              Find Work <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
        
      </div>
    </div>
  );
}
