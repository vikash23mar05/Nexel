import React from 'react';
import { Settings as SettingsIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="bg-[#181818] text-gray-200 min-h-screen w-full flex flex-col font-sans">
      <header className="p-6 border-b border-[#333] flex items-center gap-4">
        <Link href="/storage" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-wider">Settings</h1>
      </header>
      <main className="p-8 max-w-4xl mx-auto w-full">
        <div className="bg-[#222] p-8 rounded-xl border border-[#333] shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <SettingsIcon className="w-8 h-8 text-emerald-500" />
            <h2 className="text-xl font-semibold text-white">Application Settings</h2>
          </div>
          <p className="text-gray-400">Settings and preferences configuration will go here.</p>
        </div>
      </main>
    </div>
  );
}
