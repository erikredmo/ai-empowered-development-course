import { VibeKanbanWebCompanion } from 'vibe-kanban-web-companion';
import { format, parseISO, isBefore, isToday, isTomorrow } from 'date-fns';

// Todos array (Feature 1)
let todos = [];
let nextId = 1;

// Current filter (Feature 2)
let currentFilter = 'all';

// Current sort mode
let currentSort = 'none';

// Search query
let searchQuery = '';

// Notes object for detailed notes per todo
let notes = {};

// Expanded todo ID for inline details
let expandedTodoId = null;

// Dark mode preference
let darkMode = false;

// LocalStorage keys
const STORAGE_KEY = 'todos';
const NEXT_ID_KEY = 'nextId';
const NOTES_KEY = 'todoNotes';
const DARK_MODE_KEY = 'darkModePreference';

document.addEventListener('DOMContentLoaded', () => {
    init();
    initVibeKanban();
});

function init() {
    // Load todos from localStorage
    loadTodos();
    loadNotes();
    initDarkMode();

    // Wire up add button
    const addBtn = document.getElementById('addBtn');
    const todoInput = document.getElementById('todoInput');
    const dueDateInput = document.getElementById('dueDateInput');

    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    // Wire up filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });

    // Wire up sort button
    const sortBtn = document.getElementById('sortBtn');
    if (sortBtn) {
        sortBtn.addEventListener('click', toggleSort);
    }

    // Wire up search input
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTodos();
    });
    clearSearchBtn.addEventListener('click', () => {
        searchQuery = '';
        searchInput.value = '';
        renderTodos();
    });

    // Wire up dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    darkModeToggle.addEventListener('click', () => {
        toggleDarkMode();
        updateDarkModeButton();
    });
    updateDarkModeButton();

    renderTodos();
}

function initVibeKanban() {
    const companion = new VibeKanbanWebCompanion();
    companion.render(document.body);
}

// Feature 1: Add, toggle, delete todos
function addTodo() {
    const input = document.getElementById('todoInput');
    const dueDateInput = document.getElementById('dueDateInput');
    const text = input.value.trim();

    if (text === '') return;

    todos.push({
        id: nextId++,
        text: text,
        completed: false,
        dueDate: dueDateInput.value || null
    });

    input.value = '';
    dueDateInput.value = '';
    saveTodos();
    renderTodos();
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
    }
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    delete notes[id];
    expandedTodoId = null;
    saveTodos();
    saveNotes();
    renderTodos();
}

