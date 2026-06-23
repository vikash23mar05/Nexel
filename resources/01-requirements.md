# Nexel Backend Requirements Specification

This document lists the business objectives, user features, and system requirements for the rebuilt Nexel backend API.

---

## 1. Project Overview
Nexel is an AI-powered learning workspace. The Next.js frontend is fully operational. We are rebuilding the backend from scratch as a modular, placement-ready Express server backed by MongoDB.

---

## 2. Core Functional Requirements

### 2.1 User Authentication
* **Registration**: Users must be able to sign up with a unique email and password.
* **Authentication**: Users must be able to log in securely, yielding a JSON Web Token (JWT).
* **Route Protection**: Private resources (folders, documents, highlights, and AI features) must only be accessible to authenticated users carrying a valid JWT.
* **Security**: Passwords must be hashed using a strong cryptographic algorithm (bcrypt) before persistence.

### 2.2 Folder Management
* **Creation**: Authenticated users can create folders with a name and a visual color tag (e.g. red, blue, green).
* **Retrieval**: Users can list all folders they own.
* **Modification**: Users can rename folders or change their color properties.
* **Deletion**: Users can delete folders. Deleting a folder should handle nested documents gracefully (either cascading deletion or moving them to root).

### 2.3 Document Management
* **Listing**: Users can list all documents in a folder or at the workspace root.
* **Metadata modification**: Users can rename documents or move them into folders.
* **Deletion**: Users can delete documents. Deleting a document must cascade delete all associated text highlights.

### 2.4 PDF Upload
* **Ingestion**: The backend must parse multipart/form-data requests containing PDF files (up to 10MB).
* **Storage**: Uploaded PDFs must be stored locally on disk under an obfuscated, unique filename to protect privacy and prevent directory traversal.
* **Streaming**: The backend must serve binary PDF streams to authenticated clients so the browser can render them using `pdf.js` securely.

### 2.5 Highlight Management
* **Creation**: Users can highlight text selections inside the PDF viewer. The coordinates, page number, color, and raw text content must be stored in the database.
* **Listing**: Fetch all highlights associated with a specific document ID.
* **Deletion**: Allow users to delete specific highlights.

### 2.6 AI Actions
* **Explanation**: Translate complex selected text chunks into simplified pedagogical concepts.
* **Summarization**: Synthesize highlighted text sections into formatted markdown bullet points.
* **Notes Generation**: Convert highlighted selections into structured revision notes.
* **Streaming**: Stream AI responses token-by-token back to the user to maintain low perceived latency.

### 2.7 AI Study Roadmap Generator
* **GenAI Orchestration**: Read learning materials/PDF text and generate a structured study program containing:
  * A weekly or step-by-step study plan.
  * A list of core high-yield topics.
  * A revision checklist.
  * Interactive interview questions.

---

## 3. Non-Functional Requirements

### 3.1 Security
* Store no plain-text passwords.
* Validate all incoming request schemas (body, query, params) to prevent injection, overflow, or malformed data issues.
* Prevent directory traversal attacks when locating private PDF files.

### 3.2 Performance
* Time-to-First-Token (TTFT) for AI features should feel instantaneous via HTTP streaming techniques.
* Read queries for document highlights must be indexed to prevent table scans as database rows scale.

### 3.3 Scalability
* Keep the API server stateless (utilize JWTs instead of local memory sessions) to enable simple horizontal scaling.
