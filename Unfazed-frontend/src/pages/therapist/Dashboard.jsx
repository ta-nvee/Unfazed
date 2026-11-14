
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { io } from "socket.io-client";
import axiosInstance from "../../api/axiosInstance";
import "./Dashboard.css";

import {
  Users,
  CalendarDays,
  IndianRupee,
  UserPlus,
  ArrowUpRight,
  Heart,
  Sparkles,
  LogOut,
  FileText,
  BarChart3,
  MessageCircle,
  Copy,
  ExternalLink,
  Bell,
  CreditCard,
  X,
  Camera,
  GraduationCap,
  BriefcaseBusiness,
  Plus,
  Trash2,
} from "lucide-react";

function Dashboard() {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const photoInputRef = useRef(null);

  const [therapist, setTherapist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("therapist") || "{}");
    } catch {
      return {};
    }
  });

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [profileForm, setProfileForm] = useState({
  name: "",
  bio: "",
  profileImage: "",
  experience: 0,
  education: [],
  specializations: "",
  languages: "",
  services: [],
  isPublic: false,
  isAcceptingClients: false,
});

  // Notifications and real-time socket
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    const fetchNotifications = async () => {
      try {
        const response = await axiosInstance.get(
          "/notifications/therapist"
        );

        setNotifications(response.data.notifications || []);
      } catch (error) {
        console.error(
          "Notification loading error:",
          error.response?.data?.message || error.message
        );
      }
    };

    fetchNotifications();

    const socket = io("http://localhost:5000", {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("new-notification", (notification) => {
      setNotifications((previous) => {
        if (previous.some((item) => item._id === notification._id)) {
          return previous;
        }

        return [notification, ...previous];
      });
    });

    socket.on("connect_error", (error) => {
      console.error(
        "Notification socket connection error:",
        error.message
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await axiosInstance.patch(
        `/notifications/therapist/${notificationId}/read`
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error(
        "Could not mark notification as read:",
        error.response?.data?.message || error.message
      );
    }
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  const bookingUrl = therapist?.slug
    ? `${window.location.origin}/${therapist.slug}`
    : "";

  const handleCopyLink = async () => {
    if (!bookingUrl) return;

    try {
      await navigator.clipboard.writeText(bookingUrl);
      alert("Public profile link copied successfully!");
    } catch (error) {
      console.error("Copy link error:", error);
      alert("Unable to copy the link. Please copy it manually.");
    }
  };

  const handleLogout = () => {
    socketRef.current?.disconnect();

    localStorage.removeItem("token");
    localStorage.removeItem("therapist");

    navigate("/login");
  };

  // Profile editor
  const openProfileEditor = async () => {
    setProfileEditorOpen(true);
    setProfileLoading(true);
    setProfileMessage("");

    try {
      const response = await axiosInstance.get("/therapists/profile");
      const data = response.data.therapist || response.data;

      setProfileForm({
        name: data.name || "",
        bio: data.bio || "",
        profileImage: data.profileImage || "",
        experience: data.experience ?? 0,
        education: Array.isArray(data.education)
          ? data.education.map((item) => ({
              degree: item.degree || "",
              institution: item.institution || "",
              year: item.year || "",
            }))
          : [],
        specializations: (data.specializations || []).join(", "),
        languages: (data.languages || []).join(", "),
        services: data.services || [],
        isPublic: data.isPublic ?? false,
isAcceptingClients: data.isAcceptingClients ?? false,
      });
    } catch (error) {
      console.error("Profile loading error:", error);

      setProfileMessage(
        error.response?.data?.message ||
          "Unable to load profile details."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;

    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Profile photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileMessage("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage("Please select an image smaller than 2 MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setProfileForm((prev) => ({
        ...prev,
        profileImage: reader.result,
      }));

      setProfileMessage("");
    };

    reader.onerror = () => {
      setProfileMessage("Unable to read this image. Please try again.");
    };

    reader.readAsDataURL(file);
  };

  const removeProfilePhoto = () => {
    setProfileForm((prev) => ({
      ...prev,
      profileImage: "",
    }));

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  // Education
  const addEducation = () => {
    setProfileForm((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          degree: "",
          institution: "",
          year: "",
        },
      ],
    }));
  };

  const handleEducationChange = (index, field, value) => {
    setProfileForm((prev) => {
      const education = [...prev.education];

      education[index] = {
        ...education[index],
        [field]: value,
      };

      return {
        ...prev,
        education,
      };
    });
  };

  const removeEducation = (index) => {
    setProfileForm((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  // Services
  const handleServiceChange = (index, field, value) => {
    setProfileForm((prev) => {
      const services = [...prev.services];

      services[index] = {
        ...services[index],
        [field]: value,
      };

      return {
        ...prev,
        services,
      };
    });
  };

  const addService = () => {
    setProfileForm((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        {
          title: "",
          description: "",
          duration: 60,
          price: 0,
        },
      ],
    }));
  };

  const removeService = (index) => {
    setProfileForm((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  // Save profile
  const saveProfile = async (e) => {
    e.preventDefault();

    setProfileSaving(true);
    setProfileMessage("");

    try {
      const payload = {
        name: profileForm.name.trim(),
        bio: profileForm.bio,
        profileImage: profileForm.profileImage,
        experience: Number(profileForm.experience),

        education: profileForm.education
          .filter(
            (item) =>
              item.degree.trim() || item.institution.trim() || item.year
          )
          .map((item) => ({
            degree: item.degree.trim(),
            institution: item.institution.trim(),
            year: item.year ? Number(item.year) : undefined,
          })),

        specializations: profileForm.specializations
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),

        languages: profileForm.languages
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),

        services: profileForm.services.map((service) => ({
          title: service.title.trim(),
          description: service.description || "",
          duration: Number(service.duration),
          price: Number(service.price),
        })),
        services: profileForm.services.map((service) => ({
  title: service.title.trim(),
  description: service.description || "",
  duration: Number(service.duration),
  price: Number(service.price),
})),

isPublic: profileForm.isPublic,
isAcceptingClients: profileForm.isAcceptingClients,
      };

      if (!payload.name) {
        setProfileMessage("Please enter your name.");
        return;
      }

      if (
        !Number.isFinite(payload.experience) ||
        payload.experience < 0
      ) {
        setProfileMessage("Please enter valid years of experience.");
        return;
      }

      const currentYear = new Date().getFullYear();

      const invalidEducation = profileForm.education.some((item) => {
        const hasAnyValue =
          item.degree.trim() ||
          item.institution.trim() ||
          item.year;

        if (!hasAnyValue) return false;

        if (!item.degree.trim() || !item.institution.trim()) {
          return true;
        }

        if (item.year) {
          const year = Number(item.year);

          if (
            !Number.isInteger(year) ||
            year < 1900 ||
            year > currentYear + 10
          ) {
            return true;
          }
        }

        return false;
      });

      if (invalidEducation) {
        setProfileMessage(
          "Please complete each education entry and enter a valid year."
        );
        return;
      }

      if (payload.services.some((service) => !service.title)) {
        setProfileMessage("Please enter a title for every service.");
        return;
      }

      if (
        payload.services.some(
          (service) =>
            !Number.isFinite(service.duration) ||
            service.duration <= 0 ||
            !Number.isFinite(service.price) ||
            service.price < 0
        )
      ) {
        setProfileMessage(
          "Please enter valid service duration and price."
        );
        return;
      }

      const response = await axiosInstance.put(
        "/therapists/profile",
        payload
      );

      const returnedTherapist = response.data.therapist || {};

      const updatedTherapist = {
        ...therapist,
        ...payload,
        ...returnedTherapist,
      };

      setTherapist(updatedTherapist);

      localStorage.setItem(
        "therapist",
        JSON.stringify(updatedTherapist)
      );

      setProfileMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Profile update error:", error);

      setProfileMessage(
        error.response?.data?.message ||
          "Unable to update profile. Please try again."
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const stats = [
    {
      title: "Total Clients",
      value: "—",
      icon: Users,
    },
    {
      title: "Upcoming Sessions",
      value: "—",
      icon: CalendarDays,
    },
    {
      title: "Total Revenue",
      value: "—",
      icon: IndianRupee,
    },
    {
      title: "New Leads",
      value: "—",
      icon: UserPlus,
    },
  ];

  const actions = [
    {
      title: "Client Management",
      description: "Build stronger connections with your clients.",
      link: "/therapist/clients",
      icon: Users,
    },
    {
      title: "Schedule Management",
      description: "Organize appointments and working hours.",
      link: "/therapist/schedule",
      icon: CalendarDays,
    },
    {
      title: "Notes Management",
      description: "Create, organize and manage your client session notes.",
      link: "/therapist/notes",
      icon: FileText,
    },
    {
      title: "Analytics",
      description: "Track your practice growth, clients and revenue.",
      link: "/therapist/analytics",
      icon: BarChart3,
    },
    {
      title: "Lead Management",
      description: "Track potential clients and convert leads into clients.",
      link: "/therapist/leads",
      icon: UserPlus,
    },
    {
      title: "Chat Management",
      description: "Stay connected with your clients through messages.",
      link: "/therapist/chat",
      icon: MessageCircle,
    },
    {
      title: "Payment Management",
      description: "Collect payments and manage payment records securely.",
      link: "/therapist/payment",
      icon: IndianRupee,
    },
    {
      title: "Subscription Management",
      description:
        "View your current plan, explore available plans and manage your practice subscription.",
      link: "/therapist/subscription",
      icon: CreditCard,
    },
  ];

  return (
    <div className="unfazed-dashboard">
      {/* Navbar */}
      <nav className="dashboard-navbar">
        <div className="navbar-inner">
          <Link to="/therapist/dashboard" className="dashboard-brand">
            <div className="brand-icon">
              <Heart size={21} />
            </div>

            <div>
              <h1>unfazed</h1>
              <p>YOUR PRACTICE SPACE</p>
            </div>
          </Link>

          <div className="navbar-right">
            {/* Notifications */}
            <div className="notification-wrapper">
              <button
                type="button"
                className="notification-button"
                onClick={() =>
                  setShowNotifications((previous) => !previous)
                }
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                <Bell size={21} />

                {unreadCount > 0 && (
                  <span className="notification-count">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h3>Notifications</h3>
                    <span>{unreadCount} unread</span>
                  </div>

                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="empty-notifications">
                        <Bell size={28} />
                        <p>No notifications yet.</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`notification-item ${
                            !notification.isRead ? "unread" : ""
                          }`}
                        >
                          <p className="notification-title">
                            {notification.title}
                          </p>

                          <p className="notification-message">
                            {notification.message}
                          </p>

                          <div className="notification-bottom">
                            <span>
                              {notification.createdAt
                                ? new Date(
                                    notification.createdAt
                                  ).toLocaleString("en-IN")
                                : ""}
                            </span>

                            {!notification.isRead && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleMarkNotificationRead(
                                    notification._id
                                  )
                                }
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

            <div className="navbar-user">
              <p>{therapist.name || "Therapist"}</p>
              <span>Therapist account</span>
            </div>

            <button
              onClick={handleLogout}
              className="logout-button"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="dashboard-main">
        {/* Welcome */}
        <section className="welcome-banner">
          <div className="welcome-decoration decoration-one" />
          <div className="welcome-decoration decoration-two" />

          <div className="welcome-content">
            <div className="welcome-label">
              <Sparkles size={15} />
              YOUR WELLNESS WORKSPACE
            </div>

            <h2>
              Welcome back,
              <br />
              <span>{therapist.name || "Therapist"}!</span>
            </h2>

            <p>
              A little progress each day makes a big difference.
              Here's an overview of your practice.
            </p>

            <Link to="/therapist/schedule" className="primary-button">
              View Schedule
              <ArrowUpRight size={18} />
            </Link>
          </div>

          <div className="welcome-heart">
            <Heart size={76} strokeWidth={1} />
          </div>
        </section>

        {/* Public Profile */}
        <section className="public-profile-card">
          <div className="public-profile-info">
            <div className="section-eyebrow">
              <Sparkles size={17} />
              YOUR PUBLIC PROFILE
            </div>

            <h3>Share your profile</h3>

            <p>
              Let clients discover your therapist profile and services.
            </p>

            {bookingUrl ? (
              <p className="booking-url">{bookingUrl}</p>
            ) : (
              <p className="profile-warning">
                Your profile link is not available yet. Please check your therapist profile slug.
              </p>
            )}
          </div>

          <div className="profile-actions">
            <button
              onClick={openProfileEditor}
              className="secondary-button"
            >
              Edit Profile
            </button>

            {bookingUrl && (
              <>
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-button"
                >
                  View Profile
                  <ExternalLink size={16} />
                </a>

                <button
                  onClick={handleCopyLink}
                  className="secondary-button"
                >
                  <Copy size={16} />
                  Copy Link
                </button>
              </>
            )}
          </div>
        </section>

        {/* Profile Editor */}
        {profileEditorOpen && (
          <section className="profile-editor-card">
            <div className="editor-heading">
              <div>
                <h3>Edit Public Profile</h3>
                <p>Update the information clients see.</p>
              </div>

              <button
                type="button"
                className="close-editor"
                onClick={() => setProfileEditorOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {profileLoading ? (
              <p>Loading profile...</p>
            ) : (
              <form onSubmit={saveProfile} className="profile-form">
                {/* Profile Photo */}
                <div className="profile-extra-section">
                  <div className="profile-extra-heading">
                    <div className="profile-extra-icon">
                      <Camera size={20} />
                    </div>

                    <div>
                      <h4>Profile Photo</h4>
                      <p>Choose a friendly, professional photo.</p>
                    </div>
                  </div>

                  <div className="photo-upload-area">
                    <div className="profile-photo-preview">
                      {profileForm.profileImage ? (
                        <img
                          src={profileForm.profileImage}
                          alt="Therapist profile preview"
                        />
                      ) : (
                        <div className="photo-placeholder">
                          <Camera size={30} />
                          <span>Your photo</span>
                        </div>
                      )}
                    </div>

                    <div className="photo-upload-actions">
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        hidden
                      />

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => photoInputRef.current?.click()}
                      >
                        <Camera size={16} />
                        {profileForm.profileImage
                          ? "Change Photo"
                          : "Upload Photo"}
                      </button>

                      {profileForm.profileImage && (
                        <button
                          type="button"
                          className="remove-photo-button"
                          onClick={removeProfilePhoto}
                        >
                          <Trash2 size={15} />
                          Remove
                        </button>
                      )}

                      <small>JPG, PNG or other image format · Max 2 MB</small>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="form-group">
                  <label>Therapist name</label>
                  <input
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    required
                    placeholder="Your name"
                  />
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={profileForm.bio}
                    onChange={handleProfileChange}
                    rows="4"
                    placeholder="Tell clients about yourself..."
                  />
                </div>

                <div className="form-group">
                  <label>Specializations</label>
                  <input
                    name="specializations"
                    value={profileForm.specializations}
                    onChange={handleProfileChange}
                    placeholder="Anxiety, Stress, Relationships"
                  />
                  <small>Separate items with commas.</small>
                </div>

                <div className="form-group">
                  <label>Languages</label>
                  <input
                    name="languages"
                    value={profileForm.languages}
                    onChange={handleProfileChange}
                    placeholder="English, Hindi, Marathi"
                  />
                  <small>Separate items with commas.</small>
                </div>

                {/* Education */}
                <div className="profile-extra-section">
                  <div className="profile-extra-heading">
                    <div className="profile-extra-icon">
                      <GraduationCap size={21} />
                    </div>

                    <div>
                      <h4>Education</h4>
                      <p>Add your degrees and educational background.</p>
                    </div>
                  </div>

                  {profileForm.education.map((item, index) => (
                    <div className="education-editor" key={index}>
                      <div className="education-editor-heading">
                        <h5>Education {index + 1}</h5>

                        <button
                          type="button"
                          className="remove-education-button"
                          onClick={() => removeEducation(index)}
                        >
                          <Trash2 size={15} />
                          Remove
                        </button>
                      </div>

                      <div className="form-group">
                        <label>Degree / Qualification</label>
                        <input
                          value={item.degree}
                          onChange={(e) =>
                            handleEducationChange(
                              index,
                              "degree",
                              e.target.value
                            )
                          }
                          placeholder="e.g. MA in Clinical Psychology"
                        />
                      </div>

                      <div className="form-group">
                        <label>Institution / University</label>
                        <input
                          value={item.institution}
                          onChange={(e) =>
                            handleEducationChange(
                              index,
                              "institution",
                              e.target.value
                            )
                          }
                          placeholder="e.g. University name"
                        />
                      </div>

                      <div className="form-group">
                        <label>Graduation Year</label>
                        <input
                          type="number"
                          min="1900"
                          max={new Date().getFullYear() + 10}
                          value={item.year}
                          onChange={(e) =>
                            handleEducationChange(
                              index,
                              "year",
                              e.target.value
                            )
                          }
                          placeholder="e.g. 2024"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="add-education-button"
                    onClick={addEducation}
                  >
                    <Plus size={17} />
                    Add Education
                  </button>

                  {profileForm.education.length === 0 && (
                    <p className="education-empty">
                      No education details added yet.
                    </p>
                  )}
                </div>

                {/* Experience */}
                <div className="profile-extra-section">
                  <div className="profile-extra-heading">
                    <div className="profile-extra-icon">
                      <BriefcaseBusiness size={20} />
                    </div>

                    <div>
                      <h4>Professional Experience</h4>
                      <p>Share how many years you have worked professionally.</p>
                    </div>
                  </div>

                  <div className="form-group experience-input-group">
                    <label>Years of Experience</label>

                    <div className="experience-input-wrapper">
                      <input
                        type="number"
                        name="experience"
                        min="0"
                        step="0.5"
                        value={profileForm.experience}
                        onChange={handleProfileChange}
                        placeholder="e.g. 3"
                      />

                      <span>Years</span>
                    </div>
                  </div>
                </div>

{/* Profile Visibility Settings */}
<div className="profile-extra-section">
  <div className="profile-extra-heading">
    <div className="profile-extra-icon">
      <Sparkles size={20} />
    </div>

    <div>
      <h4>Profile Visibility</h4>
      <p>Choose how clients can discover and contact you.</p>
    </div>
  </div>

  {/* Public Profile */}
  <label className="flex items-start gap-3 rounded-xl border border-[#dce7dc] bg-[#f7faf6] p-4 cursor-pointer mb-3">
    <input
      type="checkbox"
      checked={profileForm.isPublic}
      onChange={(e) =>
        setProfileForm((prev) => ({
          ...prev,
          isPublic: e.target.checked,
        }))
      }
      className="mt-1 h-5 w-5 accent-[#52745f]"
    />

    <div>
      <strong className="block text-[#365b43]">
        Make my profile public
      </strong>

      <span className="text-sm text-gray-600">
        Allow clients to discover your profile in Therapist Explore.
      </span>
    </div>
  </label>

  {/* Accepting Clients */}
  <label className="flex items-start gap-3 rounded-xl border border-[#dce7dc] bg-[#f7faf6] p-4 cursor-pointer">
    <input
      type="checkbox"
      checked={profileForm.isAcceptingClients}
      onChange={(e) =>
        setProfileForm((prev) => ({
          ...prev,
          isAcceptingClients: e.target.checked,
        }))
      }
      className="mt-1 h-5 w-5 accent-[#52745f]"
    />

    <div>
      <strong className="block text-[#365b43]">
        I am accepting new clients
      </strong>

      <span className="text-sm text-gray-600">
        Allow clients to view your booking profile and book your services.
      </span>
    </div>
  </label>

  <p className="mt-3 text-sm text-gray-500">
    Your profile appears in Therapist Explore only when both
    settings are enabled.
  </p>
</div>


                {/* Services */}
                <div className="services-section">
                  <div className="services-heading">
                    <h4>Services</h4>

                    <button
                      type="button"
                      onClick={addService}
                      className="add-service-button"
                    >
                      + Add Service
                    </button>
                  </div>

                  {profileForm.services.map((service, index) => (
                    <div
                      key={index}
                      className="service-editor"
                    >
                      <div className="service-editor-heading">
                        <h5>Service {index + 1}</h5>

                        <button
                          type="button"
                          onClick={() => removeService(index)}
                        >
                          Remove
                        </button>
                      </div>

                      <input
                        value={service.title || ""}
                        onChange={(e) =>
                          handleServiceChange(
                            index,
                            "title",
                            e.target.value
                          )
                        }
                        placeholder="Service title"
                        required
                      />

                      <textarea
                        value={service.description || ""}
                        onChange={(e) =>
                          handleServiceChange(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Service description"
                        rows="3"
                      />

                      <div className="service-grid">
                        <div className="form-group">
                          <label>Duration (minutes)</label>
                          <input
                            type="number"
                            min="1"
                            value={service.duration ?? 60}
                            onChange={(e) =>
                              handleServiceChange(
                                index,
                                "duration",
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Price (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={service.price ?? 0}
                            onChange={(e) =>
                              handleServiceChange(
                                index,
                                "price",
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {profileForm.services.length === 0 && (
                    <p className="empty-services">
                      No services added yet. Click Add Service to create one.
                    </p>
                  )}
                </div>

                {profileMessage && (
                  <p className="profile-message" role="status">
                    {profileMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="primary-button save-profile-button"
                >
                  {profileSaving ? "Saving..." : "Save Profile"}
                </button>
              </form>
            )}
          </section>
        )}

        {/* Statistics */}
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h3>Practice Overview</h3>
              <p>Your practice at a glance</p>
            </div>

            <span>Dashboard statistics</span>
          </div>

          <div className="stats-grid">
            {stats.map((stat, index) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.title}
                  className={`stat-card stat-card-${index + 1}`}
                >
                  <div className="stat-card-top">
                    <div className="stat-icon">
                      <Icon size={22} />
                    </div>

                    <ArrowUpRight size={18} className="stat-arrow" />
                  </div>

                  <p>{stat.title}</p>

                  <h4>{stat.value}</h4>

                  <small>Data integration pending</small>
                </div>
              );
            })}
          </div>
        </section>

        {/* Management */}
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h3>Manage Your Practice</h3>
              <p>Everything you need, all in one place.</p>
            </div>
          </div>

          <div className="management-grid">
            {actions.map((action, index) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.title}
                  to={action.link}
                  className={`management-card management-card-${index + 1}`}
                >
                  <div className="management-card-top">
                    <div className="management-icon">
                      <Icon size={26} />
                    </div>

                    <ArrowUpRight
                      size={21}
                      className="management-arrow"
                    />
                  </div>

                  <h4>{action.title}</h4>

                  <p>{action.description}</p>

                  <span>Explore now →</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
          <p>© 2026 Unfazed. Your practice, your space.</p>

          <p>
            <Heart size={14} />
            Making mental wellness matter.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;
