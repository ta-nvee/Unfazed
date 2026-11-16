
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Therapist = require("../models/Therapist");
const Client = require("../models/Client");
const Session = require("../models/Session");
const Message = require("../models/Message");
const Notification = require("../models/Notification");

const { canAccess } = require("../services/entitlementService");

// Check whether a client has a booking with a particular therapist.
// Legacy therapist-linked clients are also supported for therapist-side chat.
async function hasChatRelationship(clientId, therapistId, userType) {
  const session = await Session.findOne({
    client: clientId,
    therapist: therapistId,
    status: { $ne: "cancelled" },
  }).select("_id");

  if (session) return true;

  if (userType === "therapist") {
    const legacyClient = await Client.findOne({
      _id: clientId,
      therapist: therapistId,
    }).select("_id");

    return Boolean(legacyClient);
  }

  return false;
}

function initializeChat(io) {
  // ==========================================
  // AUTHENTICATE CLIENT OR THERAPIST
  // ==========================================

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required."));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded.id || !mongoose.isValidObjectId(decoded.id)) {
        return next(new Error("Invalid authentication token."));
      }

      if (decoded.role === "client") {
        const client = await Client.findOne({
          _id: decoded.id,
          status: "active",
          accountCreatedAt: { $ne: null },
        });

        if (!client) {
          return next(
            new Error("Client account not found or inactive.")
          );
        }

        socket.userType = "client";
        socket.clientId = client._id.toString();

        // Do not assign a single therapist here.
        // The client selects a therapist when joining a conversation.
      } else {
        // Existing therapist tokens may not contain a role field.
        const therapist = await Therapist.findById(decoded.id);

        if (!therapist) {
          return next(new Error("Therapist account not found."));
        }

        socket.userType = "therapist";
        socket.therapistId = therapist._id.toString();

        // Therapist subscription is checked at connection.
        const chatAccess = await canAccess(
          socket.therapistId,
          "chat"
        );

        if (!chatAccess) {
          return next(
            new Error(
              "CHAT_UPGRADE_REQUIRED: Chat is not available on this subscription plan."
            )
          );
        }
      }

      next();
    } catch (error) {
      console.error("Socket authentication error:", error.message);
      next(new Error("Invalid or expired token."));
    }
  });

  // ==========================================
  // CONNECTION
  // ==========================================

  io.on("connection", (socket) => {
    console.log(`${socket.userType} connected:`, socket.id);

    // NOTIFICATION ROOM
    if (socket.userType === "client") {
      socket.join(`client-notifications:${socket.clientId}`);
    } else {
      socket.join(`therapist-notifications:${socket.therapistId}`);
    }

    // ==========================================
    // JOIN CHAT ROOM
    // ==========================================

    socket.on("join-room", async (data, callback) => {
      try {
        let clientId;
        let therapistId;

        if (socket.userType === "client") {
          // New client format:
          // { clientId, therapistId }
          if (
            !data ||
            typeof data !== "object" ||
            typeof data.clientId !== "string" ||
            typeof data.therapistId !== "string"
          ) {
            return callback?.({
              success: false,
              message: "Select a therapist to open the conversation.",
            });
          }

          clientId = data.clientId;
          therapistId = data.therapistId;

          if (socket.clientId !== clientId) {
            return callback?.({
              success: false,
              message: "Access denied.",
            });
          }
        } else {
          // Existing therapist format:
          // "clientId"
          clientId =
            typeof data === "string" ? data : data?.clientId;

          therapistId = socket.therapistId;
        }

        if (
          typeof clientId !== "string" ||
          !mongoose.isValidObjectId(clientId) ||
          typeof therapistId !== "string" ||
          !mongoose.isValidObjectId(therapistId)
        ) {
          return callback?.({
            success: false,
            message: "Invalid client or therapist ID.",
          });
        }

        // Therapists can only join their own conversations.
        if (
          socket.userType === "therapist" &&
          socket.therapistId !== therapistId
        ) {
          return callback?.({
            success: false,
            message: "Access denied.",
          });
        }

        // Verify the client account exists.
        const client = await Client.findById(clientId).select("_id");

        if (!client) {
          return callback?.({
            success: false,
            message: "Client not found.",
          });
        }

        // Verify the therapist exists.
        const therapist = await Therapist.findById(
          therapistId
        ).select("_id");

        if (!therapist) {
          return callback?.({
            success: false,
            message: "Therapist not found.",
          });
        }

        // A client must have booked this therapist.
        // Therapist-side legacy client access is preserved.
        const hasAccess = await hasChatRelationship(
          clientId,
          therapistId,
          socket.userType
        );

        if (!hasAccess) {
          return callback?.({
            success: false,
            message:
              "You can only chat with therapists you have booked.",
          });
        }

        // Check the selected therapist's subscription.
        const chatAccess = await canAccess(
          therapistId,
          "chat"
        );

        if (!chatAccess) {
          return callback?.({
            success: false,
            code: "FEATURE_UPGRADE_REQUIRED",
            feature: "chat",
            message:
              "Chat requires a Growth or Professional subscription.",
          });
        }

        // Give every client-therapist pair a separate room.
        const roomId = `client:${clientId}:therapist:${therapistId}`;

        // Leave the previous conversation room when switching chats.
        if (
          socket.activeChatRoom &&
          socket.activeChatRoom !== roomId
        ) {
          socket.leave(socket.activeChatRoom);
        }

        socket.join(roomId);
        socket.activeChatRoom = roomId;
        socket.activeChatClientId = clientId;
        socket.activeChatTherapistId = therapistId;

        const messages = await Message.find({
          therapist: therapistId,
          client: clientId,
        }).sort({ sentAt: 1 });

        callback?.({
          success: true,
          roomId,
          messages,
        });
      } catch (error) {
        console.error("Join room error:", error.message);

        callback?.({
          success: false,
          message: "Could not join chat room.",
        });
      }
    });

    // ==========================================
    // SEND MESSAGE
    // ==========================================

    socket.on("send-message", async (data, callback) => {
      try {
        if (
          !data ||
          typeof data.clientId !== "string" ||
          typeof data.message !== "string" ||
          !data.message.trim()
        ) {
          return callback?.({
            success: false,
            message: "Invalid message details.",
          });
        }

        const clientId = data.clientId;

        // Client sends the selected therapist ID.
        // Therapist always uses their own ID.
        const therapistId =
          socket.userType === "client"
            ? data.therapistId
            : socket.therapistId;

        if (
          !mongoose.isValidObjectId(clientId) ||
          typeof therapistId !== "string" ||
          !mongoose.isValidObjectId(therapistId)
        ) {
          return callback?.({
            success: false,
            message: "Invalid client or therapist ID.",
          });
        }

        const messageText = data.message.trim();

        if (messageText.length > 5000) {
          return callback?.({
            success: false,
            message: "Message cannot exceed 5000 characters.",
          });
        }

        if (
          socket.userType === "client" &&
          socket.clientId !== clientId
        ) {
          return callback?.({
            success: false,
            message: "Access denied.",
          });
        }

        if (
          socket.userType === "therapist" &&
          socket.therapistId !== therapistId
        ) {
          return callback?.({
            success: false,
            message: "Access denied.",
          });
        }

        const roomId = `client:${clientId}:therapist:${therapistId}`;

        // The socket must have joined this exact conversation.
        if (
          socket.activeChatRoom !== roomId ||
          !socket.rooms.has(roomId)
        ) {
          return callback?.({
            success: false,
            message: "Join the chat room first.",
          });
        }

        // Recheck the client-therapist relationship before sending.
        const hasAccess = await hasChatRelationship(
          clientId,
          therapistId,
          socket.userType
        );

        if (!hasAccess) {
          return callback?.({
            success: false,
            message: "Chat access denied.",
          });
        }

        // Recheck subscription access before sending.
        const chatAccess = await canAccess(
          therapistId,
          "chat"
        );

        if (!chatAccess) {
          return callback?.({
            success: false,
            code: "FEATURE_UPGRADE_REQUIRED",
            feature: "chat",
            message:
              "Chat requires a Growth or Professional subscription.",
          });
        }

        const isClient = socket.userType === "client";

        // SAVE MESSAGE
        const savedMessage = await Message.create({
          therapist: therapistId,
          client: clientId,
          roomId,
          senderId: isClient ? clientId : therapistId,
          senderType: isClient ? "client" : "therapist",
          message: messageText,
        });

        // Include IDs in the emitted object so both sides
        // can identify the correct conversation.
        const messageForRoom = {
          ...savedMessage.toObject(),
          clientId,
          therapistId,
        };

        // DELIVER MESSAGE ONLY TO THIS CLIENT-THERAPIST ROOM
        io.to(roomId).emit("receive-message", messageForRoom);

        // CREATE RECIPIENT NOTIFICATION
        try {
          const recipientType = isClient ? "therapist" : "client";

          const notification = await Notification.create({
            therapist: therapistId,
            client: clientId,
            recipientType,
            type: "new_message",
            title: isClient
              ? "New message from client"
              : "New message from your therapist",
            message: messageText,
            relatedId: savedMessage._id,
          });

          const notificationRoom = isClient
            ? `therapist-notifications:${therapistId}`
            : `client-notifications:${clientId}`;

          io.to(notificationRoom).emit(
            "new-notification",
            notification
          );
        } catch (notificationError) {
          console.error(
            "Notification creation error:",
            notificationError.message
          );
        }

        callback?.({
          success: true,
          message: messageForRoom,
        });
      } catch (error) {
        console.error("Send message error:", error.message);

        callback?.({
          success: false,
          message: "Could not send message.",
        });
      }
    });

    // ==========================================
    // DISCONNECT
    // ==========================================

    socket.on("disconnect", () => {
      console.log(`${socket.userType} disconnected:`, socket.id);
    });
  });
}

module.exports = initializeChat;
