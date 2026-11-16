
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  UserRound,
  Languages,
  BriefcaseBusiness,
  Heart,
  Video,
  MapPin,
  LoaderCircle,
  CreditCard,
  CheckCircle,
} from "lucide-react";

import axiosInstance from "../../api/axiosInstance";
import "./BookingPage.css";

function loadRazorpayScript() {
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
}

function BookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [therapist, setTherapist] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [date, setDate] = useState("");
  const [availability, setAvailability] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    sessionType: "online",
    presentingConcern: "",
    consentAccepted: false,
  });

  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingBooking, setPendingBooking] = useState(null);

  const selectedService = services.find(
    (service) =>
      String(service._id || service.id) === String(selectedServiceId)
  );

  const fee = Number(
    selectedService?.price ??
      selectedService?.fee ??
      selectedService?.amount ??
      0
  );

  // Load therapist profile and services
  useEffect(() => {
    const fetchTherapist = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axiosInstance.get(
          `/therapists/${encodeURIComponent(slug)}`
        );
        console.log("PUBLIC BOOKING RESPONSE:", response.data);

        const profile =
          response.data?.therapist ||
          response.data?.data?.therapist ||
          response.data?.data ||
          response.data;

        if (!profile || !profile._id) {
          throw new Error("Therapist profile not found.");
        }

        setTherapist(profile);

        const therapistServices = Array.isArray(profile.services)
          ? profile.services
          : Array.isArray(response.data?.services)
            ? response.data.services
            : [];

        setServices(therapistServices);

        if (therapistServices.length > 0) {
          setSelectedServiceId(
            String(therapistServices[0]._id || therapistServices[0].id)
          );
        }
      } catch (err) {
        console.error("Therapist profile error:", err);

        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load this therapist's profile."
        );
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchTherapist();
    }
  }, [slug]);

  // Load available time slots
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!date || !selectedServiceId) {
        setAvailability([]);
        return;
      }

      try {
        setAvailabilityLoading(true);
        setError("");
        setSelectedTime("");

        const response = await axiosInstance.get(
          `/scheduling/public/${encodeURIComponent(slug)}/availability`,
          {
            params: {
              date,
              serviceId: selectedServiceId,
            },
          }
        );

        const slots =
          response.data?.availability ||
          response.data?.slots ||
          response.data?.data ||
          [];

        setAvailability(Array.isArray(slots) ? slots : []);
      } catch (err) {
        console.error("Availability error:", err);

        setAvailability([]);

        setError(
          err.response?.data?.message ||
            "Unable to load available time slots."
        );
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [date, selectedServiceId, slug]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Start Razorpay payment
  const startPayment = async (booking) => {
    try {
      setError("");

      const loaded = await loadRazorpayScript();

      if (!loaded) {
        setError(
          "Razorpay could not load. Please check your internet connection."
        );
        return;
      }

      const orderResponse = await axiosInstance.post(
        "/payments/public/create-order",
        {
          sessionId: booking.sessionId,
        }
      );

      const { order, keyId } = orderResponse.data;

      if (!order?.id || !keyId) {
        throw new Error(
          "Payment order details are incomplete. Please check the payment configuration."
        );
      }

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Unfazed",
        description: `Session with ${therapist.name}`,
        order_id: order.id,

        prefill: {
          name: booking.customer.name,
          email: booking.customer.email,
          contact: booking.customer.phone,
        },

        theme: {
          color: "#52745f",
        },

        handler: async (paymentResponse) => {
          try {
            const verificationResponse = await axiosInstance.post(
              "/payments/public/verify",
              {
                sessionId: booking.sessionId,
                razorpay_order_id:
                  paymentResponse.razorpay_order_id,
                razorpay_payment_id:
                  paymentResponse.razorpay_payment_id,
                razorpay_signature:
                  paymentResponse.razorpay_signature,
              }
            );

            if (verificationResponse.data?.success) {
              setPendingBooking(null);
              setError("");
              setSuccess(
                "Your session has been booked and payment was successful!"
              );
            } else {
              setError(
                verificationResponse.data?.message ||
                  "Payment verification could not be completed."
              );
            }
          } catch (err) {
            console.error("Payment verification error:", err);
            console.log(
              "Verification response:",
              err.response?.data
            );

            setError(
              err.response?.data?.message ||
                "Payment verification failed. Please contact the therapist."
            );
          }
        },

        modal: {
          ondismiss: () => {
            setError(
              "Payment was not completed. You can retry below."
            );
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (response) => {
        console.error("Razorpay payment failed:", response.error);

        setError(
          response.error?.description ||
            "Payment failed. Please try again."
        );
      });

      razorpay.open();
    } catch (err) {
      console.error("Payment error:", err);
      console.log("Payment backend response:", err.response?.data);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to start payment."
      );
    }
  };

  // Create booking
  const handleBooking = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!date || !selectedTime || !selectedServiceId) {
      setError("Please select a service, date and time.");
      return;
    }

    if (!formData.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!formData.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    // Required by the backend for first-time bookings
    if (!formData.presentingConcern.trim()) {
      setError(
        "Please tell us what you would like support with."
      );
      return;
    }

    if (!formData.consentAccepted) {
      setError("Please accept the consent before booking.");
      return;
    }

    try {
      setBookingLoading(true);

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        date,
        time: selectedTime,
        serviceId: selectedServiceId,
        sessionType: formData.sessionType,
        presentingConcern: formData.presentingConcern.trim(),
        consentAccepted: formData.consentAccepted,
      };

      console.log("Booking payload:", payload);

      const response = await axiosInstance.post(
        `/scheduling/public/${encodeURIComponent(slug)}/book`,
        payload
      );

      const bookingData =
        response.data?.booking ||
        response.data?.data ||
        response.data;

      const sessionId =
        bookingData?.id ||
        bookingData?._id ||
        bookingData?.sessionId;

      if (!sessionId) {
        throw new Error(
          "Booking was created, but the server did not return a session ID."
        );
      }

      const booking = {
        sessionId,
        customer: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        },
      };

      setPendingBooking(booking);

      const bookingFee = Number(
        bookingData?.fee ??
          bookingData?.price ??
          fee
      );

      if (bookingFee <= 0) {
        setSuccess("Your session has been booked successfully!");
        setPendingBooking(null);
      } else {
        await startPayment(booking);
      }
    } catch (err) {
      console.error("Booking error:", err);

      console.log(
        "Backend response:",
        err.response?.data
      );

      console.log("Booking payload:", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        date,
        time: selectedTime,
        serviceId: selectedServiceId,
        sessionType: formData.sessionType,
        presentingConcern: formData.presentingConcern.trim(),
        consentAccepted: formData.consentAccepted,
      });

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to complete your booking."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="profile-loading">
        <LoaderCircle className="explore-spinner" size={34} />
        <p>Loading therapist profile...</p>
      </div>
    );
  }

  // Therapist not found
  if (error && !therapist) {
    return (
      <div className="public-profile-page">
        <div className="explore-message explore-error">
          <h2>Profile unavailable</h2>
          <p>{error}</p>

          <button onClick={() => navigate("/client/explore")}>
            Explore therapists
          </button>
        </div>
      </div>
    );
  }

  // Booking success
  if (success) {
    return (
      <div className="public-profile-page">
        <div className="booking-success">
          <CheckCircle size={55} />

          <h1>You're all set!</h1>

          <p>{success}</p>

          <p>
            Thank you for choosing Unfazed. Keep your booking
            details handy for your session.
          </p>

          <button onClick={() => navigate("/client/explore")}>
            Explore more therapists
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-profile-page">
      <nav className="explore-navbar">
        <div className="explore-nav-inner">
          <button
            className="explore-brand"
            onClick={() => navigate("/")}
          >
            <span className="brand-icon">
              <Heart size={20} />
            </span>
            unfazed
          </button>

          <button
            className="explore-back-button"
            onClick={() => navigate("/client/explore")}
          >
            <ArrowLeft size={17} />
            Back to therapists
          </button>
        </div>
      </nav>

      <main className="booking-page-main">
        {/* Therapist profile */}
        <section className="booking-profile-card">
          <div className="booking-profile-header">
            <div className="booking-profile-avatar">
              {therapist.profileImage ? (
                <img
                  src={therapist.profileImage}
                  alt={therapist.name}
                />
              ) : (
                <UserRound size={48} />
              )}
            </div>

            <div>
              <span className="explore-eyebrow">
                YOUR POTENTIAL THERAPIST
              </span>

              <h1>{therapist.name}</h1>

              <p>
                {therapist.title ||
                  "Mental Wellness Professional"}
              </p>
            </div>
          </div>

          {therapist.bio && (
            <div className="booking-profile-section">
              <h3>About</h3>
              <p>{therapist.bio}</p>
            </div>
          )}

          <div className="booking-profile-details">
            {therapist.experience !== undefined && (
              <span>
                <BriefcaseBusiness size={17} />
                {therapist.experience} years experience
              </span>
            )}

            {Array.isArray(therapist.languages) &&
              therapist.languages.length > 0 && (
                <span>
                  <Languages size={17} />
                  {therapist.languages.join(", ")}
                </span>
              )}
          </div>

          {Array.isArray(therapist.specializations) &&
            therapist.specializations.length > 0 && (
              <div className="therapist-tags">
                {therapist.specializations.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            )}

          {therapist.qualifications && (
            <div className="booking-profile-section">
              <h3>Qualifications</h3>
              <p>{therapist.qualifications}</p>
            </div>
          )}
        </section>

        {/* Booking form */}
        <section className="booking-form-card">
          <div className="booking-form-heading">
            <span className="explore-eyebrow">
              TAKE THE FIRST STEP
            </span>

            <h2>Book your session</h2>

            <p>
              Choose a service and a time that works for you.
            </p>
          </div>

          {error && (
            <div className="booking-error">
              {error}
            </div>
          )}

          {services.length === 0 ? (
            <div className="explore-empty">
              <CalendarDays size={35} />

              <h3>No services available</h3>

              <p>
                This therapist has not added any bookable
                services yet. Please check back later.
              </p>
            </div>
          ) : (
            <form onSubmit={handleBooking}>
              <div className="booking-field">
                <label htmlFor="service">
                  Select session
                </label>

                <select
                  id="service"
                  value={selectedServiceId}
                  onChange={(e) => {
                    setSelectedServiceId(e.target.value);
                    setSelectedTime("");
                  }}
                  required
                >
                  {services.map((service) => (
                    <option
                      key={service._id || service.id}
                      value={service._id || service.id}
                    >
                      {service.name ||
                        service.title ||
                        "Therapy session"}
                      {" — "}
                      ₹
                      {service.price ??
                        service.fee ??
                        service.amount ??
                        0}
                    </option>
                  ))}
                </select>
              </div>

              {selectedService && (
                <div className="booking-service-info">
                  <div>
                    <strong>
                      {selectedService.name ||
                        selectedService.title}
                    </strong>

                    <p>
                      {selectedService.duration
                        ? `${selectedService.duration} minutes`
                        : "Session"}
                    </p>
                  </div>

                  <strong>₹{fee}</strong>
                </div>
              )}

              <div className="booking-field">
                <label htmlFor="date">
                  <CalendarDays size={16} />
                  Select date
                </label>

                <input
                  id="date"
                  type="date"
                  min={new Date().toLocaleDateString("en-CA")}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSelectedTime("");
                  }}
                  required
                />
              </div>

              {date && (
                <div className="booking-field">
                  <label>
                    <Clock size={16} />
                    Available time slots
                  </label>

                  {availabilityLoading ? (
                    <p className="booking-hint">
                      <LoaderCircle
                        className="explore-spinner"
                        size={18}
                      />
                      Checking availability...
                    </p>
                  ) : availability.length === 0 ? (
                    <p className="booking-hint">
                      No available slots for this date.
                      Please choose another date.
                    </p>
                  ) : (
                    <div className="booking-time-slots">
                      {availability.map((slot, index) => {
                        const time =
                          typeof slot === "string"
                            ? slot
                            : slot.time ||
                              slot.startTime ||
                              slot.start;

                        if (!time) return null;

                        return (
                          <button
                            type="button"
                            key={`${time}-${index}`}
                            className={
                              selectedTime === time
                                ? "selected"
                                : ""
                            }
                            onClick={() => setSelectedTime(time)}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="booking-field">
                <label htmlFor="name">
                  Your name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="booking-field">
                <label htmlFor="email">
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="booking-field">
                <label htmlFor="phone">
                  Phone number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="booking-field">
                <label>Session type</label>

                <div className="booking-session-types">
                  <button
                    type="button"
                    className={
                      formData.sessionType === "online"
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        sessionType: "online",
                      }))
                    }
                  >
                    <Video size={17} />
                    Online
                  </button>

                  <button
                    type="button"
                    className={
                      formData.sessionType === "in-person"
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        sessionType: "in-person",
                      }))
                    }
                  >
                    <MapPin size={17} />
                    In person
                  </button>
                </div>
              </div>

              <div className="booking-field">
                <label htmlFor="concern">
                  What would you like support with? *
                </label>

                <textarea
                  id="concern"
                  name="presentingConcern"
                  rows="4"
                  placeholder="Share anything you'd like your therapist to know..."
                  value={formData.presentingConcern}
                  onChange={handleChange}
                  required
                />
              </div>

              <label className="booking-consent">
                <input
                  type="checkbox"
                  name="consentAccepted"
                  checked={formData.consentAccepted}
                  onChange={handleChange}
                  required
                />

                <span>
                  I agree to be contacted regarding this booking
                  and understand that my information will be
                  shared with this therapist.
                </span>
              </label>

              <button
                type="submit"
                className="booking-submit-button"
                disabled={
                  bookingLoading ||
                  availabilityLoading ||
                  !selectedTime
                }
              >
                {bookingLoading ? (
                  <>
                    <LoaderCircle
                      className="explore-spinner"
                      size={18}
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Book and pay ₹{fee}
                  </>
                )}
              </button>
            </form>
          )}

          {pendingBooking && (
            <button
              type="button"
              className="booking-retry-button"
              disabled={bookingLoading}
              onClick={() => startPayment(pendingBooking)}
            >
              Retry payment
            </button>
          )}
        </section>
      </main>

      <footer className="explore-footer">
        <p>
          unfazed — A little space to feel better.
        </p>
      </footer>
    </div>
  );
}

export default BookingPage;
