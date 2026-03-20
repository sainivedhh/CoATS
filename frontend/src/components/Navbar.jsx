import { useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div
      style={{
        padding: "10px 20px",
        background: "#1f2937",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <div>
        <b>CoATS</b> — {role}
      </div>

      <button
        onClick={handleLogout}
        style={{
          background: "#ef4444",
          border: "none",
          color: "white",
          padding: "6px 12px",
          cursor: "pointer",
          borderRadius: "4px"
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default Navbar;
