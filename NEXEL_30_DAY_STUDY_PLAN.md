# 📅 Nexel: 30-Day Placement Preparation & Web Dev Masterclass Curriculum

This is your interactive, step-by-step masterclass study guide designed to take you from a "vibe-coder" to an interview-ready full-stack software engineer. Each day contains a core objective, the files and concepts to study, and a high-yield technical placement keyword.

---

```
  [Phase 1] ──► [Phase 2] ──► [Phase 3] ──► [Phase 4] ──► [Phase 5] ──► [Phase 6]
  Foundations   Dashboard     Uploads       PDF View      AI Engine     Interview Ready
  (Days 1-5)    (Days 6-10)   (Days 11-15)  (Days 16-20)  (Days 21-25)  (Days 26-30)
```

---

## 🏗️ PHASE 1: Next.js Foundations & Landing Page (Days 1–5)
*Goal: Understand the basic React & Next.js structure, file routing, global styling, and building your first static landing page.*

### **Day 1: Framework Architecture & Project Structure**
*   **Core Objective:** Master the files in your project. Understand what `package.json`, `tsconfig.json`, and Next.js App Router structure actually do.
*   **What to Study:** Look at `src/app/layout.tsx` (the universal wrapper) and understand the difference between standard React and Next.js.
*   **Placement Keyword:** Server-Side Pre-rendering (SSR) vs. Client-Side Hydration.

### **Day 2: Styling & UI Tokens (Tailwind CSS v4)**
*   **Core Objective:** Understand how visual aesthetics are built. Review utility classes and responsive layouts.
*   **What to Study:** Look at `src/app/globals.css` and the theme variables setup. Learn why utilities speed up page loads.
*   **Placement Keyword:** Zero-runtime CSS vs. CSS-in-JS performance bottlenecks.

### **Day 3: State & React Hooks (`useState` & `useRef`)**
*   **Core Objective:** Master component memory. Learn how state triggers re-renders and how references point directly to physical DOM items.
*   **What to Study:** Review the Upload Modal state and file input references in `src/app/page.tsx` (lines 19-35).
*   **Placement Keyword:** React Component Lifecycle & Reconciliation Triggers.

### **Day 4: Routing & Navigation (`useRouter` & Link)**
*   **Core Objective:** Understand single-page application dynamic routing. Learn how pages load instantly without browser refreshes.
*   **What to Study:** Study `router.push()` redirects on file selection inside the landing page component.
*   **Placement Keyword:** Single Page Application (SPA) Routing & Prefetching.

### **Day 5: Adding the Hero Video & Custom Hydration Fix**
*   **Core Objective:** Master browser media components. Understand why React throws **Error #418 (Hydration Mismatch)** and how to write a mounting guard.
*   **What to Study:** Study the `isMounted` state wrapper around the `<video>` element on the landing page hero section.
*   **Placement Keyword:** React Hydration Mismatch & Client-side Mounting Guards.

---

## 📂 PHASE 2: Storage Dashboard & Folder Architecture (Days 6–10)
*Goal: Build the dynamic file dashboard, understand folder/file state schemas, and create mock relational storage.*

### **Day 6: Dashboard Mock Data & Grid Layouts**
*   **Core Objective:** Master rendering dynamic data arrays inside JSX templates. 
*   **What to Study:** Look at `src/app/storage/page.tsx` grid layout classes and Lucide icon mappings.
*   **Placement Keyword:** Component mapping keys (`key` prop reconciliation algorithm).

### **Day 7: State Management for Folders & Documents**
*   **Core Objective:** Understand React state updates. Learn how to perform folder creation, renames, and moves safely in React memory.
*   **What to Study:** Review folder filter states in the Storage Dashboard.
*   **Placement Keyword:** Immutability in React State Updates (why we use spread operators `[...folders]`).

### **Day 8: Local Storage & IndexedDB Fallback**
*   **Core Objective:** Master client-side storage options. Learn how browser-based files and JSON nodes are saved locally.
*   **What to Study:** Read the helper file `src/utils/indexedDB.ts` and understand its initialization.
*   **Placement Keyword:** Client-side offline persistence, Web Storage APIs, & quota limits.

### **Day 9: Integrating API Handshakes on Mount (`useEffect`)**
*   **Core Objective:** Master asynchronous data fetching. Learn how the dashboard syncs with the database when a user opens the page.
*   **What to Study:** Study the fetch functions triggered inside the primary `useEffect` hook in `src/app/storage/page.tsx`.
*   **Placement Keyword:** Async/Await API Fetch pipelines & Dependency Arrays.

