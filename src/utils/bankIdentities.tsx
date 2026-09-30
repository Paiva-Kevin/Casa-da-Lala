import React from "react";
import { BancoId } from "../types/lala";

export interface IdentidadeBanco {
  id: BancoId;
  nomeBanco: string;
  sigla: string;
  corPrimaria: string;
  corSecundaria: string;
  corTextoBadge: string;
  gradiente: string;
  renderIcone: (size?: number) => React.ReactNode;
}

export const CATALOGO_BANCOS: Record<BancoId, IdentidadeBanco> = {
  nubank: {
    id: "nubank",
    nomeBanco: "Nubank",
    sigla: "Nu",
    corPrimaria: "#820AD1",
    corSecundaria: "#5B0694",
    corTextoBadge: "#FFFFFF",
    gradiente: "linear-gradient(135deg, #820AD1 0%, #530088 100%)",
    renderIcone: (size = 18) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 17V8.5C5 6.8 6.3 5.5 8 5.5C9.7 5.5 11 6.8 11 8.5V17M13 7V15.5C13 17.2 14.3 18.5 16 18.5C17.7 18.5 19 17.2 19 15.5V7"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  itau: {
    id: "itau",
    nomeBanco: "Itaú Unibanco",
    sigla: "Itaú",
    corPrimaria: "#EC7000",
    corSecundaria: "#003399",
    corTextoBadge: "#FFE600",
    gradiente: "linear-gradient(135deg, #EC7000 0%, #C85800 100%)",
    renderIcone: (size = 18) => (
      <span
        style={{
          fontSize: Math.max(9, Math.round(size * 0.56)),
          color: "#FFE600",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Itaú
      </span>
    ),
  },
  inter: {
    id: "inter",
    nomeBanco: "Banco Inter",
    sigla: "inter",
    corPrimaria: "#FF7A00",
    corSecundaria: "#E06300",
    corTextoBadge: "#FFFFFF",
    gradiente: "linear-gradient(135deg, #FF7A00 0%, #E05A00 100%)",
    renderIcone: (size = 18) => (
      <span
        style={{
          fontSize: Math.max(9, Math.round(size * 0.54)),
          color: "#FFFFFF",
          fontWeight: 900,
          letterSpacing: "-0.04em",
        }}
      >
        inter
      </span>
    ),
  },
  bradesco: {
    id: "bradesco",
    nomeBanco: "Bradesco",
    sigla: "BRA",
    corPrimaria: "#CC092F",
    corSecundaria: "#990522",
    corTextoBadge: "#FFFFFF",
    gradiente: "linear-gradient(135deg, #CC092F 0%, #8E041F 100%)",
    renderIcone: (size = 18) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 17C5 11.5 8.5 7 12 7C15.5 7 19 11.5 19 17"
          stroke="#FFFFFF"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d="M8.5 17C8.5 13.5 10 10.5 12 10.5C14 10.5 15.5 13.5 15.5 17"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M12 14V19" stroke="#FFFFFF" strokeWidth="2.3" strokeLinecap="round" />
      </svg>
    ),
  },
  santander: {
    id: "santander",
    nomeBanco: "Santander",
    sigla: "SAN",
    corPrimaria: "#EC0000",
    corSecundaria: "#B30000",
    corTextoBadge: "#FFFFFF",
    gradiente: "linear-gradient(135deg, #EC0000 0%, #A80000 100%)",
    renderIcone: (size = 18) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5C9.5 8 14.5 10.5 12 14C10 11.5 14 9 12 5Z"
          stroke="#FFFFFF"
          strokeWidth="2"
          fill="#FFFFFF"
        />
        <ellipse
          cx="12"
          cy="16.5"
          rx="6.5"
          ry="2.5"
          stroke="#FFFFFF"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  bb: {
    id: "bb",
    nomeBanco: "Banco do Brasil",
    sigla: "BB",
    corPrimaria: "#0038A8",
    corSecundaria: "#F8D117",
    corTextoBadge: "#F8D117",
    gradiente: "linear-gradient(135deg, #0038A8 0%, #00236B 100%)",
    renderIcone: (size = 18) => (
      <span
        style={{
          fontSize: Math.max(10, Math.round(size * 0.62)),
          color: "#F8D117",
          fontWeight: 900,
          letterSpacing: "-0.05em",
        }}
      >
        BB
      </span>
    ),
  },
  caixa: {
    id: "caixa",
    nomeBanco: "Caixa Econômica",
    sigla: "CEF",
    corPrimaria: "#005CA9",
    corSecundaria: "#F39200",
    corTextoBadge: "#FFFFFF",
    gradiente: "linear-gradient(135deg, #005CA9 0%, #003E75 100%)",
    renderIcone: (size = 18) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M6 7L18 17M18 7L6 17"
          stroke="#F39200"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  c6: {
    id: "c6",
    nomeBanco: "C6 Bank",
    sigla: "C6",
    corPrimaria: "#242424",
    corSecundaria: "#121212",
    corTextoBadge: "#FFFFFF",
    gradiente: "linear-gradient(135deg, #2B2B2B 0%, #121212 100%)",
    renderIcone: (size = 18) => (
      <span
        style={{
          fontSize: Math.max(10, Math.round(size * 0.62)),
          color: "#FFFFFF",
          fontWeight: 800,
          letterSpacing: "-0.04em",
        }}
      >
        C6
      </span>
    ),
  },
  picpay: {
    id: "picpay",
    nomeBanco: "PicPay",
    sigla: "Pic",
    corPrimaria: "#11C76F",
    corSecundaria: "#0B8F4E",
    corTextoBadge: "#FFFFFF",
    gradiente: "linear-gradient(135deg, #11C76F 0%, #0A874A 100%)",
    renderIcone: (size = 18) => (
      <span
        style={{
          fontSize: Math.max(10, Math.round(size * 0.58)),
          color: "#FFFFFF",
          fontWeight: 900,
        }}
      >
        P
      </span>
    ),
  },
  mercadopago: {
    id: "mercadopago",
    nomeBanco: "Mercado Pago",
    sigla: "MP",
    corPrimaria: "#009EE3",
    corSecundaria: "#007EB5",
    corTextoBadge: "#FFFFFF",
    gradiente: "linear-gradient(135deg, #009EE3 0%, #0071A8 100%)",
    renderIcone: (size = 18) => (
      <span
        style={{
          fontSize: Math.max(9, Math.round(size * 0.56)),
          color: "#FFFFFF",
          fontWeight: 900,
        }}
      >
        MP
      </span>
    ),
  },
  xp: {
    id: "xp",
    nomeBanco: "XP Investimentos",
    sigla: "XP",
    corPrimaria: "#1F2024",
    corSecundaria: "#FFC709",
    corTextoBadge: "#FFC709",
    gradiente: "linear-gradient(135deg, #23252A 0%, #111215 100%)",
    renderIcone: (size = 18) => (
      <span
        style={{
          fontSize: Math.max(10, Math.round(size * 0.6)),
          color: "#FFC709",
          fontWeight: 900,
        }}
      >
        XP
      </span>
    ),
  },
  btg: {
    id: "btg",
    nomeBanco: "BTG Pactual",
    sigla: "BTG",
    corPrimaria: "#001E62",
    corSecundaria: "#003399",
    corTextoBadge: "#FFFFFF",
    gradiente: "linear-gradient(135deg, #002984 0%, #001647 100%)",
    renderIcone: (size = 18) => (
      <span
        style={{
          fontSize: Math.max(9, Math.round(size * 0.52)),
          color: "#FFFFFF",
          fontWeight: 800,
        }}
      >
        BTG
      </span>
    ),
  },
  carteira: {
    id: "carteira",
    nomeBanco: "Carteira / Reserva",
    sigla: "R$",
    corPrimaria: "#2E6F5E",
    corSecundaria: "#1F4E42",
    corTextoBadge: "#FFFFFF",
    gradiente: "linear-gradient(135deg, #2E6F5E 0%, #1D4B3F 100%)",
    renderIcone: (size = 18) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="6"
          width="18"
          height="13"
          rx="3"
          stroke="#FFFFFF"
          strokeWidth="2.2"
        />
        <circle cx="16.5" cy="12.5" r="1.5" fill="#FFFFFF" />
      </svg>
    ),
  },
  outro: {
    id: "outro",
    nomeBanco: "Instituição Bancária",
    sigla: "BCO",
    corPrimaria: "#0284C7",
    corSecundaria: "#0369A1",
    corTextoBadge: "#FFFFFF",
    gradiente: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
    renderIcone: (size = 18) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M3 10L12 4L21 10M5 10V18M9.5 10V18M14.5 10V18M19 10V18M3 19H21"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
};

export function detectarBancoIdPorNome(
  nome: string,
  bancoIdExplicito?: BancoId
): BancoId {
  if (bancoIdExplicito && CATALOGO_BANCOS[bancoIdExplicito]) {
    return bancoIdExplicito;
  }
  const n = (nome || "").toLowerCase();
  if (n.includes("nubank") || n.includes("nu ") || n.includes("roxin") || n.includes("caixinha"))
    return "nubank";
  if (n.includes("itaú") || n.includes("itau") || n.includes("iti"))
    return "itau";
  if (n.includes("inter")) return "inter";
  if (n.includes("bradesco") || n.includes("next")) return "bradesco";
  if (n.includes("santander")) return "santander";
  if (n.includes("banco do brasil") || /\bbb\b/.test(n) || n.includes("ourocard"))
    return "bb";
  if (n.includes("caixa") || n.includes("cef") || n.includes("poupanca caixa"))
    return "caixa";
  if (n.includes("c6")) return "c6";
  if (n.includes("picpay")) return "picpay";
  if (n.includes("mercado pago") || n.includes("mercadopago"))
    return "mercadopago";
  if (/\bxp\b/.test(n) || n.includes("rico")) return "xp";
  if (n.includes("btg")) return "btg";
  if (
    n.includes("carteira") ||
    n.includes("dinheiro") ||
    n.includes("reserva") ||
    n.includes("espécie")
  )
    return "carteira";
  return "outro";
}

export function getIdentidadeBanco(
  nome: string,
  bancoIdExplicito?: BancoId,
  corCustom?: string
): IdentidadeBanco {
  const id = detectarBancoIdPorNome(nome, bancoIdExplicito);
  const base = CATALOGO_BANCOS[id] || CATALOGO_BANCOS.outro;
  if (id === "outro" && corCustom) {
    return {
      ...base,
      corPrimaria: corCustom,
      gradiente: `linear-gradient(135deg, ${corCustom} 0%, ${corCustom}CC 100%)`,
    };
  }
  return base;
}
