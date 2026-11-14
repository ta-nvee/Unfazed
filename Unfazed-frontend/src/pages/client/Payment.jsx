
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  IndianRupee,
  History,
  RefreshCw,
  Download,
} from "lucide-react";
import axiosInstance from "../../api/axiosInstance";

const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Payment = () => {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await axiosInstance.get("/clients");
        setClients(response.data.clients || []);
      } catch (err) {
        setError("Unable to load clients. Please log in again.");
      }
    };

    fetchClients();
  }, []);

  // Fetch payment history
  const fetchPaymentHistory = async () => {
    try {
      setHistoryLoading(true);

      const response = await axiosInstance.get("/payments");
      setPayments(response.data.payments || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load payment history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  // Download invoice PDF
  const handleDownloadInvoice = async (payment) => {
    try {
      setError("");
      setMessage("");
      setDownloadingInvoice(payment._id);

      const response = await axiosInstance.get(
        `/payments/${payment._id}/invoice`,
        {
          responseType: "blob",
        }
      );

      if (response.data.type === "application/json") {
        const errorText = await response.data.text();
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData.message || "Invoice download failed."
        );
      }

      const pdfBlob = new Blob([response.data], {
        type: "application/pdf",
      });

      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = `Unfazed-Invoice-${
        payment.invoiceNumber || payment._id
      }.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);

      setMessage("Invoice downloaded successfully!");
    } catch (err) {
      setError(
        err.message ||
          err.response?.data?.message ||
          "Unable to download invoice."
      );
    } finally {
      setDownloadingInvoice("");
    }
  };

  // Payment status styling
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-[#edf3eb] text-[#405e4b] border border-[#d5e5d4]";

      case "pending":
        return "bg-amber-50 text-amber-700 border border-amber-100";

      case "failed":
        return "bg-red-50 text-red-600 border border-red-100";

      default:
        return "bg-gray-100 text-gray-600 border border-gray-200";
    }
  };

  // Format payment date
  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Start Razorpay payment
  const handlePayment = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!client || !amount || Number(amount) <= 0) {
      setError("Please select a client and enter a valid amount.");
      return;
    }

    setLoading(true);

    try {
      const scriptLoaded = await loadRazorpay();

      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay Checkout.");
      }

      // Step 1: Create order
      const orderResponse = await axiosInstance.post(
        "/payments/create-order",
        {
          client,
          amount: Number(amount),
        }
      );

      const { order, keyId } = orderResponse.data;

      if (!order || !keyId) {
        throw new Error("Unable to create payment order.");
      }

      // Step 2: Open Razorpay Checkout
      const selectedClient = clients.find(
        (item) => item._id === client
      );

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Unfazed",
        description: "Therapy Session Payment",
        order_id: order.id,

        prefill: {
          name: selectedClient?.name || "",
          email: selectedClient?.email || "",
        },

        theme: {
          color: "#52745f",
        },

        handler: async (response) => {
          try {
            // Step 3: Verify payment
            const verification = await axiosInstance.post(
              "/payments/verify",
              response
            );

            if (verification.data.success) {
              setMessage("Payment successful and verified!");
              setAmount("");
              setClient("");

              await fetchPaymentHistory();
            }
          } catch (err) {
            setError(
              err.response?.data?.message ||
                "Payment verification failed. Please contact support."
            );
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (response) => {
        setError(
          response.error?.description ||
            "Payment failed. Please try again."
        );

        setLoading(false);
      });

      razorpay.open();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to start payment."
      );

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f2] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate("/therapist/dashboard")}
          className="mb-8 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#52745f] transition hover:bg-[#edf3eb] hover:text-[#405e4b]"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[2px] text-[#829d84]">
            Manage your finances
          </p>

          <h1 className="text-3xl font-extrabold tracking-tight text-[#303c33] sm:text-4xl">
            Payment Management
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#788078] sm:text-base">
            Collect payments securely and keep track of your client transactions.
          </p>
        </div>

        {/* Payment form */}
        <div className="rounded-3xl border border-[#e0e9df] bg-[#fffefa] p-6 shadow-[0_8px_30px_rgba(48,60,51,0.04)] sm:p-9">

          <div className="mb-2 flex items-center gap-4">
            <div className="rounded-2xl bg-[#edf3eb] p-3.5 text-[#52745f]">
              <CreditCard size={25} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#303c33] sm:text-2xl">
                Collect Payment
              </h2>

              <p className="mt-1 text-sm text-[#788078]">
                Secure payments through Razorpay
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          {/* Success */}
          {message && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-[#d5e5d4] bg-[#edf3eb] p-4 text-sm font-medium text-[#405e4b]"
            >
              {message}
            </div>
          )}

          <form onSubmit={handlePayment} className="mt-8 space-y-6">

            {/* Select client */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#405044]">
                Select Client
              </label>

              <select
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full rounded-xl border border-[#dce6da] bg-[#fffefa] px-4 py-3.5 text-sm text-[#303c33] outline-none transition focus:border-[#829d84] focus:ring-4 focus:ring-[#edf3eb]"
                required
              >
                <option value="">Choose a client</option>

                {clients.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} {item.email ? `(${item.email})` : ""}
                  </option>
                ))}
              </select>

              {clients.length === 0 && (
                <p className="mt-2 text-xs text-[#788078]">
                  No clients found. Add a client before collecting payment.
                </p>
              )}
            </div>

            {/* Payment amount */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#405044]">
                Payment Amount
              </label>

              <div className="flex items-center rounded-xl border border-[#dce6da] bg-[#fffefa] px-4 transition focus-within:border-[#829d84] focus-within:ring-4 focus-within:ring-[#edf3eb]">
                <IndianRupee
                  size={19}
                  className="shrink-0 text-[#52745f]"
                />

                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-transparent p-3.5 text-sm text-[#303c33] outline-none placeholder:text-[#a0a89f]"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || clients.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#52745f] px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#405e4b] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  Proceed to Razorpay
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#8a938a]">
            Payments are processed securely through Razorpay.
          </p>
        </div>

        {/* Payment history */}
        <div className="mt-8 rounded-3xl border border-[#e0e9df] bg-[#fffefa] p-6 shadow-[0_8px_30px_rgba(48,60,51,0.04)] sm:p-9">

          <div className="mb-7 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-[#edf3eb] p-3.5 text-[#52745f]">
                <History size={24} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#303c33] sm:text-2xl">
                  Payment History
                </h2>

                <p className="mt-1 text-sm text-[#788078]">
                  Your recent client transactions
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchPaymentHistory}
              disabled={historyLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf3eb] text-[#52745f] transition hover:bg-[#dce9d9] hover:text-[#405e4b] disabled:opacity-50"
              title="Refresh payment history"
              aria-label="Refresh payment history"
            >
              <RefreshCw
                size={18}
                className={historyLoading ? "animate-spin" : ""}
              />
            </button>
          </div>

          {/* Loading */}
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <RefreshCw
                size={27}
                className="animate-spin text-[#829d84]"
              />
              <p className="text-sm text-[#788078]">
                Loading payment history...
              </p>
            </div>
          ) : payments.length === 0 ? (
            /* Empty state */
            <div className="rounded-2xl border border-dashed border-[#d5e2d3] bg-[#f8faf6] px-5 py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf3eb] text-[#829d84]">
                <CreditCard size={30} />
              </div>

              <h3 className="font-bold text-[#303c33]">
                No payments yet
              </h3>

              <p className="mt-2 text-sm text-[#788078]">
                Your client transactions will appear here.
              </p>
            </div>
          ) : (
            /* Transactions */
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment._id}
                  className="flex flex-col gap-5 rounded-2xl border border-[#e0e9df] bg-[#fffefa] p-5 transition hover:border-[#c7d8c8] hover:shadow-[0_5px_18px_rgba(48,60,51,0.05)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="break-words font-bold text-[#303c33]">
                      {payment.client?.name || "Unknown Client"}
                    </h3>

                    <p className="mt-1 text-sm text-[#788078]">
                      {formatDate(payment.paidAt || payment.createdAt)}
                    </p>

                    <p className="mt-2 break-all text-xs text-[#9aa399]">
                      {payment.razorpayOrderId || "Payment order"}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <p className="text-xl font-extrabold text-[#303c33]">
                      ₹
                      {Number(payment.amount || 0).toLocaleString("en-IN")}
                    </p>

                    <span
                      className={`inline-block rounded-full px-3 py-1.5 text-xs font-bold capitalize ${getStatusStyle(
                        payment.status
                      )}`}
                    >
                      {payment.status || "Unknown"}
                    </span>

                    {payment.status === "paid" && (
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(payment)}
                        disabled={downloadingInvoice === payment._id}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#edf3eb] px-4 py-2.5 text-sm font-semibold text-[#405e4b] transition hover:bg-[#dce9d9] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {downloadingInvoice === payment._id ? (
                          <>
                            <RefreshCw
                              size={15}
                              className="animate-spin"
                            />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download size={15} />
                            Download Invoice
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center text-xs leading-6 text-[#8a938a]">
          Made with care for your practice. Payments are securely processed
          through Razorpay.
        </p>
      </div>
    </div>
  );
};

export default Payment;
