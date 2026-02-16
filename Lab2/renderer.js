class LessonModel {
  constructor() {
    this.lessons = [];
    this.currentFilePath = null;
  }

  setCurrentFilePath(path) {
    this.currentFilePath = path;
  }

  getCurrentFilePath() {
    return this.currentFilePath;
  }

  async loadLessonsFromFile(filePath) {
    this.setCurrentFilePath(filePath);
    const lines = await window.api.readFile(filePath);
    this.lessons = [];
    lines.forEach((line, idx) => {
      try {
        this.lessons.push(this.parseLessonLine(line));
      } catch (err) {
        console.error(`Ошибка парсинга строки ${idx + 1}: ${err.message}`);
      }
    });
  }

  async saveLessonsToFile() {
    if (!this.currentFilePath) throw new Error('Отсутствует путь к файлу');
    const data = this.lessons.map(lesson => this.formatLessonLine(lesson)).join('\n');
    await window.api.writeFile(this.currentFilePath, data);
  }

  addLesson(lesson) {
    const error = this.validateLesson(lesson);
    if (error) throw new Error(error);
    this.lessons.push(lesson);
  }

  deleteLesson(index) {
    if (index < 0 || index >= this.lessons.length) {
      throw new Error('Некорректный индекс занятия');
    }
    this.lessons.splice(index, 1);
  }

  validateLesson(lesson) {
    if (!lesson.objType || !lesson.date || !lesson.time || !lesson.name) {
      return 'Все поля обязательны для заполнения';
    }
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(lesson.date)) {
      return 'Неверный формат даты. Используйте: гггг.мм.дд';
    }
    if (!/^\d{2}:\d{2}$/.test(lesson.time)) {
      return 'Неверный формат времени. Используйте: чч:мм';
    }
    return null;
  }

  parseLessonLine(line) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) throw new Error(`Неверный формат строки: ${line}`);
    const objType = line.substring(0, colonIndex).trim();
    const rest = line.substring(colonIndex + 1).trim();
    const firstQuote = rest.indexOf('"');
    const lastQuote = rest.lastIndexOf('"');
    let name = '';
    if (firstQuote !== -1 && lastQuote !== -1 && firstQuote < lastQuote) {
      name = rest.substring(firstQuote + 1, lastQuote);
    }
    const parts = rest.split(' ').filter(p => p && p !== name);
    const date = parts[0] || '';
    const time = parts[1] || '';
    return { objType, date, time, name };
  }

  formatLessonLine(lesson) {
    return `${lesson.objType}: ${lesson.date} ${lesson.time} "${lesson.name}"`;
  }
}

class LessonView {
  constructor() {
    this.openFileBtn = document.getElementById('openFileBtn');
    this.addLessonBtn = document.getElementById('addLessonBtn');
    this.deleteLessonBtn = document.getElementById('deleteLessonBtn');
    this.tableBody = document.getElementById('tableBody');
    this.addModal = document.getElementById('addModal');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.lessonForm = document.getElementById('lessonForm');
    this.statusBar = document.getElementById('statusBar');
    this.selectedRowIndex = null;
  }

