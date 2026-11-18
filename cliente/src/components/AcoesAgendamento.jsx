import { useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../auth";
import * as s from "../styles";
import { dataBR, erroApi } from "../utils";

// Botões de ação de um agendamento (usados na agenda e na lista).
// Cancelar abre uma janela com motivo e a opção de avisar o cliente no WhatsApp.
export default function AcoesAgendamento({ ag, onEditar, onAlterado, onErro, compacto }) {
  const { podeAgendar, ehProfissional } = useAuth();
  const [cancelando, setCancelando] = useState(false);

  const mudarStatus = async (status, extra = {}) => {
    try {
      await api.patch(`/agendamentos/${ag.id}/status`, { status, ...extra });
      onAlterado(status === "cancelado" ? `Agendamento cancelado${extra.avisarCliente && ag.telefone ? " e cliente avisado no WhatsApp" : ""}.` : "Status atualizado.");
    } catch (e) {
      onErro(erroApi(e, "Não foi possível alterar o status."));
    }
  };

  const remover = async () => {
    if (!window.confirm(`Remover de vez o agendamento de ${ag.clienteNome}? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/agendamentos/${ag.id}`);
      onAlterado("Agendamento removido.");
    } catch (e) {
      onErro(erroApi(e, "Não foi possível remover."));
    }
  };

  const b = { ...s.linkBtn, fontSize: compacto ? 12 : 13 };
  const ativo = ag.status === "agendado" || ag.status === "confirmado";
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {podeAgendar && <button type="button" style={b} onClick={() => onEditar(ag)}>Editar</button>}
      {ag.status === "agendado" && <button type="button" style={b} onClick={() => mudarStatus("confirmado")}>Confirmar</button>}
      {ativo && <button type="button" style={{ ...b, color: "#6FD69A" }} onClick={() => mudarStatus("concluido")}>Concluir</button>}
      {ativo && <button type="button" style={{ ...b, color: "#F0B060" }} onClick={() => mudarStatus("faltou")}>Faltou</button>}
      {ativo && !ehProfissional && <button type="button" style={{ ...b, color: "#9AA0AA" }} onClick={() => setCancelando(true)}>Cancelar</button>}
      {podeAgendar && <button type="button" style={{ ...b, color: "#F28B8B" }} onClick={remover}>Remover</button>}
      {cancelando && (
        <CancelarModal
          ag={ag}
          onClose={() => setCancelando(false)}
          onConfirmar={(motivo, avisar) => {
            setCancelando(false);
            mudarStatus("cancelado", { motivoCancelamento: motivo || null, avisarCliente: avisar });
          }}
        />
      )}
    </div>
  );
}

function CancelarModal({ ag, onClose, onConfirmar }) {
  const [motivo, setMotivo] = useState("");
  const [avisar, setAvisar] = useState(true);
  return (
    <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 440 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800 }}>Cancelar agendamento</h2>
        <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "#9AA0AA" }}>
          {ag.clienteNome} · {dataBR(ag.data)} às {ag.inicio} com {ag.profissionalNome}
        </p>
        <label style={s.label}>Motivo (opcional, vai na mensagem ao cliente)</label>
        <input style={s.input} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: profissional doente" />
        {ag.telefone ? (
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} style={{ accentColor: s.OURO }} />
            Avisar o cliente no WhatsApp
          </label>
        ) : (
          <p style={{ fontSize: 12.5, color: "#6E7482", marginTop: 12 }}>Sem telefone cadastrado: o cliente não será avisado.</p>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button style={s.btnSecondary} onClick={onClose}>Voltar</button>
          <button style={{ ...s.btnDanger, background: "#F28B8B", color: "#13171D", borderColor: "#F28B8B" }} onClick={() => onConfirmar(motivo, avisar)}>Cancelar agendamento</button>
        </div>
      </div>
    </div>
  );
}
