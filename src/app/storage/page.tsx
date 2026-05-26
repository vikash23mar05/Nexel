"use client";

import React, { useEffect, useState } from "react";
import { User, Home, Folder, User as ProfileIcon, Settings, RefreshCw, Download, Plus, FileText, Edit2, Check, FolderPlus, X, Menu } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StoragePage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Renaming state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Create folder state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("blue");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const fetchDocuments = async () => {
    setIsLoading(true);
    
    let serverDocs: any[] = [];
    let serverFolders: any[] = [];
    
    try {
      const res = await fetch("/api/documents/list");
      if (res.ok) {
        const data = await res.json();
        if (data.documents) serverDocs = data.documents;
        if (data.folders) serverFolders = data.folders;
      }
    } catch (e) {
      console.warn("Failed to fetch documents from server, combining with client-side database:", e);
    }
    
    try {
      const { getLocalDocuments, getLocalFolders } = await import("../../utils/indexedDB");
      const localDocs = await getLocalDocuments();
      const localFolders = await getLocalFolders();
      
      const formattedLocalDocs = localDocs.map(d => ({
        id: d.id,
        name: d.name,
        size: d.size,
        type: "PDF",
        uploadedAt: d.uploadedAt,
        isLocal: true
      }));

      // Combine and de-duplicate documents
      const combinedDocs = [...serverDocs];
      formattedLocalDocs.forEach(ld => {
        if (!combinedDocs.some(sd => sd.id === ld.id)) {
          combinedDocs.push(ld);
        }
      });

      // Combine and de-duplicate folders
      const combinedFolders = [...serverFolders];
      localFolders.forEach(lf => {
        if (!combinedFolders.some(sf => sf.id === lf.id)) {
          combinedFolders.push(lf);
        }
      });
      
      setDocuments(combinedDocs);
      setFolders(combinedFolders);
    } catch (e) {
      console.error("Failed to load local documents", e);
      setDocuments(serverDocs);
      setFolders(serverFolders);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleRename = async (docId: string) => {
    try {
      const res = await fetch("/api/documents/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: docId, name: editName })
      });
      if (res.ok) {
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, name: editName } : d));
      }
    } catch (e) {
      console.error("Failed to rename", e);
    }
    setEditingDocId(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const uniqueFolderId = `folder-${Date.now()}`;
    
    // Save locally in IndexedDB as a fallback backup
    try {
      const { saveLocalFolder } = await import("../../utils/indexedDB");
      await saveLocalFolder(uniqueFolderId, newFolderName, newFolderColor);
      
      const newFolderObj = { id: uniqueFolderId, name: newFolderName, color: newFolderColor };
      setFolders(prev => {
        if (prev.some(f => f.name === newFolderName)) return prev;
        return [...prev, newFolderObj];
      });
      setIsCreatingFolder(false);
      setNewFolderName("");
    } catch(e) {
      console.warn("Failed to save folder locally:", e);
    }

    // Try saving on server
    try {
      await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName, color: newFolderColor })
      });
    } catch(e) {
      console.warn("Failed to create folder on server:", e);
    }
  };

  const getColorClass = (color: string) => {
    const map: Record<string, string> = {
      blue: "bg-blue-500",
      red: "bg-red-500",
      green: "bg-green-500",
      yellow: "bg-yellow-500",
      purple: "bg-purple-500",
      gray: "bg-gray-500"
    };
    return map[color] || map.gray;
  };

  return (
    <div className="bg-[#181818] text-gray-200 h-screen w-screen overflow-hidden flex font-sans relative">
      {/* Create Folder Modal */}
      {isCreatingFolder && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-[#222] p-6 rounded-xl border border-[#333] w-96 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Create Folder</h3>
              <button onClick={() => setIsCreatingFolder(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <input 
              type="text" 
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder Name"
              className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white mb-4 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <div className="flex gap-2 mb-6">
              {["blue", "red", "green", "yellow", "purple", "gray"].map(c => (
                <button 
                  key={c}
                  onClick={() => setNewFolderColor(c)}
                  className={`w-8 h-8 rounded-full ${getColorClass(c)} border-2 ${newFolderColor === c ? 'border-white' : 'border-transparent'}`}
                />
              ))}
            </div>
            <button 
              onClick={handleCreateFolder}
              className="w-full bg-emerald-500 text-black font-semibold py-2 rounded hover:bg-emerald-400 transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Mobile Left Sidebar Overlay Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setIsMobileSidebarOpen(false)}>
          <aside 
            className="w-[240px] h-full bg-[#222222] border-r border-[#333333] flex flex-col z-50 animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex justify-between items-center border-b border-[#333333]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden border border-gray-500">
                  <User className="w-6 h-6 text-gray-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-100">Vikash Kumar</h3>
                  <p className="text-xs text-gray-400">Test@email.com</p>
                </div>
              </div>
              <button onClick={() => setIsMobileSidebarOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex-1 mt-4">
              <a className="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#2A2A2A] transition-colors" href="/" onClick={() => setIsMobileSidebarOpen(false)}>
                <Home className="w-5 h-5 text-center" /> Home
              </a>
              <a className="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-gray-100 bg-[#2A2A2A] border-l-4 border-emerald-500 transition-colors" href="/storage" onClick={() => setIsMobileSidebarOpen(false)}>
                <Folder className="w-5 h-5 text-center" /> Storage
              </a>
              <a className="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#2A2A2A] transition-colors" href="#" onClick={() => setIsMobileSidebarOpen(false)}>
                <ProfileIcon className="w-5 h-5 text-center" /> Profile
              </a>
              <a className="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#2A2A2A] transition-colors" href="#" onClick={() => setIsMobileSidebarOpen(false)}>
                <Settings className="w-5 h-5 text-center" /> Settings
              </a>
            </nav>
          </aside>
        </div>
      )}

      {/* Left Sidebar - Desktop only */}
      <aside className="hidden md:flex w-[240px] bg-[#222222] border-r border-[#333333] flex flex-col z-10 shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden border border-gray-500">
              <User className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Vikash Kumar Vivek</h3>
              <p className="text-xs text-gray-400">Test@email.com</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 mt-2">
          <a className="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#2A2A2A] transition-colors" href="/">
            <Home className="w-5 h-5 text-center" /> Home
          </a>
          <a className="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-gray-100 bg-[#2A2A2A] border-l-4 border-emerald-500 transition-colors" href="/storage">
            <Folder className="w-5 h-5 text-center" /> Storage
          </a>
          <a className="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#2A2A2A] transition-colors" href="#">
            <ProfileIcon className="w-5 h-5 text-center" /> Profile
          </a>
          <a className="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-[#2A2A2A] transition-colors" href="#">
            <Settings className="w-5 h-5 text-center" /> Settings
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#1A1A1A] overflow-y-auto">
        <div className="max-w-[1200px] w-full mx-auto p-4 sm:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden text-gray-400 hover:text-white p-1 focus:outline-none"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-wider">Storage</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <button onClick={fetchDocuments} className="text-gray-400 hover:text-white transition-colors p-2">
                <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={() => setIsCreatingFolder(true)} className="text-gray-400 hover:text-white transition-colors border border-gray-600 px-3 py-2 rounded-md flex items-center gap-2 text-xs sm:text-sm">
                <FolderPlus className="w-4 h-4" /> <span className="hidden sm:inline">New Folder</span><span className="sm:hidden">Folder</span>
              </button>
              <a href="/" className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 sm:px-5 py-2.5 rounded-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" /> Add new
              </a>
            </div>
          </div>

          {/* Cloud Tabs */}
          <div className="flex items-center gap-3 mb-8">
            <button className="bg-[#2A2A2A] text-gray-200 px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-[#333]">
              <Folder className="w-4 h-4 text-gray-400" /> My Storage
            </button>
          </div>

          {/* Folders Row */}
          {folders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Folders</h2>
              <div className="flex gap-4 flex-wrap">
                {folders.map(f => (
                  <div key={f.id} className="flex items-center gap-3 bg-[#222] border border-[#333] px-5 py-4 rounded-xl hover:bg-[#2A2A2A] cursor-pointer transition-colors w-64">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-opacity-20 ${getColorClass(f.color).replace('bg-', 'text-').replace('500', '400')} ${getColorClass(f.color).replace('bg-', 'bg-').replace('500', '500/20')}`}>
                      <Folder className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-200 truncate">{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid Layout */}
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Documents</h2>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">Loading documents...</div>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-[#222] rounded-xl border border-[#333] border-dashed">
              <FileText className="w-12 h-12 text-gray-500 mb-3" />
              <p className="text-gray-400 font-medium">No documents in storage</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <div key={doc.id} className="group flex flex-col">
                  {/* Document Card Thumbnail */}
                  <div 
                    onClick={() => {
                      const targetUrl = doc.isLocal 
                        ? `indexeddb://${doc.id}` 
                        : `/api/document?id=${doc.id}`;
                      router.push(`/workspace/${doc.id}?url=${encodeURIComponent(targetUrl)}`);
                    }}
                    className="cursor-pointer bg-[#EFEFEF] rounded-t-lg aspect-[4/3] w-full p-4 relative overflow-hidden border border-[#333] border-b-0 group-hover:opacity-90 transition-opacity"
                  >
                     <div className="absolute top-3 right-3 bg-[#114032] text-emerald-100 text-xs font-bold px-2 py-1 rounded shadow-sm z-10">
                       PDF
                     </div>
                     <div className="space-y-2 mt-4 opacity-50">
                        <div className="h-3 bg-gray-400 w-3/4 rounded"></div>
                        <div className="h-2 bg-gray-400 w-full rounded"></div>
                        <div className="h-2 bg-gray-400 w-full rounded"></div>
                        <div className="h-2 bg-gray-400 w-5/6 rounded"></div>
                        <div className="h-2 bg-gray-400 w-full rounded mt-4"></div>
                     </div>
                  </div>
                  {/* Document Card Footer */}
                  <div className="bg-[#1A1A1A] border border-[#333] border-t-0 p-3 rounded-b-lg flex justify-between items-center group-hover:bg-[#222] transition-colors">
                    {editingDocId === doc.id ? (
                      <div className="flex items-center gap-2 w-full pr-2">
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-[#111] border border-emerald-500 text-white px-2 py-1 rounded text-sm w-full focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => { if(e.key === 'Enter') handleRename(doc.id); }}
                        />
                        <button onClick={() => handleRename(doc.id)} className="text-emerald-500 hover:text-emerald-400"><Check className="w-4 h-4"/></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <h4 className="text-gray-200 text-sm font-medium truncate">{doc.name}</h4>
                          <button 
                            onClick={() => { setEditingDocId(doc.id); setEditName(doc.name); }}
                            className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-gray-500 text-xs shrink-0">{doc.size}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
