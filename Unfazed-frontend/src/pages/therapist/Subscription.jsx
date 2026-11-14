
import { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";

// Load Razorpay Checkout
const loadRazorpayScript = () => {
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

// Format usage limits
const formatLimit = (value) => {
  if (value === -1) return "Unlimited";
  if (value === undefined || value === null) return "Not specified";
  return value;
};

// All subscription features
const featureLabels = {
  clientManagement: "Client Management",
  sessionScheduling: "Session Scheduling",
  serviceManagement: "Service Management",
  sessionNotes: "Session Notes",
  advancedNoteTemplates: "Advanced Note Templates",
  basicAnalytics: "Basic Analytics",
  advancedAnalytics: "Advanced Analytics",
  leadManagement: "Lead Management",
  onlinePayments: "Online Payments",
  packageManagement: "Package Management",
  invoiceGeneration: "Invoice Generation",
  chat: "Chat",
};

// Subscription plan order
const planRank = {
  starter: 0,
  growth: 1,
  professional: 2,
};

export default function Subscription() {
  const [tiers, setTiers] = useState([]);
  const [subscription, setSubscription] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscriptionError, setSubscriptionError] = useState("");

  const [processingTier, setProcessingTier] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");

  // ==========================================
  // FETCH SUBSCRIPTION DATA
  // ==========================================

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError("");
      setSubscriptionError("");

      const tiersResponse = await axiosInstance.get("/subscriptions");

      setTiers(tiersResponse.data?.tiers || []);

      const subscriptionResponse = await axiosInstance.get(
        "/subscriptions/my-subscription"
      );

      setSubscription(
        subscriptionResponse.data?.subscription || null
      );
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Unable to load subscription information.";

      if (tiers.length === 0) {
        setError(message);
      } else {
        setSubscriptionError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  // ==========================================
  // PLAN HELPERS
  // ==========================================

  const isCurrentPlan = (tier) => {
    if (!subscription) return false;

    return (
      String(tier._id) === String(subscription._id) ||
      tier.tierKey === subscription.tierKey
    );
  };

  const canUpgrade = (tier) => {
    if (isCurrentPlan(tier)) return false;

    if (!subscription?.tierKey) return true;

    return (
      (planRank[tier.tierKey] ?? -1) >
      (planRank[subscription.tierKey] ?? -1)
    );
  };

  // ==========================================
  // RAZORPAY SUBSCRIPTION PAYMENT
  // ==========================================

  const handleUpgrade = async (tier) => {
    if (processingTier || Number(tier.price) <= 0) return;

    setProcessingTier(tier.tierKey);
    setPaymentMessage("");
    setPaymentError("");

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error(
          "Unable to load Razorpay Checkout. Please check your internet connection."
        );
      }

      // Create payment order on backend
      const orderResponse = await axiosInstance.post(
        "/subscriptions/create-order",
        {
          tierKey: tier.tierKey,
        }
      );

      const order = orderResponse.data;

      if (!order?.orderId || !order?.keyId) {
        throw new Error(
          order?.message || "Unable to create Razorpay payment order."
        );
      }

      // Razorpay Checkout options
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Unfazed",
        description: `${order.tier?.name || tier.name} Subscription`,
        order_id: order.orderId,

        handler: async function (response) {
          try {
            setPaymentError("");
            setPaymentMessage("Verifying your payment...");

            // Verify payment on backend
            const verifyResponse = await axiosInstance.post(
              "/subscriptions/verify-payment",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }
            );

            if (!verifyResponse.data?.success) {
              throw new Error(
                verifyResponse.data?.message ||
                  "Payment verification failed."
              );
            }

            setPaymentMessage(
              `Congratulations! Your ${tier.name} plan is now active.`
            );

            await fetchSubscriptionData();
          } catch (err) {
            setPaymentMessage("");
            setPaymentError(
              err.response?.data?.message ||
                err.message ||
                "Payment verification failed. Please contact support before trying again."
            );
          } finally {
            setProcessingTier("");
          }
        },

        modal: {
          ondismiss: function () {
            setProcessingTier("");
            setPaymentMessage("");
          },
        },

        theme: {
          color: "#718b73",
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on("payment.failed", function (response) {
        setPaymentError(
          response.error?.description ||
            "Payment failed. Please try again."
        );

        setPaymentMessage("");
        setProcessingTier("");
      });

      razorpayInstance.open();
    } catch (err) {
      setPaymentError(
        err.response?.data?.message ||
          err.message ||
          "Unable to start subscription payment."
      );

      setProcessingTier("");
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f2] flex items-center justify-center">
        <p className="text-gray-500">
          Loading subscription information...
        </p>
      </div>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="min-h-screen bg-[#f8f7f2] px-6 py-10">
      <div className="max-w-6xl mx-auto">

        {/* PAGE HEADER */}

        <div className="mb-10">
          <p className="text-sm font-medium text-[#718b73] mb-2">
            YOUR SUBSCRIPTION
          </p>

          <h1 className="text-3xl font-semibold text-[#34352f]">
            Choose the plan that fits your practice
          </h1>

          <p className="text-gray-500 mt-3">
            Manage your subscription and explore available plans.
          </p>
        </div>

        {/* CURRENT SUBSCRIPTION */}

        <div className="bg-white border border-[#e8e3d9] rounded-2xl p-6 mb-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-[#718b73] font-medium mb-2">
                CURRENT SUBSCRIPTION
              </p>

              <h2 className="text-2xl font-semibold text-[#34352f]">
                {subscription
                  ? subscription.name || "Your current plan"
                  : "No active plan"}
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                {subscription
                  ? "This is the subscription currently assigned to your therapist account."
                  : "You haven't been assigned a subscription plan yet."}
              </p>
            </div>

            <div>
              {subscription ? (
                <span className="inline-flex px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium">
                  Plan Assigned
                </span>
              ) : (
                <span className="inline-flex px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-medium">
                  No Plan Assigned
                </span>
              )}
            </div>
          </div>

          {subscriptionError && (
            <p className="text-sm text-red-600 mt-4">
              {subscriptionError}
            </p>
          )}

          {subscription && (
            <div className="mt-5 pt-5 border-t border-[#eeeae2] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Plan Name</p>
                <p className="font-medium text-gray-800 mt-1">
                  {subscription.name || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Tier Key</p>
                <p className="font-medium text-gray-800 mt-1">
                  {subscription.tierKey || "Not specified"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* PAYMENT STATUS */}

        {paymentMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-6">
            {paymentMessage}
          </div>
        )}

        {paymentError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {paymentError}
          </div>
        )}

        {/* AVAILABLE PLANS */}

        <div className="mb-7">
          <h2 className="text-2xl font-semibold text-[#34352f]">
            Available Plans
          </h2>

          <p className="text-gray-500 mt-2">
            Explore the features and usage limits of each plan.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {error}

            <button
              onClick={fetchSubscriptionData}
              className="ml-3 underline font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {!error && tiers.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-gray-600">
              No subscription plans are available right now.
            </p>

            <button
              onClick={fetchSubscriptionData}
              className="mt-4 text-[#718b73] underline font-medium"
            >
              Refresh plans
            </button>
          </div>
        )}

        {/* PLAN CARDS */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const current = isCurrentPlan(tier);
            const upgradeAllowed = canUpgrade(tier);
            const processing = processingTier === tier.tierKey;
            const isFreePlan = Number(tier.price) <= 0;

            return (
              <div
                key={tier._id || tier.tierKey}
                className={`bg-white rounded-2xl border p-7 shadow-sm flex flex-col ${
                  current
                    ? "border-[#718b73] ring-1 ring-[#718b73]"
                    : "border-[#e8e3d9]"
                }`}
              >
                {/* PLAN HEADER */}

                <div className="mb-6">
                  <div className="flex justify-between items-center gap-2">
                    <h2 className="text-2xl font-semibold text-[#34352f]">
                      {tier.name}
                    </h2>

                    {current && (
                      <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium whitespace-nowrap">
                        Current Plan
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 mt-2">
                    {tier.description ||
                      "A plan for your therapy practice."}
                  </p>
                </div>

                {/* PRICE */}

                <div className="mb-6">
                  <p className="text-3xl font-semibold text-[#34352f]">
                    ₹{Number(tier.price || 0).toLocaleString("en-IN")}

                    <span className="text-sm font-normal text-gray-500">
                      /month
                    </span>
                  </p>
                </div>

                {/* USAGE LIMITS */}

                <div className="border-y border-[#eeeae2] py-5 mb-5">
                  <h3 className="font-semibold text-[#34352f] mb-4">
                    Usage Limits
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Clients</span>
                      <span className="font-medium text-gray-800">
                        {formatLimit(tier.limits?.maxClients)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Sessions</span>
                      <span className="font-medium text-gray-800">
                        {formatLimit(tier.limits?.maxSessions)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Leads</span>
                      <span className="font-medium text-gray-800">
                        {formatLimit(tier.limits?.maxLeads)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Services</span>
                      <span className="font-medium text-gray-800">
                        {formatLimit(tier.limits?.maxServices)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Packages</span>
                      <span className="font-medium text-gray-800">
                        {formatLimit(tier.limits?.maxPackages)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* FEATURES */}

                <div className="flex-1">
                  <h3 className="font-semibold text-[#34352f] mb-4">
                    Included Features
                  </h3>

                  <div className="space-y-3">
                    {Object.entries(featureLabels).map(
                      ([key, label]) => {
                        const enabled = Boolean(
                          tier.features?.[key]
                        );

                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="text-gray-600">
                              {label}
                            </span>

                            <span
                              className={
                                enabled
                                  ? "text-green-700 font-medium"
                                  : "text-gray-400"
                              }
                            >
                              {enabled ? "Included" : "Not included"}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* PLAN ACTION */}

                <button
                  type="button"
                  disabled={
                    current ||
                    !upgradeAllowed ||
                    isFreePlan ||
                    Boolean(processingTier)
                  }
                  onClick={() => handleUpgrade(tier)}
                  className={`w-full mt-8 rounded-xl py-3 font-medium transition ${
                    current || !upgradeAllowed || isFreePlan
                      ? "bg-[#e8e5dc] text-gray-500 cursor-not-allowed"
                      : "bg-[#718b73] text-white hover:bg-[#506d57] disabled:opacity-60"
                  }`}
                >
                  {current
                    ? "Current Plan"
                    : isFreePlan
                    ? "Free Plan"
                    : !upgradeAllowed
                    ? "Already on a higher plan"
                    : processing
                    ? "Processing..."
                    : `Upgrade to ${tier.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mt-8 text-center">
          Payments are processed securely through Razorpay. Monthly
          plans currently require manual renewal.
        </p>
      </div>
    </div>
  );
}
