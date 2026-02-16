/** @jest-environment jsdom */
// Unit tests for LessonApp
const { LessonApp } = require('../renderer.js');
describe('LessonApp', () => {
		
	let app;
	beforeEach(() => {
		// Mock DOM
		document.body.innerHTML = `
			<button id="openFileBtn"></button>
			<button id="addLessonBtn"></button>
			<button id="deleteLessonBtn"></button>
			<tbody id="tableBody"></tbody>
			<div id="addModal"></div>
			<button id="closeModalBtn"></button>
			<button id="cancelBtn"></button>
			<form id="lessonForm"></form>
			<div id="statusBar"></div>
			<input id="objType" />
			<input id="date" />
			<input id="time" />
			<input id="name" />
		`;
		app = new LessonApp();
	});
	test('loadLessonsFromFile skips invalid lines and logs error', async () => {
			// Arrange 3 строки, вторая невалидная
			const valid1 = 'Лекция: 2023.02.15 10:00 "Иван ИВАН"';
			const invalid = 'Некорректная строка';
			const valid2 = 'Семинар: 2024.01.01 12:30 "Алексей Петрович"';
			window.api = {
				readFile: jest.fn().mockResolvedValue([valid1, invalid, valid2]),
				writeFile: jest.fn(),
				selectFile: jest.fn(),
			};
			// Ловим console.error
			const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
			// Act
			await app.loadLessonsFromFile();
			// Assert
			expect(app.lessons.length).toBe(2);
			expect(app.lessons[0]).toEqual({
				objType: 'Лекция',
				date: '2023.02.15',
				time: '10:00',
				name: 'Иван ИВАН',
			});
			expect(app.lessons[1]).toEqual({
				objType: 'Семинар',
				date: '2024.01.01',
				time: '12:30',
				name: 'Алексей Петрович',
			});
			expect(errorSpy).toHaveBeenCalled();
			errorSpy.mockRestore();
		});

	test('parseLessonLine parses valid line', () => {
		const line = 'Лекция: 2023.02.15 10:00 "Иван ИВАН"';
		const lesson = app.parseLessonLine(line);
		expect(lesson).toEqual({
			objType: 'Лекция',
			date: '2023.02.15',
			time: '10:00',
			name: 'Иван ИВАН',
		});
	});

	test('parseLessonLine throws on invalid format', () => {
		expect(() => app.parseLessonLine('Invalid')).toThrow();
	});

	test('formatLessonLine formats lesson object', () => {
		const lesson = { objType: 'Семинар', date: '2024.01.01', time: '12:30', name: 'Алексей Петрович' };
		expect(app.formatLessonLine(lesson)).toBe('Семинар: 2024.01.01 12:30 "Алексей Петрович"');
	});

	test('validateInput returns true for valid input', () => {
		expect(app.validateInput('Лекция', '2023.02.15', '10:00', 'Николай Николаевич')).toBe(true);
	});

	test('validateInput returns false for missing fields', () => {
		expect(app.validateInput('', '2023.02.15', '10:00', 'Николай Николаевич')).toBe(false);
		expect(app.validateInput('Лекция', '', '10:00', 'Николай Николаевич')).toBe(false);
		expect(app.validateInput('Лекция', '2023.02.15', '', 'Николай Николаевич')).toBe(false);
		expect(app.validateInput('Лекция', '2023.02.15', '10:00', '')).toBe(false);
	});

	test('validateInput returns false for invalid date/time', () => {
		expect(app.validateInput('Лекция', '2023-02-15', '10:00', 'Николай Николаевич')).toBe(false);
		expect(app.validateInput('Лекция', '2023.02.15', '1000', 'Николай Николаевич')).toBe(false);
	});

	test('escapeHtml escapes HTML', () => {
		expect(LessonApp.escapeHtml('<script>')).toBe('&lt;script&gt;');
		expect(LessonApp.escapeHtml('plain')).toBe('plain');
	});
});
