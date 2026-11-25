const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const br = (d) => d.split("-").reverse().join("/");
const KEY = "clinica-vet-v2";
const HORARIOS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

let dados = null;
let user = null;

const salvar = () => localStorage.setItem(KEY, JSON.stringify(dados));
const nomeDe = (cpf) => dados.users.find((u) => u.cpf === cpf)?.nome ?? "—";
const petsDoTutor = () => dados.pets.filter((p) => p.tutor === user.cpf);

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

$("#f-login").onsubmit = (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const u = dados.users.find((x) => x.cpf === f.get("cpf").trim() && x.senha === f.get("senha"));
  if (!u) {
    $("#e-login").textContent = "CPF ou senha incorretos. Confira os dados e tente de novo.";
    return;
  }
  $("#e-login").textContent = "";
  user = u;
  e.target.reset();
  entrar();
};

$("#f-cad").onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  f.cpf = f.cpf.trim();
  if (dados.users.some((u) => u.cpf === f.cpf)) {
    $("#e-cad").textContent = "Já existe uma conta com esse CPF.";
    return;
  }
  dados.users.push({ cpf: f.cpf, nome: f.nome, telefone: f.telefone, email: f.email, senha: f.senha, perfil: "tutor" });
  salvar();
  $("#e-cad").textContent = "";
  e.target.reset();
  aviso("Conta criada. Faça login para continuar.");
  ir("login");
};

$("#f-pet").onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  dados.pets.push({ id: dados.seq++, tutor: user.cpf, nome: f.nome.trim(), especie: f.especie.trim(), raca: f.raca.trim(), nasc: f.nasc });
  salvar();
  e.target.reset();
  aviso("Pet cadastrado.");
  ir("menu");
};

function renderAgendar() {
  const pets = petsDoTutor();
  $("#sem-pet").hidden = pets.length > 0;
  $("#f-ag").hidden = pets.length === 0;
  const f = $("#f-ag");
  f.pet.innerHTML = pets.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join("");
  f.vet.innerHTML = dados.users.filter((u) => u.perfil === "veterinario").map((v) => `<option value="${v.cpf}">${esc(v.nome)}</option>`).join("");
  f.hora.innerHTML = HORARIOS.map((h) => `<option>${h}</option>`).join("");
  f.data.min = new Date().toISOString().slice(0, 10);
  $("#e-ag").textContent = "";
}

$("#f-ag").onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (dados.consultas.some((c) => c.vet === f.vet && c.data === f.data && c.hora === f.hora)) {
    $("#e-ag").textContent = "Esse horário já está ocupado para o veterinário escolhido. Escolha outro horário.";
    return;
  }
  const pet = dados.pets.find((p) => p.id === Number(f.pet));
  dados.consultas.push({ id: dados.seq++, pet: pet.id, vet: f.vet, data: f.data, hora: f.hora, obs: [] });
  salvar();
  $("#resumo").innerHTML = `<b>Pet:</b> ${esc(pet.nome)}<br><b>Veterinário:</b> ${esc(nomeDe(f.vet))}<br><b>Data:</b> ${br(f.data)}<br><b>Horário:</b> ${f.hora}`;
  ir("confirmacao");
};

const ordenar = (a, b) => (a.data + a.hora).localeCompare(b.data + b.hora);

function renderMenu() {
  const ids = petsDoTutor().map((p) => p.id);
  const lista = dados.consultas.filter((c) => ids.includes(c.pet)).sort(ordenar);
  $("#proximas").innerHTML = lista.length
    ? lista.map((c) => {
        const pet = dados.pets.find((p) => p.id === c.pet);
        return `<div class="item item-topo">
          <div><b>${esc(pet.nome)}</b> com ${esc(nomeDe(c.vet))}<br><small>${br(c.data)} às ${c.hora}</small></div>
          <button type="button" class="perigo" data-cancelar="${c.id}">Cancelar</button>
        </div>`;
      }).join("")
    : `<p class="vazio">Você ainda não tem consultas agendadas.</p>`;
}

$("#proximas").onclick = (e) => {
  const id = e.target.dataset.cancelar;
  if (!id || !confirm("Cancelar esta consulta?")) return;
  dados.consultas = dados.consultas.filter((c) => c.id !== Number(id));
  salvar();
  aviso("Consulta cancelada.");
  renderMenu();
};

