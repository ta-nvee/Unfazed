
const crypto = require("crypto");
const mongoose = require("mongoose");

const razorpay = require("../config/razorpay");
const Payment = require("../models/Payment");
const Session = require("../models/Session");

const {
  generateAndStoreInvoice,
} = require("../services/invoiceService");

const { canAccess } = require("../services/entitlementService");

// ==========================================
// INVOICE NUMBER GENERATOR
// ==========================================

const createInvoiceNumber = (payment) => {
  const date = new Date(payment.paidAt || Date.now());

  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const paymentPart = payment._id
    .toString()
    .slice(-8)
    .toUpperCase();

  return `UNF-${datePart}-${paymentPart}`;
};

// ==========================================
// CREATE PUBLIC BOOKING PAYMENT ORDER
// ==========================================

const createPublicPaymentOrder = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (
      !sessionId ||
      !mongoose.Types.ObjectId.isValid(sessionId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid session ID is required.",
      });
    }

    if (!razorpay || !process.env.RAZORPAY_KEY_ID) {
      return res.status(503).json({
        success: false,
        message: "Payment gateway is not configured.",
      });
    }

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Booking session not found.",
      });
    }

    // ==========================================
    // CHECK THERAPIST SUBSCRIPTION ACCESS
    // ==========================================

    const paymentAccess = await canAccess(
      session.therapist,
      "onlinePayments"
    );

    if (!paymentAccess) {
      return res.status(403).json({
        success: false,
        code: "FEATURE_UPGRADE_REQUIRED",
        feature: "onlinePayments",
        message:
          "Online payments are not available on this therapist's subscription plan.",
      });
    }

    if (session.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: "This session is not available for payment.",
      });
    }

    // Always use the server-side session fee.
    const amount = Number(session.fee);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid session fee.",
      });
    }

    const amountInPaise = Math.round(amount * 100);

    if (
      !Number.isSafeInteger(amountInPaise) ||
      amountInPaise <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid session payment amount.",
      });
    }

    // Check whether this session has already been paid.
    const existingPaidPayment = await Payment.findOne({
      session: session._id,
      therapist: session.therapist,
      client: session.client,
      paymentType: "session",
      status: "paid",
    });

    if (existingPaidPayment) {
      return res.status(409).json({
        success: false,
        message: "This booking has already been paid for.",
      });
    }

    // Reuse an existing pending order instead of creating duplicates.
    const existingPendingPayment = await Payment.findOne({
      session: session._id,
      therapist: session.therapist,
      client: session.client,
      paymentType: "session",
      status: "pending",
    }).sort({ createdAt: -1 });

    if (existingPendingPayment) {
      if (
        Math.round(existingPendingPayment.amount * 100) !==
        amountInPaise
      ) {
        return res.status(409).json({
          success: false,
          message:
            "An existing payment order has a different amount. Please contact the therapist.",
        });
      }

      const existingOrder = await razorpay.orders.fetch(
        existingPendingPayment.razorpayOrderId
      );

      if (existingOrder.status === "created") {
        return res.status(200).json({
          success: true,
          message: "Existing payment order retrieved successfully.",
          order: existingOrder,
          payment: {
            id: existingPendingPayment._id,
            amount: existingPendingPayment.amount,
            currency: existingPendingPayment.currency,
            status: existingPendingPayment.status,
          },
          keyId: process.env.RAZORPAY_KEY_ID,
        });
      }

      if (existingOrder.status === "paid") {
        return res.status(409).json({
          success: false,
          message:
            "Payment is being processed. Please verify your payment before retrying.",
        });
      }
    }

    // Create a new Razorpay order.
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `booking_${session._id}_${Date.now()}`,
      notes: {
        sessionId: session._id.toString(),
      },
    });

    const payment = await Payment.create({
      therapist: session.therapist,
      client: session.client,
      session: session._id,
      paymentType: "session",
      amount,
      currency: "INR",
      status: "pending",
      provider: "razorpay",
      razorpayOrderId: order.id,
    });

    return res.status(201).json({
      success: true,
      message: "Payment order created successfully.",
      order,
      payment: {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VERIFY PUBLIC BOOKING PAYMENT
// ==========================================

const verifyPublicPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are required.",
      });
    }

    if (!razorpay || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: "Payment verification is not configured.",
      });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      paymentType: "session",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found.",
      });
    }

    // Verify the session relationship.
    if (!payment.session) {
      return res.status(400).json({
        success: false,
        message: "This payment is not linked to a booking session.",
      });
    }

    const session = await Session.findById(payment.session);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Associated booking session not found.",
      });
    }

    if (
      session.therapist.toString() !== payment.therapist.toString() ||
      session.client.toString() !== payment.client.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment and booking details do not match.",
      });
    }

    // Validate signature format.
    if (!/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature format.",
      });
    }

    // Verify Razorpay signature.
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const signatureBuffer = Buffer.from(
      razorpay_signature,
      "hex"
    );

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "hex"
    );

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(
        signatureBuffer,
        expectedBuffer
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

    // Check actual payment status with Razorpay.
    const gatewayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      gatewayPayment.order_id !== razorpay_order_id ||
      gatewayPayment.status !== "captured" ||
      gatewayPayment.captured !== true
    ) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment has not been captured.",
      });
    }

    // Verify amount and currency.
    if (
      gatewayPayment.amount !== Math.round(payment.amount * 100) ||
      gatewayPayment.currency !== payment.currency
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment amount or currency does not match.",
      });
    }

    // Idempotent verification.
    if (payment.status === "paid") {
      if (payment.razorpayPaymentId !== razorpay_payment_id) {
        return res.status(409).json({
          success: false,
          message:
            "This order was already paid using another payment ID.",
        });
      }

      const invoice = await generateAndStoreInvoice(payment._id);

      return res.status(200).json({
        success: true,
        message: "Payment was already verified.",
        payment: {
          id: payment._id,
          status: payment.status,
          amount: payment.amount,
          session: payment.session,
        },
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          alreadyGenerated: invoice.alreadyGenerated,
        },
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This payment cannot be verified.",
      });
    }

    // Do not accept a new payment for a cancelled or completed session.
    if (session.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: "This booking is no longer available for payment.",
      });
    }

    // Atomically mark payment as successful.
    // This prevents webhook and frontend verification from
    // overwriting each other's payment details.
    const paidAt = new Date();

    const updatedPayment = await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        status: "pending",
      },
      {
        $set: {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "paid",
          paidAt,
          invoiceNumber: createInvoiceNumber({
            _id: payment._id,
            paidAt,
          }),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    // Another request or webhook may have completed the payment first.
    if (!updatedPayment) {
      const latestPayment = await Payment.findById(payment._id);

      if (
        latestPayment &&
        latestPayment.status === "paid" &&
        latestPayment.razorpayPaymentId === razorpay_payment_id
      ) {
        const invoice = await generateAndStoreInvoice(
          latestPayment._id
        );

        return res.status(200).json({
          success: true,
          message: "Payment was already verified.",
          payment: {
            id: latestPayment._id,
            status: latestPayment.status,
            amount: latestPayment.amount,
            session: latestPayment.session,
          },
          invoice: {
            invoiceNumber: invoice.invoiceNumber,
            alreadyGenerated: invoice.alreadyGenerated,
          },
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "Payment was already processed or changed. Please refresh and check payment status.",
      });
    }

    // Generate and save invoice.
    const invoice = await generateAndStoreInvoice(
      updatedPayment._id
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified and invoice generated successfully.",
      payment: {
        id: updatedPayment._id,
        status: updatedPayment.status,
        amount: updatedPayment.amount,
        session: updatedPayment.session,
      },
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        alreadyGenerated: invoice.alreadyGenerated,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This payment or invoice is already registered.",
      });
    }

    next(error);
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  createPublicPaymentOrder,
  verifyPublicPayment,
};
