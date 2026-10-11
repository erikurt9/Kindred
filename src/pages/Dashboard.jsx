import useStore from "../store/useStore";
import Sidebar from "../components/Sidebar";
import Kindreds from "../components/panels/Kindreds";
import Conversations from "../components/panels/Conversations";
import PersonalityMap from "../components/panels/PersonalityMap";

const s = `
  .dashboard { min-height:100vh;padding-top:72px;display:grid;grid-template-columns:260px 1fr;position:relative; }
  .main { padding:40px 52px;overflow-y:auto;position:relative;z-index:5; }
`;

export default function Dashboard() {
  const panel = useStore((s) => s.panel);

  return (
    <>
      <style>{s}</style>
      <div className="dashboard">
        <Sidebar />
        <div className="main">
          {panel === "kindreds"      && <Kindreds />}
          {panel === "conversations" && <Conversations />}
          {panel === "map"           && <PersonalityMap />}
        </div>
      </div>
    </>
  );
}