### **Day 10: Building Folder Navigation Logic**
*   **Core Objective:** Understand path breadcrumbs and folder nesting logic.
*   **What to Study:** Study how files are filtered in the dashboard UI using `document.folderId === activeFolderId`.
*   **Placement Keyword:** Declarative UI filtering vs. Imperative DOM updates.

---

## 📤 PHASE 3: The Core Upload & Streaming Pipeline (Days 11–15)
*Goal: Understand the full journey of a document from a client's computer drag-and-drop to a secure binary server folder.*

### **Day 11: Binary Form Data Encodings**
*   **Core Objective:** Master file uploads. Learn how browsers bundle files into boundary-separated payloads.
*   **What to Study:** Review the upload payload headers in the network tab when uploading a PDF file.
*   **Placement Keyword:** Binary multipart data encoding vs. Base64 strings.

### **Day 12: Next.js API Routes & Request Parsing**
*   **Core Objective:** Build backend route controllers. Learn how the server reads file streams natively using `req.formData()`.
*   **What to Study:** Read `/src/app/api/upload/route.ts` (lines 12-23).
*   **Placement Keyword:** Serverless API Handlers & HTTP Request-Response lifecycle.

### **Day 13: File System I/O Operations in Node.js**
*   **Core Objective:** Master the server file system. Learn how to read buffers and write binary files directly to the hard drive.
*   **What to Study:** Read `/src/app/api/upload/route.ts` filesystem writes (`fs.writeFileSync`).
*   **Placement Keyword:** Synchronous vs. Asynchronous File System I/O.

### **Day 14: Document Obfuscation & Traversal Security**
*   **Core Objective:** Master web app security. Learn how to hide raw PDF files from the public folder and secure system paths.
*   **What to Study:** Study how Nexel renames PDFs to randomized timestamp IDs and checks path roots in the document API.
*   **Placement Keyword:** Path Traversal Vulnerability & File Upload Security Protocols.

### **Day 15: Building the Secure Document Stream API**
*   **Core Objective:** Build a secure file streaming bridge. Learn how to serve private PDFs with standard MIME headers.
*   **What to Study:** Read `/src/app/api/document/route.ts`.
*   **Placement Keyword:** Binary streaming buffers & bypassing automatic browser download managers (IDM).

---

## 🎨 PHASE 4: PDF Viewports & Selection Coordinates (Days 16–20)
*Goal: Master Mozilla’s pdf.js Web Workers, capture cursor highlights, and map page coordinates.*

### **Day 16: Understanding Mozilla’s `pdf.js` & Web Workers**
*   **Core Objective:** Master client-side PDF rendering. Learn why lazy-loading is crucial for heavy third-party rendering modules.
*   **What to Study:** Look at `src/app/workspace/PdfViewer.tsx` Web Worker registration and `next/dynamic` lazy loading.
*   **Placement Keyword:** Multi-threaded Web Workers & JavaScript single-thread bottlenecks.

### **Day 17: Text Layer Generation & DOM Selection**
*   **Core Objective:** Understand how mouse selection works over vector canvas elements.
*   **What to Study:** Study `window.getSelection()` and how transparent HTML text layers map directly onto PDF pages.
*   **Placement Keyword:** The DOM Range API & absolute page selections.

### **Day 18: Bounding Rectangles & Coordinate Serialization**
*   **Core Objective:** Master digital coordinate mapping. Learn how to measure highlight selections relative to browser viewports.
*   **What to Study:** Study coordinate serialization to JSON objects before saving highlights.
*   **Placement Keyword:** Scaling coordinates across responsive browser viewports.

### **Day 19: Highlight Persistence & Rendering Overlays**
*   **Core Objective:** Draw highlights dynamically. Learn how coordinate arrays are read and rendered as custom-colored `div` overlays.
*   **What to Study:** Review how highlight overlays are redrawn inside the PDF viewer when a workspace loads.
*   **Placement Keyword:** Optimistic UI Updates vs. Confirmed Database States.

### **Day 20: iOS/Safari Text Clipping Fix**
*   **Core Objective:** Master browser compatibility. Learn why gradient text disappears in Safari and how GPU hardware acceleration fixes it.
*   **What to Study:** Review the vendor utility classes `-webkit-text-fill-color` and `translate3d(0,0,0)` on the landing page hero span.
*   **Placement Keyword:** WebKit Compositor Layers & GPU Hardware Acceleration.