// Feature 1: Render todos
function renderTodos() {
    const todoList = document.getElementById('todoList');
    let filteredTodos = getFilteredTodos();

    // Apply sorting if enabled
    if (currentSort === 'dueDate') {
        filteredTodos = sortByDueDate(filteredTodos);
    }

    todoList.innerHTML = '';

    // Show "no matches" message if no todos to display
    if (filteredTodos.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = searchQuery.trim() ? 'No matches found' : 'No todos yet';
        todoList.appendChild(emptyMessage);
        return;
    }

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.dataset.todoId = todo.id;
        if (todo.completed) li.classList.add('completed');
        if (expandedTodoId === todo.id) li.classList.add('expanded');

        // Create a wrapper for the controls
        const controlsWrapper = document.createElement('div');
        controlsWrapper.className = 'todo-controls';

        const dueDateHtml = todo.dueDate ? `<span class="todo-due-date">${formatDueDate(todo.dueDate)}</span>` : '';

        controlsWrapper.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            ${dueDateHtml}
            <button class="todo-expand" aria-label="Expand details">▼</button>
            <button class="todo-delete">Delete</button>
        `;

        controlsWrapper.querySelector('.todo-checkbox').addEventListener('change', () => toggleTodo(todo.id));
        controlsWrapper.querySelector('.todo-delete').addEventListener('click', () => deleteTodo(todo.id));
        controlsWrapper.querySelector('.todo-expand').addEventListener('click', (e) => {
            e.stopPropagation();
            setExpandedTodo(todo.id);
        });

        li.appendChild(controlsWrapper);

        // Add expanded details section if this todo is expanded
        if (expandedTodoId === todo.id) {
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'todo-details';
            const notesContent = notes[todo.id] || '';
            detailsDiv.innerHTML = `
                <textarea class="todo-notes" placeholder="Add notes...">${escapeHtml(notesContent)}</textarea>
            `;
            const textarea = detailsDiv.querySelector('.todo-notes');
            textarea.addEventListener('input', (e) => {
                updateNotes(todo.id, e.target.value);
            });
            li.appendChild(detailsDiv);
        }

        todoList.appendChild(li);
    });
}

// Helper function to format due dates nicely
function formatDueDate(dateString) {
    const date = parseISO(dateString);

    if (isToday(date)) {
        return 'Today';
    } else if (isTomorrow(date)) {
        return 'Tomorrow';
    }

    return format(date, 'MMM d, yyyy');
}

// Helper function to sort todos by due date (upcoming first)
function sortByDueDate(todosToSort) {
    return [...todosToSort].sort((a, b) => {
        // Todos without due dates go to the end
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;

        const dateA = parseISO(a.dueDate);
        const dateB = parseISO(b.dueDate);

        return isBefore(dateA, dateB) ? -1 : 1;
    });
}

// Feature 2: Filter todos based on current filter
function getFilteredTodos() {
    let filtered = todos;

    if (currentFilter === 'active') {
        filtered = filtered.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    }

    // Apply search filter
    if (searchQuery.trim()) {
        filtered = filterBySearch(filtered, searchQuery);
    }

    return filtered;
}

// Filter todos by search query
function filterBySearch(todosToFilter, query) {
    const lowerQuery = query.toLowerCase();
    return todosToFilter.filter(t => {
        const titleMatch = t.text.toLowerCase().includes(lowerQuery);
        const notesMatch = notes[t.id] && notes[t.id].toLowerCase().includes(lowerQuery);
        return titleMatch || notesMatch;
    });
}

// Feature 2: Set filter and update UI
function setFilter(filter) {
    currentFilter = filter;

    // Update button styling
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });

    renderTodos();
}

// Feature 3: Toggle sort by due date
function toggleSort() {
    currentSort = currentSort === 'dueDate' ? 'none' : 'dueDate';

    const sortBtn = document.getElementById('sortBtn');
    if (sortBtn) {
        sortBtn.classList.toggle('active', currentSort === 'dueDate');
    }

    renderTodos();
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Feature 2: Todo Details/Notes functions
function setExpandedTodo(id) {
    expandedTodoId = expandedTodoId === id ? null : id;
    renderTodos();
}

function updateNotes(id, noteText) {
    notes[id] = noteText;
    saveNotes();
}

function getNotes(id) {
    return notes[id] || '';
}

// Feature 3: Dark Mode functions
function initDarkMode() {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved !== null) {
        darkMode = JSON.parse(saved);
    } else {
        // Detect system preference
        darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyDarkMode();
}

function toggleDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(darkMode));
    applyDarkMode();
}

function applyDarkMode() {
    if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function updateDarkModeButton() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.textContent = darkMode ? '☀️' : '🌙';
    }
}

// LocalStorage functions
function saveTodos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    localStorage.setItem(NEXT_ID_KEY, JSON.stringify(nextId));
}

function loadTodos() {
    const storedTodos = localStorage.getItem(STORAGE_KEY);
    const storedNextId = localStorage.getItem(NEXT_ID_KEY);

    if (storedTodos) {
        todos = JSON.parse(storedTodos);
    }

    if (storedNextId) {
        nextId = JSON.parse(storedNextId);
    }
}

function saveNotes() {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function loadNotes() {
    const storedNotes = localStorage.getItem(NOTES_KEY);
    if (storedNotes) {
        notes = JSON.parse(storedNotes);
    }
}
