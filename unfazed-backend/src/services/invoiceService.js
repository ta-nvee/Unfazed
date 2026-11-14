
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const Payment = require("../models/Payment");

const { canAccess } = require("./entitlementService");

const invoiceDirectory = path.join(
  __dirname,
  "../../uploads/invoices"
);

// ==========================================
// FORMAT CURRENCY
// ==========================================

const formatCurrency = (amount, currency = "INR") => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
};

// ==========================================
// CREATE INVOICE NUMBER
// ==========================================

const createInvoiceNumber = (payment) => {
  const date = new Date(payment.paidAt || Date.now());

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

// ==========================================
// GENERATE INVOICE PDF BUFFER
// ==========================================

const generateInvoicePDF = (payment, invoiceNumber) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", reject);

      const therapist = payment.therapist || {};
      const client = payment.client || {};
      const selectedPackage = payment.package || {};

      const invoiceDate = new Date(
        payment.paidAt || Date.now()
      ).toLocaleDateString("en-IN");

      const currency = payment.currency || "INR";
      const amount = formatCurrency(payment.amount, currency);

      const platformFee = formatCurrency(
        payment.platformFee || 0,
        currency
      );

      let description = "Therapy Session";

      if (payment.paymentType === "package") {
        description = selectedPackage.name
          ? `Therapy Package - ${selectedPackage.name}`
          : "Therapy Session Package";

        if (selectedPackage.sessionCount) {
          description += ` (${selectedPackage.sessionCount} sessions)`;
        }
      }

      // HEADER
      doc
        .fontSize(26)
        .fillColor("#526B5D")
        .text("UNFAZED", 50, 50);

      doc
        .fontSize(10)
        .fillColor("#777777")
        .text("Therapy & Wellness", 50, 82);

      doc
        .fontSize(21)
        .fillColor("#222222")
        .text("INVOICE", 350, 55, {
          align: "right",
        });

      doc.moveDown(3);

      // INVOICE DETAILS
      doc
        .fontSize(11)
        .fillColor("#333333")
        .text(`Invoice Number: ${invoiceNumber}`)
        .text(`Invoice Date: ${invoiceDate}`)
        .text(`Payment Status: ${payment.status.toUpperCase()}`)
        .text(
          `Payment Type: ${
            payment.paymentType === "package" ? "Package" : "Session"
          }`
        );

      doc.moveDown(2);

      // THERAPIST
      doc
        .fontSize(13)
        .fillColor("#526B5D")
        .text("FROM");

      doc
        .fontSize(11)
        .fillColor("#333333")
        .text(therapist.name || "Therapist")
        .text(therapist.email || "");

      doc.moveDown(1);

      // CLIENT
      doc
        .fontSize(13)
        .fillColor("#526B5D")
        .text("BILL TO");

      doc
        .fontSize(11)
        .fillColor("#333333")
        .text(client.name || "Client")
        .text(client.email || "");

      doc.moveDown(2);

      // PAYMENT TABLE
      const tableTop = doc.y;

      doc
        .rect(50, tableTop, 495, 32)
        .fill("#526B5D");

      doc
        .fillColor("#FFFFFF")
        .fontSize(11)
        .text("Description", 60, tableTop + 10)
        .text("Amount", 420, tableTop + 10, {
          width: 115,
          align: "right",
        });

      const rowTop = tableTop + 32;

      doc
        .fillColor("#333333")
        .fontSize(11)
        .text(description, 60, rowTop + 12, {
          width: 330,
        })
        .text(amount, 420, rowTop + 12, {
          width: 115,
          align: "right",
        });

      doc
        .moveTo(50, rowTop + 45)
        .lineTo(545, rowTop + 45)
        .strokeColor("#DDDDDD")
        .stroke();

      // TOTAL
      doc
        .fontSize(11)
        .fillColor("#333333")
        .text("Subtotal:", 330, rowTop + 60)
        .text(amount, 420, rowTop + 60, {
          width: 115,
          align: "right",
        });

      doc
        .text("GST:", 330, rowTop + 82)
        .text("Not configured", 420, rowTop + 82, {
          width: 115,
          align: "right",
        });

      doc
        .text("Total Paid:", 330, rowTop + 110)
        .fontSize(14)
        .fillColor("#526B5D")
        .text(amount, 420, rowTop + 108, {
          width: 115,
          align: "right",
        });

      doc.moveDown(10);

      // PLATFORM FEE INFORMATION
      doc
        .fontSize(9)
        .fillColor("#777777")
        .text(`Platform Fee: ${platformFee}`);

      // PAYMENT REFERENCES
      doc.moveDown(1);

      doc
        .fontSize(9)
        .fillColor("#666666")
        .text(
          `Razorpay Order ID: ${payment.razorpayOrderId || "N/A"}`
        )
        .text(
          `Razorpay Payment ID: ${payment.razorpayPaymentId || "N/A"}`
        );

      doc.moveDown(3);

      doc
        .fontSize(10)
        .fillColor("#526B5D")
        .text("Thank you for choosing Unfazed.", {
          align: "center",
        });

      doc
        .fontSize(9)
        .fillColor("#777777")
        .text("This invoice confirms the payment received.", {
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// ==========================================
// GENERATE AND SAVE INVOICE
// ==========================================

const generateAndStoreInvoice = async (paymentId) => {
  const payment = await Payment.findById(paymentId)
    .populate("therapist", "name email")
    .populate("client", "name email")
    .populate("package", "name sessionCount");

  if (!payment) {
    throw new Error("Payment not found for invoice generation.");
  }

  if (payment.status !== "paid") {
    throw new Error("Invoice can only be generated for paid payments.");
  }

  // ==========================================
  // CHECK SUBSCRIPTION FEATURE ACCESS
  // ==========================================

  const invoiceAccess = await canAccess(
    payment.therapist?._id || payment.therapist,
    "invoiceGeneration"
  );

  if (!invoiceAccess) {
    return {
      invoiceNumber: null,
      filePath: null,
      alreadyGenerated: false,
      skipped: true,
      message:
        "Invoice generation is not available on this subscription plan.",
    };
  }

  // Generate invoice number if missing.
  if (!payment.invoiceNumber) {
    payment.invoiceNumber = createInvoiceNumber(payment);
  }

  await fs.promises.mkdir(invoiceDirectory, {
    recursive: true,
  });

  const filePath = path.join(
    invoiceDirectory,
    `${payment._id}.pdf`
  );

  // Reuse an already generated invoice.
  if (
    payment.invoiceFilePath &&
    fs.existsSync(payment.invoiceFilePath)
  ) {
    return {
      invoiceNumber: payment.invoiceNumber,
      filePath: payment.invoiceFilePath,
      alreadyGenerated: true,
      skipped: false,
    };
  }

  const pdfBuffer = await generateInvoicePDF(
    payment,
    payment.invoiceNumber
  );

  const temporaryPath = `${filePath}.tmp`;

  await fs.promises.writeFile(temporaryPath, pdfBuffer);

  await fs.promises.rename(temporaryPath, filePath);

  payment.invoiceFilePath = filePath;
  payment.invoiceGeneratedAt = new Date();

  await payment.save();

  return {
    invoiceNumber: payment.invoiceNumber,
    filePath,
    alreadyGenerated: false,
    skipped: false,
  };
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  generateInvoicePDF,
  generateAndStoreInvoice,
};
