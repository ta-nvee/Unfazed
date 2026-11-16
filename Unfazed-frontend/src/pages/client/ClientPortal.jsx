import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axiosInstance from "../../api/axiosInstance";
import ClientIntake from "../../components/Profiles/ClientIntake";
import ClientProfile from "../../components/Profiles/ClientProfile";
import "./ClientPortal.css";

import {
  CalendarDays,
  FileText,
  CreditCard,
  MessageCircle,
  LogOut,
  Heart,
  Loader2,
  Clock,
  Video,
  MapPin,
  BookOpen,
  IndianRupee,
  Receipt,
  Send,
  CalendarPlus,
  Bell,
  Search,
  ArrowRight,
  Download,
  LayoutDashboard,
  Package,
  CalendarCheck,
  History,
  UserRound,
  Menu,
  X,
  Home,
} from "lucide-react";

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const loadRazorpay = () =>
  new Promise((resolve) => {
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

function ClientPortal() {
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [payments, setPayments] = useState([]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [purchasingPackage, setPurchasingPackage] = useState("");
  const [packageMessage, setPackageMessage] = useState("");
  const [packageError, setPackageError] = useState("");

  const [payingSessionId, setPayingSessionId] = useState("");
  const [sessionPaymentError, setSessionPaymentError] = useState("");
  const [sessionPaymentMessage, setSessionPaymentMessage] = useState("");

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // THERAPIST SELECTION AND BOOKING
  const [therapist, setTherapist] = useState(null);
  const [therapists, setTherapists] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [selectedTime, setSelectedTime] = useState("");
  const [sessionType, setSessionType] = useState("online");
  const [availableSlots, setAvailableSlots] = useState([]);

  const [therapistLoading, setTherapistLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatError, setChatError] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatConnected, setChatConnected] = useState(false);

  const [downloadingPaymentId, setDownloadingPaymentId] = useState(null);
  const [invoiceError, setInvoiceError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const [selectedChatTherapist, setSelectedChatTherapist] = useState("");

  // THERAPISTS THE CLIENT HAS BOOKED
  const chatTherapists = [
    ...new Map(
      sessions
        .filter(
          (session) =>
            session.status !== "cancelled" &&
            session.therapist
        )
        .map((session) => {
          const therapistId =
            typeof session.therapist === "object"
              ? session.therapist?._id
              : session.therapist;

          if (!therapistId) return null;

          const therapistDetails =
            typeof session.therapist === "object"
              ? session.therapist
              : therapists.find(
                  (item) =>
                    String(item._id) === String(therapistId)
                );

          return therapistDetails
            ? [
                String(therapistId),
                { ...therapistDetails, _id: therapistId },
              ]
            : null;
        })
        .filter(Boolean)
    ).values(),
  ];

  // LOAD CLIENT PORTAL DATA

  useEffect(() => {
    let cancelled = false;

    const fetchPortalData = async () => {
      const token = localStorage.getItem("clientToken");
      const savedClient = localStorage.getItem("client");

      if (!token) {
        navigate("/client/login", { replace: true });
        return;
      }

      if (savedClient) {
        try {
          setClient(JSON.parse(savedClient));
        } catch {
          localStorage.removeItem("client");
        }
      }

      try {
        const results = await Promise.allSettled([
          axiosInstance.get("/client-portal/sessions"),
          axiosInstance.get("/client-portal/notes"),
          axiosInstance.get("/client-portal/payments"),
          axiosInstance.get("/client-portal/therapists"),
          axiosInstance.get("/notifications/client"),
          axiosInstance.get("/client-packages"),
        ]);

        if (cancelled) return;

        const [
          sessionResult,
          notesResult,
          paymentResult,
          therapistResult,
          notificationResult,
          packageResult,
        ] = results;

        if (sessionResult.status === "fulfilled") {
          console.log("PORTAL SESSION RESPONSE:", sessionResult.value.data);

          setSessions(sessionResult.value.data.sessions || []);
        } else {
          console.error("SESSION API ERROR:", sessionResult.reason);
        }

        if (notesResult.status === "fulfilled") {
          setNotes(notesResult.value.data.notes || []);
        }

        if (paymentResult.status === "fulfilled") {
          setPayments(paymentResult.value.data.payments || []);
        }

        if (therapistResult.status === "fulfilled") {
          setTherapists(
            therapistResult.value.data.therapists || []
          );
        } else {
          setTherapists([]);
        }

        if (notificationResult.status === "fulfilled") {
          setNotifications(
            notificationResult.value.data.notifications || []
          );
        }

        if (packageResult.status === "fulfilled") {
          setPackages(packageResult.value.data.packages || []);
          setPackageError("");
        } else {
          setPackageError(
            packageResult.reason?.response?.data?.message ||
              "Unable to load available packages."
          );
        }

        const hasFailedRequest = results.some(
          (result) => result.status === "rejected"
        );

        if (hasFailedRequest) {
          setError(
            "Some portal information could not be loaded. Please refresh the page."
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load your portal."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTherapistLoading(false);
          setPackagesLoading(false);
        }
      }
    };

    fetchPortalData();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // SELECTED THERAPIST SERVICES

  const services = therapist?.services || [];

  const chosenService = services.find(
    (service) =>
      String(service._id) === String(selectedService)
  );

  // LOAD AVAILABLE APPOINTMENT SLOTS

  useEffect(() => {
    let cancelled = false;

    const fetchAvailableSlots = async () => {
      if (!therapist?.slug || !selectedService || !selectedDate) {
        setAvailableSlots([]);
        setSelectedTime("");
        setSlotsLoading(false);
        return;
      }

      try {
        setSlotsLoading(true);
        setBookingError("");
        setBookingSuccess("");
        setSelectedTime("");

        const response = await axiosInstance.get(
          `/scheduling/public/${therapist.slug}/availability`,
          {
            params: {
              date: selectedDate,
              serviceId: selectedService,
            },
          }
        );

        if (!cancelled) {
          setAvailableSlots(response.data.availability || []);
        }
      } catch (err) {
        if (!cancelled) {
          setAvailableSlots([]);
          setBookingError(
            err.response?.data?.message ||
              "Unable to load available time slots."
          );
        }
      } finally {
        if (!cancelled) {
          setSlotsLoading(false);
        }
      }
    };

    fetchAvailableSlots();

    return () => {
      cancelled = true;
    };
  }, [therapist?.slug, selectedService, selectedDate]);

  // BOOK APPOINTMENT

  const handleBookAppointment = async (e) => {
    e.preventDefault();

    setBookingError("");
    setBookingSuccess("");

    if (!therapist?._id) {
      setBookingError("Please select a therapist.");
      return;
    }

    if (!selectedService || !selectedDate || !selectedTime) {
      setBookingError(
        "Please select a service, date and time."
      );
      return;
    }

    try {
      setBookingLoading(true);

      const response = await axiosInstance.post(
        "/client-portal/bookings",
        {
          therapistId: therapist._id,
          serviceId: selectedService,
          date: selectedDate,
          time: selectedTime,
          sessionType,
        }
      );

      setBookingSuccess(
        response.data.message ||
          "Your appointment has been booked successfully."
      );

      setSelectedTime("");

      const sessionResponse = await axiosInstance.get(
        "/client-portal/sessions"
      );

      setSessions(sessionResponse.data.sessions || []);

      const availabilityResponse = await axiosInstance.get(
        `/scheduling/public/${therapist.slug}/availability`,
        {
          params: {
            date: selectedDate,
            serviceId: selectedService,
          },
        }
      );

      setAvailableSlots(
        availabilityResponse.data.availability || []
      );
    } catch (err) {
      setBookingError(
        err.response?.data?.message ||
          "Unable to book your appointment. Please try again."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  // PAY FOR INDIVIDUAL SESSION

  const handlePayForSession = async (session) => {
    setSessionPaymentError("");
    setSessionPaymentMessage("");

    try {
      setPayingSessionId(session._id);

      const scriptLoaded = await loadRazorpay();

      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay Checkout.");
      }

      const orderResponse = await axiosInstance.post(
        "/payments/public/create-order",
        {
          sessionId: session._id,
        }
      );

      const { order, keyId } = orderResponse.data;

      if (!order?.id || !keyId) {
        throw new Error(
          "Unable to create payment order. Please try again."
        );
      }

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Unfazed",
        description: "Therapy Session Payment",
        order_id: order.id,
        prefill: {
          name: client?.name || "",
          email: client?.email || "",
        },
        theme: {
          color: "#52745f",
        },
        handler: async (razorpayResponse) => {
          try {
            const verificationResponse = await axiosInstance.post(
              "/payments/public/verify",
              razorpayResponse
            );

            if (verificationResponse.data.success) {
              setSessionPaymentMessage(
                "Payment successful! Your session payment is confirmed."
              );

              const paymentResponse = await axiosInstance.get(
                "/client-portal/payments"
              );

              setPayments(paymentResponse.data.payments || []);
            } else {
              setSessionPaymentError(
                "Payment verification is pending. Please refresh your portal."
              );
            }
          } catch (err) {
            setSessionPaymentError(
              err.response?.data?.message ||
                "Payment verification failed. Please contact support before trying again."
            );
          } finally {
            setPayingSessionId("");
          }
        },
        modal: {
          ondismiss: () => setPayingSessionId(""),
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (response) => {
        setSessionPaymentError(
          response.error?.description ||
            "Payment failed. Please try again."
        );
        setPayingSessionId("");
      });

      razorpay.open();
    } catch (err) {
      setSessionPaymentError(
        err.response?.data?.message ||
          err.message ||
          "Unable to start session payment."
      );
      setPayingSessionId("");
    }
  };

  // BUY THERAPY PACKAGE

  const handleBuyPackage = async (selectedPackage) => {
    setPackageError("");
    setPackageMessage("");

    try {
      setPurchasingPackage(selectedPackage._id);

      const scriptLoaded = await loadRazorpay();

      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay Checkout.");
      }

      const orderResponse = await axiosInstance.post(
        `/client-packages/${selectedPackage._id}/create-order`
      );

      const { order, keyId } = orderResponse.data;

      if (!order?.id || !keyId) {
        throw new Error("Unable to create package payment order.");
      }

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Unfazed",
        description: `${selectedPackage.name} - ${selectedPackage.sessionCount} sessions`,
        order_id: order.id,
        prefill: {
          name: client?.name || "",
          email: client?.email || "",
        },
        theme: {
          color: "#52745f",
        },
        handler: async (response) => {
          try {
            const verification = await axiosInstance.post(
              "/client-packages/verify",
              response
            );

            if (verification.data.success) {
              setPackageMessage(
                "Payment successful! Your therapy package is now activated."
              );

              setPackageError("");

              try {
                const paymentResponse = await axiosInstance.get(
                  "/client-portal/payments"
                );

                setPayments(paymentResponse.data.payments || []);
              } catch (refreshError) {
                console.error(
                  "Payment history refresh failed:",
                  refreshError
                );
              }
            }
          } catch (err) {
            setPackageError(
              err.response?.data?.message ||
                "Payment verification failed. Please contact support before trying to pay again."
            );
          } finally {
            setPurchasingPackage("");
          }
        },
        modal: {
          ondismiss: () => setPurchasingPackage(""),
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (response) => {
        setPackageError(
          response.error?.description ||
            "Payment failed. Please try again."
        );
        setPurchasingPackage("");
      });

      razorpay.open();
    } catch (err) {
      setPackageError(
        err.response?.data?.message ||
          err.message ||
          "Unable to start package purchase."
      );
      setPurchasingPackage("");
    }
  };

  // SELECT FIRST AVAILABLE CHAT THERAPIST
  useEffect(() => {
    if (chatTherapists.length === 0) {
      setSelectedChatTherapist("");
      setMessages([]);
      return;
    }

    const selectedExists = chatTherapists.some(
      (item) =>
        String(item._id) === String(selectedChatTherapist)
    );

    if (!selectedExists) {
      setSelectedChatTherapist(
        String(chatTherapists[0]._id)
      );
    }
  }, [sessions, therapists, selectedChatTherapist]);

  // CLIENT CHAT + NOTIFICATION CONNECTION
  useEffect(() => {
    const clientId = client?.id || client?._id;
    const token = localStorage.getItem("clientToken");

    if (!clientId || !token) return;

    if (!selectedChatTherapist) {
      setMessages([]);
      setChatConnected(false);
      return;
    }

    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000",
      {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );

    socketRef.current = socket;

    const joinRoom = () => {
      socket.emit(
        "join-room",
        {
          clientId: String(clientId),
          therapistId: String(selectedChatTherapist),
        },
        (response) => {
          if (response?.success) {
            setMessages(response.messages || []);
            setChatError("");
            setChatConnected(true);
          } else {
            setMessages([]);
            setChatConnected(false);
            setChatError(
              response?.message ||
                "Could not open this conversation."
            );
          }
        }
      );
    };

    socket.on("connect", joinRoom);

    socket.on("disconnect", () => {
      setChatConnected(false);
    });

    socket.on("connect_error", (err) => {
      setChatConnected(false);
      setChatError(
        err.message || "Chat connection failed."
      );
      console.error("Chat connection error:", err.message);
    });

    socket.on("receive-message", (message) => {
      const messageClientId =
        message.clientId ||
        message.client?._id ||
        message.client;

      const messageTherapistId =
        message.therapistId ||
        message.therapist?._id ||
        message.therapist;

      if (
        String(messageClientId) !== String(clientId) ||
        String(messageTherapistId) !==
          String(selectedChatTherapist)
      ) {
        return;
      }

      setMessages((previous) => {
        if (
          previous.some(
            (item) => item._id === message._id
          )
        ) {
          return previous;
        }

        return [...previous, message];
      });
    });

    socket.on("new-notification", (notification) => {
      setNotifications((previous) => {
        if (
          previous.some(
            (item) => item._id === notification._id
          )
        ) {
          return previous;
        }

        return [notification, ...previous];
      });
    });

    return () => {
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      setChatConnected(false);
    };
  }, [
    client?.id,
    client?._id,
    selectedChatTherapist,
  ]);

  // SCROLL CHAT TO LATEST MESSAGE

  useEffect(() => {
    if (activeTab === "chat") {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages, activeTab]);

  // SEND CHAT MESSAGE
  const handleSendMessage = (e) => {
    e.preventDefault();

    const messageText = newMessage.trim();
    const socket = socketRef.current;
    const clientId = client?.id || client?._id;

    if (!messageText) return;

    if (messageText.length > 5000) {
      setChatError(
        "Messages cannot exceed 5000 characters."
      );
      return;
    }

    if (!clientId || !selectedChatTherapist) {
      setChatError(
        "Please select a therapist to start chatting."
      );
      return;
    }

    if (!socket?.connected || !chatConnected) {
      setChatError(
        "Chat is not connected. Please wait or refresh."
      );
      return;
    }

    setChatSending(true);
    setChatError("");

    socket.timeout(5000).emit(
      "send-message",
      {
        clientId: String(clientId),
        therapistId: String(selectedChatTherapist),
        message: messageText,
      },
      (err, response) => {
        setChatSending(false);

        if (err) {
          setChatError(
            "Server is not responding. Please try again."
          );
          return;
        }

        if (response?.success) {
          setNewMessage("");
        } else {
          setChatError(
            response?.message ||
              "Message could not be sent."
          );
        }
      }
    );
  };

  // MARK NOTIFICATION AS READ

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await axiosInstance.patch(
        `/notifications/client/${notificationId}/read`
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (err) {
      console.error(
        "Could not mark notification as read:",
        err.response?.data?.message || err.message
      );
    }
  };

  // DOWNLOAD CLIENT PAYMENT INVOICE

  const handleDownloadInvoice = async (payment) => {
    try {
      setInvoiceError("");
      setDownloadingPaymentId(payment._id);

      const response = await axiosInstance.get(
        `/client-portal/payments/${payment._id}/invoice`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = `UNF-${payment._id.slice(-8).toUpperCase()}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);
    } catch (err) {
      let message = "Unable to download invoice. Please try again.";

      if (err.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(
            await err.response.data.text()
          );
          message = errorData.message || message;
        } catch {
          // Keep default error message.
        }
      } else {
        message = err.response?.data?.message || message;
      }

      setInvoiceError(message);
    } finally {
      setDownloadingPaymentId(null);
    }
  };

  // LOGOUT

  const handleLogout = () => {
    socketRef.current?.disconnect();
    localStorage.removeItem("clientToken");
    localStorage.removeItem("client");
    navigate("/client/login", { replace: true });
  };

  // SIDEBAR NAVIGATION

  const closeSidebar = () => setSidebarOpen(false);

  const navigateToSection = (sectionId) => {
    setActiveTab(sectionId);
    closeSidebar();
    setShowNotifications(false);
  };

  // HELPERS

  const now = new Date();

  const upcomingSessions = sessions.filter(
    (session) =>
      new Date(session.startTime) >= now &&
      session.status === "scheduled"
  );

  const previousSessions = sessions.filter(
    (session) => !upcomingSessions.includes(session)
  );

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    if (!date) return "Time unavailable";

    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount || 0);

  const getPaymentStyle = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "failed":
        return "bg-red-100 text-red-700";
      case "refunded":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getSessionPayment = (sessionId) =>
    payments.find((payment) => {
      const paymentSessionId =
        typeof payment.session === "object"
          ? payment.session?._id
          : payment.session;

      return String(paymentSessionId) === String(sessionId);
    });

  // LOADING SCREEN

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f7f2]">
        <Loader2
          className="animate-spin text-[#52745f]"
          size={30}
        />
      </div>
    );
  }

  // DASHBOARD

  const tabClass = (tab) =>
    `portal-tab-content ${activeTab === tab ? "active" : ""}`;

  const sidebarButtonClass = (tab) =>
    `client-sidebar-tab ${activeTab === tab ? "active" : ""}`;

  return (
    <div className="client-portal-page min-h-screen bg-[#f8f7f2] text-[#30483b]">
      <style>{`
        .client-portal-main > .portal-tab-content {
          display: none;
        }

        .client-portal-main > .portal-tab-content.active {
          display: block;
          animation: portalTabFade 0.22s ease;
        }

        .client-portal-main > #overview.portal-tab-content.active {
          animation: none;
        }

        .client-sidebar-nav .client-sidebar-tab {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          border-radius: 12px;
          padding: 12px 14px;
          color: #66776a;
          transition: all 0.2s ease;
        }

        .client-sidebar-nav .client-sidebar-tab:hover {
          background: #edf3eb;
          color: #52745f;
        }

        .client-sidebar-nav .client-sidebar-tab.active {
          background: #e8eee6;
          color: #52745f;
          font-weight: 600;
        }

        .client-sidebar-nav .client-sidebar-tab.active svg {
          color: #52745f;
        }

        @keyframes portalTabFade {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .client-portal-main > .portal-tab-content.active {
            animation: none;
          }
        }
      `}</style>

      {/* TOP NAVBAR */}
      <nav className="client-topbar">
        <div className="flex items-center gap-3">
          <button
            className="client-mobile-menu"
            onClick={() => setSidebarOpen((previous) => !previous)}
            aria-label="Toggle sidebar"
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

          <h1 className="text-2xl font-bold tracking-tight text-[#52745f]">
            unfazed<span className="text-[#c17b60]">.</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/client/explore")}
            className="hidden items-center gap-2 text-sm font-medium text-[#52745f] transition hover:text-[#c17b60] sm:flex"
          >
            <Search size={17} />
            Explore Therapists
          </button>

          <button
            type="button"
            onClick={() => navigateToSection("profile")}
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
              activeTab === "profile"
                ? "border-[#52745f] bg-[#52745f] text-white shadow-md"
                : "border-[#d5e2d5] bg-[#e8eee6] text-[#365b43] shadow-sm hover:border-[#52745f] hover:bg-[#dce8dc] hover:shadow-md"
            }`}
            title="My Profile"
            aria-label="Go to My Profile"
          >
            <UserRound size={23} strokeWidth={2.3} />
          </button>

          {/* NOTIFICATIONS */}
          <div className="relative">
            <button
              onClick={() =>
                setShowNotifications((previous) => !previous)
              }
              className="relative rounded-full p-2 text-[#52745f] transition hover:bg-[#edf3eb]"
              aria-label="Notifications"
              aria-expanded={showNotifications}
            >
              <Bell size={21} />

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 z-[120] w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-[#e8e6dc] bg-[#fffefa] shadow-xl">
                <div className="flex items-center justify-between border-b border-[#e8e6dc] p-4">
                  <h3 className="font-semibold">Notifications</h3>
                  <span className="text-xs text-gray-500">
                    {unreadCount} unread
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell
                        size={28}
                        className="mx-auto mb-3 text-[#829d84]"
                      />
                      <p className="text-sm text-gray-500">
                        You're all caught up!
                      </p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={`border-b border-[#f0efe9] p-4 ${
                          !notification.isRead ? "bg-[#edf3eb]" : ""
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#30483b]">
                          {notification.title}
                        </p>

                        <p className="mt-1 break-words text-sm text-gray-600">
                          {notification.message}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-400">
                            {notification.createdAt
                              ? new Date(
                                  notification.createdAt
                                ).toLocaleString("en-IN")
                              : ""}
                          </span>

                          {!notification.isRead && (
                            <button
                              onClick={() =>
                                handleMarkNotificationRead(
                                  notification._id
                                )
                              }
                              className="text-xs font-semibold text-[#52745f] hover:underline"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-600 transition hover:text-[#b66d55]"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <div className="client-portal-layout">
        {/* MOBILE SIDEBAR BACKDROP */}
        {sidebarOpen && (
          <button
            type="button"
            className="client-sidebar-backdrop"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          />
        )}

        {/* LEFT SIDEBAR */}
        <aside
          className={`client-sidebar ${
            sidebarOpen ? "sidebar-open" : ""
          }`}
        >
          <div className="client-sidebar-heading">
            <p>YOUR SPACE</p>
            <h3>My Wellness</h3>
            <span>
              {client?.name ? `Hello, ${client.name}` : "Welcome back"}
            </span>
          </div>

          <nav className="client-sidebar-nav">
            <button
              type="button"
              className="client-sidebar-tab"
              onClick={() => {
                closeSidebar();
                setShowNotifications(false);
                navigate("/", { replace: true });
              }}
              title="Return to Unfazed homepage"
            >
              <Home size={19} />
              <span>Home</span>
            </button>

            <button
              className={sidebarButtonClass("overview")}
              onClick={() => navigateToSection("overview")}
            >
              <LayoutDashboard size={19} />
              <span>Overview</span>
            </button>

            <button
              className={sidebarButtonClass("profile")}
              onClick={() => navigateToSection("profile")}
            >
              <UserRound size={19} />
              <span>My Profile</span>
            </button>

            <button
              className={sidebarButtonClass("intake")}
              onClick={() => navigateToSection("intake")}
            >
              <Heart size={19} />
              <span>Wellness Intake</span>
            </button>

            <button
              className="client-sidebar-tab"
              onClick={() => {
                closeSidebar();
                navigate("/client/explore");
              }}
            >
              <Search size={19} />
              <span>Explore Therapists</span>
            </button>

            <button
              className={sidebarButtonClass("packages")}
              onClick={() => navigateToSection("packages")}
            >
              <Package size={19} />
              <span>Therapy Packages</span>
            </button>

            <button
              className={sidebarButtonClass("booking")}
              onClick={() => navigateToSection("booking")}
            >
              <CalendarCheck size={19} />
              <span>Book Appointment</span>
            </button>

            <button
              className={sidebarButtonClass("upcoming")}
              onClick={() => navigateToSection("upcoming")}
            >
              <CalendarDays size={19} />
              <span>Upcoming Sessions</span>
            </button>

            <button
              className={sidebarButtonClass("previous")}
              onClick={() => navigateToSection("previous")}
            >
              <History size={19} />
              <span>Previous Sessions</span>
            </button>

            <button
              className={sidebarButtonClass("notes")}
              onClick={() => navigateToSection("notes")}
            >
              <FileText size={19} />
              <span>My Therapy Notes</span>
            </button>

            <button
              className={sidebarButtonClass("payments")}
              onClick={() => navigateToSection("payments")}
            >
              <CreditCard size={19} />
              <span>Payment History</span>
            </button>

            <button
              className={sidebarButtonClass("chat")}
              onClick={() => navigateToSection("chat")}
            >
              <MessageCircle size={19} />
              <span>Chat with Therapist</span>
            </button>
          </nav>

          <div className="client-sidebar-footer">
            <Heart size={18} />
            <div>
              <strong>One step at a time.</strong>
              <span>Your wellness matters.</span>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="client-portal-main">
          {/* OVERVIEW */}
          <div
            id="overview"
            className={tabClass("overview") + " mb-8"}
          >
            <div className="rounded-3xl bg-[#52745f] p-8 text-white shadow-sm md:p-10">
              <Heart size={30} className="mb-5 text-[#dce8dc]" />

              <p className="text-sm tracking-[0.18em] text-[#dce8dc]">
                YOUR PERSONAL WELLNESS SPACE
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Welcome{client?.name ? `, ${client.name}` : ""}
              </h2>

              <p className="mt-3 max-w-xl leading-7 text-[#edf3eb]">
                Take a moment for yourself. Your wellness journey matters.
                This is your personal space to stay connected and cared for.
              </p>
            </div>

            {error && (
              <p className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-5">
                <CalendarDays className="mb-3 text-[#64836a]" size={23} />
                <p className="text-sm text-gray-500">Upcoming Sessions</p>
                <p className="mt-2 text-3xl font-semibold">
                  {upcomingSessions.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-5">
                <FileText className="mb-3 text-[#64836a]" size={23} />
                <p className="text-sm text-gray-500">Shared Notes</p>
                <p className="mt-2 text-3xl font-semibold">
                  {notes.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-5">
                <CreditCard className="mb-3 text-[#64836a]" size={23} />
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="mt-2 text-3xl font-semibold">
                  {payments.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-5">
                <Bell className="mb-3 text-[#64836a]" size={23} />
                <p className="text-sm text-gray-500">Unread Notifications</p>
                <p className="mt-2 text-3xl font-semibold">
                  {unreadCount}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#e0e9df] bg-[#fffefa] p-6">
              <h3 className="text-lg font-semibold">
                Your wellness journey
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Your personal space brings your appointments, therapy notes,
                payments and conversations together in one place.
              </p>

              <button
                onClick={() => navigateToSection("booking")}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#52745f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#405e4b]"
              >
                Book an Appointment
                <ArrowRight size={17} />
              </button>
            </div>
          </div>

          {/* CLIENT PROFILE */}
          <section id="profile" className={tabClass("profile")}>
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-[#30483b]">
                My Profile
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage your personal information and contact details.
              </p>
            </div>

            <ClientProfile onProfileUpdated={setClient} />
          </section>

          {/* WELLNESS INTAKE */}
          <section id="intake" className={tabClass("intake")}>
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-[#30483b]">
                Wellness Intake
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Share information that helps your therapist understand your needs.
              </p>
            </div>

            <ClientIntake />
          </section>

          {/* EXPLORE THERAPISTS */}
          <section id="explore" className={tabClass("explore")}>
            <div className="flex flex-col gap-6 rounded-2xl border border-[#e0e9df] bg-[#fffefa] p-6 shadow-sm md:flex-row md:items-center md:justify-between md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#edf3eb]">
                  <Heart size={27} className="text-[#52745f]" />
                </div>

                <div>
                  <p className="text-xs font-semibold tracking-wider text-[#829d84]">
                    FIND YOUR SUPPORT
                  </p>

                  <h3 className="mt-2 text-xl font-semibold text-[#30483b]">
                    Looking for the right therapist?
                  </h3>

                  <p className="mt-2 max-w-lg text-sm leading-6 text-gray-500">
                    Explore our wellness professionals, discover their
                    specializations and services, and find someone who
                    understands your needs.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate("/client/explore")}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#52745f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#405e4b]"
              >
                Explore Therapists
                <ArrowRight size={17} />
              </button>
            </div>
          </section>

          {/* THERAPY PACKAGES */}
          <section id="packages" className={tabClass("packages")}>
            <div className="mb-5 flex items-center gap-2">
              <CreditCard size={22} className="text-[#64836a]" />
              <h3 className="text-xl font-semibold">Therapy Packages</h3>
            </div>

            <p className="mb-5 text-sm text-gray-500">
              Choose a session package and save on your wellness journey.
            </p>

            {packageError && (
              <p className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {packageError}
              </p>
            )}

            {packageMessage && (
              <p className="mb-4 rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
                {packageMessage}
              </p>
            )}

            {packagesLoading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-6 text-gray-500">
                <Loader2 size={20} className="animate-spin" />
                Loading packages...
              </div>
            ) : packages.length === 0 ? (
              <div className="rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-7 text-center">
                <Heart
                  size={34}
                  className="mx-auto mb-3 text-[#829d84]"
                />
                <p className="font-medium text-gray-700">
                  No packages available yet.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Your therapist's available packages will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {packages.map((item) => (
                  <div
                    key={item._id}
                    className="flex flex-col rounded-2xl border border-[#e0e9df] bg-[#fffefa] p-6 shadow-sm"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf3eb]">
                      <Heart size={24} className="text-[#52745f]" />
                    </div>

                    <h4 className="text-lg font-semibold text-[#30483b]">
                      {item.name}
                    </h4>

                    <p className="mt-2 min-h-10 text-sm leading-6 text-gray-500">
                      {item.description ||
                        "A package for your wellness journey."}
                    </p>

                    <div className="my-5">
                      <p className="text-3xl font-bold text-[#52745f]">
                        {formatAmount(item.price)}
                      </p>
                    </div>

                    <div className="mb-6 space-y-3 border-y border-[#e8e6dc] py-4">
                      <p className="flex items-center gap-2 text-sm text-gray-600">
                        <CalendarDays
                          size={17}
                          className="text-[#829d84]"
                        />
                        {item.sessionCount} therapy sessions
                      </p>

                      <p className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock
                          size={17}
                          className="text-[#829d84]"
                        />
                        Valid for {item.validityDays} days
                      </p>
                    </div>

                    <button
                      onClick={() => handleBuyPackage(item)}
                      disabled={purchasingPackage !== ""}
                      className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[#52745f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#405e4b] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {purchasingPackage === item._id ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard size={17} />
                          Buy Package
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* BOOK APPOINTMENT */}
          <section id="booking" className={tabClass("booking")}>
            <h3 className="mb-5 flex items-center gap-2 text-xl font-semibold">
              <CalendarPlus size={22} className="text-[#64836a]" />
              Book an Appointment
            </h3>

            <div className="rounded-2xl border border-[#e0e9df] bg-[#fffefa] p-6 shadow-sm md:p-8">
              {therapistLoading ? (
                <div className="flex items-center gap-3 py-5 text-gray-500">
                  <Loader2 size={20} className="animate-spin" />
                  Loading therapists...
                </div>
              ) : therapists.length === 0 ? (
                <div className="py-5 text-center">
                  <Heart
                    size={35}
                    className="mx-auto mb-3 text-[#829d84]"
                  />
                  <p className="font-medium text-gray-700">
                    No therapists are available for booking right now.
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Please check again later.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/client/explore")}
                    className="mt-4 rounded-xl bg-[#52745f] px-5 py-3 text-sm font-medium text-white hover:bg-[#405e4b]"
                  >
                    Explore Therapists
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleBookAppointment}
                  className="space-y-6"
                >
                  {/* SELECT THERAPIST */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Choose your therapist
                    </label>

                    <select
                      value={therapist?._id || ""}
                      onChange={(e) => {
                        const selected = therapists.find(
                          (item) =>
                            String(item._id) === String(e.target.value)
                        );

                        setTherapist(selected || null);
                        setSelectedService("");
                        setSelectedTime("");
                        setAvailableSlots([]);
                        setBookingError("");
                        setBookingSuccess("");
                      }}
                      required
                      className="w-full rounded-xl border border-[#e5e7dd] bg-[#fffefa] px-4 py-3 text-sm outline-none focus:border-[#829d84] focus:ring-2 focus:ring-[#e8eee6]"
                    >
                      <option value="">Select a therapist</option>

                      {therapists.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SELECTED THERAPIST DETAILS */}
                  {therapist && (
                    <div className="rounded-xl border border-[#e0e9df] bg-[#f8f7f2] p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e0e9df]">
                          <UserRound
                            size={23}
                            className="text-[#52745f]"
                          />
                        </div>

                        <div>
                          <h4 className="text-lg font-semibold text-[#30483b]">
                            {therapist.name}
                          </h4>

                          {therapist.specializations?.length > 0 && (
                            <p className="mt-1 text-sm text-[#64836a]">
                              {therapist.specializations.join(", ")}
                            </p>
                          )}

                          {therapist.languages?.length > 0 && (
                            <p className="mt-1 text-xs text-gray-500">
                              Languages: {therapist.languages.join(", ")}
                            </p>
                          )}
                        </div>
                      </div>

                      {therapist.bio && (
                        <p className="mt-4 text-sm leading-6 text-gray-600">
                          {therapist.bio}
                        </p>
                      )}
                    </div>
                  )}

                  {/* SERVICE SELECTION */}
                  {therapist && (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Choose a service
                        </label>

                        <select
                          value={selectedService}
                          onChange={(e) => {
                            setSelectedService(e.target.value);
                            setSelectedTime("");
                            setBookingError("");
                            setBookingSuccess("");
                          }}
                          required
                          disabled={services.length === 0}
                          className="w-full rounded-xl border border-[#e5e7dd] bg-[#fffefa] px-4 py-3 text-sm outline-none focus:border-[#829d84] focus:ring-2 focus:ring-[#e8eee6] disabled:opacity-60"
                        >
                          <option value="">Select a service</option>

                          {services.map((service) => (
                            <option
                              key={service._id}
                              value={service._id}
                            >
                              {service.name ||
                                service.title ||
                                "Therapy Session"}
                              {service.price != null
                                ? ` — ${formatAmount(service.price)}`
                                : service.fee != null
                                ? ` — ${formatAmount(service.fee)}`
                                : ""}
                            </option>
                          ))}
                        </select>

                        {services.length === 0 && (
                          <p className="mt-2 text-sm text-gray-500">
                            This therapist has not added any bookable services yet.
                          </p>
                        )}
                      </div>

                      {/* DATE */}
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Choose a date
                        </label>

                        <input
                          type="date"
                          value={selectedDate}
                          min={getLocalDate()}
                          onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setBookingError("");
                            setBookingSuccess("");
                          }}
                          required
                          className="w-full rounded-xl border border-[#e5e7dd] bg-[#fffefa] px-4 py-3 text-sm outline-none focus:border-[#829d84] focus:ring-2 focus:ring-[#e8eee6]"
                        />
                      </div>

                      {/* AVAILABLE TIME SLOTS */}
                      {selectedService && selectedDate && (
                        <div>
                          <label className="mb-3 block text-sm font-medium">
                            Available time slots
                          </label>

                          {slotsLoading ? (
                            <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
                              <Loader2
                                size={18}
                                className="animate-spin"
                              />
                              Checking available times...
                            </div>
                          ) : availableSlots.length === 0 ? (
                            <p className="rounded-xl bg-[#f8f7f2] p-4 text-sm text-gray-500">
                              No available slots for this date. Please try another date.
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                              {availableSlots.map((slot) => {
                                const slotTime =
                                  slot.time || slot.startTime;

                                return (
                                  <button
                                    key={slotTime}
                                    type="button"
                                    onClick={() =>
                                      setSelectedTime(slotTime)
                                    }
                                    className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                                      selectedTime === slotTime
                                        ? "border-[#52745f] bg-[#52745f] text-white"
                                        : "border-[#e0e9df] bg-[#fffefa] text-[#52745f] hover:border-[#829d84] hover:bg-[#f2f5ef]"
                                    }`}
                                  >
                                    {slotTime}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* SESSION TYPE */}
                      <div>
                        <label className="mb-3 block text-sm font-medium">
                          Session type
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setSessionType("online")}
                            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                              sessionType === "online"
                                ? "border-[#52745f] bg-[#edf3eb]"
                                : "border-[#e8e6dc] bg-[#fffefa]"
                            }`}
                          >
                            <Video
                              size={20}
                              className="text-[#64836a]"
                            />
                            <span className="text-sm font-medium">
                              Online session
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSessionType("in-person")}
                            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                              sessionType === "in-person"
                                ? "border-[#52745f] bg-[#edf3eb]"
                                : "border-[#e8e6dc] bg-[#fffefa]"
                            }`}
                          >
                            <MapPin
                              size={20}
                              className="text-[#64836a]"
                            />
                            <span className="text-sm font-medium">
                              In-person session
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* BOOKING SUMMARY */}
                      {chosenService && (
                        <div className="rounded-xl bg-[#f8f7f2] p-4">
                          <p className="text-sm font-medium">
                            Booking summary
                          </p>

                          <div className="mt-3 space-y-2 text-sm text-gray-600">
                            <div className="flex justify-between gap-3">
                              <span>Therapist</span>
                              <span className="font-medium text-[#30483b]">
                                {therapist.name}
                              </span>
                            </div>

                            <div className="flex justify-between gap-3">
                              <span>Service</span>
                              <span className="font-medium text-[#30483b]">
                                {chosenService.name ||
                                  chosenService.title ||
                                  "Therapy Session"}
                              </span>
                            </div>

                            <div className="flex justify-between gap-3">
                              <span>Date</span>
                              <span className="font-medium text-[#30483b]">
                                {formatDate(selectedDate)}
                              </span>
                            </div>

                            <div className="flex justify-between gap-3">
                              <span>Time</span>
                              <span className="font-medium text-[#30483b]">
                                {selectedTime || "Not selected"}
                              </span>
                            </div>

                            <div className="flex justify-between gap-3">
                              <span>Session type</span>
                              <span className="font-medium capitalize text-[#30483b]">
                                {sessionType}
                              </span>
                            </div>

                            <div className="flex justify-between gap-3 border-t border-[#e0e9df] pt-3">
                              <span>Fee</span>
                              <span className="font-semibold text-[#52745f]">
                                {formatAmount(
                                  chosenService.price ??
                                    chosenService.fee
                                )}
                              </span>
                            </div>
                          </div>

                          {chosenService.duration && (
                            <p className="mt-3 text-xs text-gray-500">
                              Duration: {chosenService.duration} minutes
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* MESSAGES */}
                  {bookingError && (
                    <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      {bookingError}
                    </p>
                  )}

                  {bookingSuccess && (
                    <p className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
                      {bookingSuccess}
                    </p>
                  )}

                  {/* CONFIRM APPOINTMENT */}
                  <button
                    type="submit"
                    disabled={
                      bookingLoading ||
                      slotsLoading ||
                      !therapist ||
                      !selectedService ||
                      !selectedTime
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#52745f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#405e4b] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {bookingLoading ? (
                      <>
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                        Booking...
                      </>
                    ) : (
                      <>
                        <CalendarPlus size={18} />
                        Confirm Appointment
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* UPCOMING SESSIONS */}
          <section id="upcoming" className={tabClass("upcoming")}>
            <h3 className="mb-5 flex items-center gap-2 text-xl font-semibold">
              <CalendarDays size={22} className="text-[#64836a]" />
              Upcoming Sessions
            </h3>

            {sessionPaymentError && (
              <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {sessionPaymentError}
              </p>
            )}

            {sessionPaymentMessage && (
              <p className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
                {sessionPaymentMessage}
              </p>
            )}

            {upcomingSessions.length === 0 ? (
              <div className="rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-7 text-gray-500">
                No upcoming sessions scheduled.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {upcomingSessions.map((session) => {
                  const sessionPayment = getSessionPayment(session._id);
                  const isPaid = sessionPayment?.status === "paid";

                  return (
                    <div
                      key={session._id}
                      className="rounded-2xl border border-[#e0e9df] bg-[#fffefa] p-6 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-[#e8eee6] px-3 py-1 text-xs font-semibold text-[#52745f]">
                          Scheduled
                        </span>

                        {session.sessionType === "online" ? (
                          <Video
                            size={20}
                            className="text-[#64836a]"
                          />
                        ) : (
                          <MapPin
                            size={20}
                            className="text-[#64836a]"
                          />
                        )}
                      </div>

                      <h4 className="mt-5 text-lg font-semibold">
                        Therapy Session
                      </h4>

                      <p className="mt-2 text-sm text-gray-600">
                        Therapist:{" "}
                        {session.therapist?.name || "Your therapist"}
                      </p>

                      <p className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                        <CalendarDays
                          size={16}
                          className="text-[#829d84]"
                        />
                        {formatDate(session.startTime)}
                      </p>

                      <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <Clock
                          size={16}
                          className="text-[#829d84]"
                        />
                        {formatTime(session.startTime)} –{" "}
                        {formatTime(session.endTime)}
                      </p>

                      <div className="mt-5">
                        {isPaid ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
                              Payment completed
                            </span>

                            {sessionPayment && (
                              <button
                                onClick={() =>
                                  handleDownloadInvoice(sessionPayment)
                                }
                                disabled={
                                  downloadingPaymentId ===
                                  sessionPayment._id
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-[#e0e9df] px-4 py-3 text-sm font-medium text-[#52745f] hover:bg-[#edf3eb] disabled:opacity-60"
                              >
                                {downloadingPaymentId ===
                                sessionPayment._id ? (
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Download size={16} />
                                )}
                                Invoice
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePayForSession(session)}
                            disabled={payingSessionId !== ""}
                            className="flex items-center justify-center gap-2 rounded-xl bg-[#52745f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#405e4b] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {payingSessionId === session._id ? (
                              <>
                                <Loader2
                                  size={17}
                                  className="animate-spin"
                                />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard size={17} />
                                Pay Now
                                {session.fee != null
                                  ? ` · ${formatAmount(session.fee)}`
                                  : ""}
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {session.sessionType === "online" &&
                        session.meetingLink && (
                          <a
                            href={session.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#52745f] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#405e4b]"
                          >
                            <Video size={16} />
                            Join Session
                          </a>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* PREVIOUS SESSIONS */}
          <section id="previous" className={tabClass("previous")}>
            <h3 className="mb-5 text-xl font-semibold">
              Previous Sessions
            </h3>

            {previousSessions.length === 0 ? (
              <div className="rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-7 text-gray-500">
                No previous sessions yet.
              </div>
            ) : (
              <div className="space-y-3">
                {previousSessions.map((session) => (
                  <div
                    key={session._id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-5"
                  >
                    <div>
                      <p className="font-semibold">Therapy Session</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatDate(session.startTime)}
                      </p>
                    </div>

                    <span className="rounded-full bg-[#f0efe9] px-3 py-1 text-xs capitalize text-gray-600">
                      {session.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* THERAPY NOTES */}
          <section id="notes" className={tabClass("notes")}>
            <h3 className="mb-5 flex items-center gap-2 text-xl font-semibold">
              <FileText size={22} className="text-[#64836a]" />
              My Therapy Notes
            </h3>

            {notes.length === 0 ? (
              <div className="rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-8 text-center">
                <BookOpen
                  size={35}
                  className="mx-auto mb-3 text-[#829d84]"
                />
                <p className="font-medium text-gray-700">
                  No shared notes yet.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Your therapist's shared notes will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {notes.map((note) => (
                  <div
                    key={note._id}
                    className="rounded-2xl border border-[#e0e9df] bg-[#fffefa] p-6 shadow-sm"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-[#e8eee6] px-3 py-1 text-xs font-semibold capitalize text-[#52745f]">
                        {note.noteType || "session"}
                      </span>

                      <span className="text-xs text-gray-500">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                      {note.content}
                    </p>

                    {note.session?.startTime && (
                      <p className="mt-4 border-t border-[#e8e6dc] pt-3 text-xs text-gray-500">
                        Session: {formatDate(note.session.startTime)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* PAYMENT HISTORY */}
          <section id="payments" className={tabClass("payments")}>
            <h3 className="mb-5 flex items-center gap-2 text-xl font-semibold">
              <CreditCard size={22} className="text-[#64836a]" />
              My Payment History
            </h3>

            {invoiceError && (
              <p className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {invoiceError}
              </p>
            )}

            {payments.length === 0 ? (
              <div className="rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-8 text-center">
                <Receipt
                  size={36}
                  className="mx-auto mb-3 text-[#64836a]"
                />
                <p className="font-medium text-gray-700">
                  No payments found.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Your transactions will appear here once a payment is created.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment._id}
                    className="rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="flex items-center gap-1 text-xl font-semibold">
                          <IndianRupee size={19} />
                          {formatAmount(
                            payment.amount,
                            payment.currency
                          )}
                        </p>

                        <p className="mt-2 text-sm text-gray-500">
                          {formatDate(
                            payment.paidAt || payment.createdAt
                          )}
                        </p>

                        {payment.paymentType === "package" && (
                          <p className="mt-2 text-xs font-medium text-[#52745f]">
                            Therapy package payment
                          </p>
                        )}
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getPaymentStyle(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </div>

                    <div className="mt-4 border-t border-[#e8e6dc] pt-3">
                      <p className="text-xs text-gray-500">
                        Razorpay Order ID
                      </p>
                      <p className="mt-1 break-all text-sm font-medium text-gray-700">
                        {payment.razorpayOrderId || "Not available"}
                      </p>
                    </div>

                    {payment.session?.startTime && (
                      <p className="mt-3 text-xs text-gray-500">
                        Session date:{" "}
                        {formatDate(payment.session.startTime)}
                      </p>
                    )}

                    {payment.status === "paid" && (
                      <button
                        onClick={() => handleDownloadInvoice(payment)}
                        disabled={
                          downloadingPaymentId === payment._id
                        }
                        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#52745f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#405e4b] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {downloadingPaymentId === payment._id ? (
                          <>
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download size={17} />
                            Download Invoice
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CLIENT CHAT */}
          <section id="chat" className={tabClass("chat")}>
            <h3 className="mb-5 flex items-center gap-2 text-xl font-semibold">
              <MessageCircle size={22} className="text-[#64836a]" />
              Chat with Your Therapist
            </h3>

            <div className="overflow-hidden rounded-2xl border border-[#e8e6dc] bg-[#fffefa] shadow-sm">
              {/* CHAT HEADER */}
              <div className="border-b border-[#e8e6dc] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="w-full">
                    <h4 className="font-semibold">
                      Your Conversations
                    </h4>

                    {chatTherapists.length > 0 ? (
                      <select
                        value={selectedChatTherapist}
                        onChange={(e) => {
                          setSelectedChatTherapist(e.target.value);
                          setMessages([]);
                          setChatError("");
                          setChatConnected(false);
                        }}
                        className="mt-3 w-full rounded-xl border border-[#e5e7dd] bg-[#fffefa] px-4 py-3 text-sm outline-none focus:border-[#829d84]"
                      >
                        {chatTherapists.map((item) => (
                          <option
                            key={item._id}
                            value={item._id}
                          >
                            {item.name || "Therapist"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">
                        Book a session with a therapist to start a conversation.
                      </p>
                    )}
                  </div>

                  {chatTherapists.length > 0 && (
                    <span
                      className={`shrink-0 text-xs font-medium ${
                        chatConnected
                          ? "text-green-600"
                          : "text-orange-500"
                      }`}
                    >
                      {chatConnected
                        ? "● Connected"
                        : "● Connecting..."}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  A calm and private space to connect with your therapist.
                </p>
              </div>

              {/* CHAT MESSAGES */}
              <div className="h-[350px] space-y-4 overflow-y-auto bg-[#f8f7f2] p-5">
                {chatTherapists.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <MessageCircle
                      size={38}
                      className="mb-3 text-[#c1d2c0]"
                    />

                    <p className="font-medium text-gray-600">
                      No conversations yet
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      Book a session with a therapist to start chatting.
                    </p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <MessageCircle
                      size={38}
                      className="mb-3 text-[#c1d2c0]"
                    />

                    <p className="font-medium text-gray-600">
                      Start a conversation
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      Your messages with this therapist will appear here.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`flex ${
                        msg.senderType === "client"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.senderType === "client"
                            ? "rounded-br-sm bg-[#52745f] text-white"
                            : "rounded-bl-sm bg-[#fffefa] text-gray-800 shadow-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {msg.message}
                        </p>

                        <p
                          className={`mt-1 text-right text-[10px] ${
                            msg.senderType === "client"
                              ? "text-[#dce8dc]"
                              : "text-gray-400"
                          }`}
                        >
                          {msg.sentAt
                            ? new Date(
                                msg.sentAt
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                <div ref={bottomRef} />
              </div>

              {/* CHAT ERROR */}
              {chatError && (
                <p className="bg-red-50 px-4 py-2 text-sm text-red-600">
                  {chatError}
                </p>
              )}

              {/* MESSAGE INPUT */}
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-3 border-t border-[#e8e6dc] p-4"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (chatError) setChatError("");
                  }}
                  maxLength={5000}
                  disabled={!selectedChatTherapist}
                  placeholder={
                    selectedChatTherapist
                      ? "Type your message..."
                      : "Select a therapist first..."
                  }
                  className="min-w-0 flex-1 rounded-xl border border-[#e5e7dd] bg-[#fffefa] px-4 py-3 text-sm outline-none transition focus:border-[#829d84] focus:ring-2 focus:ring-[#e8eee6] disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={
                    !newMessage.trim() ||
                    chatSending ||
                    !chatConnected ||
                    !selectedChatTherapist
                  }
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#52745f] text-white transition hover:bg-[#405e4b] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message"
                >
                  {chatSending ? (
                    <Loader2
                      size={19}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={19} />
                  )}
                </button>
              </form>

              <div className="px-4 pb-3 text-right text-xs text-gray-400">
                {newMessage.length}/5000 characters
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#e8e6dc] bg-[#fffefa] px-6 py-6 text-center">
        <p className="text-sm text-[#64836a]">
          Made with care by unfazed. ♡
        </p>
      </footer>
    </div>
  );
}

export default ClientPortal;