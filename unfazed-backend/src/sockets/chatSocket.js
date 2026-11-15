
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Therapist = require("../models/Therapist");
const Client = require("../models/Client");
const Message = require("../models/Message");
const Notification = require("../models/Notification");

const { canAccess } = require("../services/entitlementService");

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

        if (!client || !client.therapist) {
          return next(
            new Error("Client account not found or inactive.")
          );
        }

        socket.userType = "client";
        socket.clientId = client._id.toString();
        socket.therapistId = client.therapist.toString();
      } else {
        // Existing therapist tokens may not contain a role field.
        const therapist = await Therapist.findById(decoded.id);

        if (!therapist) {
          return next(new Error("Therapist account not found."));
        }

        socket.userType = "therapist";
        socket.therapistId = therapist._id.toString();
      }

      // ==========================================
      // CHECK CHAT SUBSCRIPTION ACCESS
      // ==========================================

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

    socket.on("join-room", async (clientId, callback) => {
      try {
        if (
          typeof clientId !== "string" ||
          !mongoose.isValidObjectId(clientId)
        ) {
          return callback?.({
            success: false,
            message: "Invalid client ID.",
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

        // Recheck subscription access.
        const chatAccess = await canAccess(
          socket.therapistId,
          "chat"
        );

        if (!chatAccess) {
          return callback?.({
            success: false,
            code: "FEATURE_UPGRADE_REQUIRED",
            feature: "chat",
            message: "Chat requires a Growth or Professional subscription.",
          });
        }

        const client = await Client.findOne({
          _id: clientId,
          therapist: socket.therapistId,
        });

        if (!client) {
          return callback?.({
            success: false,
            message: "Client not found or access denied.",
          });
        }

        const roomId = `client:${clientId}`;

        socket.join(roomId);

        const messages = await Message.find({
          therapist: socket.therapistId,
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

        const messageText = data.message.trim();

        if (messageText.length > 5000) {
          return callback?.({
            success: false,
            message: "Message cannot exceed 5000 characters.",
          });
        }

        if (!mongoose.isValidObjectId(data.clientId)) {
          return callback?.({
            success: false,
            message: "Invalid client ID.",
          });
        }

        if (
          socket.userType === "client" &&
          socket.clientId !== data.clientId
        ) {
          return callback?.({
            success: false,
            message: "Access denied.",
          });
        }

        // Recheck subscription access before sending.
        const chatAccess = await canAccess(
          socket.therapistId,
          "chat"
        );

        if (!chatAccess) {
          return callback?.({
            success: false,
            code: "FEATURE_UPGRADE_REQUIRED",
            feature: "chat",
            message: "Chat requires a Growth or Professional subscription.",
          });
        }

        const client = await Client.findOne({
          _id: data.clientId,
          therapist: socket.therapistId,
        });

        if (!client) {
          return callback?.({
            success: false,
            message: "Client not found or access denied.",
          });
        }

        const roomId = `client:${data.clientId}`;

        if (!socket.rooms.has(roomId)) {
          return callback?.({
            success: false,
            message: "Join the chat room first.",
          });
        }

        const isClient = socket.userType === "client";

        // SAVE MESSAGE
        const savedMessage = await Message.create({
          therapist: socket.therapistId,
          client: data.clientId,
          roomId,
          senderId: isClient
            ? socket.clientId
            : socket.therapistId,
          senderType: isClient ? "client" : "therapist",
          message: messageText,
        });

        // DELIVER MESSAGE TO CHAT ROOM
        io.to(roomId).emit("receive-message", savedMessage);

        // CREATE RECIPIENT NOTIFICATION
        try {
          const recipientType = isClient ? "therapist" : "client";

          const notification = await Notification.create({
            therapist: socket.therapistId,
            client: data.clientId,
            recipientType,
            type: "new_message",
            title: isClient
              ? "New message from client"
              : "New message from your therapist",
            message: messageText,
            relatedId: savedMessage._id,
          });

          const notificationRoom = isClient
            ? `therapist-notifications:${socket.therapistId}`
            : `client-notifications:${data.clientId}`;

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
          message: savedMessage,
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
