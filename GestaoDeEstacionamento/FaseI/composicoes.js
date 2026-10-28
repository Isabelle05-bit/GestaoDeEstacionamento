// ─────────────────────────────────────────────────────────────────────────────
// composicoes.js
// Classes de orquestração + persistência CSV (Fase 2).
// ─────────────────────────────────────────────────────────────────────────────

import * as Hierarquia from "./hierarquia.js";

function validate(valor, tipo) {
  if (valor === null || valor === undefined || valor === "") {
    throw new Error(`Campo obrigatório não pode ser vazio.`);
  }
  if (typeof valor !== tipo.toLowerCase()) {
    throw new Error(`Esperado ${tipo}, recebido ${typeof valor}.`);
  }
}

// ─── TicketEstacionamento ─────────────────────────────────────────────────────

export class TicketEstacionamento {
  #placa; #tipoCliente; #dataEntrada;
  #dataSaida = null; #custoBruto = 0; #descontoId = "nenhum";
  #valorDesconto = 0; #valorDevido = 0; #valorPago = 0;

  constructor(placa, tipoCliente, dataEntrada) {
    validate(placa, "String"); validate(tipoCliente, "String");
    if (!(dataEntrada instanceof Date)) throw new Error("dataEntrada deve ser um Date.");
    this.#placa = placa.toUpperCase();
    this.#tipoCliente = tipoCliente;
    this.#dataEntrada = dataEntrada;
  }

