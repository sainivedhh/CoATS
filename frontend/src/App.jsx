import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login          from "./pages/Login";
import Cases          from "./pages/Cases";
import CreateCase     from "./pages/CreateCase";
import CaseDetail     from "./pages/CaseDetail";
import COATSDashboard from "./pages/COATSDashboard";
import CaseLogs       from "./pages/CaseLogs";
import ChainOfCustody from "./pages/ChainOfCustody";
import ProgressUpdate from "./pages/ProgressUpdate";
import ProtectedRoute from "./components/ProtectedRoute";
import useIdleTimeout from "./hooks/useIdleTimeout";

function IdleTimer() {
  const handleIdle = () => {
    if (localStorage.getItem("access_token")) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("role");
      alert("Session expired due to inactivity. Please log in again.");
      window.location.href = "/login";
    }
  };

  useIdleTimeout({ onIdle: handleIdle, idleTime: 15 * 60 * 1000 }); // 15 mins

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <IdleTimer />
      <Routes>
        <Route path="/"            element={<RoleRedirect />} />
        <Route path="/login"       element={<Login />} />

        <Route path="/cases"            element={<ProtectedRoute><Cases /></ProtectedRoute>} />
        <Route path="/cases/:id"        element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
        <Route path="/cases/:id/progress" element={<ProtectedRoute><ProgressUpdate /></ProtectedRoute>} />
        <Route path="/create-case"      element={<ProtectedRoute><CreateCase /></ProtectedRoute>} />

        <Route path="/dashboard"        element={<ProtectedRoute><COATSDashboard /></ProtectedRoute>} />
        <Route path="/logs"             element={<ProtectedRoute><CaseLogs /></ProtectedRoute>} />
        <Route path="/cases/:id/custody" element={<ProtectedRoute><ChainOfCustody /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function RoleRedirect() {
  const role = localStorage.getItem("role");
  if (role === "SUPERVISOR") return <Navigate to="/dashboard" replace />;
  if (role === "CASE")       return <Navigate to="/cases"     replace />;
  return <Navigate to="/login" replace />;
}

export default App;
