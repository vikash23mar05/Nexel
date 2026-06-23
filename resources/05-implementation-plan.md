# Nexel Backend Rebuild: Implementation Plan & Feature Roadmap

This document outlines the step-by-step build roadmap, keeping track of complete and pending milestones.

---

## 1. Feature Order Checklist

- [ ] **Feature 1: User Authentication**
  - Status: *In Planning & Tutoring*
  - Tasks: Setup express server, configure Mongoose User schema, implement `/api/auth/signup` & `/api/auth/login`, write JWT Verification Middleware, and write tests.
- [ ] **Feature 2: Folder Management**
  - Status: *Pending*
  - Tasks: Create Folder model, design routes for CRUD operations, associate folder with User.
- [ ] **Feature 3: Document Management**
  - Status: *Pending*
  - Tasks: Create Document model, design routes for renaming, listing, moving, and cascading deletes.
- [ ] **Feature 4: PDF Upload**
  - Status: *Pending*
  - Tasks: Set up Multer file parser, stream binaries to disk, protect streaming file downloads via authorization validation.
- [ ] **Feature 5: Highlight Management**
  - Status: *Pending*
  - Tasks: Design Highlight schema, build routes to save, fetch, and delete user highlight coordinates.
- [ ] **Feature 6: AI Actions**
  - Status: *Pending*
  - Tasks: Set up AWS Bedrock integration, build streaming routes for Explain, Summarize, and Notes Generation.
- [ ] **Feature 7: AI Study Roadmap Generator**
  - Status: *Pending*
  - Tasks: Process document texts to create dynamic, structured multi-week study roadmaps with checklists, topics, and interview prep questions.

---

## 2. Feature 1: Authentication Breakdown
We follow a strict 9-Step process:
1. **Explain the Feature** (Done)
2. **Explain the Architecture** (Done)
3. **Explain Database changes** (Done)
4. **Explain API design** (Done)
5. **Explain Interview Prep questions** (Done)
6. **Generate the Code** (*Awaiting Approval*)
7. **Explain the Code Line-by-Line** (*Awaiting Approval*)
8. **Test the Feature** (*Awaiting Approval*)
9. **Mock Interview Evaluation** (*Awaiting Approval*)
