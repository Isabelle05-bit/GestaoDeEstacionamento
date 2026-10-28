// ─────────────────────────────────────────────────────────────────────────────
// interface.js
// Interface com o usuário via terminal (menu interativo).
// ─────────────────────────────────────────────────────────────────────────────

import * as readline from "readline";
import * as Hierarquia  from "./hierarquia.js";
import * as Composicoes from "./composicoes.js";

export class Interface {
  #app;
  #rl;

  constructor(app) {
    this.#app = app;
    this.#rl  = readline.createInterface({
      input:  process.stdin,
      output: process.stdout,
    });
  }

  // ── Pergunta ao usuário ────────────────────────────────────────────────────

  #perguntar(texto) {
    return new Promise(resolve => this.#rl.question(texto, resolve));
  }

  // ── Menu principal ─────────────────────────────────────────────────────────

  async iniciar() {
    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║   EstACME — Controle de Estacionamento  ║");
    console.log("╚══════════════════════════════════════════╝");

    let rodando = true;
    while (rodando) {
      console.log("\n──────────────────────────────────────────");
      console.log("  MENU PRINCIPAL");
      console.log("──────────────────────────────────────────");
      console.log("  1. Cadastro de clientes");
      console.log("  2. Entrada de veículo");
      console.log("  3. Saída de veículo");
      console.log("  4. Relatórios");
      console.log("  5. Salvar e sair");
      console.log("──────────────────────────────────────────");

      const opcao = await this.#perguntar("  Escolha uma opção: ");

      switch (opcao.trim()) {
        case "1": await this.#menuCadastro();   break;
        case "2": await this.#menuEntrada();    break;
        case "3": await this.#menuSaida();      break;
        case "4": await this.#menuRelatorios(); break;
        case "5": rodando = false;              break;
        default:  console.log("  ✘ Opção inválida.");
      }
    }

    this.#rl.close();
  }

  // ── Menu Cadastro ──────────────────────────────────────────────────────────

  async #menuCadastro() {
    console.log("\n  CADASTRO DE CLIENTES");
    console.log("  1. Cadastrar cliente");
    console.log("  2. Adicionar placa a cliente");
    console.log("  3. Remover placa de cliente");
    console.log("  4. Listar clientes");
    console.log("  0. Voltar");

    const opcao = await this.#perguntar("  Opção: ");

    switch (opcao.trim()) {
      case "1": await this.#cadastrarCliente(); break;
      case "2": await this.#adicionarPlaca();   break;
      case "3": await this.#removerPlaca();     break;
      case "4": this.#listarClientes();         break;
    }
  }

  async #cadastrarCliente() {
    console.log("\n  Tipo: 1-Estudante  2-Professor  3-Empresa");
    const tipo = await this.#perguntar("  Tipo: ");

    if (tipo === "1") {
      const cpf      = await this.#perguntar("  CPF: ");
      const nome     = await this.#perguntar("  Nome: ");
      const creditos = parseFloat(await this.#perguntar("  Créditos iniciais: "));
      const cliente  = new Hierarquia.Estudante(cpf, nome, creditos);
      const r = this.#app.cadastro.cadastrarCliente(cliente);
      console.log(`  ${r.ok ? "✔" : "✘"} ${r.motivo}`);

    } else if (tipo === "2") {
      const cpf   = await this.#perguntar("  CPF: ");
      const nome  = await this.#perguntar("  Nome: ");
      const depto = await this.#perguntar("  Departamento: ");
      const cliente = new Hierarquia.Professor(cpf, nome, depto);
      const r = this.#app.cadastro.cadastrarCliente(cliente);
      console.log(`  ${r.ok ? "✔" : "✘"} ${r.motivo}`);

    } else if (tipo === "3") {
      const cnpj  = await this.#perguntar("  CNPJ: ");
      const nome  = await this.#perguntar("  Nome: ");
      const cliente = new Hierarquia.Empresa(cnpj, nome);
      const r = this.#app.cadastro.cadastrarCliente(cliente);
      console.log(`  ${r.ok ? "✔" : "✘"} ${r.motivo}`);
    }
  }

  async #adicionarPlaca() {
    const doc   = await this.#perguntar("  Documento do cliente: ");
    const placa = await this.#perguntar("  Placa: ");
    const r = this.#app.cadastro.adicionarPlacaCliente(doc, placa);
    console.log(`  ${r.ok ? "✔" : "✘"} ${r.motivo}`);
  }

  async #removerPlaca() {
    const doc   = await this.#perguntar("  Documento do cliente: ");
    const placa = await this.#perguntar("  Placa: ");
    const r = this.#app.cadastro.removerPlacaCliente(doc, placa);
    console.log(`  ${r.ok ? "✔" : "✘"} ${r.motivo}`);
  }

  #listarClientes() {
    const clientes = this.#app.cadastro.listarClientes();
    if (clientes.length === 0) {
      console.log("  Nenhum cliente cadastrado.");
      return;
    }
    console.log("\n  CLIENTES CADASTRADOS:");
    clientes.forEach(c => console.log(`  • ${c}`));
  }

  // ── Menu Entrada ───────────────────────────────────────────────────────────

  async #menuEntrada() {
    const placa = await this.#perguntar("\n  Placa do veículo: ");
    const r = this.#app.registrarEntrada(placa.toUpperCase());
    console.log(`  ${r.ok ? "✔" : "✘"} ${r.motivo}`);
  }

  // ── Menu Saída ─────────────────────────────────────────────────────────────

  async #menuSaida() {
    const placa = await this.#perguntar("\n  Placa do veículo: ");
    const r     = this.#app.registrarSaida(placa.toUpperCase());
    console.log(`  ${r.ok ? "✔" : "✘"} ${r.motivo}`);
    if (r.ticket) {
      console.log(`  Custo bruto:  R$${r.ticket.custoBruto.toFixed(2)}`);
      console.log(`  Desconto:     ${r.ticket.descontoId}`);
      console.log(`  Valor pago:   R$${r.ticket.valorPago.toFixed(2)}`);
    }
  }

  // ── Menu Relatórios ────────────────────────────────────────────────────────

  async #menuRelatorios() {
    console.log("\n  RELATÓRIOS");
    console.log("  1. Total arrecadado por período");
    console.log("  2. Situação de cliente");
    console.log("  3. Registros de cliente cadastrado");
    console.log("  4. Registros de cliente avulso");
    console.log("  5. Clientes bloqueados");
    console.log("  6. Top 10 mais frequentes");
    console.log("  0. Voltar");

    const opcao = await this.#perguntar("  Opção: ");

    switch (opcao.trim()) {
      case "1": await this.#relatorioTotalArrecadado();       break;
      case "2": await this.#relatorioSituacaoCliente();       break;
      case "3": await this.#relatorioClienteCadastrado();     break;
      case "4": await this.#relatorioClienteAvulso();         break;
      case "5": this.#relatorioClientesBloqueados();          break;
      case "6": this.#relatorioTop10();                       break;
    }
  }

  async #relatorioTotalArrecadado() {
    const inicioStr = await this.#perguntar("  Data início (YYYY-MM-DD): ");
    const fimStr    = await this.#perguntar("  Data fim    (YYYY-MM-DD): ");
    const inicio    = new Date(inicioStr);
    const fim       = new Date(fimStr + "T23:59:59");

    const { total, tickets } = this.#app.relatorios.totalArrecadado(inicio, fim);
    console.log(`\n  Total arrecadado: R$${total.toFixed(2)}`);
    console.log(`  Registros: ${tickets.length}`);
    tickets.forEach(t => console.log(`  • ${t}`));
  }

  async #relatorioSituacaoCliente() {
    const doc = await this.#perguntar("  Documento do cliente: ");
    const sit = this.#app.relatorios.situacaoCliente(doc);
    if (!sit) { console.log("  ✘ Cliente não encontrado."); return; }

    console.log(`\n  Nome:     ${sit.nome}`);
    console.log(`  Tipo:     ${sit.tipo}`);
    console.log(`  Veículos ativos: ${sit.veiculosAtivos.join(", ") || "nenhum"}`);
    if (sit.creditos    !== undefined) console.log(`  Créditos: R$${sit.creditos}`);
    if (sit.saldoDevedor !== undefined) console.log(`  Débito:   R$${sit.saldoDevedor}`);
  }

  async #relatorioClienteCadastrado() {
    const doc       = await this.#perguntar("  Documento do cliente: ");
    const inicioStr = await this.#perguntar("  Data início (YYYY-MM-DD): ");
    const fimStr    = await this.#perguntar("  Data fim    (YYYY-MM-DD): ");
    const tickets   = this.#app.relatorios.registrosClienteCadastrado(
      doc, new Date(inicioStr), new Date(fimStr + "T23:59:59")
    );
    console.log(`\n  Registros encontrados: ${tickets.length}`);
    tickets.forEach(t => console.log(`  • ${t}`));
  }

  async #relatorioClienteAvulso() {
    const placa     = await this.#perguntar("  Placa: ");
    const inicioStr = await this.#perguntar("  Data início (YYYY-MM-DD): ");
    const fimStr    = await this.#perguntar("  Data fim    (YYYY-MM-DD): ");
    const tickets   = this.#app.relatorios.registrosClienteAvulso(
      placa.toUpperCase(), new Date(inicioStr), new Date(fimStr + "T23:59:59")
    );
    console.log(`\n  Registros encontrados: ${tickets.length}`);
    tickets.forEach(t => console.log(`  • ${t}`));
  }

  #relatorioClientesBloqueados() {
    const lista = this.#app.relatorios.clientesBloqueados();
    console.log(`\n  Clientes bloqueados: ${lista.length}`);
    lista.forEach(b => console.log(`  ✘ ${b.identificador} — ${b.motivo}`));
  }

  #relatorioTop10() {
    const top = this.#app.relatorios.top10Frequentes();
    console.log("\n  TOP 10 CLIENTES MAIS FREQUENTES:");
    top.forEach((item, i) =>
      console.log(`  ${i + 1}. ${item.placa} (${item.nome}) — ${item.usos} uso(s)`)
    );
  }
}
