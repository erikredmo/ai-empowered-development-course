import { VibeKanbanWebCompanion } from 'vibe-kanban-web-companion';
import { format, parseISO, isBefore, isToday, isTomorrow } from 'date-fns';

// Todos array (Feature 1)
let todos = [];
let nextId = 1;

// Current filter (Feature 2)
let currentFilter = 'all';

// Current sort mode
let currentSort = 'none';

// LocalStorage key
const STORAGE_KEY = 'todos';
const NEXT_ID_KEY = 'nextId';

document.addEventListener('DOMContentLoaded', () => {
    init();
    initVibeKanban();
});

function init() {
    // Load todos from localStorage
    loadTodos();

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
    saveTodos();
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

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        if (todo.completed) li.classList.add('completed');

        const dueDateHtml = todo.dueDate ? `<span class="todo-due-date">${formatDueDate(todo.dueDate)}</span>` : '';

        li.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            ${dueDateHtml}
            <button class="todo-delete">Delete</button>
        `;

        li.querySelector('.todo-checkbox').addEventListener('change', () => toggleTodo(todo.id));
        li.querySelector('.todo-delete').addEventListener('click', () => deleteTodo(todo.id));

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
    if (currentFilter === 'active') {
        return todos.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        return todos.filter(t => t.completed);
    }
    return todos; // 'all'
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
