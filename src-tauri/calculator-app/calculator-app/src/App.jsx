import { useState } from "react";
import "./App.css";

const buttons = [
  ["C", "+/-", "%", "/"],
  ["7", "8", "9", "*"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["0", ".", "="],
];

export default function App() {
  const [display, setDisplay] = useState("0");
  const [firstOperand, setFirstOperand] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForSecond, setWaitingForSecond] = useState(false);

  function handleNumber(value) {
    if (waitingForSecond) {
      setDisplay(value === "." ? "0." : value);
      setWaitingForSecond(false);
    } else {
      if (value === "." && display.includes(".")) return;
      setDisplay(display === "0" && value !== "." ? value : display + value);
    }
  }

  function handleOperator(op) {
    const current = parseFloat(display);
    if (firstOperand !== null && !waitingForSecond) {
      const result = calculate(firstOperand, current, operator);
      setDisplay(String(result));
      setFirstOperand(result);
    } else {
      setFirstOperand(current);
    }
    setOperator(op);
    setWaitingForSecond(true);
  }

  function calculate(a, b, op) {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : "Error";
      default: return b;
    }
  }

  function handleEquals() {
    if (operator === null || firstOperand === null) return;
    const current = parseFloat(display);
    const result = calculate(firstOperand, current, operator);
    setDisplay(String(result));
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecond(false);
  }

  function handleSpecial(action) {
    const current = parseFloat(display);
    switch (action) {
      case "C":
        setDisplay("0");
        setFirstOperand(null);
        setOperator(null);
        setWaitingForSecond(false);
        break;
      case "+/-":
        setDisplay(String(current * -1));
        break;
      case "%":
        setDisplay(String(current / 100));
        break;
    }
  }

  function handleClick(value) {
    if (["C", "+/-", "%"].includes(value)) return handleSpecial(value);
    if (["+", "-", "*", "/"].includes(value)) return handleOperator(value);
    if (value === "=") return handleEquals();
    handleNumber(value);
  }

  function getLabel(value) {
    if (value === "*") return "×";
    if (value === "/") return "÷";
    return value;
  }

  function getType(value) {
    if (["C", "+/-", "%"].includes(value)) return "special";
    if (["+", "-", "*", "/"].includes(value)) return "operator";
    if (value === "=") return "equals";
    return "number";
  }

  return (
    <div className="calculator">
      <div className="display">
        <span className="display-text">{display}</span>
      </div>
      <div className="buttons">
        {buttons.map((row, i) => (
          <div key={i} className="row">
            {row.map((btn) => (
              <button
                key={btn}
                className={`btn btn-${getType(btn)} ${btn === "0" ? "btn-wide" : ""}`}
                onClick={() => handleClick(btn)}
              >
                {getLabel(btn)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
