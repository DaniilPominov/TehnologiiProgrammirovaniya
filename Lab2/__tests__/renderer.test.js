/** @jest-environment jsdom */
const {LessonModel, LessonView, CommandProcessor } = require("../renderer")

describe('LessonModel', () => {
    let model;
    let processor;
    let errorSpy;

    beforeEach(() => {
        model = new LessonModel();
        processor = new CommandProcessor(model);
    });

    afterEach(() => {
        if (errorSpy) {
            errorSpy.mockRestore();
        }
        delete window.api;
    });

    describe('loadLessonsFromFile', () => {
        const valid1 = 'Лекция: 2023.02.15 10:00 "Иван ИВАН"';
        const invalid = 'Некорректная строка';
        const valid2 = 'Семинар: 2024.01.01 12:30 "Алексей Петрович"';

        beforeEach(() => {
            window.api = {
                readFile: jest.fn().mockResolvedValue([valid1, invalid, valid2]),
                writeFile: jest.fn(),
                selectFile: jest.fn(),
            };
            errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        });

        test('должен загрузить корректное количество уроков', async () => {
            await model.loadLessonsFromFile('fakepath');
            expect(model.lessons.length).toBe(2);
        });

        test('должен корректно распарсить первый урок', async () => {
            await model.loadLessonsFromFile('fakepath');
            expect(model.lessons[0]).toEqual({
                objType: 'Лекция',
                date: '2023.02.15',
                time: '10:00',
                name: 'Иван ИВАН',
            });
        });

        test('должен корректно распарсить второй урок', async () => {
            await model.loadLessonsFromFile('fakepath');
            expect(model.lessons[1]).toEqual({
                objType: 'Семинар',
                date: '2024.01.01',
                time: '12:30',
                name: 'Алексей Петрович',
            });
        });

        test('должен логировать ошибку при наличии некорректных строк', async () => {
            await model.loadLessonsFromFile('fakepath');
            expect(errorSpy).toHaveBeenCalled();
        });
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

    describe('validateLesson missing fields', () => {
        test('должен возвращать ошибку при пустом objType', () => {
            const lesson = { objType: '', date: '2023.02.15', time: '10:00', name: 'Николай Николаевич' };
            expect(model.validateLesson(lesson)).toBeDefined();
        });

        test('должен возвращать ошибку при пустой date', () => {
            const lesson = { objType: 'Лекция', date: '', time: '10:00', name: 'Николай Николаевич' };
            expect(model.validateLesson(lesson)).toBeDefined();
        });

        test('должен возвращать ошибку при пустом time', () => {
            const lesson = { objType: 'Лекция', date: '2023.02.15', time: '', name: 'Николай Николаевич' };
            expect(model.validateLesson(lesson)).toBeDefined();
        });

        test('должен возвращать ошибку при пустом name', () => {
            const lesson = { objType: 'Лекция', date: '2023.02.15', time: '10:00', name: '' };
            expect(model.validateLesson(lesson)).toBeDefined();
        });
    });

    describe('validateLesson invalid formats', () => {
        test('должен возвращать ошибку при неверном формате даты', () => {
            const lesson = { objType: 'Лекция', date: '2023-02-15', time: '10:00', name: 'Николай Николаевич' };
            expect(model.validateLesson(lesson)).toBeDefined();
        });

        test('должен возвращать ошибку при неверном формате времени', () => {
            const lesson = { objType: 'Лекция', date: '2023.02.15', time: '1000', name: 'Николай Николаевич' };
            expect(model.validateLesson(lesson)).toBeDefined();
        });
    });

    describe('commandProcessor', () =>{
        test('преобразует csv к формату с пробелам', () =>{
            const csvinput = 'lecture; 2024.04.01; 09:00; "Введение в теорию вероятностей"';
            expect(processor.normalizeCsvToStr(csvinput)).toBe('lecture: 2024.04.01 09:00 "Введение в теорию вероятностей"');

        });
        test('считывает строку с командой', async ()=>{
            const commandLide = 'ADD lecture; 2024.04.01; 09:00; "Введение в теорию вероятностей"';
            const modelLength = model.lessons.length;
            await processor.executeCommand(commandLide);
            expect(model.lessons[modelLength]).toEqual(
                {
                objType: 'lecture',
                date: '2024.04.01',
                time: '09:00',
                name: 'Введение в теорию вероятностей',
            }
            );
        });

        test('считывает условие для REM',()=>{
            const conditionString = 'date<2024.04.01';
            const predicate = processor.parseCondition(conditionString);

            const lessonMatch = {objType: 'lecture', date: '2024.03.01', time: '09:00', name: 'Введение в теорию вероятностей'};
            const lessonNotMatch = {objType: 'lecture', date: '2024.04.01', time: '09:00', name: 'Введение в теорию вероятностей'};

            expect(predicate(lessonMatch)).toBe(true);
            expect(predicate(lessonNotMatch)).toBe(false);
        });

    });
});

describe('LessonView', () => {
    beforeEach(() => {
        document.body.innerHTML = `
      <button id="openFileBtn"></button>
      <button id="addLessonBtn"></button>
      <button id="deleteLessonBtn"></button>
      <button id="commandsFileBtn"></button>
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

    describe('escapeHtml', () => {
        test('должен экранировать HTML теги', () => {
            expect(LessonView.escapeHtml('<script>')).toBe('&lt;script&gt;');
        });

        test('должен оставлять обычный текст без изменений', () => {
            expect(LessonView.escapeHtml('plain')).toBe('plain');
        });
    });
});
