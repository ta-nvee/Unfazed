
const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const Package = require("../models/Package");
const ClientPackage = require("../models/ClientPackage");

const { generateAndStoreInvoice } = require("./invoiceService");

const createInvoiceNumber = (payment, date) => {
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  return `UNF-${datePart}-${payment._id
    .toString()
    .slice(-8)
    .toUpperCase()}`;
};

const activatePackageFromPayment = async (
  paymentId,
  razorpayPaymentId,
  razorpaySignature = null
) => {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw new Error("Invalid payment ID.");
  }

  if (!razorpayPaymentId) {
    throw new Error("Razorpay payment ID is required.");
  }

  const dbSession = await mongoose.startSession();

  let result;

  try {
    await dbSession.withTransaction(async () => {
      const payment = await Payment.findById(paymentId).session(dbSession);

      if (!payment || payment.paymentType !== "package") {
        throw new Error("Package payment not found.");
      }

      if (
        payment.razorpayPaymentId &&
        payment.razorpayPaymentId !== razorpayPaymentId
      ) {
        throw new Error("Payment ID does not match this package payment.");
      }

      // Prevent duplicate package activation.
      const existingClientPackage = await ClientPackage.findOne({
        payment: payment._id,
      }).session(dbSession);

      if (existingClientPackage) {
        if (
          payment.status !== "paid" ||
          !payment.clientPackage ||
          payment.clientPackage.toString() !==
            existingClientPackage._id.toString()
        ) {
          payment.razorpayPaymentId = razorpayPaymentId;

          if (razorpaySignature) {
            payment.razorpaySignature = razorpaySignature;
          }

          payment.status = "paid";
          payment.clientPackage = existingClientPackage._id;
          payment.paidAt = payment.paidAt || new Date();

          if (!payment.invoiceNumber) {
            payment.invoiceNumber = createInvoiceNumber(
              payment,
              payment.paidAt
            );
          }

          await payment.save({ session: dbSession });
        }

        result = {
          payment,
          clientPackage: existingClientPackage,
          alreadyActivated: true,
        };

        return;
      }

      // Detect broken payment-to-package references.
      if (payment.clientPackage) {
        const referencedPackage = await ClientPackage.findById(
          payment.clientPackage
        ).session(dbSession);

        if (referencedPackage) {
          throw new Error(
            "This payment is already linked to another client package."
          );
        }

        throw new Error(
          "Payment references a missing client package. Please review the payment."
        );
      }

      if (!["pending", "paid"].includes(payment.status)) {
        throw new Error("This payment cannot activate a package.");
      }

      // Only active packages belonging to this therapist can be activated.
      const selectedPackage = await Package.findOne({
        _id: payment.package,
        therapist: payment.therapist,
        isActive: true,
      }).session(dbSession);

      if (!selectedPackage) {
        throw new Error("Active package not found.");
      }

      // Verify the payment amount against the package price.
      const packageAmount = Math.round(
        Number(selectedPackage.price) * 100
      );

      const paymentAmount = Math.round(Number(payment.amount) * 100);

      if (
        !Number.isSafeInteger(packageAmount) ||
        packageAmount <= 0 ||
        packageAmount !== paymentAmount
      ) {
        throw new Error("Package payment amount does not match.");
      }

      if (
        !Number.isInteger(selectedPackage.sessionCount) ||
        selectedPackage.sessionCount < 1
      ) {
        throw new Error("Package session count is invalid.");
      }

      if (
        !Number.isFinite(Number(selectedPackage.validityDays)) ||
        Number(selectedPackage.validityDays) <= 0
      ) {
        throw new Error("Package validity period is invalid.");
      }

      const purchasedAt = payment.paidAt || new Date();

      const expiresAt = new Date(purchasedAt);

      expiresAt.setDate(
        expiresAt.getDate() + Number(selectedPackage.validityDays)
      );

      // Create exactly one client package for this payment.
      const [newClientPackage] = await ClientPackage.create(
        [
          {
            therapist: payment.therapist,
            client: payment.client,
            package: selectedPackage._id,
            payment: payment._id,
            sessionsTotal: selectedPackage.sessionCount,
            sessionsUsed: 0,
            purchasePrice: payment.amount,
            purchasedAt,
            expiresAt,
            status: "active",
          },
        ],
        { session: dbSession }
      );

      payment.razorpayPaymentId = razorpayPaymentId;

      if (razorpaySignature) {
        payment.razorpaySignature = razorpaySignature;
      }

      payment.status = "paid";
      payment.paidAt = purchasedAt;
      payment.clientPackage = newClientPackage._id;

      if (!payment.invoiceNumber) {
        payment.invoiceNumber = createInvoiceNumber(
          payment,
          purchasedAt
        );
      }

      await payment.save({ session: dbSession });

      result = {
        payment,
        clientPackage: newClientPackage,
        alreadyActivated: false,
      };
    });

    if (!result) {
      throw new Error("Package activation did not complete.");
    }

    // Generate invoice after the database transaction commits.
    const invoice = await generateAndStoreInvoice(paymentId);

    return {
      ...result,
      invoice,
    };
  } finally {
    await dbSession.endSession();
  }
};

module.exports = {
  activatePackageFromPayment,
};
