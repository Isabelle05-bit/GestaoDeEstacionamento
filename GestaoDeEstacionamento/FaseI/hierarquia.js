// ─────────────────────────────────────────────────────────────────────────────
// hierarquia.js
// Classes de domínio: Cliente (abstrata), subclasses e descontos.
// ─────────────────────────────────────────────────────────────────────────────

function validate(valor, tipo) {
  if (valor === null || valor === undefined || valor === "") {
    throw new Error(`Campo obrigatório não pode ser vazio.`);
  }
  if (typeof valor !== tipo.toLowerCase()) {
    throw new Error(`Esperado ${tipo}, recebido ${typeof valor}.`);
  }
}

// ─── Cliente (abstrata) ───────────────────────────────────────────────────────

export class Cliente {
  #documento; #nome; #tipo; #placas;

  constructor(documento, nome, tipo) {
    if (new.target === Cliente) throw new Error("Cliente é uma classe abstrata.");
    validate(documento, "String"); validate(nome, "String"); validate(tipo, "String");
    this.#documento = documento; this.#nome = nome; this.#tipo = tipo;
    this.#placas = new Set();
  }

  get documento() { return this.#documento; }
  get nome()      { return this.#nome; }
  get tipo()      { return this.#tipo; }
  get placas()    { return this.#placas; }

  adicionarPlaca(placa) { validate(placa, "String"); this.#placas.add(placa.toUpperCase()); }
  removerPlaca(placa)   { validate(placa, "String"); this.#placas.delete(placa.toUpperCase()); }
  possuiPlaca(placa)    { return this.#placas.has(placa.toUpperCase()); }

  toString() { return `Documento: ${this.#documento} | Nome: ${this.#nome} | Tipo: ${this.#tipo}`; }

  calcularCusto()            { throw new Error("calcularCusto() deve ser implementado."); }
  verificarPermissaoEntrada(){ throw new Error("verificarPermissaoEntrada() deve ser implementado."); }
  processarPagamento()       { throw new Error("processarPagamento() deve ser implementado."); }
  limiteVeiculos()           { throw new Error("limiteVeiculos() deve ser implementado."); }
}

// ─── Estudante ────────────────────────────────────────────────────────────────

export class Estudante extends Cliente {
  #creditos;

  constructor(cpf, nome, creditos) {
    super(cpf, nome, "Estudante");
    validate(creditos, "Number");
    if (creditos < 0) throw new Error("Créditos não podem ser negativos.");
    this.#creditos = creditos;
  }

  get creditos()     { return this.#creditos; }
  get inadimplente() { return this.#creditos < 0; }

  carregarSaldo(valor) {
    validate(valor, "Number");
    if (valor <= 0) throw new Error("Valor deve ser positivo.");
    this.#creditos += valor;
  }

  calcularCusto(entrada, saida) {
    return entrada.getDate() === saida.getDate() ? 10 : 20;
  }

  verificarPermissaoEntrada() {
    if (this.#creditos < 0) return { permitido: false, motivo: "Saldo negativo." };
    return { permitido: true, motivo: "Saldo positivo." };
  }

  processarPagamento(custo) { this.#creditos -= custo; }
  limiteVeiculos()          { return 1; }
  toString() { return `${super.toString()} | Créditos: ${this.#creditos}`; }
}

// ─── Professor ────────────────────────────────────────────────────────────────

export class Professor extends Cliente {
  #departamento;

  constructor(cpf, nome, departamento) {
    super(cpf, nome, "Professor");
    validate(departamento, "String");
    this.#departamento = departamento;
  }

  get departamento() { return this.#departamento; }

  calcularCusto()            { return 0; }
  verificarPermissaoEntrada(){ return { permitido: true, motivo: "Professor." }; }
  processarPagamento()       { /* Gratuito */ }
  limiteVeiculos()           { return 2; }
  toString() { return `${super.toString()} | Departamento: ${this.#departamento}`; }
}

// ─── ClienteAvulso ────────────────────────────────────────────────────────────

export class ClienteAvulso extends Cliente {
  #bloqueado;

  constructor(placa) {
    super(placa, `Avulso-${placa}`, "Avulso");
    this.#bloqueado = false;
    this.adicionarPlaca(placa);
  }

  get bloqueado() { return this.#bloqueado; }

  calcularCusto(entrada, saida) {
    const horas = (saida - entrada) / (1000 * 60 * 60);
    return horas <= 6 ? horas * 5 : 25;
  }

  verificarPermissaoEntrada() {
    if (this.#bloqueado) return { permitido: false, motivo: "Bloqueado por recusa de pagamento." };
    return { permitido: true, motivo: "Liberado." };
  }

  processarPagamento() { /* Avulso paga na saída */ }
  limiteVeiculos()     { return 1; }
  bloquear()           { this.#bloqueado = true; }
  desbloquear()        { this.#bloqueado = false; }
  toString() { return `${super.toString()} | Bloqueado: ${this.#bloqueado}`; }
}

// ─── Empresa ──────────────────────────────────────────────────────────────────

export class Empresa extends Cliente {
  #saldoDevedor; #inadimplente;

  constructor(cnpj, nome) {
    super(cnpj, nome, "Empresa");
    this.#saldoDevedor = 0;
    this.#inadimplente = false;
  }

  get saldoDevedor() { return this.#saldoDevedor; }
  get inadimplente() { return this.#inadimplente; }

  calcularCusto(entrada, saida) {
    let custo = 25;
    if (entrada.getDate() !== saida.getDate()) custo += 50;
    return custo;
  }

  verificarPermissaoEntrada() {
    if (this.#inadimplente) return { permitido: false, motivo: "Empresa inadimplente." };
    return { permitido: true, motivo: "Liberado." };
  }

  processarPagamento(custo)  { this.#saldoDevedor += custo; }
  limiteVeiculos()           { return Infinity; }
  emitirBoleto()             { return this.#saldoDevedor; }
  marcarInadimplente()       { this.#inadimplente = true; }

  pagarBoleto(valor) {
    this.#saldoDevedor -= valor;
    if (this.#saldoDevedor <= 0) { this.#saldoDevedor = 0; this.#inadimplente = false; }
  }

  toString() { return `${super.toString()} | Saldo devedor: ${this.#saldoDevedor} | Inadimplente: ${this.#inadimplente}`; }
}

// ─── DescontoStrategy (abstrata) ─────────────────────────────────────────────

export class DescontoStrategy {
  constructor() {
    if (new.target === DescontoStrategy) throw new Error("DescontoStrategy é abstrata.");
  }
  get id()             { throw new Error("id deve ser implementado."); }
  aplicavel(contexto)  { throw new Error("aplicavel() deve ser implementado."); }
  calcular(custoBruto) { throw new Error("calcular() deve ser implementado."); }
}

// ─── DescontoClienteFrequente ─────────────────────────────────────────────────

export class DescontoClienteFrequente extends DescontoStrategy {
  #id; #percentual; #usos; #janela;

  constructor() {
    super();
    this.#id         = "ClienteFrequente";
    this.#percentual = 0.20;
    this.#usos       = 3;
    this.#janela     = 5;
  }

  get id() { return this.#id; }

  aplicavel(contexto) {
    const agora       = new Date();
    const janelaAtras = new Date(agora - this.#janela * 24 * 60 * 60 * 1000);
    const usosRecentes = contexto.historicoTickets.filter(t => t.dataEntrada >= janelaAtras);
    return usosRecentes.length >= this.#usos;
  }

  calcular(custoBruto) { return custoBruto * this.#percentual; }

  toString() { return `Desconto: ${this.#id} | ${this.#percentual * 100}%`; }
}
