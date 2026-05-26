"use client";

import { 
  User, Home, Folder, FileText, StickyNote, Library, Network, 
  MessageSquare, Video, Settings, ArrowLeft, ChevronDown, ZoomOut, 
  ZoomIn, Maximize, Minimize, Sparkles, Highlighter, Type, 
  MessageSquareText, ArrowRight, Plus, X, Copy, Download, 
  AlignLeft, Send 
} from "lucide-react";
import React, { useState, useEffect, use } from "react";
import dynamic from "next/dynamic";

// Dynamically import PdfViewer
const PdfViewer = dynamic(() => import("../PdfViewer"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-gray-400">Loading Document Viewer...</div>
});

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [activeTab, setActiveTab] = useState("Notes");
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [activeColor, setActiveColor] = useState("yellow");
  const docId = unwrappedParams.id;
  const [url, setUrl] = useState("");
  const [highlights, setHighlights] = useState<any[]>([]);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: string, text: string}[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [rightSidebarWidth, setRightSidebarWidth] = useState(360);
  const [isMobile, setIsMobile] = useState(false);
  const [flashcards, setFlashcards] = useState<{question: string, answer: string}[]>([
    { 
      question: "What is the primary benefit of React's Virtual DOM?", 
      answer: "It optimizes rendering performance by minimizing direct manipulations of the real browser DOM, reconciling state changes virtually first." 
    },
    { 
      question: "How does unidirectional data flow work in React?", 
      answer: "Data flows strictly downward from parent components to child components via props, making debugging and state management highly predictable." 
    }
  ]);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX; // drag to the left increases width
      const newWidth = Math.max(280, Math.min(600, startWidth + deltaX)); // enforce constraints
      setRightSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const renderMarkdown = (content: string) => {
    if (!content) return "";
    
    // Split by double newlines or single newlines for paragraph spacing
    const lines = content.split('\n');
    
    return lines.map((line, idx) => {
      // Check if line is a header or key feature (e.g. "Key features of React include:")
      const isHeader = line.trim().startsWith('###') || line.trim().startsWith('##') || line.trim().startsWith('#') || line.trim().startsWith('**Key');
      
      // Replace **bold** with strong elements
      const parts = line.split(/\*\*([^*]+)\*\*/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <strong key={pIdx} className="font-bold text-gray-100">{part}</strong>;
        }
        return part;
      });

      if (isHeader) {
        return <h4 key={idx} className="text-sm font-bold text-emerald-400 mt-4 mb-2">{renderedLine}</h4>;
      }
      
      // Check for lists (e.g. "1. " or "* " or "- ")
      const isList = /^\d+\.\s/.test(line.trim()) || /^[\*\-\+]\s/.test(line.trim());
      if (isList) {
        return <div key={idx} className="pl-4 py-1 text-gray-300 leading-relaxed list-item list-disc ml-4">{renderedLine}</div>;
      }

      return line.trim() === "" ? <div key={idx} className="h-2" /> : <p key={idx} className="text-gray-300 mb-2 leading-relaxed">{renderedLine}</p>;
    });
  };

  const handleAIGenerate = async (action: string) => {
    const targetHighlight = highlights.find(h => h.id === activeHighlightId) || highlights[0];
    if (!targetHighlight || !targetHighlight.content?.text) {
      alert("Please select a highlight with text first!");
      return;
    }

    const text = targetHighlight.content.text;
    setActiveTab("Chat");
    
    const userMsg = { role: "user", text: `Please ${action} this text: "${text}"` };
    setChatMessages(prev => [...prev, userMsg, { role: "assistant", text: "" }]);
    setIsGeneratingAI(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "", action, text })
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        setChatMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = { ...newMessages[lastIndex], text: newMessages[lastIndex].text + chunkValue };
          return newMessages;
        });
      }

      // Parse flashcards after streaming completes
      if (action === "flashcards") {
        setChatMessages(prev => {
          const finalMsg = prev[prev.length - 1];
          if (finalMsg && finalMsg.text) {
            const textVal = finalMsg.text;
            const parsedCards: {question: string, answer: string}[] = [];
            const cardMatches = textVal.match(/Q:\s*([\s\S]*?)\s*A:\s*([\s\S]*?)(?=Q:|$)/g);
            if (cardMatches) {
              cardMatches.forEach(m => {
                const qMatch = m.match(/Q:\s*([\s\S]*?)\s*(?=A:|$)/);
                const aMatch = m.match(/A:\s*([\s\S]*?)$/);
                if (qMatch && aMatch) {
                  parsedCards.push({ question: qMatch[1].trim(), answer: aMatch[1].trim() });
                }
              });
            }
            if (parsedCards.length > 0) {
              setFlashcards(prevCards => [...prevCards, ...parsedCards]);
              setActiveTab("Flashcards"); // Automatically switch to the flashcards tab!
            }
          }
          return prev;
        });
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const currentInput = chatInput;
    setChatInput("");
    setActiveTab("Chat");

    const targetHighlight = highlights.find(h => h.id === activeHighlightId) || highlights[0];
    const contextText = targetHighlight ? targetHighlight.content?.text || "" : "";

    const userMsg = { role: "user", text: currentInput };
    setChatMessages(prev => [...prev, userMsg, { role: "assistant", text: "" }]);
    setIsGeneratingAI(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentInput, action: "chat", text: contextText })
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        setChatMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = { ...newMessages[lastIndex], text: newMessages[lastIndex].text + chunkValue };
          return newMessages;
        });
      }

      // Auto-parse flashcards if response contains Q: and A:
      setChatMessages(prev => {
        const finalMsg = prev[prev.length - 1];
        if (finalMsg && finalMsg.text && finalMsg.text.includes("Q:") && finalMsg.text.includes("A:")) {
          const textVal = finalMsg.text;
          const parsedCards: {question: string, answer: string}[] = [];
          const cardMatches = textVal.match(/Q:\s*([\s\S]*?)\s*A:\s*([\s\S]*?)(?=Q:|$)/g);
          if (cardMatches) {
            cardMatches.forEach(m => {
              const qMatch = m.match(/Q:\s*([\s\S]*?)\s*(?=A:|$)/);
              const aMatch = m.match(/A:\s*([\s\S]*?)$/);
              if (qMatch && aMatch) {
                parsedCards.push({ question: qMatch[1].trim(), answer: aMatch[1].trim() });
              }
            });
          }
          if (parsedCards.length > 0) {
            setFlashcards(prevCards => [...prevCards, ...parsedCards]);
          }
        }
        return prev;
      });
    } catch(e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const addHighlight = async (highlight: any, color: string) => {
    const newHighlight = {
      ...highlight,
      id: String(Math.random()).slice(2),
      color
    };
    
    // Optimistic update
    setHighlights(prev => [...prev, newHighlight]);
    
    // Save to DB
    try {
      await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, highlight: newHighlight })
      });
    } catch (e) {
      console.error("Failed to save highlight", e);
    }
  };

  useEffect(() => {
    // Basic way to grab query param in a client component if not using useSearchParams
    const searchParams = new URLSearchParams(window.location.search);
    const urlParam = searchParams.get("url");
    if (urlParam) setUrl(urlParam);

    if (docId) {
      fetch(`/api/highlights?docId=${docId}`)
        .then(res => res.json())
        .then(data => {
           if (data.highlights) setHighlights(data.highlights);
        });
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [docId]);

  return (
    <div className="bg-[#0A0A0A] text-gray-300 h-screen w-screen overflow-hidden flex selection:bg-emerald-500/30 relative">
      {/* Left Sidebar Edge Toggle (Always Visible when closed) */}
      {!isLeftSidebarOpen && (
        <button 
          onClick={() => setIsLeftSidebarOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-600 text-black w-5 h-16 rounded-r-md flex items-center justify-center shadow-md transition-colors z-50 hidden md:flex"
        >
          <ChevronDown className="w-4 h-4 -rotate-90" />
        </button>
      )}

      {/* BEGIN: LeftSidebar */}
      {isLeftSidebarOpen && (
        <aside className="w-64 bg-[#111111] border-r border-[#1E1E1E] flex-col justify-between hidden md:flex z-10 transition-all relative">
          {/* Edge Toggle Button */}
          <button 
            onClick={() => setIsLeftSidebarOpen(false)}
            className="absolute -right-5 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-600 text-black w-5 h-16 rounded-r-md flex items-center justify-center shadow-md transition-colors"
          >
            <ChevronDown className="w-4 h-4 rotate-90" />
          </button>
          
          <div>
            {/* User Profile */}
            <div className="p-5 border-b border-[#1E1E1E]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#2A2A2A] flex items-center justify-center text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-100">Vikash Kumar Vivek</h3>
                  <p className="text-xs text-gray-500">Test@email.com</p>
                </div>
              </div>
            </div>
            {/* Navigation Menu */}
            <nav className="p-3 space-y-1 mt-2">
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#181818] transition-colors" href="#">
                <Home className="w-5 h-5 text-center" /> Home
              </a>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#181818] transition-colors" href="#">
                <Folder className="w-5 h-5 text-center" /> Storage
              </a>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-100 bg-[#181818] border border-[#2A2A2A] transition-colors" href="#">
                <FileText className="w-5 h-5 text-center" /> Documents
              </a>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#181818] transition-colors" href="#">
                <StickyNote className="w-5 h-5 text-center" /> Notes
              </a>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#181818] transition-colors" href="#">
                <Library className="w-5 h-5 text-center" /> Flashcards
              </a>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#181818] transition-colors" href="#">
                <Network className="w-5 h-5 text-center" /> Diagrams
              </a>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#181818] transition-colors" href="#">
                <MessageSquare className="w-5 h-5 text-center" /> AI Chat
              </a>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#181818] transition-colors" href="#">
                <Video className="w-5 h-5 text-center" /> Videos
              </a>
            </nav>
          </div>
          {/* Settings */}
          <div className="p-3 mb-2 border-t border-[#1E1E1E]">
            <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#181818] transition-colors" href="#">
              <Settings className="w-5 h-5 text-center" /> Settings
            </a>
          </div>
        </aside>
      )}
      {/* END: LeftSidebar */}

      {/* BEGIN: MainContent */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-[#1E1E1E] bg-[#0A0A0A] flex items-center justify-between px-4 lg:px-6 z-20">
          <div className="flex items-center gap-4">
            <a 
              href="/storage"
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <h1 className="text-gray-100 font-medium">Workspace Document</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-3 text-sm text-gray-400 bg-[#111111] px-3 py-1.5 rounded-lg border border-[#2A2A2A]">
              <span>100%</span>
              <ChevronDown className="w-4 h-4 text-xs" />
            </div>
            <div className="hidden sm:flex items-center gap-3 text-gray-400">
              <button className="hover:text-white"><ZoomOut className="w-4 h-4" /></button>
              <button className="hover:text-white"><ZoomIn className="w-4 h-4" /></button>
              <div className="w-px h-4 bg-[#2A2A2A] mx-1"></div>
              <button className="hover:text-white"><Maximize className="w-4 h-4" /></button>
              <button className="hover:text-white"><Minimize className="w-4 h-4" /></button>
            </div>
            {/* AI Tools Button */}
            <button 
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className="bg-emerald-400 hover:bg-emerald-500 text-black px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              <Sparkles className="w-4 h-4" /> AI Tools
            </button>
          </div>
        </header>

        {/* Document Viewer Area */}
        <div className="flex-1 overflow-y-auto bg-[#0E0E0E] relative flex justify-center pt-8 pb-32">
          {/* Annotation Toolbar (Floating Left) */}
          <div className="absolute left-6 top-24 bg-[#111111] border border-[#2A2A2A] rounded-xl p-2 flex-col gap-3 shadow-lg z-10 hidden xl:flex">
            <button className="w-8 h-8 flex items-center justify-center rounded bg-emerald-500 text-black hover:bg-emerald-400 transition-colors">
              <Highlighter className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#181818] transition-colors">
              <Type className="w-4 h-4" />
            </button>
            {[
              { id: "yellow", bg: "bg-yellow-400" },
              { id: "blue", bg: "bg-blue-400" },
              { id: "pink", bg: "bg-pink-400" },
            ].map(color => (
              <div key={color.id} className="w-8 h-8 flex items-center justify-center" onClick={() => setActiveColor(color.id)}>
                <div className={`w-4 h-4 rounded-full ${color.bg} cursor-pointer border-2 transition-all ${activeColor === color.id ? 'border-white scale-125' : 'border-[#111111]'}`}></div>
              </div>
            ))}
            <button className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#181818] transition-colors mt-1">
              <MessageSquareText className="w-4 h-4" />
            </button>
          </div>

          {/* The Document Page */}
          <div className="bg-white text-gray-900 w-full max-w-[850px] h-[calc(100vh-120px)] shadow-2xl rounded-sm text-sm lg:text-base leading-relaxed relative overflow-hidden">
            {url ? (
              <PdfViewer 
                docId={docId} 
                url={url} 
                highlights={highlights} 
                addHighlight={addHighlight} 
                activeColor={activeColor}
              />
            ) : (
              <div className="flex items-center justify-center h-[1100px] text-gray-400 flex-col gap-4">
                <FileText className="w-12 h-12" />
                <p>No document uploaded</p>
                <a href="/" className="text-emerald-500 hover:underline">Go back to upload</a>
              </div>
            )}
          </div>

          {/* Bottom Floating Controls (Removed static pagination) */}
        </div>
      </main>
      {/* END: MainContent */}

      {/* BEGIN: RightSidebar (AI Assistant) */}
      {isRightSidebarOpen && (
        <aside 
          style={{ width: isMobile ? "100%" : rightSidebarWidth }}
          className={`bg-[#0A0A0A] flex flex-col transition-[width] duration-75 select-none ${
            isMobile 
              ? "fixed inset-y-0 right-0 z-50 shadow-2xl animate-in slide-in-from-right duration-250" 
              : "relative border-l border-[#1E1E1E] z-20"
          }`}
        >
          {/* Resize handle (Desktop only) */}
          {!isMobile && (
            <div 
              className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/50 active:bg-emerald-500 transition-colors z-30"
              onMouseDown={handleMouseDown}
            />
          )}

          {/* Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-[#1E1E1E]">
            <h2 className="text-base font-semibold text-gray-100">AI Assistant</h2>
            <button onClick={() => setIsRightSidebarOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#1A1A1A]">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-4 pb-2 border-b border-[#1E1E1E]">
            <div className="flex bg-[#111111] p-1 rounded-lg border border-[#2A2A2A]">
              {["Chat", "Notes", "Flashcards", "Diagram"].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === tab 
                      ? "text-gray-100 bg-[#2A2A2A] shadow-sm" 
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          
          {/* Scrollable Content */}
          {activeTab === "Notes" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* AI Notes Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-100">AI Notes</h3>
                  <div className="flex gap-2 text-gray-400">
                    <button className="hover:text-white transition-colors"><Copy className="w-4 h-4" /></button>
                    <button className="hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
                  </div>
                </div>
                <ul className="text-sm text-gray-300 space-y-3 pl-4 list-disc marker:text-gray-500">
                  {highlights.length > 0 ? (
                    highlights.map((h, i) => (
                      <li 
                        key={i} 
                        className={`pl-2 py-1 rounded cursor-pointer relative group transition-colors ${activeHighlightId === h.id ? 'bg-[#222]' : 'hover:bg-[#181818]'}`}
                        onClick={() => setActiveHighlightId(h.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          {h.content?.text ? (
                            <span className={`px-1.5 py-0.5 rounded text-xs leading-relaxed break-words ${
                              h.color === 'blue' ? 'bg-blue-500/30 text-blue-200' :
                              h.color === 'pink' ? 'bg-pink-500/30 text-pink-200' :
                              h.color === 'green' ? 'bg-green-500/30 text-green-200' :
                              'bg-yellow-500/30 text-yellow-200'
                            }`}>
                              {h.content.text}
                            </span>
                          ) : (
                            "Area Highlight"
                          )}
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              setHighlights(prev => prev.filter(item => item.id !== h.id));
                              try {
                                await fetch(`/api/highlights?id=${h.id}&docId=${docId}`, { method: 'DELETE' });
                              } catch(e) {}
                            }}
                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="pl-1 text-gray-500">No highlights yet. Select text in the PDF to create one.</li>
                  )}
                </ul>
              </div>

              {/* Generate From Highlight Section */}
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-gray-100 mb-3">Generate From Highlight</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleAIGenerate('summarize')} disabled={isGeneratingAI} className="flex items-center justify-center gap-2 py-2 px-3 bg-[#111111] border border-[#2A2A2A] rounded-lg text-xs font-medium text-gray-300 hover:bg-[#181818] hover:text-white transition-colors disabled:opacity-50">
                    <AlignLeft className="w-3 h-3" /> Summarize
                  </button>
                  <button onClick={() => handleAIGenerate('explain')} disabled={isGeneratingAI} className="flex items-center justify-center gap-2 py-2 px-3 bg-[#111111] border border-[#2A2A2A] rounded-lg text-xs font-medium text-gray-300 hover:bg-[#181818] hover:text-white transition-colors disabled:opacity-50">
                    <MessageSquare className="w-3 h-3" /> Explain
                  </button>
                  <button onClick={() => handleAIGenerate('flashcards')} disabled={isGeneratingAI} className="flex items-center justify-center gap-2 py-2 px-3 bg-[#111111] border border-[#2A2A2A] rounded-lg text-xs font-medium text-gray-300 hover:bg-[#181818] hover:text-white transition-colors disabled:opacity-50">
                    <Library className="w-3 h-3" /> Flashcards
                  </button>
                  <button disabled className="flex items-center justify-center gap-2 py-2 px-3 bg-[#111111] border border-[#2A2A2A] rounded-lg text-xs font-medium text-gray-300 opacity-50 cursor-not-allowed">
                    <Network className="w-3 h-3" /> Diagrams
                  </button>
                  <button disabled className="col-span-2 flex items-center justify-center gap-2 py-2 px-3 bg-[#111111] border border-[#2A2A2A] rounded-lg text-xs font-medium text-gray-300 opacity-50 cursor-not-allowed">
                    <Video className="w-3 h-3" /> Video Script
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Flashcards" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-100 mb-2">Interactive Study Deck</h3>
                <p className="text-xs text-gray-500 mb-4">Click a card to flip and reveal the answer. You can generate more flashcards from text highlights.</p>
                
                {flashcards.length > 0 ? (
                  <div className="space-y-4">
                    {flashcards.map((card, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className="w-full min-h-[140px] bg-[#111] hover:bg-[#151515] border border-[#2A2A2A] rounded-xl p-5 cursor-pointer relative flex items-center justify-center transition-all duration-300 transform active:scale-[0.98] text-center select-none shadow-lg border-l-4 border-l-emerald-500"
                      >
                        {flippedCards[idx] ? (
                          <div className="text-emerald-300 text-sm leading-relaxed">
                            <span className="text-[9px] text-emerald-500 block mb-1 uppercase tracking-widest font-bold">Answer</span>
                            {card.answer}
                          </div>
                        ) : (
                          <div className="text-gray-100 text-sm font-semibold leading-relaxed">
                            <span className="text-[9px] text-gray-500 block mb-1 uppercase tracking-widest font-bold">Question</span>
                            {card.question}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs text-center mt-8">No flashcards created yet. Generate them from document highlights!</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "Diagram" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-100 mb-2">Visual Concept Map</h3>
                <p className="text-xs text-gray-500 mb-4">A visual flow diagram linking your document highlights into a structured concept tree.</p>

                <div className="w-full flex flex-col items-center py-4 bg-[#111]/30 rounded-xl border border-[#1E1E1E]">
                  <div className="w-20 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs mb-8 shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                    Document
                  </div>
                  
                  {highlights.length > 0 ? (
                    <div className="w-full relative flex flex-col gap-6 items-center px-4">
                      {/* Draw vertical connecting line */}
                      <div className="absolute top-[-32px] bottom-8 w-0.5 bg-[#2A2A2A] z-0" />
                      
                      {highlights.map((h, i) => (
                        <div key={i} className="bg-[#111] border border-[#2A2A2A] rounded-lg p-3 w-full max-w-[260px] text-center text-xs relative z-10 hover:border-emerald-500/40 transition-colors shadow-md">
                          <div className="text-[9px] text-emerald-400 mb-1 font-bold uppercase tracking-wider">Highlight #{i + 1}</div>
                          <p className="text-gray-300 line-clamp-3 leading-relaxed">{h.content?.text || "Area highlight"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs text-center px-6 py-4">Add text highlights in the PDF viewer to auto-generate a visual concept diagram map.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chat UI (Shows when Chat tab is active) */}
          {activeTab === "Chat" && (
            <div className="flex-1 bg-[#0A0A0A] flex flex-col p-4 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                  Select a highlight and click an AI action to start.
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                       <span className="text-[10px] text-gray-500 mb-1 px-1 uppercase">{msg.role}</span>
                       <div className={`p-3 rounded-lg text-sm max-w-[90%] leading-relaxed ${msg.role === 'user' ? 'bg-[#222] text-gray-300 border border-[#333]' : 'bg-emerald-500/10 text-emerald-100 border border-emerald-500/20'}`}>
                          {msg.role === 'user' ? msg.text : renderMarkdown(msg.text)}
                       </div>
                    </div>
                  ))}
                  {isGeneratingAI && <div className="text-emerald-500 text-xs animate-pulse pl-1">AI is typing...</div>}
                </div>
              )}
            </div>
          )}

          {/* Bottom Input */}
          <div className="p-4 border-t border-[#1E1E1E] bg-[#0A0A0A]">
            <div className="relative flex items-center">
              <input 
                className="w-full bg-[#111111] border border-[#2A2A2A] rounded-xl py-3 pl-4 pr-12 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#404040] focus:ring-1 focus:ring-[#404040] transition-all disabled:opacity-50" 
                placeholder="Ask anything about this document..." 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendChat();
                }}
                disabled={isGeneratingAI}
              />
              <button 
                onClick={handleSendChat}
                disabled={isGeneratingAI}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-500 mt-3">AI responses may not be 100% accurate.</p>
          </div>
        </aside>
      )}
      {/* END: RightSidebar */}
    </div>
  );
}
