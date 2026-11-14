
const crypto = require("crypto");
const mongoose = require("mongoose");

const razorpay = require("../config/razorpay");
const Payment = require("../models/Payment");
const Client = require("../models/Client");
const Session = require("../models/Session");

const {
  generateAndStoreInvoice,
} = require("../services/invoiceService");

const {
  activatePackageFromPayment,
} = require("../services/packageActivationService");

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
// CREATE RAZORPAY PAYMENT ORDER
// ==========================================

const createPaymentOrder = async (req, res, next) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: "Razorpay is not configured. Please add API keys.",
      });
    }

    const { client, session, amount } = req.body;

    if (!client || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Client and amount are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(client)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID.",
      });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid payment amount.",
      });
    }

    const clientExists = await Client.findOne({
      _id: client,
      therapist: req.therapist.id,
    });

    if (!clientExists) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    if (session) {
      if (!mongoose.Types.ObjectId.isValid(session)) {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID.",
        });
      }

      const sessionExists = await Session.findOne({
        _id: session,
        therapist: req.therapist.id,
        client,
      });

      if (!sessionExists) {
        return res.status(404).json({
          success: false,
          message: "Session not found.",
        });
      }

      const existingPaidPayment = await Payment.findOne({
        session,
        status: "paid",
      });

      if (existingPaidPayment) {
        return res.status(409).json({
          success: false,
          message: "This session has already been paid for.",
        });
      }
    }

    const amountInPaise = Math.round(paymentAmount * 100);

    if (
      !Number.isSafeInteger(amountInPaise) ||
      amountInPaise <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount.",
      });
    }

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `payment_${Date.now()}`,
    });

    const payment = await Payment.create({
      therapist: req.therapist.id,
      client,
      session: session || undefined,
      amount: paymentAmount,
      currency: "INR",
      status: "pending",
      provider: "razorpay",
      paymentType: "session",
      razorpayOrderId: order.id,
    });

    return res.status(201).json({
      success: true,
      message: "Payment order created successfully.",
      order,
      payment,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VERIFY RAZORPAY PAYMENT
// ==========================================

const verifyPayment = async (req, res, next) => {
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
        message: "Razorpay secret is not configured.",
      });
    }

    // Only session payments can be verified here.
    // Package payments use the client package verification flow.
    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      therapist: req.therapist.id,
      paymentType: "session",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Session payment not found.",
      });
    }

    if (!/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature format.",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const received = Buffer.from(razorpay_signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

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
        message: "Razorpay payment is not captured yet.",
      });
    }

    if (
      gatewayPayment.amount !== Math.round(payment.amount * 100) ||
      gatewayPayment.currency !== payment.currency
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment amount or currency does not match.",
      });
    }

    // Handle duplicate verification.
    if (payment.status === "paid") {
      if (payment.razorpayPaymentId !== razorpay_payment_id) {
        return res.status(409).json({
          success: false,
          message: "This order has already been paid using another payment ID.",
        });
      }

      const invoice = await generateAndStoreInvoice(payment._id);

      return res.status(200).json({
        success: true,
        message: "Payment was already verified.",
        payment,
        invoice,
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This payment cannot be verified.",
      });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "paid";
    payment.paidAt = new Date();
    payment.invoiceNumber = createInvoiceNumber(payment);

    await payment.save();

    const invoice = await generateAndStoreInvoice(payment._id);

    return res.status(200).json({
      success: true,
      message: "Payment verified and invoice generated successfully.",
      payment,
      invoice,
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
// RAZORPAY WEBHOOK
// ==========================================

const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(503).json({
        success: false,
        message: "Razorpay webhook secret is not configured.",
      });
    }

    const webhookSignature = req.headers["x-razorpay-signature"];

    if (!webhookSignature || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Webhook signature or raw request body is missing.",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (!/^[a-f0-9]{64}$/i.test(webhookSignature)) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature format.",
      });
    }

    const received = Buffer.from(webhookSignature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay webhook signature.",
      });
    }

    const eventData = JSON.parse(req.body.toString("utf8"));
    const event = eventData.event;

    if (!["payment.captured", "order.paid"].includes(event)) {
      return res.status(200).json({
        success: true,
        message: `Webhook event ${event} received and ignored.`,
      });
    }

    const paymentEntity = eventData.payload?.payment?.entity;

    const orderId =
      paymentEntity?.order_id ||
      eventData.payload?.order?.entity?.id;

    const paymentId = paymentEntity?.id;

    if (!orderId || !paymentId || !paymentEntity) {
      return res.status(400).json({
        success: false,
        message: "Order ID or payment details are missing from webhook.",
      });
    }

    if (
      paymentEntity.status !== "captured" ||
      paymentEntity.captured !== true
    ) {
      return res.status(200).json({
        success: true,
        message: "Payment is not captured. Webhook acknowledged.",
      });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: orderId,
    });

    if (!payment) {
      return res.status(200).json({
        success: true,
        message: "No matching payment record found. Webhook acknowledged.",
      });
    }

    if (
      paymentEntity.amount !== Math.round(payment.amount * 100) ||
      paymentEntity.currency !== payment.currency
    ) {
      return res.status(400).json({
        success: false,
        message: "Webhook payment amount or currency does not match.",
      });
    }

    // Package payment: activate package.
    if (payment.paymentType === "package") {
      await activatePackageFromPayment(
        payment._id,
        paymentId
      );

      const invoice = await generateAndStoreInvoice(payment._id);

      return res.status(200).json({
        success: true,
        message: "Package payment and invoice processed successfully.",
        invoice,
      });
    }

    // Duplicate webhook handling.
    if (payment.status === "paid") {
      if (payment.razorpayPaymentId !== paymentId) {
        return res.status(409).json({
          success: false,
          message: "Payment was already confirmed using another payment ID.",
        });
      }

      const invoice = await generateAndStoreInvoice(payment._id);

      return res.status(200).json({
        success: true,
        message: "Payment was already confirmed.",
        invoice,
      });
    }

    if (payment.status !== "pending") {
      return res.status(200).json({
        success: true,
        message: "Payment is not pending. Webhook acknowledged.",
      });
    }

    payment.razorpayPaymentId = paymentId;
    payment.status = "paid";
    payment.paidAt = new Date();
    payment.invoiceNumber = createInvoiceNumber(payment);

    await payment.save();

    const invoice = await generateAndStoreInvoice(payment._id);

    return res.status(200).json({
      success: true,
      message: "Razorpay webhook and invoice processed successfully.",
      invoice,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook JSON payload.",
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate payment or invoice number.",
      });
    }

    next(error);
  }
};

// ==========================================
// GET PAYMENT HISTORY
// ==========================================

const getPayments = async (req, res, next) => {
  try {
    const { clientId } = req.query;

    const filter = {
      therapist: req.therapist.id,
    };

    if (clientId) {
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid client ID.",
        });
      }

      const clientExists = await Client.findOne({
        _id: clientId,
        therapist: req.therapist.id,
      });

      if (!clientExists) {
        return res.status(404).json({
          success: false,
          message: "Client not found.",
        });
      }

      filter.client = clientId;
    }

    const payments = await Payment.find(filter)
      .populate("client", "name email")
      .populate("session", "startTime endTime")
      .populate("package", "name sessionCount")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DOWNLOAD PAYMENT INVOICE PDF
// ==========================================

const downloadInvoice = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      therapist: req.therapist.id,
      status: "paid",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Paid payment not found.",
      });
    }

    const invoice = await generateAndStoreInvoice(payment._id);

    return res.download(
      invoice.filePath,
      `${invoice.invoiceNumber}.pdf`
    );
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handleRazorpayWebhook,
  getPayments,
  downloadInvoice,
};