function renderHistorico() {
  const pets = petsDoTutor();
  $("#sel-hist").innerHTML = pets.length
    ? pets.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join("")
    : `<option value="">Nenhum pet cadastrado</option>`;
  mostrarHistorico();
}

function mostrarHistorico() {
  const id = Number($("#sel-hist").value);
  const lista = dados.consultas.filter((c) => c.pet === id).sort(ordenar);
  $("#corpo-hist").innerHTML = lista.length
    ? lista.map((c) => `<tr><td>${br(c.data)}</td><td>${esc(nomeDe(c.vet))}</td><td>${c.obs.length ? c.obs.map(esc).join("<br>") : "—"}</td></tr>`).join("")
    : `<tr><td colspan="3" class="vazio">Nenhuma consulta registrada para este pet.</td></tr>`;
}
$("#sel-hist").onchange = mostrarHistorico;

function renderVet() {
  const lista = dados.consultas.filter((c) => c.vet === user.cpf).sort(ordenar);
  $("#lista-vet").innerHTML = lista.length
    ? lista.map((c) => {
        const pet = dados.pets.find((p) => p.id === c.pet);
        return `<div class="item">
          <div class="item-topo"><div><b>${esc(pet.nome)}</b> (${esc(pet.especie)})<br><small>Tutor: ${esc(nomeDe(pet.tutor))}</small></div>
          <small>${br(c.data)} às ${c.hora}</small></div>
          ${c.obs.length ? `<ul class="obs">${c.obs.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>` : ""}
          <form class="f-obs" data-id="${c.id}">
            <textarea name="texto" rows="2" placeholder="Escreva uma observação sobre o atendimento" required></textarea>
            <button class="prim">Salvar observação</button>
          </form>
        </div>`;
      }).join("")
    : `<p class="vazio">Nenhuma consulta agendada para você.</p>`;
}

$("#lista-vet").onsubmit = (e) => {
  e.preventDefault();
  const c = dados.consultas.find((x) => x.id === Number(e.target.dataset.id));
  const texto = e.target.texto.value.trim();
  if (!c || c.vet !== user.cpf || !texto) return;
  c.obs.push(texto);
  salvar();
  aviso("Observação salva no histórico.");
  renderVet();
};

function renderAdmin() {
  $("#corpo-users").innerHTML = dados.users.map((u) => `<tr>
    <td>${esc(u.nome)}</td><td>${esc(u.cpf)}</td><td>${esc(u.perfil)}</td>
    <td>${u.cpf === user.cpf ? "" : `<button type="button" class="perigo" data-remover="${esc(u.cpf)}">Remover</button>`}</td>
  </tr>`).join("");
}

$("#f-vet").onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  f.cpf = f.cpf.trim();
  if (dados.users.some((u) => u.cpf === f.cpf)) {
    $("#e-vet").textContent = "Já existe uma conta com esse CPF.";
    return;
  }
  dados.users.push({ cpf: f.cpf, nome: f.nome, senha: f.senha, perfil: "veterinario" });
  salvar();
  $("#e-vet").textContent = "";
  e.target.reset();
  aviso("Veterinário cadastrado.");
  renderAdmin();
};

$("#corpo-users").onclick = (e) => {
  const cpf = e.target.dataset.remover;
  if (!cpf || !confirm("Remover esta conta? Pets e consultas ligados a ela também serão removidos.")) return;
  const petsRemovidos = dados.pets.filter((p) => p.tutor === cpf).map((p) => p.id);
  dados.users = dados.users.filter((u) => u.cpf !== cpf);
  dados.pets = dados.pets.filter((p) => p.tutor !== cpf);
  dados.consultas = dados.consultas.filter((c) => c.vet !== cpf && !petsRemovidos.includes(c.pet));
  salvar();
  aviso("Conta removida.");
  renderAdmin();
};

(function iniciar() {
  try { dados = JSON.parse(localStorage.getItem(KEY)); } catch { dados = null; }
  if (!dados) {
    dados = {
      seq: 1,
      users: [
        { cpf: "111", nome: "Dra. Ana", senha: "123", perfil: "veterinario" },
        { cpf: "222", nome: "Dr. Carlos", senha: "123", perfil: "veterinario" },
        { cpf: "000", nome: "Administrador", senha: "123", perfil: "administrador" },
      ],
      pets: [],
      consultas: [],
    };
    salvar();
  }
  ir("login");
})();