
import { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import "./Schedule.css";

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function Schedule() {
  const [sessions, setSessions] = useState([]);
  const [clients, setClients] = useState([]);
  const [availability, setAvailability] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [sessionForm, setSessionForm] = useState({
    client: "",
    startTime: "",
    endTime: "",
    sessionType: "online",
    meetingLink: "",
    fee: 0,
  });

  const [availabilityForm, setAvailabilityForm] = useState({
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "17:00",
  });

  const [blockForm, setBlockForm] = useState({
    date: "",
    startTime: "14:00",
    endTime: "16:00",
  });

  const [activeTab, setActiveTab] = useState("sessions");
  const [savingBlock, setSavingBlock] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);

  // ==========================================
  // FETCH DATA
  // ==========================================

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [sessionRes, clientRes, availabilityRes] =
        await Promise.all([
          axiosInstance.get("/scheduling"),
          axiosInstance.get("/clients"),
          axiosInstance.get("/scheduling/availability"),
        ]);

      setSessions(sessionRes.data.sessions || []);
      setClients(clientRes.data.clients || []);
      setAvailability(availabilityRes.data.availability || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load schedule data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ==========================================
  // FORM HANDLERS
  // ==========================================

  const handleSessionChange = (e) => {
    setSessionForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAvailabilityChange = (e) => {
    setAvailabilityForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleBlockChange = (e) => {
    setBlockForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  // ==========================================
  // CREATE SESSION
  // ==========================================

  const handleCreateSession = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (
      new Date(sessionForm.endTime) <=
      new Date(sessionForm.startTime)
    ) {
      setError("Session end time must be after start time.");
      return;
    }

    try {
      setSavingSession(true);

      await axiosInstance.post("/scheduling", {
        ...sessionForm,
        fee: Number(sessionForm.fee),
      });

      setMessage("Session scheduled successfully!");

      setSessionForm({
        client: "",
        startTime: "",
        endTime: "",
        sessionType: "online",
        meetingLink: "",
        fee: 0,
      });

      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to schedule session."
      );
    } finally {
      setSavingSession(false);
    }
  };

  // ==========================================
  // CANCEL SESSION
  // ==========================================

  const handleCancelSession = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this session?")) {
      return;
    }

    try {
      setError("");
      setMessage("");

      await axiosInstance.patch(`/scheduling/${id}/cancel`);

      setMessage("Session cancelled successfully!");
      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to cancel session."
      );
    }
  };

  // ==========================================
  // COMPLETE SESSION
  // ==========================================

  const handleCompleteSession = async (id) => {
    try {
      setError("");
      setMessage("");

      await axiosInstance.put(`/scheduling/${id}`, {
        status: "completed",
      });

      setMessage("Session marked as completed!");
      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update session."
      );
    }
  };

  // ==========================================
  // SET WEEKLY AVAILABILITY
  // ==========================================

  const handleSetAvailability = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (availabilityForm.endTime <= availabilityForm.startTime) {
      setError("Availability end time must be after start time.");
      return;
    }

    try {
      setSavingAvailability(true);

      await axiosInstance.post("/scheduling/availability", {
        ...availabilityForm,
        dayOfWeek: Number(availabilityForm.dayOfWeek),
      });

      setMessage("Weekly availability saved successfully!");
      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save availability."
      );
    } finally {
      setSavingAvailability(false);
    }
  };

  // ==========================================
  // BLOCK SPECIFIC DATE AND TIME
  // ==========================================

  const handleBlockAvailability = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (blockForm.endTime <= blockForm.startTime) {
      setError("Blocked time end must be after its start time.");
      return;
    }

    try {
      setSavingBlock(true);

      await axiosInstance.post(
        "/scheduling/availability/block",
        blockForm
      );

      setMessage("Date and time blocked successfully!");

      setBlockForm({
        date: "",
        startTime: "14:00",
        endTime: "16:00",
      });

      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to block this time."
      );
    } finally {
      setSavingBlock(false);
    }
  };

  // ==========================================
  // DELETE AVAILABILITY OR BLOCK
  // ==========================================

  const handleDeleteAvailability = async (id, isBlocked = false) => {
    const confirmation = isBlocked
      ? "Are you sure you want to remove this blocked time?"
      : "Delete this weekly availability slot?";

    if (!window.confirm(confirmation)) {
      return;
    }

    try {
      setError("");
      setMessage("");

      await axiosInstance.delete(
        `/scheduling/availability/${id}`
      );

      setMessage(
        isBlocked
          ? "Blocked time removed successfully!"
          : "Availability deleted successfully!"
      );

      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete availability."
      );
    }
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatBlockedDate = (date) => {
    if (!date) return "";

    const [year, month, day] = date.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  };

  // ==========================================
  // SEPARATE AVAILABILITY TYPES
  // ==========================================

  const weeklyAvailability = availability.filter(
    (slot) =>
      slot.availabilityType !== "date-specific" &&
      slot.isAvailable !== false
  );

  const blockedAvailability = availability.filter(
    (slot) =>
      slot.availabilityType === "date-specific" &&
      slot.isAvailable === false
  );

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <div className="schedule-page min-h-screen flex items-center justify-center">
        <p className="text-lg font-medium">
          Loading your schedule...
        </p>
      </div>
    );
  }

  // ==========================================
  // MAIN PAGE
  // ==========================================

  return (
    <div className="schedule-page min-h-screen p-6">
      <div className="max-w-7xl mx-auto">

        {/* PAGE HEADER */}

        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold mb-2">
              UNFAZED / THERAPIST
            </p>

            <h1 className="text-3xl font-bold">
              Schedule Management
            </h1>

            <p className="mt-1">
              Manage your sessions and availability.
            </p>
          </div>

          <button
            onClick={() =>
              (window.location.href = "/therapist/dashboard")
            }
            className="bg-gray-800 text-white px-5 py-3 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* SUCCESS MESSAGE */}

        {message && (
          <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4">
            {message}
          </div>
        )}

        {/* SUMMARY */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <p className="text-sm">Total Sessions</p>
            <h2 className="text-2xl font-bold mt-2">
              {sessions.length}
            </h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm">
            <p className="text-sm">Weekly Availability</p>
            <h2 className="text-2xl font-bold mt-2">
              {weeklyAvailability.length}
            </h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm">
            <p className="text-sm">Blocked Time Slots</p>
            <h2 className="text-2xl font-bold mt-2">
              {blockedAvailability.length}
            </h2>
          </div>
        </div>

        {/* TABS */}

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-5 py-3 rounded-lg ${
              activeTab === "sessions"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 border"
            }`}
          >
            Sessions
          </button>

          <button
            onClick={() => setActiveTab("availability")}
            className={`px-5 py-3 rounded-lg ${
              activeTab === "availability"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 border"
            }`}
          >
            Availability
          </button>
        </div>

        {/* =====================================
            SESSIONS TAB
        ===================================== */}

        {activeTab === "sessions" && (
          <>
            {/* CREATE SESSION */}

            <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
              <h2 className="text-xl font-semibold mb-2">
                Schedule New Session
              </h2>

              <p className="text-sm mb-5">
                Create a new appointment with one of your clients.
              </p>

              <form
                onSubmit={handleCreateSession}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Select Client
                  </label>

                  <select
                    name="client"
                    value={sessionForm.client}
                    onChange={handleSessionChange}
                    required
                    className="w-full"
                  >
                    <option value="">Choose a client</option>

                    {clients.map((client) => (
                      <option key={client._id} value={client._id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Session Type
                  </label>

                  <select
                    name="sessionType"
                    value={sessionForm.sessionType}
                    onChange={handleSessionChange}
                    className="w-full"
                  >
                    <option value="online">Online</option>
                    <option value="in-person">In Person</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Start Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    name="startTime"
                    value={sessionForm.startTime}
                    onChange={handleSessionChange}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    End Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    name="endTime"
                    value={sessionForm.endTime}
                    onChange={handleSessionChange}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Session Fee (₹)
                  </label>

                  <input
                    type="number"
                    name="fee"
                    min="0"
                    value={sessionForm.fee}
                    onChange={handleSessionChange}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Meeting Link (Optional)
                  </label>

                  <input
                    type="url"
                    name="meetingLink"
                    value={sessionForm.meetingLink}
                    onChange={handleSessionChange}
                    placeholder="https://..."
                    className="w-full"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    clients.length === 0 || savingSession
                  }
                  className="md:col-span-2 bg-indigo-600 text-white py-3 rounded-lg"
                >
                  {savingSession
                    ? "Scheduling..."
                    : "Schedule Session"}
                </button>

                {clients.length === 0 && (
                  <p className="md:col-span-2 text-sm text-amber-700">
                    Add a client before scheduling a session.
                  </p>
                )}
              </form>
            </div>

            {/* ALL SESSIONS */}

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-semibold">
                    All Sessions
                  </h2>
                  <p className="text-sm mt-1">
                    View and manage your appointments.
                  </p>
                </div>

                <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                  {sessions.length} Sessions
                </span>
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="font-semibold text-lg">
                    No sessions yet
                  </h3>
                  <p className="mt-2">
                    Your scheduled appointments will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-sm">
                        <th className="p-3">Client</th>
                        <th className="p-3">Start</th>
                        <th className="p-3">End</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Fee</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session._id} className="border-b">
                          <td className="p-3 font-medium">
                            {session.client?.name || "Unknown"}
                          </td>

                          <td className="p-3 text-sm">
                            {formatDate(session.startTime)}
                          </td>

                          <td className="p-3 text-sm">
                            {formatDate(session.endTime)}
                          </td>

                          <td className="p-3 capitalize">
                            {session.sessionType}
                          </td>

                          <td className="p-3">
                            ₹{session.fee || 0}
                          </td>

                          <td className="p-3">
                            <span className="capitalize">
                              {session.status || "scheduled"}
                            </span>
                          </td>

                          <td className="p-3">
                            {session.status === "scheduled" && (
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() =>
                                    handleCompleteSession(session._id)
                                  }
                                  className="text-green-700 text-sm hover:underline"
                                >
                                  Complete
                                </button>

                                <button
                                  onClick={() =>
                                    handleCancelSession(session._id)
                                  }
                                  className="text-red-600 text-sm hover:underline"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* =====================================
            AVAILABILITY TAB
        ===================================== */}

        {activeTab === "availability" && (
          <>
            {/* WEEKLY AVAILABILITY FORM */}

            <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
              <h2 className="text-xl font-semibold mb-2">
                Set Weekly Availability
              </h2>

              <p className="text-sm mb-5">
                Set the hours when clients can regularly book sessions.
              </p>

              <form
                onSubmit={handleSetAvailability}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Day
                  </label>

                  <select
                    name="dayOfWeek"
                    value={availabilityForm.dayOfWeek}
                    onChange={handleAvailabilityChange}
                    className="w-full"
                  >
                    {days.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Start Time
                  </label>

                  <input
                    type="time"
                    name="startTime"
                    value={availabilityForm.startTime}
                    onChange={handleAvailabilityChange}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    End Time
                  </label>

                  <input
                    type="time"
                    name="endTime"
                    value={availabilityForm.endTime}
                    onChange={handleAvailabilityChange}
                    required
                    className="w-full"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingAvailability}
                  className="md:col-span-3 bg-indigo-600 text-white py-3 rounded-lg"
                >
                  {savingAvailability
                    ? "Saving..."
                    : "Save Weekly Availability"}
                </button>
              </form>
            </div>

            {/* WEEKLY AVAILABILITY LIST */}

            <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
              <h2 className="text-xl font-semibold mb-5">
                Weekly Availability ({weeklyAvailability.length})
              </h2>

              {weeklyAvailability.length === 0 ? (
                <p>No weekly availability added yet.</p>
              ) : (
                <div className="space-y-3">
                  {weeklyAvailability.map((slot) => (
                    <div
                      key={slot._id}
                      className="flex flex-wrap justify-between items-center gap-3 border rounded-lg p-4"
                    >
                      <div>
                        <p className="font-semibold">
                          {days[slot.dayOfWeek] || "Unknown day"}
                        </p>

                        <p className="text-sm">
                          {slot.startTime} - {slot.endTime}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          handleDeleteAvailability(slot._id)
                        }
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BLOCK SPECIFIC DATE */}

            <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
              <h2 className="text-xl font-semibold mb-2">
                Block a Specific Date & Time
              </h2>

              <p className="text-sm mb-5">
                Temporarily prevent clients from booking during a
                particular time. Your regular weekly availability
                will remain unchanged.
              </p>

              <form
                onSubmit={handleBlockAvailability}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Select Date
                  </label>

                  <input
                    type="date"
                    name="date"
                    value={blockForm.date}
                    onChange={handleBlockChange}
                    min={new Date().toLocaleDateString("en-CA")}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Start Time
                  </label>

                  <input
                    type="time"
                    name="startTime"
                    value={blockForm.startTime}
                    onChange={handleBlockChange}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    End Time
                  </label>

                  <input
                    type="time"
                    name="endTime"
                    value={blockForm.endTime}
                    onChange={handleBlockChange}
                    required
                    className="w-full"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingBlock}
                  className="md:col-span-3 bg-red-600 text-white py-3 rounded-lg"
                >
                  {savingBlock ? "Blocking Time..." : "Block This Time"}
                </button>
              </form>
            </div>

            {/* BLOCKED TIMES LIST */}

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold mb-5">
                Blocked Dates ({blockedAvailability.length})
              </h2>

              {blockedAvailability.length === 0 ? (
                <p>No dates or times are currently blocked.</p>
              ) : (
                <div className="space-y-3">
                  {blockedAvailability.map((slot) => (
                    <div
                      key={slot._id}
                      className="flex flex-wrap justify-between items-center gap-3 border border-red-100 bg-red-50 rounded-lg p-4"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          {formatBlockedDate(slot.date)}
                        </p>

                        <p className="text-sm text-red-700">
                          {slot.startTime} - {slot.endTime}
                        </p>

                        <p className="text-xs mt-1">
                          Clients cannot book during this time.
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          handleDeleteAvailability(slot._id, true)
                        }
                        className="text-red-600 hover:underline font-medium"
                      >
                        Remove Block
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Schedule;