  get placa()         { return this.#placa; }
  get tipoCliente()   { return this.#tipoCliente; }
  get dataEntrada()   { return this.#dataEntrada; }
  get dataSaida()     { return this.#dataSaida; }
  get custoBruto()    { return this.#custoBruto; }
  get descontoId()    { return this.#descontoId; }
  get valorDesconto() { return this.#valorDesconto; }
  get valorDevido()   { return this.#valorDevido; }
  get valorPago()     { return this.#valorPago; }
  get estaAtivo()     { return this.#dataSaida === null; }

  registrarSaida(dataSaida, custoBruto, descontoId, valorDesconto, valorDevido, valorPago) {
    if (!(dataSaida instanceof Date)) throw new Error("dataSaida deve ser um Date.");
    this.#dataSaida     = dataSaida;
    this.#custoBruto    = custoBruto;
    this.#descontoId    = descontoId;
    this.#valorDesconto = valorDesconto;
    this.#valorDevido   = valorDevido;
    this.#valorPago     = valorPago;
  }

  paraCSV() {
    const entrada = this.#dataEntrada.toISOString().slice(0, 19);
    const saida   = this.#dataSaida ? this.#dataSaida.toISOString().slice(0, 19) : "";
    return `${this.#placa},${entrada},${saida},${this.#custoBruto},${this.#valorDesconto},${this.#valorPago}`;
  }

  static deCSV(linha) {
    const [placa, entradaStr, saidaStr, custoBruto, valorDesconto, valorPago] =
      linha.split(",").map(s => s.trim());
    const ticket = new TicketEstacionamento(placa, "Histórico", new Date(entradaStr));
    if (saidaStr) {
      ticket.registrarSaida(
        new Date(saidaStr),
        parseFloat(custoBruto)    || 0,
        "nenhum",
        parseFloat(valorDesconto) || 0,
        parseFloat(custoBruto)    || 0,
        parseFloat(valorPago)     || 0,
      );
    }
    return ticket;
  }

  toString() {
    const saida = this.#dataSaida ? this.#dataSaida.toLocaleString("pt-BR") : "Em aberto";
    return `Placa: ${this.#placa} | Entrada: ${this.#dataEntrada.toLocaleString("pt-BR")} | Saída: ${saida} | Pago: R$${this.#valorPago.toFixed(2)}`;
  }
}

// ─── GerenciadorDescontos ─────────────────────────────────────────────────────

export class GerenciadorDescontos {
  #estrategias;

  constructor() {
    this.#estrategias = [new Hierarquia.DescontoClienteFrequente()];
  }

  registrarEstrategia(estrategia) {
    if (!(estrategia instanceof Hierarquia.DescontoStrategy)) throw new Error("Estratégia inválida.");
    this.#estrategias.push(estrategia);
  }

  aplicar(custoBruto, contexto) {
    for (const e of this.#estrategias) {
      if (e.aplicavel(contexto)) {
        const valorDesconto = e.calcular(custoBruto);
        return { descontoId: e.id, valorDesconto, valorDevido: parseFloat((custoBruto - valorDesconto).toFixed(2)) };
      }
    }
    return { descontoId: "nenhum", valorDesconto: 0, valorDevido: custoBruto };
  }

  toString() { return `GerenciadorDescontos | Estratégias: ${this.#estrategias.length}`; }
}

// ─── CadastroClientes ─────────────────────────────────────────────────────────

export class CadastroClientes {
  #clientes;         // Map<documento, Cliente>
  #placaParaCliente; // Map<placa, Cliente>

  constructor() {
    this.#clientes         = new Map();
    this.#placaParaCliente = new Map();
  }

  cadastrarCliente(cliente) {
    if (this.#clientes.has(cliente.documento)) return { ok: false, motivo: "Documento já cadastrado." };
    this.#clientes.set(cliente.documento, cliente);
    for (const placa of cliente.placas) this.#placaParaCliente.set(placa, cliente);
    return { ok: true, motivo: "Cliente cadastrado." };
  }

  removerCliente(documento) {
    const cliente = this.#clientes.get(documento);
    if (!cliente) return { ok: false, motivo: "Cliente não encontrado." };
    for (const placa of cliente.placas) this.#placaParaCliente.delete(placa);
    this.#clientes.delete(documento);
    return { ok: true, motivo: "Cliente removido." };
  }

  adicionarPlacaCliente(documento, placa) {
    const cliente = this.#clientes.get(documento);
    if (!cliente) return { ok: false, motivo: "Cliente não encontrado." };
    const placaNorm = placa.toUpperCase();
    if (this.#placaParaCliente.has(placaNorm)) return { ok: false, motivo: "Placa já cadastrada." };
    if (cliente.placas.size >= cliente.limiteVeiculos()) return { ok: false, motivo: "Limite de veículos atingido." };
    cliente.adicionarPlaca(placaNorm);
    this.#placaParaCliente.set(placaNorm, cliente);
    return { ok: true, motivo: "Placa adicionada." };
  }

  removerPlacaCliente(documento, placa) {
    const cliente = this.#clientes.get(documento);
    if (!cliente) return { ok: false, motivo: "Cliente não encontrado." };
    const placaNorm = placa.toUpperCase();
    cliente.removerPlaca(placaNorm);
    this.#placaParaCliente.delete(placaNorm);
    return { ok: true, motivo: "Placa removida." };
  }

  buscarPorPlaca(placa)        { return this.#placaParaCliente.get(placa.toUpperCase()) ?? null; }
  buscarPorDocumento(documento){ return this.#clientes.get(documento) ?? null; }
  placaCadastrada(placa)       { return this.#placaParaCliente.has(placa.toUpperCase()); }
  listarClientes()             { return [...this.#clientes.values()]; }

  async carregarDeCSV(caminho) {
    const fs = await import("fs");
    if (!fs.existsSync(caminho)) return;
    const linhas = fs.readFileSync(caminho, "utf-8").split(/\r?\n/).filter(l => l.trim());

    for (const linha of linhas) {
      const cols   = linha.split(",").map(s => s.trim());
      const campo2 = cols[2] ?? "";
      const ehNum  = !isNaN(Number(campo2)) && campo2 !== "";

      if (!ehNum && campo2.toUpperCase() === "PROFESSOR") {
        const [cpf, nome, , ...placas] = cols;
        const cli = new Hierarquia.Professor(cpf, nome, "Geral");
        placas.filter(p => p).forEach(p => cli.adicionarPlaca(p));
        this.cadastrarCliente(cli);

      } else if (ehNum && cols[3]?.toUpperCase() === "ESTUDANTE") {
        const [cpf, nome, cred, , placa] = cols;
        const cli = new Hierarquia.Estudante(cpf, nome, Number(cred));
        if (placa) cli.adicionarPlaca(placa);
        this.cadastrarCliente(cli);

      } else if (ehNum && cols[3]?.toUpperCase() === "EMPRESA") {
        const [cnpj, nome, saldo, , ...placas] = cols;
        const cli = new Hierarquia.Empresa(cnpj, nome);
        if (Number(saldo) > 0) cli.processarPagamento(Number(saldo));
        placas.filter(p => p).forEach(p => cli.adicionarPlaca(p));
        this.cadastrarCliente(cli);
      }
    }
  }

  async salvarParaCSV(caminho) {
    const fs     = await import("fs");
    const linhas = [];
    for (const cliente of this.#clientes.values()) {
      const placas = [...cliente.placas].join(",");
      if (cliente instanceof Hierarquia.Professor)
        linhas.push(`${cliente.documento},${cliente.nome},Professor,${placas}`);
      else if (cliente instanceof Hierarquia.Estudante)
        linhas.push(`${cliente.documento},${cliente.nome},${cliente.creditos},Estudante,${placas}`);
      else if (cliente instanceof Hierarquia.Empresa)
        linhas.push(`${cliente.documento},${cliente.nome},${cliente.saldoDevedor},Empresa,${placas}`);
    }
    fs.writeFileSync(caminho, linhas.join("\n"), "utf-8");
  }

  toString() { return `CadastroClientes | Total: ${this.#clientes.size} clientes`; }
}

// ─── RegistroDeEntradas_E_Saidas ──────────────────────────────────────────────

export class RegistroDeEntradas_E_Saidas {
  #ticketsAtivos;
  #historicoTickets;
  #listaBloqueioPlacos;
  #avulsosConhecidos;
  #cadastroClientes;
  #gerenciadorDescontos;

  constructor(cadastroClientes) {
    this.#cadastroClientes     = cadastroClientes;
    this.#ticketsAtivos        = new Map();
    this.#historicoTickets     = [];
    this.#listaBloqueioPlacos  = new Set();
    this.#avulsosConhecidos    = new Map();
    this.#gerenciadorDescontos = new GerenciadorDescontos();
  }

  get historicoTickets()   { return [...this.#historicoTickets]; }
  get ticketsAtivos()      { return new Map(this.#ticketsAtivos); }
  get listaBloqueioPlacos(){ return new Set(this.#listaBloqueioPlacos); }

  registrarEntrada(placa, dataHora = new Date()) {
    const placaNorm = placa.toUpperCase();
    if (this.#ticketsAtivos.has(placaNorm))
      return { ok: false, motivo: "Veículo já está no estacionamento." };

    const clienteCadastrado = this.#cadastroClientes.buscarPorPlaca(placaNorm);

    if (clienteCadastrado) {
      if (clienteCadastrado instanceof Hierarquia.Professor) {
        for (const p of clienteCadastrado.placas) {
          if (this.#ticketsAtivos.has(p))
            return { ok: false, motivo: "Professor já possui veículo estacionado." };
        }
      }
      const permissao = clienteCadastrado.verificarPermissaoEntrada();
      if (!permissao.permitido) return { ok: false, motivo: permissao.motivo };

      const ticket = new TicketEstacionamento(placaNorm, clienteCadastrado.tipo, dataHora);
      this.#ticketsAtivos.set(placaNorm, ticket);
      this.#historicoTickets.push(ticket);
      return { ok: true, motivo: `Entrada autorizada — ${clienteCadastrado.tipo}.`, ticket };
    }

    if (this.#listaBloqueioPlacos.has(placaNorm))
      return { ok: false, motivo: "Placa bloqueada por recusa de pagamento." };

    if (!this.#avulsosConhecidos.has(placaNorm))
      this.#avulsosConhecidos.set(placaNorm, new Hierarquia.ClienteAvulso(placaNorm));

    const ticket = new TicketEstacionamento(placaNorm, "Avulso", dataHora);
    this.#ticketsAtivos.set(placaNorm, ticket);
    this.#historicoTickets.push(ticket);
    return { ok: true, motivo: "Entrada autorizada — Avulso.", ticket };
  }

  registrarSaida(placa, dataHora = new Date(), recusouPagar = false) {
    const placaNorm = placa.toUpperCase();
    const ticket    = this.#ticketsAtivos.get(placaNorm);
    if (!ticket) return { ok: false, motivo: "Veículo não encontrado no estacionamento." };

    const cliente    = this.#cadastroClientes.buscarPorPlaca(placaNorm) ?? this.#avulsosConhecidos.get(placaNorm);
    const custoBruto = cliente.calcularCusto(ticket.dataEntrada, dataHora);
    const ticketsPlaca = this.#historicoTickets.filter(t => t.placa === placaNorm && !t.estaAtivo);

    const desconto = ticket.tipoCliente === "Avulso"
      ? this.#gerenciadorDescontos.aplicar(custoBruto, { historicoTickets: ticketsPlaca })
      : { descontoId: "nenhum", valorDesconto: 0, valorDevido: custoBruto };

    const valorPago = recusouPagar ? 0 : desconto.valorDevido;

    ticket.registrarSaida(dataHora, custoBruto, desconto.descontoId, desconto.valorDesconto, desconto.valorDevido, valorPago);

    if (!recusouPagar) cliente.processarPagamento(custoBruto);
    else if (ticket.tipoCliente === "Avulso") this.#listaBloqueioPlacos.add(placaNorm);

    this.#ticketsAtivos.delete(placaNorm);
    return { ok: true, motivo: `Saída registrada. Pago: R$${valorPago.toFixed(2)}`, ticket };
  }

  consultarTicketsPorPlaca(placa, inicio, fim) {
    const placaNorm = placa.toUpperCase();
    return this.#historicoTickets.filter(t =>
      t.placa === placaNorm && t.dataEntrada >= inicio && t.dataEntrada <= fim
    );
  }

  consultarTicketsPorCliente(documento, inicio, fim) {
    const cliente = this.#cadastroClientes.buscarPorDocumento(documento);
    if (!cliente) return [];
    return this.#historicoTickets.filter(t =>
      cliente.placas.has(t.placa) && t.dataEntrada >= inicio && t.dataEntrada <= fim
    );
  }

  topClientesFrequentes(n = 10) {
    const inicioAno = new Date(new Date().getFullYear(), 0, 1);
    const contagem  = new Map();
    for (const t of this.#historicoTickets) {
      if (t.dataEntrada < inicioAno) continue;
      contagem.set(t.placa, (contagem.get(t.placa) ?? 0) + 1);
    }
    return [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
      .map(([placa, usos]) => ({ placa, usos }));
  }

  async carregarDeCSV(caminho) {
    const fs = await import("fs");
    if (!fs.existsSync(caminho)) return;
    const linhas = fs.readFileSync(caminho, "utf-8").split(/\r?\n/).filter(l => l.trim());
    for (const linha of linhas) {
      try {
        const ticket = TicketEstacionamento.deCSV(linha);
        this.#historicoTickets.push(ticket);
        if (ticket.estaAtivo) this.#ticketsAtivos.set(ticket.placa, ticket);
      } catch (e) { console.warn("Linha ignorada:", linha); }
    }
  }

  async salvarParaCSV(caminho) {
    const fs = await import("fs");
    fs.writeFileSync(caminho, this.#historicoTickets.map(t => t.paraCSV()).join("\n"), "utf-8");
  }

  toString() { return `RegistroDeEntradas_E_Saidas | Ativos: ${this.#ticketsAtivos.size}`; }
}

// ─── RelatoriosGerenciais ─────────────────────────────────────────────────────

export class RelatoriosGerenciais {
  #cadastroClientes; #registroEntradaSaida;

  constructor(cadastroClientes, registroEntradaSaida) {
    this.#cadastroClientes     = cadastroClientes;
    this.#registroEntradaSaida = registroEntradaSaida;
  }

  totalArrecadado(inicio, fim, tipos = []) {
    const tickets = this.#registroEntradaSaida.historicoTickets.filter(t => {
      const noIntervalo = t.dataEntrada >= inicio && t.dataEntrada <= fim && !t.estaAtivo;
      const tipoOk      = tipos.length === 0 || tipos.includes(t.tipoCliente);
      return noIntervalo && tipoOk;
    });
    return { total: parseFloat(tickets.reduce((acc, t) => acc + t.valorPago, 0).toFixed(2)), tickets };
  }

  situacaoCliente(documento) {
    const cliente = this.#cadastroClientes.buscarPorDocumento(documento);
    if (!cliente) return null;
    const ativos = [...this.#registroEntradaSaida.ticketsAtivos.values()].filter(t => cliente.placas.has(t.placa));
    const resultado = { nome: cliente.nome, documento: cliente.documento, tipo: cliente.tipo, veiculosAtivos: ativos.map(t => t.placa) };
    if (cliente instanceof Hierarquia.Estudante) resultado.creditos     = cliente.creditos;
    if (cliente instanceof Hierarquia.Empresa)   resultado.saldoDevedor = cliente.saldoDevedor;
    return resultado;
  }

  registrosClienteCadastrado(documento, inicio, fim) {
    return this.#registroEntradaSaida.consultarTicketsPorCliente(documento, inicio, fim);
  }

  registrosClienteAvulso(placa, inicio, fim) {
    if (this.#cadastroClientes.placaCadastrada(placa)) return [];
    return this.#registroEntradaSaida.consultarTicketsPorPlaca(placa, inicio, fim);
  }

  clientesBloqueados() {
    const lista = [];
    for (const placa of this.#registroEntradaSaida.listaBloqueioPlacos)
      lista.push({ identificador: placa, motivo: "Avulso — recusa de pagamento." });
    for (const cliente of this.#cadastroClientes.listarClientes()) {
      if (cliente instanceof Hierarquia.Estudante && cliente.inadimplente)
        lista.push({ identificador: cliente.nome, motivo: `Saldo negativo: R$${cliente.creditos}` });
      if (cliente instanceof Hierarquia.Empresa && cliente.inadimplente)
        lista.push({ identificador: cliente.nome, motivo: `Inadimplente: R$${cliente.saldoDevedor}` });
    }
    return lista;
  }

  top10Frequentes() {
    return this.#registroEntradaSaida.topClientesFrequentes(10).map(item => {
      const cliente = this.#cadastroClientes.buscarPorPlaca(item.placa);
      return { ...item, nome: cliente ? cliente.nome : "Avulso" };
    });
  }

  toString() { return `RelatoriosGerenciais`; }
}
