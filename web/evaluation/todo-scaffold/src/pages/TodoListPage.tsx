import { useState, useEffect, useCallback, type FormEvent } from "react";
import { ensureSession } from "../lib/session";
import { listTodos, createTodo, toggleTodo, deleteTodo } from "../lib/todo-service";
import type { TodoRecord, SessionInfo } from "../types";

export default function TodoListPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [todos, setTodos] = useState<TodoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 初始化匿名会话
  useEffect(() => {
    ensureSession()
      .then((s) => {
        setSession(s);
        setSessionError("");
      })
      .catch((err: any) => {
        console.error("会话初始化失败:", err);
        setSessionError(err?.message || "会话初始化失败");
        setLoading(false);
      });
  }, []);

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

  // 会话就绪后加载 todos
  useEffect(() => {
    if (session) fetchTodos();
  }, [session, fetchTodos]);

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
      console.error("切换状态失败:", err);
    }
  };

  const handleDelete = async (todo: TodoRecord) => {
    try {
      await deleteTodo(todo.id);
      fetchTodos();
    } catch (err) {
      console.error("删除失败:", err);
    }
  };

  if (sessionError) {
    return (
      <div data-testid="todos-page" className="page todos-page">
        <div data-testid="session-error" className="form-error">
          会话初始化失败: {sessionError}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="todos-page" className="page todos-page">
      <div data-testid="todos-toolbar" className="toolbar">
        <h1 className="toolbar-title">我的待办</h1>
        {session && (
          <span data-testid="session-id" className="toolbar-user-name">
            {session.sessionId.slice(0, 8)}...
          </span>
        )}
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
          disabled={submitting || !session}
        />
        <button
          data-testid="todo-new-submit"
          type="submit"
          className="btn btn-primary"
          disabled={submitting || !newTitle.trim() || !session}
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
