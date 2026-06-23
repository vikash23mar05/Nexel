"use client";

import React, { useEffect, useState, useRef } from "react";
import { User, Home, Folder, User as ProfileIcon, Settings, RefreshCw, Download, Plus, FileText, Edit2, Check, FolderPlus, X, Menu, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StoragePage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("blue");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const [userEmail, setUserEmail] = useState("Loading...");

  const fetchDocuments = async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.email) setUserEmail(payload.email);
    } catch(e) {}

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const [docsRes, foldersRes] = await Promise.all([
        fetch(`${baseUrl}/api/documents`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/api/folders`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (docsRes.status === 401 || foldersRes.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }
      
      const docsData = await docsRes.json();
      const foldersData = await foldersRes.json();
      
      setDocuments(docsData);
      
      const formattedFolders = foldersData.map((f: any) => ({
        id: f._id,
        name: f.name,
        color: "blue" // Assuming default color
      }));
      setFolders(formattedFolders);
    } catch (e) {
      console.error("Failed to fetch from backend", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleRename = async (docId: string) => {
    try {
      const token = localStorage.getItem("token");
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${baseUrl}/api/documents/${docId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ title: editName })
      });
      if (res.ok) {
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, name: editName } : d));
      }
    } catch (e) {
      console.error("Failed to rename", e);
    }
    setEditingDocId(null);
  };

  const handleMoveDocument = async (docId: string, folderId: string | null) => {
    try {
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, folderId } : d));
      const token = localStorage.getItem("token");
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      await fetch(`${baseUrl}/api/documents/${docId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ folder: folderId })
      });
    } catch (e) {
      console.error("Failed to move document:", e);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    setDocuments(prev => prev.filter(d => d.id !== docId));

    try {
      const token = localStorage.getItem("token");
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      await fetch(`${baseUrl}/api/documents/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Failed to delete document:", e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      const token = localStorage.getItem("token");
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (activeFolderId) {
          formData.append("folder", activeFolderId);
        }

        const res = await fetch(`${baseUrl}/api/documents`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (res.ok) {
          const rawDoc = await res.json();
          const newDoc = {
            id: rawDoc._id,
            name: rawDoc.title,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            type: "PDF",
            folderId: rawDoc.folder,
            uploadedAt: rawDoc.createdAt
          };
          setDocuments(prev => [newDoc, ...prev]);
        } else {
          console.error("Server upload failed");
        }
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${baseUrl}/api/folders`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newFolderName })
      });
      if (res.ok) {
        const newFolder = await res.json();
        setFolders(prev => [...prev, { id: newFolder._id, name: newFolder.name, color: newFolderColor }]);
        setIsCreatingFolder(false);
        setNewFolderName("");
      }
    } catch(e) {
      console.warn("Failed to create folder on server:", e);
    }
  };

  const getColorClasses = (color: string) => {
    const map: Record<string, { bg: string, text: string, bgOp: string }> = {
      blue: { bg: "bg-blue-500", text: "text-blue-400", bgOp: "bg-blue-500/20" },
      red: { bg: "bg-red-500", text: "text-red-400", bgOp: "bg-red-500/20" },
      green: { bg: "bg-green-500", text: "text-green-400", bgOp: "bg-green-500/20" },
      yellow: { bg: "bg-yellow-500", text: "text-yellow-400", bgOp: "bg-yellow-500/20" },
      purple: { bg: "bg-purple-500", text: "text-purple-400", bgOp: "bg-purple-500/20" },
      gray: { bg: "bg-gray-500", text: "text-gray-400", bgOp: "bg-gray-500/20" }
    };
    return map[color] || map.gray;
  };

  return (
    <div className="bg-[#181818] text-gray-200 h-screen w-screen overflow-hidden flex font-sans relative">
      {}
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
                  className={`w-8 h-8 rounded-full ${getColorClasses(c).bg} border-2 ${newFolderColor === c ? 'border-white' : 'border-transparent'}`}
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

      {}
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
                  <h3 className="text-sm font-semibold text-gray-100">Nexel User</h3>
                  <p className="text-xs text-gray-400">{userEmail}</p>
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

      {}
      <aside className="hidden md:flex w-[240px] bg-[#222222] border-r border-[#333333] flex flex-col z-10 shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden border border-gray-500">
              <User className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Nexel User</h3>
              <p className="text-xs text-gray-400">{userEmail}</p>
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
          <button 
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-[#2A2A2A] transition-colors mt-auto border-t border-[#333]"
          >
            Log Out
          </button>
        </nav>
      </aside>

      {}
      <main className="flex-1 flex flex-col min-w-0 bg-[#1A1A1A] overflow-y-auto">
        <div className="max-w-[1200px] w-full mx-auto p-4 sm:p-8">
          {}
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
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white px-3 sm:px-5 py-2.5 rounded-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> {isUploading ? "Uploading..." : "Upload PDF"}
              </button>
            </div>
          </div>

          {}
          <div className="flex items-center gap-3 mb-8">
            <button className="bg-[#2A2A2A] text-gray-200 px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-[#333]">
              <Folder className="w-4 h-4 text-gray-400" /> My Storage
            </button>
          </div>

          {}
          {folders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Folders</h2>
              <div className="flex gap-4 flex-wrap">
                {folders.map(f => (
                  <div 
                    key={f.id} 
                    onClick={() => setActiveFolderId(f.id === activeFolderId ? null : f.id)}
                    className={`flex items-center gap-3 bg-[#222] border px-5 py-4 rounded-xl hover:bg-[#2A2A2A] cursor-pointer transition-colors w-64 ${activeFolderId === f.id ? 'border-emerald-500 bg-[#2A2A2A]' : 'border-[#333]'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(f.color).text} ${getColorClasses(f.color).bgOp}`}>
                      <Folder className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-gray-200 truncate">{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
              {activeFolderId 
                ? `Documents / ${folders.find(f => f.id === activeFolderId)?.name || 'Folder'}` 
                : 'Documents'}
            </h2>
            {activeFolderId && (
              <button 
                onClick={() => setActiveFolderId(null)}
                className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold flex items-center gap-1 ml-4"
              >
                ← Back to All
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">Loading documents...</div>
            </div>
          ) : documents.filter(doc => activeFolderId ? doc.folderId === activeFolderId : !doc.folderId).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-[#222] rounded-xl border border-[#333] border-dashed">
              <FileText className="w-12 h-12 text-gray-500 mb-3" />
              <p className="text-gray-400 font-medium">
                {activeFolderId ? "No documents in this folder" : "No documents in storage"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.filter(doc => activeFolderId ? doc.folderId === activeFolderId : !doc.folderId).map((doc) => (
                <div key={doc.id} className="group flex flex-col">
                  {}
                  <div 
                    onClick={() => {
                      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
                      const token = localStorage.getItem("token") || "";
                      const targetUrl = `${baseUrl}/api/documents/${doc.id}/stream?token=${token}`;
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
                  {}
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
                        <div className="flex items-center gap-2 overflow-hidden pr-2 w-full justify-between">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <h4 className="text-gray-200 text-sm font-medium truncate max-w-[120px]">{doc.name}</h4>
                            <button 
                              onClick={() => { setEditingDocId(doc.id); setEditName(doc.name); }}
                              className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {}
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                handleMoveDocument(doc.id, val === "root" ? null : val);
                              }}
                              value={doc.folderId || "root"}
                              className="bg-[#2a2a2a] border border-[#444] text-gray-400 text-[10px] rounded px-1.5 py-0.5 focus:outline-none max-w-[95px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-white"
                            >
                              <option value="root">Move to...</option>
                              {folders.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                              {doc.folderId && <option value="root">Uncategorize</option>}
                            </select>
                            <span className="text-gray-500 text-xs">{doc.size}</span>
                          </div>
                        </div>
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