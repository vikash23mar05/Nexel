import React from 'react';
import { User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  return (
    <div className="bg-[#181818] text-gray-200 min-h-screen w-full flex flex-col font-sans">
      <header className="p-6 border-b border-[#333] flex items-center gap-4">
        <Link href="/storage" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-wider">Profile</h1>
      </header>
      <main className="p-8 max-w-4xl mx-auto w-full">
        <div className="bg-[#222] p-8 rounded-xl border border-[#333] flex items-center gap-6 shadow-lg">
          <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden border-2 border-gray-500">
            <User className="w-12 h-12 text-gray-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Nexel User</h2>
            <p className="text-gray-400">Manage your account information and preferences.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
