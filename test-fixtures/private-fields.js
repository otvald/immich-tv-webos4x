// Test fixture: Private fields (ES2022) - UNSUPPORTED in Chrome 53
// This syntax should be rejected by the audit tool

class Counter {
	// Private field - not supported in Chromium 53
	#count = 0;
	
	increment() {
		this.#count++;
	}
	
	decrement() {
		this.#count--;
	}
	
	getCount() {
		return this.#count;
	}
}

const counter = new Counter();
counter.increment();
counter.increment();
console.log('Count:', counter.getCount());

export default Counter;
