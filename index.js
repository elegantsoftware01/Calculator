const display = document.getElementById("display");

function appendToDisplay(ch) {
  const v = display.value;

  // Evitar operadores duplicados o al inicio (permitimos '-' inicial para negativos)
  if ("+-*/".includes(ch)) {
    if (v === "") {
      if (ch === "-") {
        display.value = "-";
      }
      return;
    }
    if ("+-*/".includes(v.slice(-1))) {
      // Reemplaza el último operador por el nuevo
      display.value = v.slice(0, -1) + ch;
      return;
    }
  }

  // Evitar múltiples puntos en el mismo número
  if (ch === ".") {
    const lastNumber = v.split(/[+\-*/]/).pop();
    if (lastNumber.includes(".")) return;
    if (lastNumber === "") {
      display.value += "0.";
      return;
    }
  }

  display.value += ch;
}

function clearDisplay() {
  display.value = "";
}

function calculate() {
  try {
    const expr = display.value.trim();
    if (!expr) return;

    const result = evaluateExpr(expr);

    if (!isFinite(result) || isNaN(result)) {
      display.value = "E";
    } else {
      // Opcional: redondeo para evitar 0.30000000000000004
      const normalized = Number.isInteger(result) ? result : Number(result.toFixed(12));
      display.value = String(normalized);
    }
  } catch (e) {
    display.value = "E";
  }
}

/* ===== Evaluador sin eval() ===== */

// Prioridad de operadores
function precedence(op) {
  return (op === "+" || op === "-") ? 1
       : (op === "*" || op === "/") ? 2
       : 0;
}

// Convierte a RPN con shunting-yard (sin paréntesis)
function toRPN(expr) {
  const tokens = expr.match(/(\d+\.\d+|\d+|\.\d+|[+\-*/])/g);
  if (!tokens) throw new Error("Bad expression");

  const output = [];
  const ops = [];
  let expectNumber = true; // para detectar un '-' unario

  for (let t of tokens) {
    if (/^\d+(\.\d+)?$|^\.\d+$/.test(t)) {
      output.push(parseFloat(t));
      expectNumber = false;
    } else if ("+-*/".includes(t)) {
      // Manejo de '-' unario: lo convertimos a '0 <num> -'
      if (t === "-" && expectNumber) {
        // Empujamos un 0 y tratamos el '-' como binario con lo que venga
        output.push(0);
        while (ops.length && precedence(ops[ops.length - 1]) >= precedence("-")) {
          output.push(ops.pop());
        }
        ops.push("-");
        continue;
      }
      if (expectNumber) throw new Error("Operator in wrong place");
      while (ops.length && precedence(ops[ops.length - 1]) >= precedence(t)) {
        output.push(ops.pop());
      }
      ops.push(t);
      expectNumber = true;
    } else {
      throw new Error("Invalid token");
    }
  }

  if (expectNumber) throw new Error("Ends with operator");
  while (ops.length) output.push(ops.pop());
  return output;
}

// Evalúa la RPN y maneja divisiones por cero
function evalRPN(rpn) {
  const stack = [];
  for (let t of rpn) {
    if (typeof t === "number") {
      stack.push(t);
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) throw new Error("Bad calc");

    let res;
    switch (t) {
      case "+": res = a + b; break;
      case "-": res = a - b; break;
      case "*": res = a * b; break;
      case "/": res = (b === 0) ? NaN : a / b; break; // 0/0 => NaN, x/0 => Infinity -> lo filtramos arriba
      default: throw new Error("Bad op");
    }
    stack.push(res);
  }
  if (stack.length !== 1) throw new Error("Bad calc");
  return stack[0];
}

function evaluateExpr(expr) {
  const rpn = toRPN(expr);
  return evalRPN(rpn);
}