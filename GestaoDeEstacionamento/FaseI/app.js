// ─────────────────────────────────────────────────────────────────────────────
// app.js
// Ponto de entrada do sistema EstACME — Fase 2.
// ─────────────────────────────────────────────────────────────────────────────

import * as Hierarquia  from "./hierarquia.js";
import * as Composicoes from "./composicoes.js";
import { Interface }    from "./interface.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ARQUIVO_CLIENTES = join(__dirname, "data", "clientes.csv");
const ARQUIVO_TICKETS  = join(__dirname, "data", "tickets.csv");

// ─── App ──────────────────────────────────────────────────────────────────────

class App {
  #cadastroClientes;
  #registroEntradaSaida;
  #relatorios;

  constructor() {
    this.#cadastroClientes     = new Composicoes.CadastroClientes();
    this.#registroEntradaSaida = new Composicoes.RegistroDeEntradas_E_Saidas(this.#cadastroClientes);
    this.#relatorios           = new Composicoes.RelatoriosGerenciais(
      this.#cadastroClientes,
      this.#registroEntradaSaida
    );
  }

  async inicializar() {
    console.log("\n  Carregando dados...");
    await this.#cadastroClientes.carregarDeCSV(ARQUIVO_CLIENTES);
    await this.#registroEntradaSaida.carregarDeCSV(ARQUIVO_TICKETS);
    console.log("  ✔ Dados carregados.");
  }

  async encerrar() {
    console.log("\n  Salvando dados...");
    await this.#cadastroClientes.salvarParaCSV(ARQUIVO_CLIENTES);
    await this.#registroEntradaSaida.salvarParaCSV(ARQUIVO_TICKETS);
    console.log("  ✔ Dados salvos. Até logo!");
  }

  registrarEntrada(placa, dataHora = new Date()) {
    return this.#registroEntradaSaida.registrarEntrada(placa, dataHora);
  }

  registrarSaida(placa, dataHora = new Date(), recusouPagar = false) {
    return this.#registroEntradaSaida.registrarSaida(placa, dataHora, recusouPagar);
  }

  get cadastro()   { return this.#cadastroClientes; }
  get relatorios() { return this.#relatorios; }
}

// ─── Inicialização ────────────────────────────────────────────────────────────

const app = new App();
await app.inicializar();

const ui = new Interface(app);
await ui.iniciar();

await app.encerrar();
