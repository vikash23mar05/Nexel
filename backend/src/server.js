// src/server.js
const http = require('http');
const app = require('./app');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Track readers per document
const documentReaders = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-document', ({ documentId, user }) => {
    socket.join(documentId);
    socket.documentId = documentId;
    socket.user = user;

    if (!documentReaders.has(documentId)) {
      documentReaders.set(documentId, new Map());
    }
    documentReaders.get(documentId).set(socket.id, user);

    // Broadcast updated readers to everyone in this document
    io.to(documentId).emit('active-readers', Array.from(documentReaders.get(documentId).values()));
  });

  socket.on('new-highlight', ({ documentId, highlight, user }) => {
    console.log(`[SOCKET] Received new-highlight for document: ${documentId} from user: ${user?.name}`);
    // Broadcast the new highlight to everyone in the document room (including sender, frontend deduplicates)
    io.in(documentId).emit('receive-highlight', { highlight, user });
  });

  socket.on('delete-highlight', ({ documentId, highlightId }) => {
    console.log(`[SOCKET] Received delete-highlight: ${highlightId} for doc: ${documentId}`);
    // Broadcast the deleted highlight ID to everyone else in the document room
    socket.to(documentId).emit('remove-highlight', { highlightId });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
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
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = server;
