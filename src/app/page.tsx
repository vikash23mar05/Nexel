"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  MessageSquare, 
  Network, 
  Video, 
  ChevronRight,
  Upload,
  X,
  File,
  Menu
} from "lucide-react";

export default function LandingPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [isSignedIn, setIsSignedIn] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      
      try {
        const formData = new FormData();
        formData.append("file", file);

        let uploadSuccess = false;
        let data: any = {};

        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData
          });
          if (res.ok) {
            data = await res.json();
            if (data.url && data.docId) {
              uploadSuccess = true;
            }
          }
        } catch (serverErr) {
          console.warn("Server upload failed, falling back to client IndexedDB storage:", serverErr);
        }

        if (uploadSuccess) {
          router.push("/storage");
        } else {
          // Client-side fallback: Save file in IndexedDB
          const { saveLocalDocument } = await import("../utils/indexedDB");
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
          
          await saveLocalDocument(
            uniqueSuffix,
            file.name,
            `${sizeMb} MB`,
            file
          );

          // Go to Storage page
          router.push("/storage");
        }
      } catch (err) {
        console.error("Upload failed completely", err);
        alert("Upload failed. Please check file format and try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#2A2A2A] overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-12 border-b border-[#1E1E1E] bg-[#0A0A0A]/70 backdrop-blur-[16px] z-50 flex items-center justify-center">
        <div className="w-full max-w-[1100px] px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-zinc-600 to-zinc-400 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white"></div>
            </div>
            <span className="font-medium tracking-tight">Nexel</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Product</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Solutions</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
            
            <div className="flex items-center gap-6 ml-4 border-l border-gray-800 pl-8">
              <a href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Log in</a>
              <a href="/signup" className="bg-emerald-500 text-black px-4 py-2 rounded-full font-medium hover:bg-emerald-400 transition-colors text-sm">
                Sign up
              </a>
            </div>
          </nav>

          {/* Hamburger Button for Mobile */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="md:hidden text-gray-300 hover:text-white focus:outline-none z-50 p-1"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-12 bg-[#0A0A0A]/95 border-b border-[#1E1E1E] backdrop-blur-[16px] z-40 md:hidden flex flex-col px-6 py-6 space-y-4 shadow-2xl animate-fade-in"
          >
            <a href="#" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-white text-base font-medium transition-colors py-1">Product</a>
            <a href="#" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-white text-base font-medium transition-colors py-1">Solutions</a>
            <a href="#" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-white text-base font-medium transition-colors py-1">Pricing</a>
            <div className="h-px bg-gray-800/60 my-1" />
            <a href="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-white text-base font-medium transition-colors py-1">Log in</a>
            <a href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="bg-emerald-500 text-black py-2.5 px-4 rounded-lg font-semibold hover:bg-emerald-400 text-center transition-colors text-sm inline-block">
              Sign up
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 flex flex-col items-center text-center relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.03] blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-[720px] z-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2A2A2A] bg-[#111111] mb-8">
            <Sparkles className="w-3 h-3 text-[#A1A1A1]" />
            <span className="text-[12px] font-medium text-[#A1A1A1] tracking-wide">Introducing AI-Powered Workspaces</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-medium tracking-[-0.055em] leading-[1.1] mb-6">
            Transform PDFs into <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-[#707070]">Interactive Knowledge.</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-[#A1A1A1] tracking-[-0.01em] mb-10 max-w-[600px] mx-auto">
            Highlight text to instantly generate structured notes, visual diagrams, and flashcards. Stop reading passively.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="h-11 px-6 bg-white text-black text-[15px] font-medium rounded-[6px] hover:bg-zinc-200 transition-colors flex items-center gap-2">
              Start Learning for Free
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="h-11 px-6 bg-[#111111] border border-[#2A2A2A] text-white text-[15px] font-medium rounded-[6px] hover:bg-[#181818] transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          </div>
        </motion.div>

        {/* Hero Product Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-20 w-full max-w-[1100px] relative z-10 perspective-1000"
        >
          <div className="rounded-[12px] border border-[#2A2A2A] bg-[#0E0E0E] overflow-hidden shadow-2xl flex relative aspect-[16/9] transform-gpu rotate-x-[2deg] scale-[0.95] hover:rotate-x-0 hover:scale-100 transition-all duration-700 ease-out">
            <Image 
              src="/WebsiteMock.png" 
              alt="Nexel Mockup" 
              fill 
              className="object-cover"
              priority
            />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-[#0A0A0A]">
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.02em] mb-4">
              Everything you need to master your material.
            </h2>
            <p className="text-[#A1A1A1] text-lg max-w-[600px]">
              A complete suite of AI-powered tools designed to make studying and analyzing documents faster and more intuitive.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full mb-16 rounded-[16px] border border-[#2A2A2A] overflow-hidden shadow-2xl relative aspect-[16/9]"
          >
            <Image 
              src="/Login.png"
              alt="Login Preview"
              fill
              className="object-cover"
            />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="col-span-1 md:col-span-2 bg-[#111111] border border-[#2A2A2A] rounded-[12px] p-8 hover:bg-[#181818] transition-colors group">
              <div className="w-10 h-10 rounded-[8px] bg-[#1E1E1E] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">AI Notes from Highlights</h3>
              <p className="text-[#A1A1A1] leading-relaxed">
                Simply highlight any text in your PDF. Our AI instantly generates concise summaries, bullet points, simplified explanations, and revision notes. Perfect for rapid studying.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#111111] border border-[#2A2A2A] rounded-[12px] p-8 hover:bg-[#181818] transition-colors group">
              <div className="w-10 h-10 rounded-[8px] bg-[#1E1E1E] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Chat with Documents</h3>
              <p className="text-[#A1A1A1] leading-relaxed">
                Ask questions directly to your uploaded documents. Get instant answers backed by semantic search and vector embeddings.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#111111] border border-[#2A2A2A] rounded-[12px] p-8 hover:bg-[#181818] transition-colors group">
              <div className="w-10 h-10 rounded-[8px] bg-[#1E1E1E] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Network className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Visual Learning</h3>
              <p className="text-[#A1A1A1] leading-relaxed">
                Convert complex paragraphs into flowcharts, mindmaps, and simple diagrams. Understand relationships visually.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="col-span-1 md:col-span-2 bg-[#111111] border border-[#2A2A2A] rounded-[12px] p-8 hover:bg-[#181818] transition-colors group relative overflow-hidden">
              <div className="w-10 h-10 rounded-[8px] bg-[#1E1E1E] flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#1E1E1E] text-[11px] font-medium text-[#A1A1A1] mb-4 relative z-10">
                Experimental
              </div>
              <h3 className="text-xl font-medium mb-3 relative z-10">AI Video Generation</h3>
              <p className="text-[#A1A1A1] leading-relaxed relative z-10 max-w-[500px]">
                Turn your notes into short educational videos. We generate a script, split content into scenes, and render animated captions seamlessly.
              </p>
              
              {/* Decorative background element */}
              <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-tl from-[#2A2A2A]/50 to-transparent rounded-tl-[100%] pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E1E1E] bg-[#0A0A0A] py-12 px-6">
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-zinc-600 to-zinc-400 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
            <span className="font-medium tracking-tight text-[15px]">Nexel</span>
          </div>
          <div className="flex items-center gap-6 text-[14px] text-[#707070]">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#111111] border border-[#1E1E1E] rounded-[24px] p-8 shadow-2xl flex flex-col items-center text-center overflow-hidden"
            >
              {/* Header */}
              <div className="w-full flex justify-between items-center mb-10">
                <h3 className="font-semibold text-lg tracking-tight">Document Upload Vault</h3>
                <button 
                  onClick={() => setIsUploadModalOpen(false)}
                  className="w-8 h-8 rounded-[8px] bg-[#181818] border border-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Graphic Center */}
              <div className="relative w-full h-48 flex items-center justify-center mb-8 perspective-1000">
                {/* Background Cards */}
                <div className="absolute w-40 h-32 bg-[#181818] border border-[#2A2A2A] rounded-xl transform -rotate-12 -translate-x-12 opacity-50 overflow-hidden">
                  <div className="w-full h-full bg-zinc-800/50 flex flex-col p-2 gap-1">
                     <div className="w-3/4 h-2 bg-zinc-700 rounded-full" />
                     <div className="w-full h-1 bg-zinc-700/50 rounded-full" />
                     <div className="w-5/6 h-1 bg-zinc-700/50 rounded-full" />
                  </div>
                </div>
                <div className="absolute w-40 h-32 bg-[#181818] border border-[#2A2A2A] rounded-xl transform rotate-12 translate-x-12 opacity-50 overflow-hidden">
                  <div className="w-full h-full bg-zinc-800/50 flex flex-col p-2 gap-1">
                     <div className="w-3/4 h-2 bg-zinc-700 rounded-full" />
                     <div className="w-full h-1 bg-zinc-700/50 rounded-full" />
                     <div className="w-5/6 h-1 bg-zinc-700/50 rounded-full" />
                  </div>
                </div>
                
                {/* Center Purple Folder */}
                <div 
                  className="relative w-48 h-36 bg-[#8B5CF6] rounded-2xl rounded-tl-sm shadow-[0_0_40px_rgba(139,92,246,0.3)] flex flex-col justify-end p-4 border border-purple-400/20 z-10 cursor-pointer hover:scale-105 transition-transform" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="absolute top-0 left-0 w-20 h-4 bg-[#8B5CF6] -translate-y-full rounded-t-lg border-t border-l border-r border-purple-400/20" />
                  <div className="text-left">
                    <div className="text-white font-bold text-sm">Upload PDF</div>
                    <div className="text-purple-200 text-xs font-medium">Max 50MB</div>
                  </div>
                </div>
              </div>

              {/* Text */}
              <h2 className="text-2xl font-bold tracking-tight mb-3">Document Vault</h2>
              <p className="text-[#A1A1A1] text-sm leading-relaxed mb-8 px-4">
                Upload your quantum mathematics treatises, thermodynamic physics handbooks, and journal manuscripts.
              </p>

              {/* Action Button */}
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileSelect}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-4 bg-[#181818] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? (
                   <span className="flex items-center gap-2">
                     <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                     Processing Document...
                   </span>
                ) : (
                   "Select PDF to Upload"
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
