import { useNavigate } from "react-router-dom";
import useStore from "../store/useStore";
import MATCHES from "../data/matches";

const s = `
  .sidebar { background:white;border-right:1px solid var(--warm);padding:28px 16px;position:sticky;top:72px;height:calc(100vh - 72px);overflow-y:auto;display:flex;flex-direction:column;gap:4px;z-index:5; }
  .sidebar-user { display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--warm);padding-bottom:20px;margin-bottom:20px; }
  .user-avatar { width:44px;height:44px;border-radius:50%;background:rgba(193,122,90,.15);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0; }
  .user-name   { font-family:'Lora',serif;font-size:15px;color:var(--dark); }
  .user-status { font-size:12px;color:var(--green); }
  .nav-section { font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--soft);padding:0 14px;margin:8px 0 6px;font-weight:500; }
  .nav-item { display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:12px;cursor:pointer;transition:.2s;font-size:14px;color:var(--mid); }
  .nav-item:hover  { background:var(--cream);color:var(--dark); }
  .nav-item.active { background:rgba(193,122,90,.1);color:var(--terra); }
  .nav-item .icon  { font-size:18px;width:24px;text-align:center;flex-shrink:0; }
  .nav-badge { margin-left:auto;background:var(--terra);color:white;font-size:10px;font-weight:600;padding:2px 7px;border-radius:100px; }
  .sidebar-footer { margin-top:auto;padding-top:16px;border-top:1px solid var(--warm); }
`;

export default function Sidebar() {
  const navigate = useNavigate();
  const user  = useStore((s) => s.user);
  const panel = useStore((s) => s.panel);
  const setPanel = useStore((s) => s.setPanel);

  const unreadCount = MATCHES.filter((m) => m.unread).length;

  const items = [
    { id: "kindreds",      icon: "✨", label: "Kindreds",       badge: MATCHES.length },
    { id: "conversations", icon: "💬", label: "Conversaciones", badge: unreadCount },
    { id: "map",           icon: "🌌", label: "Tu mapa",        badge: 0 },
  ];

  return (
    <>
      <style>{s}</style>
      <div className="sidebar">
        <div className="sidebar-user">
          <div className="user-avatar">🌱</div>
          <div>
            <div className="user-name">{user.name || "Tú"}</div>
            <div className="user-status">● En línea</div>
          </div>
        </div>

        <div className="nav-section">Principal</div>
        {items.map((item) => (
          <div key={item.id} className={`nav-item ${panel === item.id ? "active" : ""}`} onClick={() => setPanel(item.id)}>
            <span className="icon">{item.icon}</span>
            {item.label}
            {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
          </div>
        ))}

        <div className="nav-section" style={{ marginTop: 16 }}>Cuenta</div>
        <div className="nav-item" onClick={() => navigate("/")}>
          <span className="icon">🚪</span> Salir
        </div>
      </div>
    </>
  );
}