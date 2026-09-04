"use client";

import React, { useState, useEffect } from "react";
import {
  PdfLoader,
  PdfHighlighter,
  Highlight,
  Popup,
  AreaHighlight,
} from "react-pdf-highlighter";
import type { IHighlight, NewHighlight, ViewportHighlight } from "react-pdf-highlighter";
import { pdfjs } from 'react-pdf';

import "./pdf_viewer.css";
import "react-pdf-highlighter/dist/style.css";


pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const getNextId = () => String(Math.random()).slice(2);

interface CustomHighlight extends IHighlight {
  color?: string;
}

export default function DocumentViewer({ 
  docId, 
  url,
  highlights,
  addHighlight,
  onContextAction,
  activeColor,
  isClipSelectionEnabled,
  pdfScaleValue = "1"
}: { 
  docId: string, 
  url: string,
  highlights: CustomHighlight[],
  addHighlight: (h: NewHighlight, c: string) => void,
  onContextAction: (action: "explain" | "ask" | "highlight" | "flashcard", text: string, highlight: NewHighlight) => void,
  activeColor: string,
  isClipSelectionEnabled: boolean,
  pdfScaleValue?: string
}) {

  const getHighlightColor = (colorCode?: string) => {
    switch (colorCode) {
      case "yellow": return "rgba(253, 224, 71, 0.7)";
      case "blue": return "rgba(96, 165, 250, 0.7)";
      case "pink": return "rgba(244, 114, 182, 0.7)";
      case "green": return "rgba(74, 222, 128, 0.7)";
      default: return "rgba(253, 224, 71, 0.7)"; 
    }
  };

  const absoluteUrl = url.startsWith("http") || url.startsWith("blob:") ? url : (typeof window !== "undefined" ? `${window.location.origin}${url}` : url);

  return (
    <div className="w-full relative" style={{ height: "calc(100vh - 120px)", width: "100%", border: "1px solid #ccc" }}>
      <PdfLoader 
        url={absoluteUrl} 
        beforeLoad={<div className="flex items-center justify-center h-full text-black">Loading PDF Document...</div>}
        errorMessage={<div className="flex items-center justify-center h-full text-red-500">Failed to load PDF. Please check the console.</div>}
      >
        {(pdfDocument) => (
          <PdfHighlighter
            key={pdfScaleValue}
            pdfDocument={pdfDocument}
            enableAreaSelection={(event) => isClipSelectionEnabled || event.altKey}
            onScrollChange={() => {}}
            scrollRef={() => {}}
            pdfScaleValue={pdfScaleValue}
            onSelectionFinished={(
              position,
              content,
              hideTipAndSelection,
              transformSelection
            ) => {
              const newHighlight = { content, position, comment: { text: "", emoji: "" } };
              const selectedText = content.text?.trim() || "";
              const hasImage = Boolean(content.image);

              if (!selectedText && !hasImage) {
                addHighlight(newHighlight, activeColor);
                setTimeout(hideTipAndSelection, 0);
                return <div style={{ display: 'none' }}></div>;
              }

              return (
                <div className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-950 p-1 text-xs text-white shadow-xl">
                  {selectedText && <>
                    <button
                      className="rounded px-2 py-1 hover:bg-emerald-500 hover:text-black"
                      onClick={() => {
                        onContextAction("explain", selectedText, newHighlight);
                        hideTipAndSelection();
                      }}
                    >
                      Explain
                    </button>
                    <button
                      className="rounded px-2 py-1 hover:bg-emerald-500 hover:text-black"
                      onClick={() => {
                        onContextAction("ask", selectedText, newHighlight);
                        hideTipAndSelection();
                      }}
                    >
                      Ask
                    </button>
                  </>}
                  <button
                    className="rounded px-2 py-1 hover:bg-emerald-500 hover:text-black"
                    onClick={() => {
                      onContextAction("flashcard", selectedText, newHighlight);
                      hideTipAndSelection();
                    }}
                  >
                    Flashcard
                  </button>
                  <button
                    className="rounded px-2 py-1 hover:bg-emerald-500 hover:text-black"
                    onClick={() => {
                      onContextAction("highlight", selectedText, newHighlight);
                      hideTipAndSelection();
                    }}
                  >
                    Highlight
                  </button>
                </div>
              );
            }}
            highlightTransform={(
              highlight: any,
              index: number,
              setTip: any,
              hideTip: any,
              viewportToScaled: any,
              screenshot: any,
              isScrolledTo: boolean
            ) => {
              const isTextHighlight = !Boolean(
                highlight.content && highlight.content.image
              );

              const component = isTextHighlight ? (
                <Highlight
                  isScrolledTo={isScrolledTo}
                  position={highlight.position}
                  comment={highlight.comment}
                />
              ) : (
                <AreaHighlight
                  isScrolledTo={isScrolledTo}
                  highlight={highlight}
                  onChange={(boundingRect) => {

                  }}
                />
              );

              return (
                <Popup
                  popupContent={<div className="bg-black text-white p-2 text-xs rounded">{highlight.color} highlight</div>}
                  onMouseOver={(popupContent) => {}}
                  onMouseOut={hideTip}
                  key={index}
                >
                  <div 
                    className="custom-highlight-wrapper" 
                    style={{ '--highlight-bg': getHighlightColor(highlight.color) } as any}
                  >
                    {component}
                  </div>
                </Popup>
              );
            }}
            highlights={highlights}
          />
        )}
      </PdfLoader>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-highlight-wrapper .Highlight__part {
          background-color: var(--highlight-bg, rgba(253, 224, 71, 0.7)) !important;
        }
      `}} />
    </div>
  );
}