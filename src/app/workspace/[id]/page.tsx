"use client";

import { 
  User, Home, Folder, FileText, StickyNote, Library, Network, 
  MessageSquare, Video, Settings, ArrowLeft, ChevronDown, ZoomOut, 
  ZoomIn, Maximize, Minimize, Sparkles, Highlighter, Type, 
  MessageSquareText, ArrowRight, Plus, X, Copy, Download, Menu, 
  AlignLeft, Send 
} from "lucide-react";
import React, { useState, useEffect, use, useRef } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";

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
  const [docName, setDocName] = useState("Loading Document...");
  const [flashcards, setFlashcards] = useState<{question: string, answer: string}[]>([]);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [activeReaders, setActiveReaders] = useState<any[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isNotesCopied, setIsNotesCopied] = useState(false);
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const viewerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const getNotesMarkdown = () => {
    if (highlights.length === 0) return "No highlights yet.";
    
    let md = `# Highlights & Notes for ${docName}\n`;
    md += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    md += `Total Highlights: ${highlights.length}\n\n`;
    md += `---\n\n`;
    
    highlights.forEach((h, index) => {
      const text = h.content?.text || "Area highlight";
      const author = h.author ? ` (by ${h.author.name})` : "";
      const color = h.color ? ` [${h.color.toUpperCase()}]` : "";
      const page = h.position?.pageNumber ? ` - Page ${h.position.pageNumber}` : "";
      
      md += `### Highlight #${index + 1}${page}${color}${author}\n`;
      md += `> ${text}\n\n`;
      if (h.comment?.text) {
        md += `*Note: ${h.comment.text}*\n\n`;
      }
      md += `---\n\n`;
    });
    
    return md;
  };

  const handleCopyNotes = () => {
    const md = getNotesMarkdown();
    navigator.clipboard.writeText(md);
    setIsNotesCopied(true);
    setTimeout(() => setIsNotesCopied(false), 2000);
  };

  const handleDownloadNotes = () => {
    const md = getNotesMarkdown();
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    const safeDocName = docName.replace(/\s+/g, "_").replace(/\.pdf$/i, "");
    link.download = `${safeDocName}_highlights.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX; 
      const newWidth = Math.max(280, Math.min(600, startWidth + deltaX)); 
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

    const lines = content.split('\n');

    return lines.map((line, idx) => {

      const isHeader = line.trim().startsWith('###') || line.trim().startsWith('##') || line.trim().startsWith('#') || line.trim().startsWith('**Key');

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
              setActiveTab("Flashcards"); 
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
      color,
      author: currentUserRef.current
    };

    const updatedHighlights = [...highlights, newHighlight];

    setHighlights(updatedHighlights);
    
    // Broadcast immediately to concurrent readers
    if (socketRef.current) {
      console.log("EMITTING NEW HIGHLIGHT TO WEBSOCKET:", newHighlight);
      socketRef.current.emit("new-highlight", {
        documentId: docId,
        highlight: newHighlight,
        user: currentUserRef.current
      });
    }

    try {
      const { saveLocalHighlights } = await import("../../../utils/indexedDB");
      await saveLocalHighlights(docId, updatedHighlights);
    } catch (e) {
      console.warn("Failed to backup highlights in IndexedDB:", e);
    }

    try {
      await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, highlight: newHighlight })
      });
    } catch (e) {
      console.error("Failed to save highlight to server:", e);
    }
  };

  // Socket reference for broadcasting highlights
  const socketRef = useRef<Socket | null>(null);
  // Current user info ref
  const currentUserRef = useRef<any>(null);

  useEffect(() => {
    // Set initial zoom level based on screen width on mount
    if (typeof window !== "undefined") {
      if (window.innerWidth < 640) {
        setZoomLevel(0.6);
      } else if (window.innerWidth < 1024) {
        setZoomLevel(0.85);
      }
    }

    const searchParams = new URLSearchParams(window.location.search);
    const urlParam = searchParams.get("url");
    const nameParam = searchParams.get("name");

    if (nameParam) {
      setDocName(nameParam);
    } else {
      setDocName("Workspace Document");
    }

    if (urlParam) {
      if (urlParam.startsWith("indexeddb://")) {
        const localDocId = urlParam.replace("indexeddb://", "");
        import("../../../utils/indexedDB").then(async ({ getLocalDocumentFile }) => {
          try {
            const blob = await getLocalDocumentFile(localDocId);
            if (blob) {
              const objectUrl = URL.createObjectURL(blob);
              setUrl(objectUrl);
            } else {
              console.error("Local document not found in IndexedDB");
            }
          } catch (e) {
            console.error("Error reading local document from IndexedDB", e);
          }
        });
      } else {
        setUrl(urlParam);
      }
    }

    if (docId) {
      fetch(`/api/highlights?docId=${docId}`)
        .then(res => {
          if (!res.ok) throw new Error("Server error fetching highlights");
          return res.json();
        })
        .then(data => {
           if (data.highlights) setHighlights(data.highlights);
        })
        .catch(async (err) => {
           console.warn("Server highlights load failed, using local IndexedDB database fallback:", err);
           const { getLocalHighlights } = await import("../../../utils/indexedDB");
           const localHighlights = await getLocalHighlights(docId);
           if (localHighlights) setHighlights(localHighlights);
        });
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // Socket.io Connection (Synchronous to avoid React Strict Mode race conditions)
    if (docId) {
      const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
      socketRef.current = socket;
      
      const colorMap: Record<string, string> = { yellow: "#FDE047", blue: "#60A5FA", pink: "#F472B6", green: "#4ADE80" };
      const colorKeys = Object.keys(colorMap);
      const myColorKey = colorKeys[Math.floor(Math.random() * colorKeys.length)];
      const myColorHex = colorMap[myColorKey];
      
      setActiveColor(myColorKey); // Auto-set the user's default highlighter color
      
      const user = { id: Math.random().toString(), name: "Vikash Kumar Vivek", color: myColorHex };
      currentUserRef.current = user;
      
      socket.on("connect", () => {
        socket.emit("join-document", { documentId: docId, user });
      });

      // Also emit immediately in case it's already connected (or fast-cached)
      if (socket.connected) {
        socket.emit("join-document", { documentId: docId, user });
      }

      socket.on("active-readers", (readers: any[]) => {
        setActiveReaders(readers);
      });

      // Listen for incoming highlights from other users
      socket.on("receive-highlight", (data: { highlight: any, user: any }) => {
        console.log("RECEIVED HIGHLIGHT FROM WEBSOCKET:", data);
        // Add the author info to the highlight so it shows in the UI
        const receivedHighlight = {
          ...data.highlight,
          author: data.user
        };
        setHighlights(prev => {
          // Avoid duplicates if the highlight already exists
          if (prev.find(h => h.id === receivedHighlight.id)) {
            console.log("Highlight already exists, skipping...");
            return prev;
          }
          console.log("Adding remote highlight to state:", receivedHighlight);
          return [...prev, receivedHighlight];
        });
      });

      // Listen for highlight deletions
      socket.on("remove-highlight", (data: { highlightId: string }) => {
        setHighlights(prev => prev.filter(h => h.id !== data.highlightId));
      });
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [docId]);

  return (
    <div className="bg-[#0A0A0A] text-gray-300 h-screen w-screen overflow-hidden flex selection:bg-emerald-500/30 relative">
      {}
      {!isLeftSidebarOpen && (
        <button 
          onClick={() => setIsLeftSidebarOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-600 text-black w-5 h-16 rounded-r-md flex items-center justify-center shadow-md transition-colors z-50"
        >
          <ChevronDown className="w-4 h-4 -rotate-90" />
        </button>
      )}

      {}
      {isLeftSidebarOpen && (
        <aside className={`w-64 bg-[#111111] border-r border-[#1E1E1E] flex-col justify-between ${isMobile ? (isLeftSidebarOpen ? "fixed inset-y-0 left-0 z-40 transition-all bg-[#111111] shadow-lg" : "hidden") : "hidden md:flex"} z-10 transition-all relative`}>
          {}
          <button 
            onClick={() => setIsLeftSidebarOpen(false)}
            className="absolute -right-5 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-600 text-black w-5 h-16 rounded-r-md flex items-center justify-center shadow-md transition-colors"
          >
            <ChevronDown className="w-4 h-4 rotate-90" />
          </button>

          <div>
            {}
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
            {}
            <nav className="p-3 space-y-1 mt-2">
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#181818] transition-colors" href="/">
                <Home className="w-5 h-5 text-center" /> Home
              </a>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#181818] transition-colors" href="/storage">
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
          {}
          <div className="p-3 mb-2 border-t border-[#1E1E1E]">
            <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#181818] transition-colors" href="/settings">
              <Settings className="w-5 h-5 text-center" /> Settings
            </a>
          </div>
        </aside>
      )}
      {}

      {}
      <main className="flex-1 flex flex-col relative min-w-0">
        {}
        <header className="h-16 border-b border-[#1E1E1E] bg-[#0A0A0A] flex items-center justify-between px-4 lg:px-6 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} 
              className="md:hidden text-gray-400 hover:text-white p-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            <a 
              href="/storage"
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <h1 className="text-gray-100 font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-none" title={docName}>{docName}</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Color picker for smaller screens */}
            <div className="flex xl:hidden items-center gap-1.5 border-[#2A2A2A] border px-2 py-1 rounded-lg bg-[#111111]">
              {[
                { id: "yellow", bg: "bg-yellow-400" },
                { id: "blue", bg: "bg-blue-400" },
                { id: "pink", bg: "bg-pink-400" },
                { id: "green", bg: "bg-green-400" },
              ].map(color => (
                <div 
                  key={color.id} 
                  className="w-5 h-5 flex items-center justify-center cursor-pointer" 
                  onClick={() => setActiveColor(color.id)}
                >
                  <div className={`w-3 h-3 rounded-full ${color.bg} border transition-all ${activeColor === color.id ? 'border-white scale-110' : 'border-transparent'}`}></div>
                </div>
              ))}
            </div>
            {}
            <div className="hidden sm:flex items-center gap-3 text-sm text-gray-400 bg-[#111111] px-3 py-1.5 rounded-lg border border-[#2A2A2A]">
              <span>{Math.round(zoomLevel * 100)}%</span>
              <ChevronDown className="w-4 h-4 text-xs" />
            </div>
            <div className="hidden sm:flex items-center gap-3 text-gray-400">
              <button onClick={handleZoomOut} className="hover:text-white"><ZoomOut className="w-4 h-4" /></button>
              <button onClick={handleZoomIn} className="hover:text-white"><ZoomIn className="w-4 h-4" /></button>
              <div className="w-px h-4 bg-[#2A2A2A] mx-1"></div>
              <button onClick={handleFullscreen} className="hover:text-white"><Maximize className="w-4 h-4" /></button>
              <button onClick={() => document.exitFullscreen()} className="hover:text-white"><Minimize className="w-4 h-4" /></button>
            </div>
            {/* Active Readers UI */}
            {activeReaders.length > 0 && (
              <div className="hidden sm:flex items-center ml-2 border-l border-[#2A2A2A] pl-4">
                <div className="flex -space-x-2 mr-2">
                  {activeReaders.map((reader, idx) => (
                    <div 
                      key={idx} 
                      className="w-8 h-8 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center text-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: reader.color || '#10B981', zIndex: 10 - idx }}
                      title={reader.name}
                    >
                      {reader.name.charAt(0)}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  {activeReaders.length} {activeReaders.length === 1 ? 'reader' : 'readers'}
                </span>
              </div>
            )}
            
            {/* Share Button */}
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
              }}
              className="hidden sm:flex items-center gap-2 text-sm text-gray-300 hover:text-white bg-[#111111] hover:bg-[#181818] px-3 py-1.5 rounded-lg border border-[#2A2A2A] transition-colors"
            >
              {isCopied ? <span className="text-emerald-400">Copied!</span> : <>Share <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg></>}
            </button>

            <button 
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className="bg-emerald-400 hover:bg-emerald-500 text-black px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              <Sparkles className="w-4 h-4" /> AI Tools
            </button>
          </div>
        </header>

        {}
        <div className="flex-1 overflow-y-auto bg-[#0E0E0E] relative flex justify-center pt-8 pb-32">
          {}
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
              { id: "green", bg: "bg-green-400" },
            ].map(color => (
              <div key={color.id} className="w-8 h-8 flex items-center justify-center" onClick={() => setActiveColor(color.id)}>
                <div className={`w-4 h-4 rounded-full ${color.bg} cursor-pointer border-2 transition-all ${activeColor === color.id ? 'border-white scale-125' : 'border-[#111111]'}`}></div>
              </div>
            ))}
            <button className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#181818] transition-colors mt-1">
              <MessageSquareText className="w-4 h-4" />
            </button>
          </div>

          {}
          <div ref={viewerRef} className="bg-white text-gray-900 w-full max-w-full md:max-w-[850px] h-[calc(100vh-120px)] shadow-2xl rounded-sm text-sm lg:text-base leading-relaxed relative overflow-hidden">
            {url ? (
              <PdfViewer 
                docId={docId} 
                url={url} 
                highlights={highlights} 
                addHighlight={addHighlight} 
                activeColor={activeColor}
                pdfScaleValue={String(zoomLevel)}
              />
            ) : (
              <div className="flex items-center justify-center h-[1100px] text-gray-400 flex-col gap-4">
                <FileText className="w-12 h-12" />
                <p>No document uploaded</p>
                <a href="/" className="text-emerald-500 hover:underline">Go back to upload</a>
              </div>
            )}
          </div>

          {}
        </div>
      </main>
      {}

      {}
      {isRightSidebarOpen && (
        <aside 
          style={{ width: isMobile ? "100%" : rightSidebarWidth }}
          className={`bg-[#0A0A0A] flex flex-col transition-[width] duration-75 select-none ${
            isMobile 
              ? "fixed inset-y-0 right-0 z-50 shadow-2xl animate-in slide-in-from-right duration-250" 
              : "relative border-l border-[#1E1E1E] z-20"
          }`}
        >
          {}
          {!isMobile && (
            <div 
              className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/50 active:bg-emerald-500 transition-colors z-30"
              onMouseDown={handleMouseDown}
            />
          )}

          {}
          <div className="h-16 flex items-center justify-between px-5 border-b border-[#1E1E1E]">
            <h2 className="text-base font-semibold text-gray-100">AI Assistant</h2>
            <button onClick={() => setIsRightSidebarOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#1A1A1A]">
              <X className="w-4 h-4" />
            </button>
          </div>

          {}
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

          {}
          {activeTab === "Notes" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-100">AI Notes</h3>
                  <div className="flex items-center gap-3 text-gray-400">
                    <button 
                      onClick={handleCopyNotes} 
                      className="hover:text-white transition-colors flex items-center gap-1 text-xs"
                      title="Copy notes to clipboard"
                    >
                      {isNotesCopied ? (
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button 
                      onClick={handleDownloadNotes} 
                      className="hover:text-white transition-colors"
                      title="Download notes as Markdown file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
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
                            <div className="flex flex-col gap-1.5 w-full">
                              <div className={`px-2 py-1.5 rounded text-xs leading-relaxed whitespace-pre-wrap break-words ${
                                h.color === 'blue' ? 'bg-blue-500/30 text-blue-200' :
                                h.color === 'pink' ? 'bg-pink-500/30 text-pink-200' :
                                h.color === 'green' ? 'bg-green-500/30 text-green-200' :
                                'bg-yellow-500/30 text-yellow-200'
                              }`}>
                                {h.content.text}
                              </div>
                              {h.author && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1.5 font-medium pl-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.author.color }}></div>
                                  {h.author.name}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span>Area Highlight</span>
                              {h.author && (
                                <span className="text-[9px] text-gray-500 flex items-center gap-1 font-medium pl-1">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: h.author.color }}></div>
                                  {h.author.name}
                                </span>
                              )}
                            </div>
                          )}
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              const filtered = highlights.filter(item => item.id !== h.id);
                              setHighlights(filtered);
                              if (socketRef.current) {
                                socketRef.current.emit("delete-highlight", { documentId: docId, highlightId: h.id });
                              }
                              try {
                                const { saveLocalHighlights } = await import("../../../utils/indexedDB");
                                await saveLocalHighlights(docId, filtered);
                              } catch(dbErr) {}
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

              {}
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
                      {}
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

          {}
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

          {}
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
      {}
    </div>
  );
}