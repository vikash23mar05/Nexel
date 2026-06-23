# Nexel Backend Rebuild Learning Journal

This journal logs our development milestones, architecture insights, and learnings during the project rebuild.

---

## Entry 1: Project Initialization & Authentication Design
*Date: June 17, 2026*

### Accomplishments
1. Assessed existing Next.js codebase. Discovered mock routes utilizing `fs.readFileSync` with `/data/db.json` representing a local database.
2. Formulated target architecture structure. Proposed creating a dedicated Express app inside a subfolder `/backend` to preserve clear separation from the Next.js client tier.
3. Created requirements, database layout, REST API schemas, and interview guides.
4. Outlined the authentication flow for Feature 1 (JWT + bcrypt).

### Conceptual Insights
* **Separation of Concerns**: Decoupling the frontend application (Next.js) from the backend service (Express) allows each to build, scale, and compile independently. If we ever want to migrate our backend to Go or Rust for speed, or shift our frontend to React Native, the REST boundary ensures it can happen with minimal code changes.
* **Stateless Authentications**: JWT verification happens entirely in-memory using public/private cryptographic signature pairs. The server is freed from maintaining session maps, improving scalability.

### Current Step
* Awaiting user verification and approval of the high-level architecture design and Feature 1 (Authentication) plan.
