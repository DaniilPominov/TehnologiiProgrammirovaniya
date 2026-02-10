let currentFilePath = null;
let lessons = [];
let selectedRowIndex = null;

// DOM элементы
const openFileBtn = document.getElementById('openFileBtn');
const addLessonBtn = document.getElementById('addLessonBtn');
const deleteLessonBtn = document.getElementById('deleteLessonBtn');
const tableBody = document.getElementById('tableBody');
const addModal = document.getElementById('addModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const lessonForm = document.getElementById('lessonForm');
const statusBar = document.getElementById('statusBar');

// Инициализация приложения
function initializeApp() {
  setupEventListeners();
  updateUIState();
}

// Настройка обработчиков событий
function setupEventListeners() {
  openFileBtn.addEventListener('click', handleOpenFile);
  addLessonBtn.addEventListener('click', () => openAddModal());
  deleteLessonBtn.addEventListener('click', handleDeleteLesson);
  closeModalBtn.addEventListener('click', closeAddModal);
  cancelBtn.addEventListener('click', closeAddModal);
  lessonForm.addEventListener('submit', handleAddLesson);
}

// Обработчик открытия файла
async function handleOpenFile() {
  try {
    const filePath = await window.api.selectFile();
    if (filePath) {
      currentFilePath = filePath;
      await loadLessonsFromFile();
      showStatus(`Файл загружен: ${filePath}`, 'success');
    }
  } catch (error) {
    showError(`Ошибка при открытии файла: ${error.message}`);
  }
}

// Загрузка данных из файла
async function loadLessonsFromFile() {
  try {
    const lines = await window.api.readFile(currentFilePath);
    lessons = lines.map(parseLessonLine);
    renderLessonsTable();
    updateUIState();
  } catch (error) {
    showError(`Ошибка загрузки данных: ${error.message}`);
  }
}

// Парсинг строки в объект занятия
function parseLessonLine(line) {
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

// Отображение таблицы занятий
function renderLessonsTable() {
  if (lessons.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          <div>📭 Нет данных</div>
          <p>Откройте файл с данными или добавьте новое занятие</p>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = lessons.map((lesson, index) => `
    <tr data-index="${index}">
      <td>${escapeHtml(lesson.objType)}</td>
      <td>${escapeHtml(lesson.date)}</td>
      <td>${escapeHtml(lesson.time)}</td>
      <td>${escapeHtml(lesson.name)}</td>
    </tr>
  `).join('');

  // Добавление обработчиков кликов по строкам
  tableBody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      handleRowSelect(row);
    });
  });
}

// Обработчик выбора строки
function handleRowSelect(row) {
  tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
  row.classList.add('selected');
  selectedRowIndex = parseInt(row.dataset.index);
  deleteLessonBtn.disabled = false;
}

// Открытие модального окна добавления
function openAddModal() {
  addModal.classList.add('active');
  document.getElementById('objType').focus();
}

// Закрытие модального окна
function closeAddModal() {
  addModal.classList.remove('active');
  lessonForm.reset();
}

// Обработчик добавления занятия
function handleAddLesson(event) {
  event.preventDefault();

  const objType = document.getElementById('objType').value.trim();
  const date = document.getElementById('date').value.trim();
  const time = document.getElementById('time').value.trim();
  const name = document.getElementById('name').value.trim();

  if (!validateInput(objType, date, time, name)) {
    return;
  }

  const newLesson = { objType, date, time, name };
  lessons.push(newLesson);

  if (currentFilePath) {
    saveLessonsToFile();
  }

  renderLessonsTable();
  closeAddModal();
  showStatus('Занятие добавлено успешно', 'success');
  updateUIState();
}

// Валидация ввода
function validateInput(objType, date, time, name) {
  if (!objType || !date || !time || !name) {
    showError('Все поля обязательны для заполнения');
    return false;
  }

  // Проверка формата даты (гггг.мм.дд)
  const datePattern = /^\d{4}\.\d{2}\.\d{2}$/;
  if (!datePattern.test(date)) {
    showError('Неверный формат даты. Используйте формат: гггг.мм.дд');
    return false;
  }

  // Проверка формата времени (чч:мм)
  const timePattern = /^\d{2}:\d{2}$/;
  if (!timePattern.test(time)) {
    showError('Неверный формат времени. Используйте формат: чч:мм');
    return false;
  }

  return true;
}

// Обработчик удаления занятия
function handleDeleteLesson() {
  if (selectedRowIndex === null || selectedRowIndex < 0 || selectedRowIndex >= lessons.length) {
    showError('Выберите занятие для удаления');
    return;
  }

  const lessonName = lessons[selectedRowIndex].name;
  if (!confirm(`Вы уверены, что хотите удалить занятие "${lessonName}"?`)) {
    return;
  }

  lessons.splice(selectedRowIndex, 1);
  selectedRowIndex = null;

  if (currentFilePath) {
    saveLessonsToFile();
  }

  renderLessonsTable();
  showStatus('Занятие удалено успешно', 'success');
  updateUIState();
}

// Сохранение данных в файл
async function saveLessonsToFile() {
  try {
    const data = lessons.map(lesson => formatLessonLine(lesson)).join('\n');
    await window.api.writeFile(currentFilePath, data);
  } catch (error) {
    showError(`Ошибка сохранения файла: ${error.message}`);
  }
}

// Форматирование объекта в строку
function formatLessonLine(lesson) {
  return `${lesson.objType}: ${lesson.date} ${lesson.time} "${lesson.name}"`;
}

// Экранирование HTML для безопасности
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Отображение статуса
function showStatus(message, type = 'info') {
  statusBar.textContent = message;
  statusBar.className = `status-bar ${type}`;
  statusBar.style.display = 'block';

  setTimeout(() => {
    statusBar.style.display = 'none';
  }, 3000);
}

function showError(message) {
  showStatus(message, 'error');
  console.error(message);
}

// Обновление состояния
function updateUIState() {
  deleteLessonBtn.disabled = selectedRowIndex === null || lessons.length === 0;
}

// Инициализация приложения
window.addEventListener('DOMContentLoaded', initializeApp);