
import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  CalendarDays,
  Clock,
  CheckCircle2,
  UserPlus,
  IndianRupee,
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  BarChart3,
  LockKeyhole,
  Crown,
  AlertCircle,
  CreditCard,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";

function Analytics() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [advancedAnalytics, setAdvancedAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [advancedLoading, setAdvancedLoading] = useState(false);

  const [error, setError] = useState("");
  const [advancedError, setAdvancedError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  // ==========================================
  // FETCH BASIC ANALYTICS
  // ==========================================

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get(
        "/analytics/dashboard"
      );

      setAnalytics(response.data.analytics || null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load analytics. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FETCH ADVANCED ANALYTICS
  // ==========================================

  const fetchAdvancedAnalytics = async () => {
    try {
      setAdvancedLoading(true);
      setAdvancedError("");
      setUpgradeRequired(false);

      const response = await axiosInstance.get(
        "/analytics/advanced"
      );

      setAdvancedAnalytics(
        response.data.advancedAnalytics || {}
      );
    } catch (err) {
      const responseData = err.response?.data;

      if (
        responseData?.code === "FEATURE_UPGRADE_REQUIRED"
      ) {
        setUpgradeRequired(true);
        setAdvancedAnalytics(null);
      } else {
        setAdvancedError(
          responseData?.message ||
            "Unable to load advanced analytics."
        );
      }
    } finally {
      setAdvancedLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // ==========================================
  // SAFE ADVANCED DATA
  // ==========================================

  const monthlyRevenue =
    advancedAnalytics?.monthlyRevenue || [];

  const monthlySessions =
    advancedAnalytics?.monthlySessions || [];

  const sessionsByStatus =
    advancedAnalytics?.sessionsByStatus || [];

  const leadsByStatus =
    advancedAnalytics?.leadsByStatus || [];

  const clientsByStatus =
    advancedAnalytics?.clientsByStatus || [];

  // ==========================================
  // HELPERS
  // ==========================================

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  };

  const formatMonth = (year, month) => {
    return new Date(year, month - 1).toLocaleDateString(
      "en-IN",
      {
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  // ==========================================
  // STATISTICS
  // ==========================================

  const stats = analytics
    ? [
        {
          title: "Total Clients",
          value: analytics.totalClients,
          description: "All registered clients",
          icon: Users,
          color: "bg-[#EEE8F5] text-[#806A98]",
        },
        {
          title: "Active Clients",
          value: analytics.activeClients,
          description: "Currently active clients",
          icon: UserCheck,
          color: "bg-[#E9F0E8] text-[#718B70]",
        },
        {
          title: "Total Sessions",
          value: analytics.totalSessions,
          description: "All scheduled sessions",
          icon: CalendarDays,
          color: "bg-[#F8ECEE] text-[#B77D88]",
        },
        {
          title: "Upcoming Sessions",
          value: analytics.upcomingSessions,
          description: "Sessions yet to happen",
          icon: Clock,
          color: "bg-[#F8F0E3] text-[#B28C55]",
        },
        {
          title: "Completed Sessions",
          value: analytics.completedSessions,
          description: "Successfully completed",
          icon: CheckCircle2,
          color: "bg-[#E9F0E8] text-[#718B70]",
        },
        {
          title: "Total Leads",
          value: analytics.totalLeads,
          description: "Potential clients",
          icon: UserPlus,
          color: "bg-[#EEE8F5] text-[#806A98]",
        },
      ]
    : [];

  // ==========================================
  // STATUS CARD
  // ==========================================

  const renderStatusCards = (items) => {
    if (!items.length) {
      return (
        <p className="rounded-xl bg-[#F8F6FA] p-4 text-sm text-[#827A89]">
          No records available yet.
        </p>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={`${item._id || "unknown"}-${index}`}
            className="rounded-xl bg-[#F8F6FA] p-4"
          >
            <p className="text-sm text-[#827A89]">
              {formatStatus(item._id)}
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {item.count ?? 0}
            </p>
          </div>
        ))}
      </div>
    );
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#39363D]">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-10">

        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              onClick={() =>
                navigate("/therapist/dashboard")
              }
              className="mb-4 flex items-center gap-2 text-sm text-[#827A89] hover:text-[#76618D]"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#E9E1F2] p-3 text-[#806A98]">
                <BarChart3 size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Analytics
                </h1>

                <p className="mt-1 text-sm text-[#8B8490]">
                  A little overview of how things are going.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-[#E8E2EB] bg-white px-4 py-2.5 text-sm text-[#705A87] shadow-sm transition hover:bg-[#F5F0F8] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            {error}

            <button
              onClick={fetchAnalytics}
              className="ml-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* LOADING */}

        {loading && !analytics ? (
          <div className="rounded-2xl border border-[#ECE7EF] bg-white p-12 text-center text-[#827A89]">
            <RefreshCw
              size={25}
              className="mx-auto mb-3 animate-spin text-[#A995BE]"
            />

            Loading your analytics...
          </div>
        ) : analytics ? (
          <>
            {/* REVENUE CARD */}

            <div className="mb-7 overflow-hidden rounded-2xl bg-gradient-to-r from-[#EAE2F2] to-[#F4E9EB] p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm text-[#766781]">
                    <IndianRupee size={18} />
                    Total Revenue
                  </div>

                  <h2 className="text-3xl font-semibold tracking-tight text-[#4F4359] md:text-4xl">
                    {formatCurrency(analytics.totalRevenue)}
                  </h2>

                  <p className="mt-2 text-sm text-[#84788D]">
                    Total successfully paid payments
                  </p>
                </div>

                <div className="rounded-2xl bg-white/60 p-4 text-[#806A98]">
                  <TrendingUp size={35} />
                </div>
              </div>
            </div>

            {/* PAYMENT SUMMARY */}

            <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#ECE7EF] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#EEE8F5] p-3 text-[#806A98]">
                    <CreditCard size={21} />
                  </div>

                  <div>
                    <p className="text-sm text-[#827A89]">
                      Successful Payments
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                      {analytics.totalPaidPayments ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#ECE7EF] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#E9F0E8] p-3 text-[#718B70]">
                    <TrendingUp size={21} />
                  </div>

                  <div>
                    <p className="text-sm text-[#827A89]">
                      Average Payment
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                      {formatCurrency(
                        analytics.totalPaidPayments
                          ? analytics.totalRevenue /
                              analytics.totalPaidPayments
                          : 0
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* STATISTICS */}

            <div className="mb-7">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Your practice at a glance
                </h2>

                <p className="mt-1 text-sm text-[#8B8490]">
                  Overview of your clients and sessions.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-[#ECE7EF] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <div className={`rounded-xl p-3 ${item.color}`}>
                          <Icon size={21} />
                        </div>

                        <span className="text-xs text-[#AAA2AD]">
                          Overview
                        </span>
                      </div>

                      <p className="text-sm text-[#827A89]">
                        {item.title}
                      </p>

                      <h3 className="mt-1 text-3xl font-semibold text-[#39363D]">
                        {item.value ?? 0}
                      </h3>

                      <p className="mt-2 text-xs text-[#A098A5]">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ATTENDANCE */}

            <div className="mb-7 rounded-2xl border border-[#ECE7EF] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-[#F8ECEE] p-3 text-[#B77D88]">
                  <AlertCircle size={21} />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Session attendance
                  </h2>

                  <p className="text-sm text-[#8B8490]">
                    Track missed appointments in your practice.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#F8F6FA] p-4">
                  <p className="text-sm text-[#827A89]">
                    No-show sessions
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {analytics.noShowSessions ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F6FA] p-4">
                  <p className="text-sm text-[#827A89]">
                    No-show rate
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {analytics.noShowRate ?? 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* PRACTICE SUMMARY */}

            <div className="mb-7 rounded-2xl border border-[#ECE7EF] bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold">
                Practice summary
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#F8F6FA] p-4">
                  <p className="text-sm text-[#827A89]">
                    Client activity
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {analytics.activeClients ?? 0} /{" "}
                    {analytics.totalClients ?? 0}
                  </p>

                  <p className="mt-1 text-xs text-[#A098A5]">
                    Active clients out of total clients
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F6FA] p-4">
                  <p className="text-sm text-[#827A89]">
                    Session progress
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {analytics.completedSessions ?? 0} /{" "}
                    {analytics.totalSessions ?? 0}
                  </p>

                  <p className="mt-1 text-xs text-[#A098A5]">
                    Completed sessions out of total sessions
                  </p>
                </div>
              </div>
            </div>

            {/* ADVANCED ANALYTICS */}

            <div className="mb-7 rounded-2xl border border-[#ECE7EF] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      Advanced Analytics
                    </h2>

                    <Crown size={18} className="text-[#A995BE]" />
                  </div>

                  <p className="mt-1 text-sm text-[#8B8490]">
                    Explore revenue trends and detailed practice insights.
                  </p>
                </div>

                <button
                  onClick={fetchAdvancedAnalytics}
                  disabled={advancedLoading}
                  className="flex items-center gap-2 rounded-xl bg-[#76618D] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#655177] disabled:opacity-60"
                >
                  {advancedLoading ? (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <BarChart3 size={16} />
                  )}

                  {advancedLoading
                    ? "Loading..."
                    : advancedAnalytics
                      ? "Refresh Advanced Analytics"
                      : "View Advanced Analytics"}
                </button>
              </div>

              {/* UPGRADE PROMPT */}

              {upgradeRequired && (
                <div className="mt-6 rounded-2xl border border-[#E8DFF0] bg-[#F8F4FA] p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="rounded-xl bg-[#EAE2F2] p-3 text-[#806A98]">
                      <LockKeyhole size={22} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-[#554663]">
                        Unlock Advanced Analytics
                      </h3>

                      <p className="text-xs text-[#8B8490]">
                        Professional plan feature
                      </p>
                    </div>
                  </div>

                  <p className="mb-5 text-sm leading-6 text-[#756B7E]">
                    Get access to monthly revenue trends, session
                    breakdowns, client insights and detailed lead
                    analytics with the Professional subscription.
                  </p>

                  <button
                    onClick={() =>
                      navigate("/therapist/subscription")
                    }
                    className="rounded-xl bg-[#76618D] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#655177]"
                  >
                    Explore Subscription Plans
                  </button>
                </div>
              )}

              {/* ADVANCED ERROR */}

              {advancedError && (
                <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                  {advancedError}

                  <button
                    onClick={fetchAdvancedAnalytics}
                    className="ml-2 font-semibold underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* ADVANCED DATA */}

              {advancedAnalytics && (
                <div className="mt-7 space-y-7">

                  {/* MONTHLY REVENUE */}

                  <div>
                    <h3 className="mb-3 font-semibold">
                      Monthly Revenue
                    </h3>

                    {monthlyRevenue.length === 0 ? (
                      <p className="rounded-xl bg-[#F8F6FA] p-4 text-sm text-[#827A89]">
                        No paid revenue records available yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {monthlyRevenue.map((item, index) => (
                          <div
                            key={`${item._id.year}-${item._id.month}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F8F6FA] p-4"
                          >
                            <div>
                              <p className="font-medium">
                                {formatMonth(
                                  item._id.year,
                                  item._id.month
                                )}
                              </p>

                              <p className="text-xs text-[#8B8490]">
                                {item.payments ?? 0} paid payments
                              </p>
                            </div>

                            <p className="font-semibold text-[#76618D]">
                              {formatCurrency(item.revenue)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* MONTHLY SESSIONS */}

                  <div>
                    <h3 className="mb-3 font-semibold">
                      Monthly Sessions
                    </h3>

                    {monthlySessions.length === 0 ? (
                      <p className="rounded-xl bg-[#F8F6FA] p-4 text-sm text-[#827A89]">
                        No session records available yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {monthlySessions.map((item, index) => (
                          <div
                            key={`${item._id.year}-${item._id.month}-${index}`}
                            className="flex items-center justify-between rounded-xl bg-[#F8F6FA] p-4"
                          >
                            <p className="font-medium">
                              {formatMonth(
                                item._id.year,
                                item._id.month
                              )}
                            </p>

                            <p className="font-semibold text-[#76618D]">
                              {item.sessions ?? 0} sessions
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SESSION STATUS */}

                  <div>
                    <h3 className="mb-3 font-semibold">
                      Sessions by Status
                    </h3>

                    {renderStatusCards(sessionsByStatus)}
                  </div>

                  {/* LEAD STATUS */}

                  <div>
                    <h3 className="mb-3 font-semibold">
                      Leads by Status
                    </h3>

                    {renderStatusCards(leadsByStatus)}
                  </div>

                  {/* CLIENT STATUS */}

                  <div>
                    <h3 className="mb-3 font-semibold">
                      Clients by Status
                    </h3>

                    {renderStatusCards(clientsByStatus)}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-[#ECE7EF] bg-white p-10 text-center">
            <p className="text-sm text-[#827A89]">
              Analytics are currently unavailable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;
