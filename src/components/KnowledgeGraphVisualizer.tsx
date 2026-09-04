"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { Sparkles, Network, RefreshCw, ZoomIn, ZoomOut, Search, Send, Layers, Info } from "lucide-react";

interface Node {
  id: string;
  label: string;
  category: string;
  description: string;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
}

interface KnowledgeGraphData {
  nodes: Node[];
  edges: Edge[];
  summary: string;
}

interface KnowledgeGraphVisualizerProps {
  docId: string;
  docName?: string;
  onAskAI?: (prompt: string) => void;
}

export default function KnowledgeGraphVisualizer({ docId, docName, onAskAI }: KnowledgeGraphVisualizerProps) {
  const { getToken } = useAuth();
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [zoom, setZoom] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchGraph = async (forceRegenerate = false) => {
    setLoading(true);
    try {
      const endpoint = forceRegenerate 
        ? `${API_BASE}/api/graph/${docId}/generate`
        : `${API_BASE}/api/graph/${docId}`;

      const method = forceRegenerate ? "POST" : "GET";
      const token = await getToken();
      const res = await fetch(endpoint, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
        if (data.nodes && data.nodes.length > 0) {
          setSelectedNode(data.nodes[0]);
          // If returning fallback sample data for a new doc, auto-trigger real AI extraction
          if (!forceRegenerate && data.nodes.some((n: Node) => n.label === "Sample Study Document")) {
            console.log("Auto-triggering real Knowledge Graph extraction...");
            fetchGraph(true);
            return;
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch Knowledge Graph:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (docId) {
      fetchGraph();
    }
  }, [docId]);

  // Color mapping by category
  const categoryColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    Concept: { bg: "#1E293B", border: "#3B82F6", text: "#60A5FA", dot: "#3B82F6" },
    Definition: { bg: "#14532D", border: "#22C55E", text: "#4ADE80", dot: "#22C55E" },
    Formula: { bg: "#581C87", border: "#A855F7", text: "#C084FC", dot: "#A855F7" },
    Process: { bg: "#7C2D12", border: "#F97316", text: "#FB923C", dot: "#F97316" },
    Term: { bg: "#701A75", border: "#EC4899", text: "#F472B6", dot: "#EC4899" },
    Default: { bg: "#27272A", border: "#71717A", text: "#A1A1AA", dot: "#71717A" },
  };

  const getColors = (category: string) => categoryColors[category] || categoryColors.Default;

  // Filtered nodes
  const filteredNodes = (graphData?.nodes || []).filter((node) => {
    const matchesCategory = filterCategory === "All" || node.category === filterCategory;
    const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          node.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = Array.from(new Set((graphData?.nodes || []).map((n) => n.category)));

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] text-gray-200 border-l border-[#262626]">
      {/* Top Bar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#262626] bg-[#181818]">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-gray-100 text-sm tracking-wide">Knowledge Graph & Mind Map</h3>
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
            GraphRAG
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchGraph(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-[#262626] hover:bg-[#333] border border-[#3A3A3A] px-3 py-1.5 rounded-lg text-gray-300 transition-colors"
            title="Re-extract Knowledge Graph using AI"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Regenerate Graph
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#141414] border-b border-[#262626] text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-gray-400 flex items-center gap-1 shrink-0"><Layers className="w-3.5 h-3.5"/> Filter:</span>
          <button
            onClick={() => setFilterCategory("All")}
            className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${filterCategory === "All" ? "bg-emerald-500 text-black font-semibold" : "bg-[#222] text-gray-400 hover:text-white"}`}
          >
            All ({graphData?.nodes?.length || 0})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${filterCategory === cat ? "bg-emerald-500 text-black font-semibold" : "bg-[#222] text-gray-400 hover:text-white"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search concept..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#1C1C1C] border border-[#333] text-gray-200 text-xs rounded-md pl-8 pr-3 py-1 focus:outline-none focus:border-emerald-500 w-44"
          />
        </div>
      </div>

      {/* Main Content Split: Graph Canvas & Node Details */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse mb-3" />
            <p className="text-gray-300 font-semibold">Extracting Knowledge Graph...</p>
            <p className="text-xs text-gray-500 max-w-sm mt-1">Analyzing entities, concepts, and relationships from document chunks.</p>
          </div>
        ) : !graphData || filteredNodes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Network className="w-10 h-10 text-gray-600 mb-3" />
            <p className="text-gray-400">No concepts found matching filter.</p>
          </div>
        ) : (
          <>
            {/* Mind Map Interactive Node Canvas */}
            <div className="flex-1 p-6 overflow-auto bg-[#0E0E0E] relative flex flex-col items-center justify-center">
              {/* Zoom Controls */}
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-[#1C1C1C] border border-[#333] rounded-lg p-1 z-10 shadow-lg">
                <button onClick={() => setZoom(prev => Math.min(prev + 0.15, 1.8))} className="p-1.5 text-gray-400 hover:text-white rounded"><ZoomIn className="w-4 h-4"/></button>
                <span className="text-xs text-gray-400 px-1 font-mono">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.5))} className="p-1.5 text-gray-400 hover:text-white rounded"><ZoomOut className="w-4 h-4"/></button>
              </div>

              {/* Node Layout Canvas */}
              <div 
                className="w-full h-full min-h-[450px] flex flex-wrap items-center justify-center gap-6 p-8 transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              >
                {filteredNodes.map((node, index) => {
                  const colors = getColors(node.category);
                  const isSelected = selectedNode?.id === node.id;

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`cursor-pointer group relative p-4 rounded-xl border transition-all duration-200 shadow-xl max-w-[220px] w-full ${
                        isSelected 
                          ? "ring-2 ring-emerald-400 scale-105 z-20" 
                          : "hover:scale-102 hover:border-gray-500 z-10"
                      }`}
                      style={{
                        backgroundColor: colors.bg,
                        borderColor: isSelected ? "#10B981" : colors.border,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-black/40 text-gray-300 border border-white/10">
                          {node.category}
                        </span>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
                      </div>
                      <h4 className="font-bold text-sm text-gray-100 group-hover:text-white leading-tight mb-1">
                        {node.label}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {node.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Concept Inspector Sidebar */}
            {selectedNode && (
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[#262626] bg-[#161616] p-5 flex flex-col justify-between shrink-0 animate-in slide-in-from-right duration-200">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Concept Detail
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/50 border border-gray-700 text-gray-300 font-mono">
                      {selectedNode.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 leading-tight">
                    {selectedNode.label}
                  </h3>

                  <p className="text-xs text-gray-300 leading-relaxed bg-[#111] p-3 rounded-lg border border-[#2A2A2A] mb-4">
                    {selectedNode.description || "No specific description available."}
                  </p>

                  {/* Connected Relationships */}
                  <div className="mb-4">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Connected Links</h5>
                    <div className="space-y-1.5">
                      {(graphData?.edges || [])
                        .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                        .map((edge) => {
                          const otherNodeId = edge.source === selectedNode.id ? edge.target : edge.source;
                          const otherNode = (graphData?.nodes || []).find((n) => n.id === otherNodeId);
                          return (
                            <div
                              key={edge.id}
                              onClick={() => otherNode && setSelectedNode(otherNode)}
                              className="text-xs bg-[#222] hover:bg-[#2A2A2A] p-2 rounded border border-[#333] cursor-pointer flex items-center justify-between text-gray-300 transition-colors"
                            >
                              <span className="font-semibold text-emerald-400 truncate max-w-[110px]">{otherNode?.label || otherNodeId}</span>
                              <span className="text-[10px] text-gray-500 italic">{edge.label}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Ask AI Button */}
                <button
                  onClick={() => {
                    if (onAskAI) {
                      onAskAI(`Explain the concept "${selectedNode.label}" from this document in detail and how it relates to the overall topic.`);
                    }
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs transition-colors shadow-lg mt-4"
                >
                  <Sparkles className="w-4 h-4" /> Ask AI About "{selectedNode.label}"
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
