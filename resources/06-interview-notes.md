# Placement Interview Notes: Core Web Engineering

This document acts as a preparation sheet for technical rounds, software engineering interviews, and academic project defenses.

---

## 1. Authentication & Security Concepts

### Q1: Why do we hash passwords instead of storing them as plain text or using symmetric encryption?
* **Problem**: Storing passwords in plain text is a massive security hazard. If the database is compromised, all user accounts are immediately exposed.
* **Why Hashing**: Hashing is a **one-way cryptographic function**. Once hashed, the original string cannot be reverse-engineered back to plain text. The only way to verify a password is to hash the incoming attempt and compare the resulting hash to the stored hash.
* **Symmetric Encryption Alternative**: Symmetric encryption uses a key to encrypt and decrypt data. This is unsafe for passwords because if a hacker obtains the database and the encryption key (which must live on the server), they can decrypt every password. Hashing has no key that can decrypt the password.

---

### Q2: What is a Salt in cryptography, and why is it necessary? What does it protect against?
* **Problem**: If two users have the same password (e.g. `password123`), their hashed passwords will be identical if using a simple hashing algorithm. Attackers use precomputed hash tables (called **Rainbow Tables**) to match common hashes to plain-text passwords instantly.
* **What is a Salt**: A salt is a cryptographically strong, random string appended to the password *before* hashing. 
* **Protection**: The salt ensures that even if two users share the same password, their final stored hashes will be completely different. It renders Rainbow Tables useless, forcing attackers to perform slow, dictionary-style attacks on every single hash individually.

---

### Q3: Stateful Session Cookies vs. Stateless JWTs: What are the trade-offs, and why did we choose JWT for Nexel?
* **Stateful Sessions**:
  * *How it works*: Server generates a unique session ID, stores it in a database/RAM (e.g., Redis), and sets it on the client as a Cookie. On every request, the server queries the database/Redis to verify if the session ID is valid and retrieve user information.
  * *Pro*: Easy to revoke sessions (just delete the record from the DB/Redis).
  * *Con*: Hard to scale. As traffic grows, lookups load the database. In a multi-server setup, servers must share session data (requiring a centralized Redis cluster).
* **Stateless JWTs**:
  * *How it works*: The server signs user details (e.g., `userId`) into a token payload using a secret key and sends it to the client. The client attaches this token to the `Authorization` header of each request. The server verifies the token mathematically without querying any database.
  * *Pro*: High performance, infinitely scalable, zero database lookups per authenticated request.
  * *Con*: Hard to invalidate before expiration. If a token is stolen, the attacker has access until the expiration time.
* **Why JWT for Nexel**: Nexel is designed with simplicity and high scalability in mind. Choosing JWT removes the dependency on an active Redis session store, reducing backend resource consumption and hosting costs.

---

### Q4: Why is it unsafe to store JWTs in localStorage? What is the alternative, and how does it prevent attacks?
* **The Danger of localStorage (XSS)**: Data stored in `localStorage` is accessible by any JavaScript running on the page. If the application has a Cross-Site Scripting (XSS) vulnerability (e.g., a malicious third-party script gets injected through npm dependencies or user comments), the script can steal the JWT and send it to an attacker.
* **The Alternative (httpOnly Cookies)**: Setting the JWT inside an HTTP cookie with the `httpOnly` flag ensures that client-side JavaScript cannot read or write to it. The browser automatically appends this cookie to all requests to the matching domain, protecting the token from XSS theft.
* **The Cookie Trade-off (CSRF)**: Using cookies introduces a vulnerability called Cross-Site Request Forgery (CSRF), where a malicious site can make requests to your API using the browser's automatic cookie inclusion. This is mitigated by setting `SameSite=Strict` or `SameSite=Lax` cookie flags.

---

### Q5: How does bcrypt defend against Brute Force and GPU cracking? (Work factor / speed limitations)
* **Problem**: Modern CPUs and GPUs can calculate millions of hashes (like MD5 or SHA-256) per second. An attacker trying to brute-force a password hash can guess millions of options rapidly.
* **The bcrypt Defense**: bcrypt uses a **Work Factor (or Cost Factor)** parameter. This parameter determines the number of hashing rounds (exponentially, i.e., $2^{\text{cost}}$ rounds). This intentionally slows down the hashing process (e.g., making it take 100-300ms on server hardware). While 300ms is imperceptible to a single user logging in, it makes brute-forcing millions of attempts completely infeasible for hackers, even with dedicated GPU arrays.
* bcrypt is also a **Key Derivation Function** designed to be memory-hard, making it extremely difficult to accelerate with parallel hardware like GPUs.

---

## 2. Common Implementation Mistakes in Auth

1. **Weak JWT Secret Keys**: Using a simple string like `"my-secret"` as the token signature key. Attackers can brute-force the secret key offline in seconds using tools like `hashcat` and forge administrative JWT tokens.
2. **Missing Token Expiry**: Signing JWTs without an expiration time (`exp` claim). If stolen, the token provides permanent access to the user's account.
3. **No Input Sanitization**: Accepting raw user inputs directly into Mongoose filters (e.g., `{ email: req.body.email }`). If the client sends an object instead of a string, this can lead to NoSQL Injection (e.g. `{ "$ne": null }`), bypassing authentication checks entirely.
