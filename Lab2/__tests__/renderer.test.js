/** @jest-environment jsdom */
const { LessonApp, LessonModel, LessonView, LessonController } = require("../renderer")

describe('LessonModel', () => {
  let model;
  beforeEach(() => {
    model = new LessonModel();
  });

  test('loadLessonsFromFile skips invalid lines and logs error', async () => {
    const valid1 = 'Лекция: 2023.02.15 10:00 "Иван ИВАН"';
    const invalid = 'Некорректная строка';
    const valid2 = 'Семинар: 2024.01.01 12:30 "Алексей Петрович"';
    window.api = {
      readFile: jest.fn().mockResolvedValue([valid1, invalid, valid2]),
      writeFile: jest.fn(),
      selectFile: jest.fn(),
    };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await model.loadLessonsFromFile('fakepath');
    expect(model.lessons.length).toBe(2);
    expect(model.lessons[0]).toEqual({
      objType: 'Лекция',
      date: '2023.02.15',
      time: '10:00',
      name: 'Иван ИВАН',
    });
    expect(model.lessons[1]).toEqual({
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
    const lesson = model.parseLessonLine(line);
    expect(lesson).toEqual({
      objType: 'Лекция',
      date: '2023.02.15',
      time: '10:00',
      name: 'Иван ИВАН',
    });
  });

  test('parseLessonLine throws on invalid format', () => {
    expect(() => model.parseLessonLine('Invalid')).toThrow();
  });

  test('formatLessonLine formats lesson object', () => {
    const lesson = { objType: 'Семинар', date: '2024.01.01', time: '12:30', name: 'Алексей Петрович' };
    expect(model.formatLessonLine(lesson)).toBe('Семинар: 2024.01.01 12:30 "Алексей Петрович"');
  });

  test('validateLesson returns null for valid input', () => {
    const lesson = { objType: 'Лекция', date: '2023.02.15', time: '10:00', name: 'Николай Николаевич' };
    expect(model.validateLesson(lesson)).toBe(null);
  });

  test('validateLesson returns error for missing fields', () => {
    expect(model.validateLesson({ objType: '', date: '2023.02.15', time: '10:00', name: 'Николай Николаевич' })).toBeDefined();
    expect(model.validateLesson({ objType: 'Лекция', date: '', time: '10:00', name: 'Николай Николаевич' })).toBeDefined();
    expect(model.validateLesson({ objType: 'Лекция', date: '2023.02.15', time: '', name: 'Николай Николаевич' })).toBeDefined();
    expect(model.validateLesson({ objType: 'Лекция', date: '2023.02.15', time: '10:00', name: '' })).toBeDefined();
  });

  test('validateLesson returns error for invalid date/time', () => {
    expect(model.validateLesson({ objType: 'Лекция', date: '2023-02-15', time: '10:00', name: 'Николай Николаевич' })).toBeDefined();
    expect(model.validateLesson({ objType: 'Лекция', date: '2023.02.15', time: '1000', name: 'Николай Николаевич' })).toBeDefined();
  });
});

describe('LessonView', () => {
  beforeEach(() => {
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
  });

  test('escapeHtml escapes HTML', () => {
    expect(LessonView.escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(LessonView.escapeHtml('plain')).toBe('plain');
  });
});