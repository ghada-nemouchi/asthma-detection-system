const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/messages/:userId - Get all messages between logged user and another user
router.get('/:userId', protect, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    // Transform messages to ensure senderId is always the ID string
    const transformedMessages = messages.map(msg => ({
      _id: msg._id,
      senderId: msg.senderId.toString(),
      receiverId: msg.receiverId.toString(),
      message: msg.message,
      isRead: msg.isRead,
      readAt: msg.readAt,
      createdAt: msg.createdAt
    }));
    
    // Mark messages as read
    await Message.updateMany(
      { senderId: otherUserId, receiverId: currentUserId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, messages: transformedMessages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/messages - Send a new message
router.post('/', protect, async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const newMessage = new Message({
      senderId: req.user.id,
      receiverId,
      message,
      isRead: false
    });

    await newMessage.save();

    // Return message with string IDs
    const responseMessage = {
      _id: newMessage._id,
      senderId: newMessage.senderId.toString(),
      receiverId: newMessage.receiverId.toString(),
      message: newMessage.message,
      isRead: newMessage.isRead,
      createdAt: newMessage.createdAt
    };
    
    // Emit socket event for real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${receiverId}`).emit('new_message', responseMessage);
      io.to(`user-${req.user.id}`).emit('new_message', responseMessage);
    }

    res.status(201).json({ success: true, message: responseMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/messages/conversations - Get all conversations for logged user
router.get('/conversations/list', protect, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', userId] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $last: '$message' },
          lastMessageTime: { $last: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$isRead', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { lastMessageTime: -1 } }
    ]);

    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const user = await User.findById(conv._id).select('name email role');
        return {
          user,
          lastMessage: conv.lastMessage,
          lastMessageTime: conv.lastMessageTime,
          unreadCount: conv.unreadCount
        };
      })
    );

    res.json({ success: true, conversations: populatedConversations });
  } catch (error) {
    console.error('Conversations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/messages/read/:senderId - Mark all messages from sender as read
router.put('/read/:senderId', protect, async (req, res) => {
  try {
    await Message.updateMany(
      { senderId: req.params.senderId, receiverId: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;