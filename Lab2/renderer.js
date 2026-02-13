
class LessonApp{
  constructor() {
    this.lessons = [];
    this.currentFilePath = null;
    this.selectedRowIndex = null;
    // DOM элементы
    this.openFileBtn = document.getElementById('openFileBtn');
    this.addLessonBtn = document.getElementById('addLessonBtn');
    this.deleteLessonBtn = document.getElementById('deleteLessonBtn');
    this.tableBody = document.getElementById('tableBody');
    this.addModal = document.getElementById('addModal');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.lessonForm = document.getElementById('lessonForm');
    this.statusBar = document.getElementById('statusBar');
  }

  // Инициализация приложения
   initializeApp() {
    this.setupEventListeners();
    this.updateUIState();
  }

  // Настройка обработчиков событий
   setupEventListeners() {
    this.openFileBtn.addEventListener('click', this.handleOpenFile.bind(this));
    this.addLessonBtn.addEventListener('click', () => this.openAddModal());
    this.deleteLessonBtn.addEventListener('click', this.handleDeleteLesson.bind(this));
    this.closeModalBtn.addEventListener('click', this.closeAddModal.bind(this));
    this.cancelBtn.addEventListener('click', this.closeAddModal.bind(this));
    this.lessonForm.addEventListener('submit', this.handleAddLesson.bind(this));
}
// Обработчик открытия файла
async handleOpenFile() {
  try {
    const filePath = await window.api.selectFile();
    if (filePath) {
      this.currentFilePath = filePath;
      await this.loadLessonsFromFile();
      this.showStatus(`Файл загружен: ${filePath}`, 'success');
    }
  } catch (error) {
    this.showError(`Ошибка при открытии файла: ${error.message}`);
  }
}
// Загрузка данных из файла
async loadLessonsFromFile() {
  try {
    const lines = await window.api.readFile(this.currentFilePath);
    this.lessons = lines.map(this.parseLessonLine.bind(this));
    this.renderLessonsTable();
    this.updateUIState();
  } catch (error) {
    this.showError(`Ошибка загрузки данных: ${error.message}`);
  }
}

// Парсинг строки в объект занятия
 parseLessonLine(line) {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) {
    throw new Error(`Неверный формат строки: ${line}`);
  }

  const objType = line.substring(0, colonIndex).trim();
  const rest = line.substring(colonIndex + 1).trim();

  const firstQuote = rest.indexOf('"');
  const lastQuote = rest.lastIndexOf('"');

  let name = '';
  let date = '';
  let time = '';

  if (firstQuote !== -1 && lastQuote !== -1 && firstQuote < lastQuote) {
    name = rest.substring(firstQuote + 1, lastQuote);
  }

  const parts = rest.split(' ').filter(part => part !== '');
  date = parts[0] || '';
  time = parts[1] || '';

  return { objType, date, time, name };
}
// Рендеринг таблицы занятий
 renderLessonsTable() {
  if (this.lessons.length === 0) {
    this.tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          <div> Нет данных</div>
          <p>Откройте файл с данными или добавьте новое занятие</p>
        </td>
      </tr>
    `;
    return;
  }

  this.tableBody.innerHTML = this.lessons.map((lesson, index) => `
    <tr data-index="${index}">
      <td>${LessonApp.escapeHtml(lesson.objType)}</td>
      <td>${LessonApp.escapeHtml(lesson.date)}</td>
      <td>${LessonApp.escapeHtml(lesson.time)}</td>
      <td>${LessonApp.escapeHtml(lesson.name)}</td>
    </tr>
  `).join('');

  // Добавление обработчиков кликов по строкам
  this.tableBody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      this.handleRowSelect(row);
    });
  });
}

// Обработчик выбора строки
 handleRowSelect(row) {
  this.tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
  row.classList.add('selected');
  this.selectedRowIndex = parseInt(row.dataset.index);
  this.deleteLessonBtn.disabled = false;
}

// Открытие модального окна добавления
 openAddModal() {
  this.addModal.classList.add('active');
  document.getElementById('objType').focus();
}

// Закрытие модального окна
 closeAddModal() {
  this.addModal.classList.remove('active');
  this.lessonForm.reset();
}

// Обработчик добавления занятия
 handleAddLesson(event) {
  event.preventDefault();

  const objType = document.getElementById('objType').value.trim();
  const date = document.getElementById('date').value.trim();
  const time = document.getElementById('time').value.trim();
  const name = document.getElementById('name').value.trim();

  if (!this.validateInput(objType, date, time, name)) {
    return;
  }

  const newLesson = { objType, date, time, name };
  this.lessons.push(newLesson);

  if (this.currentFilePath) {
    this.saveLessonsToFile();
  }

  this.renderLessonsTable();
  this.closeAddModal();
  this.showStatus('Занятие добавлено успешно', 'success');
  this.updateUIState();
}

// Валидация ввода
 validateInput(objType, date, time, name) {
  if (!objType || !date || !time || !name) {
    this.showError('Все поля обязательны для заполнения');
    return false;
  }

  // Проверка формата даты (гггг.мм.дд)
  const datePattern = /^\d{4}\.\d{2}\.\d{2}$/;
  if (!datePattern.test(date)) {
    this.showError('Неверный формат даты. Используйте формат: гггг.мм.дд');
    return false;
  }

  // Проверка формата времени (чч:мм)
  const timePattern = /^\d{2}:\d{2}$/;
  if (!timePattern.test(time)) {
    this.showError('Неверный формат времени. Используйте формат: чч:мм');
    return false;
  }

  return true;
}

// Обработчик удаления занятия
 handleDeleteLesson() {
  if (this.selectedRowIndex === null || this.selectedRowIndex < 0 || this.selectedRowIndex >= this.lessons.length) {
    this.showError('Выберите занятие для удаления');
    return;
  }

  const lessonName = this.lessons[this.selectedRowIndex].name;
  if (!confirm(`Вы уверены, что хотите удалить занятие "${lessonName}"?`)) {
    return;
  }

  this.lessons.splice(this.selectedRowIndex, 1);
  this.selectedRowIndex = null;

  if (this.currentFilePath) {
    this.saveLessonsToFile();
  }

  this.renderLessonsTable();
  this.showStatus('Занятие удалено успешно', 'success');
  this.updateUIState();
}

// Сохранение данных в файл
async  saveLessonsToFile() {
  try {
    const data = this.lessons.map(lesson => this.formatLessonLine(lesson)).join('\n');
    await window.api.writeFile(this.currentFilePath, data);
  } catch (error) {
    this.showError(`Ошибка сохранения файла: ${error.message}`);
  }
}

// Форматирование объекта в строку
 formatLessonLine(lesson) {
  return `${lesson.objType}: ${lesson.date} ${lesson.time} "${lesson.name}"`;
}

// Экранирование HTML
 static escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Отображение статуса
 showStatus(message, type = 'info') {
  this.statusBar.textContent = message;
  this.statusBar.className = `status-bar ${type}`;
  this.statusBar.style.display = 'block';

  setTimeout(() => {
    this.statusBar.style.display = 'none';
  }, 3000);
}

 showError(message) {
  this.showStatus(message, 'error');
  console.error(message);
}

// Обновление состояния
 updateUIState() {
  this.deleteLessonBtn.disabled = this.selectedRowIndex === null || this.lessons.length === 0;
}
}

const app = new LessonApp();
// Инициализация приложения
window.addEventListener('DOMContentLoaded', app.initializeApp.bind(app));