  renderLessonsTable(lessons) {
    if (lessons.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <div>Нет данных</div>
            <p>Откройте файл с данными или добавьте новое занятие</p>
          </td>
        </tr>`;
      return;
    }
    this.tableBody.innerHTML = lessons.map((lesson, idx) => `
      <tr data-index="${idx}">
        <td>${LessonView.escapeHtml(lesson.objType)}</td>
        <td>${LessonView.escapeHtml(lesson.date)}</td>
        <td>${LessonView.escapeHtml(lesson.time)}</td>
        <td>${LessonView.escapeHtml(lesson.name)}</td>
      </tr>`).join('');
  }

  showAddModal() {
    this.addModal.classList.add('active');
    document.getElementById('objType').focus();
  }

  hideAddModal() {
    this.addModal.classList.remove('active');
    this.lessonForm.reset();
  }

  getFormData() {
    return {
      objType: document.getElementById('objType').value.trim(),
      date: document.getElementById('date').value.trim(),
      time: document.getElementById('time').value.trim(),
      name: document.getElementById('name').value.trim()
    };
  }

  setSelectedRow(index) {
    this.tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
    const row = this.tableBody.querySelector(`tr[data-index="${index}"]`);
    if (row) row.classList.add('selected');
    this.selectedRowIndex = index;
  }

  clearSelection() {
    this.tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
    this.selectedRowIndex = null;
  }

  getSelectedRowIndex() {
    return this.selectedRowIndex;
  }

  updateDeleteButtonState(isDisabled) {
    this.deleteLessonBtn.disabled = isDisabled;
  }

  showStatus(message, type = 'info') {
    this.statusBar.textContent = message;
    this.statusBar.className = `status-bar ${type}`;
    this.statusBar.style.display = 'block';
    setTimeout(() => { this.statusBar.style.display = 'none'; }, 3000);
  }

  showError(message) {
    this.showStatus(message, 'error');
    console.error(message);
  }

  confirmDeletion(lessonName) {
    return confirm(`Вы уверены, что хотите удалить занятие "${lessonName}"?`);
  }

  setupEventListeners(controller) {
    this.openFileBtn.addEventListener('click', () => controller.handleOpenFile());
    this.addLessonBtn.addEventListener('click', () => controller.handleOpenAddModal());
    this.deleteLessonBtn.addEventListener('click', () => controller.handleDeleteLesson());
    this.closeModalBtn.addEventListener('click', () => controller.handleCloseAddModal());
    this.cancelBtn.addEventListener('click', () => controller.handleCloseAddModal());
    this.lessonForm.addEventListener('submit', (e) => controller.handleAddLesson(e));
    this.tableBody.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-index]');
      if (row) controller.handleRowSelect(parseInt(row.dataset.index));
    });
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

class LessonController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  async handleOpenFile() {
    try {
      const filePath = await window.api.selectFile();
      if (!filePath) return;
      await this.model.loadLessonsFromFile(filePath);
      this.view.renderLessonsTable(this.model.lessons);
      this.view.showStatus(`Файл загружен: ${filePath}`, 'success');
      this.updateUIState();
    } catch (error) {
      this.view.showError(`Ошибка при открытии файла: ${error.message}`);
    }
  }

  handleOpenAddModal() {
    this.view.showAddModal();
  }

  handleCloseAddModal() {
    this.view.hideAddModal();
  }

  async handleAddLesson(event) {
    event.preventDefault();
    const lesson = this.view.getFormData();
    const validationError = this.model.validateLesson(lesson);
    if (validationError) {
      this.view.showError(validationError);
      return;
    }
    try {
      this.model.addLesson(lesson);
      if (this.model.getCurrentFilePath()) await this.model.saveLessonsToFile();
      this.view.renderLessonsTable(this.model.lessons);
      this.view.hideAddModal();
      this.view.showStatus('Занятие добавлено успешно', 'success');
      this.updateUIState();
    } catch (error) {
      this.view.showError(`Ошибка добавления: ${error.message}`);
    }
  }

  handleRowSelect(index) {
    this.view.setSelectedRow(index);
    this.updateUIState();
  }

  async handleDeleteLesson() {
    const index = this.view.getSelectedRowIndex();
    if (index === null || index < 0 || index >= this.model.lessons.length) {
      this.view.showError('Выберите занятие для удаления');
      return;
    }
    const lessonName = this.model.lessons[index].name;
    if (!this.view.confirmDeletion(lessonName)) return;
    try {
      this.model.deleteLesson(index);
      if (this.model.getCurrentFilePath()) await this.model.saveLessonsToFile();
      this.view.renderLessonsTable(this.model.lessons);
      this.view.clearSelection();
      this.view.showStatus('Занятие удалено успешно', 'success');
      this.updateUIState();
    } catch (error) {
      this.view.showError(`Ошибка удаления: ${error.message}`);
    }
  }

  updateUIState() {
    const hasSelection = this.view.getSelectedRowIndex() !== null;
    const hasLessons = this.model.lessons.length > 0;
    this.view.updateDeleteButtonState(!(hasSelection && hasLessons));
  }
}

class LessonApp {
  constructor() {
    const model = new LessonModel();
    const view = new LessonView();
    const controller = new LessonController(model, view);
    view.setupEventListeners(controller);
    this.controller = controller;
    this.view = view;
  }

  initializeApp() {
    this.view.renderLessonsTable([]);
    this.controller.updateUIState();
  }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  const app = new LessonApp();
  app.initializeApp();
});

module.exports = { LessonApp, LessonModel, LessonView, LessonController };