import {
	normalizeKeyEvent,
	shouldHandleBackKey,
	isEditableTarget,
	createBackHandlerStack,
} from '../input-adapter';

describe('input-adapter', () => {
	describe('normalizeKeyEvent', () => {
		test('normalizes legacy Back keycode 461 to Back', () => {
			const event = new KeyboardEvent('keydown', {keyCode: 461});
			const normalized = normalizeKeyEvent(event);

			expect(normalized.key).toBe('Back');
			expect(normalized.keyCode).toBe(461);
			expect(normalized.originalEvent).toBe(event);
		});

		test('normalizes legacy Back keycode 1536 (webOS 10.x) to Back', () => {
			const event = new KeyboardEvent('keydown', {keyCode: 1536});
			const normalized = normalizeKeyEvent(event);

			expect(normalized.key).toBe('Back');
			expect(normalized.keyCode).toBe(1536);
		});

		test('normalizes Backspace keycode 8 to Back', () => {
			const event = new KeyboardEvent('keydown', {keyCode: 8});
			const normalized = normalizeKeyEvent(event);

			expect(normalized.key).toBe('Back');
			expect(normalized.keyCode).toBe(8);
		});

		test('normalizes Tizen-style keycode 10009 to Back', () => {
			const event = new KeyboardEvent('keydown', {keyCode: 10009});
			const normalized = normalizeKeyEvent(event);

			expect(normalized.key).toBe('Back');
			expect(normalized.keyCode).toBe(10009);
		});

		test('normalizes Escape keycode 27 to Back', () => {
			const event = new KeyboardEvent('keydown', {keyCode: 27});
			const normalized = normalizeKeyEvent(event);

			expect(normalized.key).toBe('Back');
			expect(normalized.keyCode).toBe(27);
		});

		test('preserves ArrowLeft key event', () => {
			const event = new KeyboardEvent('keydown', {key: 'ArrowLeft', keyCode: 37});
			const normalized = normalizeKeyEvent(event);

			expect(normalized.key).toBe('ArrowLeft');
			expect(normalized.keyCode).toBe(37);
			expect(normalized.originalEvent).toBe(event);
		});

		test('preserves ArrowRight key event', () => {
			const event = new KeyboardEvent('keydown', {key: 'ArrowRight', keyCode: 39});
			const normalized = normalizeKeyEvent(event);

			expect(normalized.key).toBe('ArrowRight');
			expect(normalized.keyCode).toBe(39);
		});

		test('preserves regular key events unchanged', () => {
			const event = new KeyboardEvent('keydown', {key: 'a', keyCode: 65});
			const normalized = normalizeKeyEvent(event);

			expect(normalized.key).toBe('a');
			expect(normalized.keyCode).toBe(65);
		});
	});

	describe('isEditableTarget', () => {
		test('returns true for input element', () => {
			const input = document.createElement('input');
			expect(isEditableTarget(input)).toBe(true);
		});

		test('returns true for textarea element', () => {
			const textarea = document.createElement('textarea');
			expect(isEditableTarget(textarea)).toBe(true);
		});

		test('returns true for contentEditable element', () => {
			const div = document.createElement('div');
			div.contentEditable = 'true';
			expect(isEditableTarget(div)).toBe(true);
		});

		test('returns false for regular div element', () => {
			const div = document.createElement('div');
			expect(isEditableTarget(div)).toBe(false);
		});

		test('returns false for button element', () => {
			const button = document.createElement('button');
			expect(isEditableTarget(button)).toBe(false);
		});

		test('returns false for null target', () => {
			expect(isEditableTarget(null)).toBe(false);
		});

		test('returns false for non-HTMLElement target', () => {
			const textNode = document.createTextNode('text');
			expect(isEditableTarget(textNode as any)).toBe(false);
		});
	});

	describe('shouldHandleBackKey', () => {
		test('returns true for Back keycode 461 on non-editable target', () => {
			const div = document.createElement('div');
			const event = new KeyboardEvent('keydown', {keyCode: 461});
			Object.defineProperty(event, 'target', {value: div, writable: false});

			expect(shouldHandleBackKey(event)).toBe(true);
		});

		test('returns true for Backspace keycode 8 on non-editable target', () => {
			const div = document.createElement('div');
			const event = new KeyboardEvent('keydown', {keyCode: 8});
			Object.defineProperty(event, 'target', {value: div, writable: false});

			expect(shouldHandleBackKey(event)).toBe(true);
		});

		test('returns false for Backspace keycode 8 on input element', () => {
			const input = document.createElement('input');
			const event = new KeyboardEvent('keydown', {keyCode: 8});
			Object.defineProperty(event, 'target', {value: input, writable: false});

			expect(shouldHandleBackKey(event)).toBe(false);
		});

		test('returns false for Backspace keycode 8 on textarea element', () => {
			const textarea = document.createElement('textarea');
			const event = new KeyboardEvent('keydown', {keyCode: 8});
			Object.defineProperty(event, 'target', {value: textarea, writable: false});

			expect(shouldHandleBackKey(event)).toBe(false);
		});

		test('returns false for Backspace keycode 8 on contentEditable element', () => {
			const div = document.createElement('div');
			div.contentEditable = 'true';
			const event = new KeyboardEvent('keydown', {keyCode: 8});
			Object.defineProperty(event, 'target', {value: div, writable: false});

			expect(shouldHandleBackKey(event)).toBe(false);
		});

		test('returns true for Back keycode 461 on input element (not Backspace)', () => {
			const input = document.createElement('input');
			const event = new KeyboardEvent('keydown', {keyCode: 461});
			Object.defineProperty(event, 'target', {value: input, writable: false});

			expect(shouldHandleBackKey(event)).toBe(true);
		});

		test('returns false for non-Back keycode', () => {
			const div = document.createElement('div');
			const event = new KeyboardEvent('keydown', {keyCode: 65}); // 'a' key
			Object.defineProperty(event, 'target', {value: div, writable: false});

			expect(shouldHandleBackKey(event)).toBe(false);
		});
	});

	describe('createBackHandlerStack', () => {
		test('fires the most recently added handler', () => {
			const stack = createBackHandlerStack();
			const handler1 = jest.fn();
			const handler2 = jest.fn();

			const unregister1 = stack.push(handler1);
			const unregister2 = stack.push(handler2);

			expect(stack.fire()).toBe(true);
			expect(handler2).toHaveBeenCalledTimes(1);
			expect(handler1).not.toHaveBeenCalled();

			unregister2();
			unregister1();
		});

		test('fires handlers in LIFO order (last-in-first-out)', () => {
			const stack = createBackHandlerStack();
			const calls: number[] = [];

			const handler1 = jest.fn(() => calls.push(1));
			const handler2 = jest.fn(() => calls.push(2));
			const handler3 = jest.fn(() => calls.push(3));

			const unregister1 = stack.push(handler1);
			const unregister2 = stack.push(handler2);
			const unregister3 = stack.push(handler3);

			stack.fire();
			expect(calls).toEqual([3]);

			unregister3();
			stack.fire();
			expect(calls).toEqual([3, 2]);

			unregister2();
			stack.fire();
			expect(calls).toEqual([3, 2, 1]);

			unregister1();
		});

		test('returns false when stack is empty', () => {
			const stack = createBackHandlerStack();
			expect(stack.fire()).toBe(false);
		});

		test('unregister removes handler from stack', () => {
			const stack = createBackHandlerStack();
			const handler1 = jest.fn();
			const handler2 = jest.fn();

			const unregister1 = stack.push(handler1);
			stack.push(handler2);

			unregister1();

			stack.fire();
			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).toHaveBeenCalledTimes(1);
		});

		test('unregister removes only the specific handler instance', () => {
			const stack = createBackHandlerStack();
			const handler = jest.fn();

			const unregister1 = stack.push(handler);
			stack.push(handler);

			unregister1();

			stack.fire();
			expect(handler).toHaveBeenCalledTimes(1); // Only the second instance fires
		});

		test('unregister is idempotent (safe to call multiple times)', () => {
			const stack = createBackHandlerStack();
			const handler = jest.fn();

			const unregister = stack.push(handler);

			unregister();
			unregister();
			unregister();

			expect(stack.fire()).toBe(false);
		});

		test('supports nested AlbumView/MediaViewer pattern', () => {
			const stack = createBackHandlerStack();
			const albumBackHandler = jest.fn();
			const viewerCloseHandler = jest.fn();

			// Simulate mounting AlbumView
			const unregisterAlbum = stack.push(albumBackHandler);

			// Simulate opening MediaViewer
			const unregisterViewer = stack.push(viewerCloseHandler);

			// Back press should close viewer first
			stack.fire();
			expect(viewerCloseHandler).toHaveBeenCalledTimes(1);
			expect(albumBackHandler).not.toHaveBeenCalled();

			// Simulate closing MediaViewer
			unregisterViewer();

			// Back press should now go to album
			stack.fire();
			expect(albumBackHandler).toHaveBeenCalledTimes(1);

			unregisterAlbum();
		});
	});
});
