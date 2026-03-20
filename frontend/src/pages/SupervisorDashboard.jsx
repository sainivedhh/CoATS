import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function groupByBranch(cases) {
  return cases.reduce((acc, c) => {
    acc[c.branch] = acc[c.branch] || [];
    acc[c.branch].push(c);
    return acc;
  }, {});
}

function SupervisorDashboard() {
  const [pending, setPending] = useState({});
  const [closed, setClosed] = useState({});
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const token = localStorage.getItem("access");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    fetch("http://127.0.0.1:8002/api/supervisor/overview/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setPending(groupByBranch(data.pending));
        setClosed(groupByBranch(data.closed));
      });

    // 🔒 Disable back to login
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => {
      window.history.pushState(null, "", window.location.href);
    };

    return () => {
      window.onpopstate = null;
    };
  }, []);

  const renderSection = (title, data) => (
    <>
      <h2>{title}</h2>
      {Object.keys(data).map((branch) => (
        <div key={branch}>
          <h3>{branch}</h3>
          <ul>
            {data[branch].map((c) => (
              <li
                key={c.id}
                style={{ cursor: "pointer", marginBottom: "8px" }}
                onClick={() => navigate(`/cases/${c.id}`)}
              >
                {c.crime_number} — {c.section_of_law}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <div style={{ textAlign: "right", marginBottom: "20px" }}>
        <button onClick={handleLogout}>Logout</button>
      </div>

      {renderSection("Pending Cases", pending)}
      {renderSection("Closed Cases", closed)}
    </div>
  );
}

export default SupervisorDashboard;
