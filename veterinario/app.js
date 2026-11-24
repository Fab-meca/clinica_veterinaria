const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const br = (d) => d.split("-").reverse().join("/");
const KEY = "clinica-vet";
const HORARIOS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

let db = null;
let user = null;

async function hash(texto) {
  if (!window.crypto || !crypto.subtle) return btoa(texto);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const salvar = () => localStorage.setItem(KEY, JSON.stringify(db));
const nomeDe = (cpf) => db.users.find((u) => u.cpf === cpf)?.nome ?? "—";
const petsDoTutor = () => db.pets.filter((p) => p.tutor === user.cpf);

function aviso(msg) {
  const el = $("#aviso");
  el.textContent = msg;
  el.classList.add("on");
  setTimeout(() => el.classList.remove("on"), 2500);
}

const INICIO = { tutor: "menu", veterinario: "vet", administrador: "admin" };
const ACESSO = { menu: "tutor", pet: "tutor", agendar: "tutor", confirmacao: "tutor", historico: "tutor", vet: "veterinario", admin: "administrador" };
const RENDER = { menu: renderMenu, agendar: renderAgendar, historico: renderHistorico, vet: renderVet, admin: renderAdmin };

function ir(id) {
  if (ACESSO[id] && (!user || user.perfil !== ACESSO[id])) {
    aviso("Acesso negado para o seu perfil.");
    return;
  }
  $$(".tela").forEach((t) => (t.hidden = t.id !== id));
  RENDER[id]?.();
  window.scrollTo(0, 0);
}

document.addEventListener("click", (e) => {
  const alvo = e.target.closest("[data-ir]");
  if (alvo) ir(alvo.dataset.ir);
});

function entrar() {
  $("#sessao").hidden = false;
  $("#quem").textContent = user.nome;
  ir(INICIO[user.perfil]);
}

$("#sair").onclick = () => {
  user = null;
  $("#sessao").hidden = true;
  ir("login");
};

$("#f-login").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const h = await hash(f.get("senha"));
  const u = db.users.find((x) => x.cpf === f.get("cpf").trim() && x.hash === h);
  if (!u) {
    $("#e-login").textContent = "CPF ou senha incorretos. Confira os dados e tente de novo.";
    return;
  }
  $("#e-login").textContent = "";
  user = u;
  e.target.reset();
  entrar();
};

$("#f-cad").onsubmit = async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  f.cpf = f.cpf.trim();
  if (db.users.some((u) => u.cpf === f.cpf)) {