const STORAGE_KEY = "desk-pad-tasks";

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const formHint = document.getElementById("formHint");
const taskList = document.getElementById("taskList");
const filterTabs = document.getElementById("filterTabs");
const taskCount = document.getElementById("taskCount");
const clearCompletedBtn = document.getElementById("clearCompleted");
const emptyState = document.getElementById("emptyState");
const emptyLine = document.getElementById("emptyLine");
const emptySub = document.getElementById("emptySub");
const dateLine = document.getElementById("dateLine");

let tasks = loadTasks();
let currentFilter = "all";
let hintTimeout = null;

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function showHint(message) {
  formHint.textContent = message;
  formHint.classList.add("show");
  clearTimeout(hintTimeout);
  hintTimeout = setTimeout(() => {
    formHint.classList.remove("show");
  }, 2200);
}

function setDateLine() {
  const today = new Date();
  const formatted = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
  dateLine.textContent = formatted + " — don't forget the little things";
}

function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    showHint("can't add an empty line");
    return;
  }
  tasks.unshift({
    id: makeId(),
    text: trimmed,
    completed: false,
    justAdded: true
  });
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    render();
  }
}

function deleteTask(id) {
  const li = taskList.querySelector(`[data-id="${id}"]`);
  if (li) {
    li.classList.add("leaving");
    setTimeout(() => {
      tasks = tasks.filter((t) => t.id !== id);
      saveTasks();
      render();
    }, 180);
  } else {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
  }
}

function startEdit(id) {
  tasks.forEach((t) => (t.editing = t.id === id));
  render();
}

function commitEdit(id, newText) {
  const trimmed = newText.trim();
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  if (!trimmed) {
    tasks = tasks.filter((t) => t.id !== id);
  } else {
    task.text = trimmed;
    task.editing = false;
  }
  saveTasks();
  render();
}

function cancelEdit(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.editing = false;
  render();
}

function clearCompleted() {
  tasks = tasks.filter((t) => !t.completed);
  saveTasks();
  render();
}

function getFilteredTasks() {
  if (currentFilter === "active") return tasks.filter((t) => !t.completed);
  if (currentFilter === "completed") return tasks.filter((t) => t.completed);
  return tasks;
}

function updateEmptyState(filtered) {
  if (filtered.length > 0) {
    emptyState.hidden = true;
    taskList.hidden = false;
    return;
  }
  taskList.hidden = true;
  emptyState.hidden = false;

  if (tasks.length === 0) {
    emptyLine.textContent = "Nothing here yet.";
    emptySub.textContent = "Type above and press Enter to start your list.";
  } else if (currentFilter === "active") {
    emptyLine.textContent = "All caught up.";
    emptySub.textContent = "Every task on the pad is checked off.";
  } else {
    emptyLine.textContent = "No completed tasks.";
    emptySub.textContent = "Finished items will collect here.";
  }
}

function updateCount() {
  const remaining = tasks.filter((t) => !t.completed).length;
  taskCount.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"} left`;
  clearCompletedBtn.disabled = tasks.every((t) => !t.completed);
}

function buildTaskItem(task) {
  const li = document.createElement("li");
  li.className = "task-item";
  li.dataset.id = task.id;
  if (task.completed) li.classList.add("completed");
  if (task.editing) li.classList.add("editing");
  if (task.justAdded) {
    li.classList.add("entering");
    delete task.justAdded;
  }

  li.innerHTML = `
    <label class="check">
      <input type="checkbox" class="check-input" ${task.completed ? "checked" : ""} aria-label="Mark task complete">
      <span class="check-box">
        <svg class="check-mark" viewBox="0 0 24 24"><polyline points="4,13 9,18 20,5"/></svg>
      </span>
    </label>
    <span class="task-text">${escapeHtml(task.text)}</span>
    <input type="text" class="edit-input" value="${escapeHtml(task.text)}" maxlength="120" aria-label="Edit task">
    <div class="task-actions">
      <button class="edit-btn" type="button" title="Edit task">✎</button>
      <button class="delete-btn" type="button" title="Delete task">×</button>
    </div>
  `;

  const checkInput = li.querySelector(".check-input");
  const taskText = li.querySelector(".task-text");
  const editInput = li.querySelector(".edit-input");
  const editBtn = li.querySelector(".edit-btn");
  const deleteBtn = li.querySelector(".delete-btn");

  checkInput.addEventListener("change", () => toggleTask(task.id));
  editBtn.addEventListener("click", () => startEdit(task.id));
  taskText.addEventListener("dblclick", () => startEdit(task.id));
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit(task.id, editInput.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit(task.id);
    }
  });
  editInput.addEventListener("blur", () => {
    if (task.editing) commitEdit(task.id, editInput.value);
  });

  if (task.editing) {
    requestAnimationFrame(() => {
      editInput.focus();
      editInput.setSelectionRange(editInput.value.length, editInput.value.length);
    });
  }

  return li;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function render() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = "";
  filtered.forEach((task) => {
    taskList.appendChild(buildTaskItem(task));
  });

  requestAnimationFrame(() => {
    taskList.querySelectorAll(".task-item.entering").forEach((el) => {
      requestAnimationFrame(() => el.classList.remove("entering"));
    });
  });

  updateEmptyState(filtered);
  updateCount();
}

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addTask(taskInput.value);
  taskInput.value = "";
  taskInput.focus();
});

filterTabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  filterTabs.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  render();
});

clearCompletedBtn.addEventListener("click", clearCompleted);

setDateLine();
render();
