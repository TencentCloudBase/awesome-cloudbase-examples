import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../lib/auth";
import { listTodos, createTodo, toggleTodo, deleteTodo } from "../lib/todo-service";
import { useCurrentUser } from "../components/UserContext";
import type { TodoRecord } from "../types";

export default function TodoListPage() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();

  const [todos, setTodos] = useState<TodoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const list = await listTodos();
      setTodos(list);
    } catch (err: any) {
      console.error("加载 Todo 列表失败:", err);
      setLoadError(err?.message || "加载失败");
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await createTodo(trimmed);
      setNewTitle("");
      fetchTodos();
    } catch (err: any) {
      console.error("创建 Todo 失败:", err);
      setLoadError(err?.message || "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (todo: TodoRecord) => {
    try {
      await toggleTodo(todo.id, !todo.done);
      fetchTodos();
    } catch (err) {
      console.error("切换 Todo 状态失败:", err);
    }
  };

  const handleDelete = async (todo: TodoRecord) => {
    try {
      await deleteTodo(todo.id);
      fetchTodos();
    } catch (err) {
      console.error("删除 Todo 失败:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div data-testid="todos-page" className="page todos-page">
      <div data-testid="todos-toolbar" className="toolbar">
        <h1 className="toolbar-title">我的待办</h1>
        <div className="toolbar-right">
          {currentUser && (
            <span data-testid="current-user-name" className="toolbar-user-name">
              {currentUser.displayName}
            </span>
          )}
          <button
            data-testid="logout-button"
            className="btn btn-text"
            onClick={handleLogout}
          >
            退出登录
          </button>
        </div>
      </div>

      <form
        data-testid="todo-create-form"
        className="todo-create-form"
        onSubmit={handleCreate}
      >
        <input
          data-testid="todo-new-title-input"
          type="text"
          placeholder="输入新的待办事项"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          disabled={submitting}
        />
        <button
          data-testid="todo-new-submit"
          type="submit"
          className="btn btn-primary"
          disabled={submitting || !newTitle.trim()}
        >
          添加
        </button>
      </form>

      {loading && (
        <div data-testid="todos-loading" className="loading">
          加载中...
        </div>
      )}

      {loadError && !loading && (
        <div data-testid="todos-error" className="form-error">
          {loadError}
        </div>
      )}

      {!loading && !loadError && todos.length === 0 && (
        <div data-testid="todos-empty" className="empty">
          暂无待办事项
        </div>
      )}

      {!loading && !loadError && todos.length > 0 && (
        <ul data-testid="todos-list" className="todos-list">
          {todos.map((todo) => (
            <li
              key={todo.id}
              data-testid={`todo-item-${todo.id}`}
              data-todo-title={todo.title}
              data-todo-done={todo.done ? "true" : "false"}
              className={`todo-item${todo.done ? " todo-item-done" : ""}`}
            >
              <input
                data-testid={`todo-checkbox-${todo.id}`}
                type="checkbox"
                checked={todo.done}
                onChange={() => handleToggle(todo)}
              />
              <span
                data-testid={`todo-title-${todo.id}`}
                className="todo-title"
              >
                {todo.title}
              </span>
              <button
                data-testid={`todo-delete-${todo.id}`}
                className="btn btn-sm btn-danger"
                onClick={() => handleDelete(todo)}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
