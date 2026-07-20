// src/server.js
const http = require('http');
const app = require('./app');
const { verifyToken } = require('./config/jwt');
const { saveHighlight, deleteHighlight } = require('./lib/highlightService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// ---------- Socket auth: verify the JWT on the handshake ----------
// The client passes it via io(url, { auth: { token } }). We reject unauthenticated
// sockets so a client can no longer join arbitrary rooms or impersonate a user.
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error('Missing auth token'));
  const payload = verifyToken(token);
  if (!payload) return next(new Error('Invalid or expired token'));
  // Trust ONLY the token for identity. Display name derives from email (User has no name field).
  socket.authUser = {
    id: payload.id,
    email: payload.email,
    name: (payload.email || '').split('@')[0] || 'User',
  };
  next();
});

// Track readers per document
const documentReaders = new Map();

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id} (${socket.authUser.email})`);

  socket.on('join-document', ({ documentId, user }) => {
    socket.join(documentId);
    socket.documentId = documentId;
    // Merge client-supplied display prefs (color) with the server-verified identity.
    // id/name come from the token, NOT the client, so users can't spoof each other.
    const roomUser = {
      id: socket.authUser.id,
      name: socket.authUser.name,
      color: user && user.color,
    };
    socket.roomUser = roomUser;

    if (!documentReaders.has(documentId)) {
      documentReaders.set(documentId, new Map());
    }
    documentReaders.get(documentId).set(socket.id, roomUser);

    // Broadcast updated readers to everyone in this document
    io.to(documentId).emit('active-readers', Array.from(documentReaders.get(documentId).values()));
  });

  socket.on('new-highlight', async ({ documentId, highlight }) => {
    // Broadcast first so concurrent readers see it immediately (snappy UX),
    // then persist to Mongo. Author identity is forced to the verified user.
    const author = socket.roomUser || socket.authUser;
    const enriched = { ...highlight, author };
    io.in(documentId).emit('receive-highlight', { highlight: enriched, user: author });

    try {
      await saveHighlight({ docId: documentId, userId: socket.authUser.id, highlight: enriched });
    } catch (err) {
      logger.error(`[SOCKET] Failed to persist highlight for doc ${documentId}: ${err.message}`);
    }
  });

  socket.on('delete-highlight', async ({ documentId, highlightId }) => {
    // Broadcast to everyone else, then remove from Mongo.
    socket.to(documentId).emit('remove-highlight', { highlightId });
    try {
      await deleteHighlight({ docId: documentId, clientId: highlightId });
    } catch (err) {
      logger.error(`[SOCKET] Failed to delete highlight ${highlightId}: ${err.message}`);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
    if (socket.documentId && documentReaders.has(socket.documentId)) {
      const readers = documentReaders.get(socket.documentId);
      readers.delete(socket.id);

      // Broadcast updated readers
      io.to(socket.documentId).emit('active-readers', Array.from(readers.values()));

      if (readers.size === 0) {
        documentReaders.delete(socket.documentId);
      }
    }
  });
});

server.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = server;