---

## 🤖 PHASE 5: The AI Integration & Response Streaming (Days 21–25)
*Goal: Master Bedrock prompt engineering, context injection, and real-time chunk-by-chunk HTTP streaming.*

### **Day 21: AWS Bedrock & API Routing**
*   **Core Objective:** Learn secure AI endpoints integration. Protect model keys by proxying requests through backend routes.
*   **What to Study:** Review the HTTP POST handshake configurations to Bedrock runtime endpoints in `/src/app/api/ai/generate/route.ts`.
*   **Placement Keyword:** Secure API Proxy Pattern (protecting credentials).

### **Day 22: Advanced Prompt Engineering & Context Anchoring**
*   **Core Objective:** Master system instructions. Learn how to pass granular highlights and limit hallucinations.
*   **What to Study:** Look at role-prompting (University TA) and output restriction instructions inside the AI API generator.
*   **Placement Keyword:** Mitigating LLM Hallucinations through Context Windows.

### **Day 23: Server-Side ReadableStreams**
*   **Core Objective:** Build high-performance backend chunk streams to reduce perceived latency.
*   **What to Study:** Read the `ReadableStream` constructor inside `/src/app/api/ai/generate/route.ts`.
*   **Placement Keyword:** HTTP Transfer-Encoding: Chunked & Time-to-First-Token (TTFT) optimization.

### **Day 24: Client-Side Stream Consuming**
*   **Core Objective:** Master reading streams in the browser. Learn how to update React state smoothly character-by-character.
*   **What to Study:** Study the TextDecoder stream reading loop inside the Chat panel of `src/app/workspace/[id]/page.tsx`.
*   **Placement Keyword:** Asynchronous Generator Loops & Streaming State Intervals.

### **Day 25: Custom Action Parsing (Flashcards & Notes)**
*   **Core Objective:** Parse raw AI strings into structured UI cards (like interactive double-sided flashcard decks).
*   **What to Study:** Review how card splits (`Q:`, `A:`) are matched and mapped into interactive cards.
*   **Placement Keyword:** Deterministic parsing of non-deterministic LLM outputs.

---

## 🚀 PHASE 6: Databases, Deployment, & Placement Preparation (Days 26–30)
*Goal: Learn Prisma migrations, SQLite schemas, Vercel DevOps, and nail your final interview walkthroughs.*

### **Day 26: Relational Schemas & Prisma Migrations**
*   **Core Objective:** Master relational database design. Understand tables mapping and schema changes.
*   **What to Study:** Read `prisma/schema.prisma`. Understand the relationship mappings between Folders, Documents, and Highlights.
*   **Placement Keyword:** Referential Integrity, Cascading Deletes, & SQL vs. NoSQL schemas.

### **Day 27: Database Indexing & Read Optimizations**
*   **Core Objective:** Optimize query performance. Learn why indexing relational foreign keys (like `docId`) is crucial.
*   **What to Study:** Learn about relational SQL indexes and query plans.
*   **Placement Keyword:** Query Execution Plans & DB performance scaling.

### **Day 28: DevOps & Serverless Deployments (Vercel)**
*   **Core Objective:** Master production deployment. Understand build scripts, production environment variables, and CDN assets delivery.
*   **What to Study:** Learn about production compile pipelines like `prisma generate && next build`.
*   **Placement Keyword:** Continuous Integration & Continuous Deployment (CI/CD) pipelines.

### **Day 29: Mastering the Systems Walkthrough Script**
*   **Core Objective:** Build professional speaking and presentation skills. Explain your architectural components like a senior engineer.
*   **What to Study:** Memorize the "Developer Narration Scripts" inside `NEXEL_TECHNICAL_DOCUMENTATION.md` (Section 5).
*   **Placement Keyword:** Technical Communication & Architectural Layering.

### **Day 30: Placement Mock Interview Drill**
*   **Core Objective:** Master handling tough follow-up interviewer questions. Build confidence for placement rounds.
*   **What to Study:** Review high-yield Q&A cards and practice verbalizing your explanations out loud.
*   **Placement Keyword:** Placement Readiness & Technical Authority.

---

## 📌 How to Use this Plan
1. This file is saved directly in the root of your project as **`NEXEL_30_DAY_STUDY_PLAN.md`**.
2. Start by declaring: **"Let's start Day 1!"** in your chat.
3. We will deep-dive into the concepts of that day, look at the exact code together, and run small interactive quizzes to make sure you are 100% prepared!
