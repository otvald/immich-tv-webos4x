// Test fixture: ES2015 syntax only - SUPPORTED in Chrome 53
// This syntax should PASS the audit tool

class Calculator {
	constructor() {
		this.history = [];
	}
	
	add(a, b) {
		const result = a + b;
		this.history.push({ operation: 'add', a, b, result });
		return result;
	}
	
	subtract(a, b) {
		const result = a - b;
		this.history.push({ operation: 'subtract', a, b, result });
		return result;
	}
	
	getHistory() {
		return this.history;
	}
}

// Arrow functions - supported in ES2015
const multiply = (a, b) => a * b;

// Template literals - supported in ES2015
const formatResult = (op, a, b, result) => `${op}(${a}, ${b}) = ${result}`;

// Promises - supported in ES2015
function asyncOperation(value) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			if (value > 0) {
				resolve(value * 2);
			} else {
				reject(new Error('Value must be positive'));
			}
		}, 100);
	});
}

// Array destructuring - supported in ES2015
const [first, second, ...rest] = [1, 2, 3, 4, 5];

// Map and Set - supported in ES2015
const map = new Map();
map.set('key', 'value');

const set = new Set([1, 2, 3, 4, 5]);

// Let and const - supported in ES2015
let counter = 0;
const MAX_COUNT = 100;

const calc = new Calculator();
calc.add(5, 3);
calc.subtract(10, 4);

console.log('Calculator history:', calc.getHistory());
console.log('Multiply:', multiply(6, 7));
console.log('First:', first, 'Rest:', rest);

export default Calculator;
