
const Notification = require("../models/Notification");
const mongoose = require("mongoose");

// Get notifications for the logged-in therapist or client
const getNotifications = async (req, res, next) => {
  try {
    let query;

    if (req.client) {
      query = {
        client: req.client._id,
        recipientType: "client",
      };
    } else if (req.therapist) {
      query = {
        therapist: req.therapist.id,
        recipientType: "therapist",
      };
    } else {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount: notifications.filter(
        (notification) => !notification.isRead
      ).length,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

// Mark a notification as read
const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    let query;

    if (req.client) {
      query = {
        _id: id,
        client: req.client._id,
        recipientType: "client",
      };
    } else if (req.therapist) {
      query = {
        _id: id,
        therapist: req.therapist.id,
        recipientType: "therapist",
      };
    } else {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      query,
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
};
