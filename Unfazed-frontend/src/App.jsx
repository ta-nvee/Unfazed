
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Public Homepage
import Home from "./pages/home/Home";

// Authentication
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ClientLogin from "./pages/auth/ClientLogin";
import ClientRegister from "./pages/auth/ClientRegister";

// Therapist Pages
import Dashboard from "./pages/therapist/Dashboard";
import Clients from "./pages/therapist/Clients";
import Schedule from "./pages/therapist/Schedule";
import Notes from "./pages/therapist/Notes";
import Analytics from "./pages/therapist/Analytics";
import Leads from "./pages/therapist/Leads";
import Chat from "./pages/therapist/Chat";
import Subscription from "./pages/therapist/Subscription";
import Packages from "./pages/therapist/Packages";

// Client Pages
import Payment from "./pages/client/Payment";
import ClientPortal from "./pages/client/ClientPortal";
import BookingPage from "./pages/client/BookingPage";
import IntakeForm from "./pages/client/IntakeForm";
import TherapistExplore from "./pages/client/TherapistExplore";

// Client Route Protection
function ProtectedClientRoute({ children }) {
  const token = localStorage.getItem("clientToken");

  if (!token) {
    return <Navigate to="/client/login" replace />;
  }

  return children;
}

// Therapist Route Protection
function ProtectedTherapistRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Homepage */}
        <Route path="/" element={<Home />} />

        {/* Therapist Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Client Authentication */}
        <Route path="/client/login" element={<ClientLogin />} />
        <Route path="/client/register" element={<ClientRegister />} />

        {/* Therapist Dashboard */}
        <Route
          path="/therapist/dashboard"
          element={
            <ProtectedTherapistRoute>
              <Dashboard />
            </ProtectedTherapistRoute>
          }
        />

        <Route
          path="/therapist/clients"
          element={
            <ProtectedTherapistRoute>
              <Clients />
            </ProtectedTherapistRoute>
          }
        />

        <Route
          path="/therapist/schedule"
          element={
            <ProtectedTherapistRoute>
              <Schedule />
            </ProtectedTherapistRoute>
          }
        />

        <Route
          path="/therapist/notes"
          element={
            <ProtectedTherapistRoute>
              <Notes />
            </ProtectedTherapistRoute>
          }
        />

        <Route
          path="/therapist/analytics"
          element={
            <ProtectedTherapistRoute>
              <Analytics />
            </ProtectedTherapistRoute>
          }
        />

        <Route
          path="/therapist/payment"
          element={
            <ProtectedTherapistRoute>
              <Payment />
            </ProtectedTherapistRoute>
          }
        />

        <Route
          path="/therapist/leads"
          element={
            <ProtectedTherapistRoute>
              <Leads />
            </ProtectedTherapistRoute>
          }
        />

        <Route
          path="/therapist/chat"
          element={
            <ProtectedTherapistRoute>
              <Chat />
            </ProtectedTherapistRoute>
          }
        />

        <Route
          path="/therapist/subscription"
          element={
            <ProtectedTherapistRoute>
              <Subscription />
            </ProtectedTherapistRoute>
          }
        />

        <Route
          path="/therapist/packages"
          element={
            <ProtectedTherapistRoute>
              <Packages />
            </ProtectedTherapistRoute>
          }
        />

        {/* Protected Client Pages */}
        <Route
          path="/client/portal"
          element={
            <ProtectedClientRoute>
              <ClientPortal />
            </ProtectedClientRoute>
          }
        />

        <Route
          path="/client/intake"
          element={
            <ProtectedClientRoute>
              <IntakeForm />
            </ProtectedClientRoute>
          }
        />

        {/* Public Client Pages */}
        <Route
          path="/client/explore"
          element={<TherapistExplore />}
        />

        {/* Public Therapist Profile / Booking */}
        <Route path="/:slug" element={<BookingPage />} />

        {/* Invalid URL */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
