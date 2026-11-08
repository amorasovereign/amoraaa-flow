import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Agenda from "./pages/Agenda";
import Agendamentos from "./pages/Agendamentos";
import Financeiro from "./pages/Financeiro";
import Servicos from "./pages/Servicos";
import Profissionais from "./pages/Profissionais";
import Configuracoes from "./pages/Configuracoes";
import Negocios from "./pages/admin/Negocios";
import Usuarios from "./pages/admin/Usuarios";

function Protegida({ children, quando = true }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <div style={{ padding: 40, color: "#A3A3A3" }}>Carregando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!quando) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { ehAdmin, podeGerir, podeAgendar, negocioId } = useAuth();
  // Admin sem negócio selecionado vai para a lista de negócios
  const precisaNegocio = (el) => (ehAdmin && !negocioId ? <Navigate to="/admin/negocios" replace /> : el);
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protegida>
            <Layout />
          </Protegida>
        }
      >
        <Route path="/" element={precisaNegocio(<Agenda />)} />
        <Route path="/agendamentos" element={precisaNegocio(<Agendamentos />)} />
        <Route path="/financeiro" element={<Protegida quando={podeAgendar}>{precisaNegocio(<Financeiro />)}</Protegida>} />
        <Route path="/profissionais" element={<Protegida quando={podeGerir}>{precisaNegocio(<Profissionais />)}</Protegida>} />
        <Route path="/servicos" element={<Protegida quando={podeGerir}>{precisaNegocio(<Servicos />)}</Protegida>} />
        <Route path="/configuracoes" element={<Protegida quando={podeGerir}>{precisaNegocio(<Configuracoes />)}</Protegida>} />
        <Route path="/admin/negocios" element={<Protegida quando={ehAdmin}><Negocios /></Protegida>} />
        <Route path="/admin/usuarios" element={<Protegida quando={ehAdmin}><Usuarios /></Protegida>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
