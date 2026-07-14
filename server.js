require('dotenv').config({ path: '.env.local' });
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:10000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize Supabase Admin client for JWT verification
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Store user socket mappings: userId -> socketId
const userSocketMap = new Map();
// Store socket to user mappings: socketId -> userId
const socketUserMap = new Map();
// Store user rooms: userId -> Set of matchIds
const userRooms = new Map();

// Socket events are delivery hints only; the database remains the message source
// of truth. Validate the active matrimony match before every client-directed emit.
async function getActiveMatchForUser(matchId, userId) {
  if (typeof matchId !== 'string' || !matchId || !userId) {
    return null;
  }

  const { data: match, error } = await supabaseAdmin
    .from('matrimony_matches')
    .select('id,user1_id,user2_id')
    .eq('id', matchId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !match) {
    return null;
  }

  if (match.user1_id === userId) {
    return { id: match.id, otherUserId: match.user2_id };
  }

  if (match.user2_id === userId) {
    return { id: match.id, otherUserId: match.user1_id };
  }

  return null;
}

async function getPersistedMessage(matchId, senderId, receiverId, messageId) {
  if (typeof messageId !== 'string' || !messageId) {
    return null;
  }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .eq('match_id', matchId)
    .eq('match_type', 'matrimony')
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .maybeSingle();

  return error ? null : message;
}

// Middleware to authenticate socket connections
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return next(new Error('Invalid authentication token'));
    }

    // Attach user info to socket
    socket.userId = user.id;
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

// Socket connection handler
io.on('connection', (socket) => {
  const userId = socket.userId;
  console.log(`User connected: ${userId} (socket: ${socket.id})`);

  // Store socket mapping
  userSocketMap.set(userId, socket.id);
  socketUserMap.set(socket.id, userId);
  userRooms.set(userId, new Set());

  // Handle joining a conversation room
  socket.on('join_conversation', async (data = {}) => {
    try {
      const matchId = data.matchId;
      
      if (!matchId) {
        socket.emit('error', { message: 'matchId is required' });
        return;
      }

      const match = await getActiveMatchForUser(matchId, userId);
      if (!match) {
        socket.emit('error', { message: 'You are not allowed to access this conversation' });
        return;
      }

      // Join the room
      socket.join(`conversation:${match.id}`);
      
      // Track the room for this user
      const rooms = userRooms.get(userId) || new Set();
      rooms.add(match.id);
      userRooms.set(userId, rooms);

      console.log(`User ${userId} joined conversation: ${match.id}`);
      socket.emit('joined_conversation', { matchId: match.id });
    } catch (error) {
      console.error('Error joining conversation:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  });

  // Handle leaving a conversation room
  socket.on('leave_conversation', (data) => {
    try {
      const { matchId } = data;
      
      if (!matchId) {
        return;
      }

      // Leave the room
      socket.leave(`conversation:${matchId}`);
      
      // Remove from tracking
      const rooms = userRooms.get(userId);
      if (rooms) {
        rooms.delete(matchId);
      }

      console.log(`User ${userId} left conversation: ${matchId}`);
      socket.emit('left_conversation', { matchId });
    } catch (error) {
      console.error('Error leaving conversation:', error);
    }
  });

  // Handle sending a message
  socket.on('send_message', async (data = {}) => {
    try {
      const { matchId, receiverId, message } = data;
      const messageId = message?.id;

      if (!matchId || !receiverId || !messageId) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      const match = await getActiveMatchForUser(matchId, userId);
      if (!match || match.otherUserId !== receiverId) {
        socket.emit('error', { message: 'You are not allowed to message this member' });
        return;
      }

      const persistedMessage = await getPersistedMessage(
        match.id,
        userId,
        match.otherUserId,
        messageId,
      );
      if (!persistedMessage) {
        socket.emit('error', { message: 'Message could not be verified' });
        return;
      }

      // Get receiver's socket ID
      const receiverSocketId = userSocketMap.get(match.otherUserId);

      if (receiverSocketId) {
        // Emit to the receiver with the full message object
        io.to(receiverSocketId).emit('receive_message', {
          matchId: match.id,
          senderId: userId,
          message: persistedMessage,
          timestamp: new Date().toISOString(),
        });
        console.log(`Message sent from ${userId} to ${match.otherUserId} in match ${match.id}`);
      } else {
        console.log(`Receiver ${match.otherUserId} is not connected`);
      }

      // Confirm to sender
      socket.emit('message_sent', {
        matchId: match.id,
        receiverId: match.otherUserId,
        success: true,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('typing', async (data = {}) => {
    try {
      const { matchId, receiverId, isTyping } = data;

      if (!matchId || !receiverId) {
        return;
      }

      const match = await getActiveMatchForUser(matchId, userId);
      if (!match || match.otherUserId !== receiverId) {
        return;
      }

      // Get receiver's socket ID
      const receiverSocketId = userSocketMap.get(match.otherUserId);

      if (receiverSocketId) {
        // Emit to the receiver
        io.to(receiverSocketId).emit('typing', {
          matchId: match.id,
          userId,
          isTyping: isTyping === true,
        });
      }
    } catch (error) {
      console.error('Error handling typing event:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId} (socket: ${socket.id})`);
    
    // Clean up mappings
    userSocketMap.delete(userId);
    socketUserMap.delete(socket.id);
    userRooms.delete(userId);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || process.env.SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});

