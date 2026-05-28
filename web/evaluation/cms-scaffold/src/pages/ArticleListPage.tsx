import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../lib/auth";
import { getArticles, deleteArticle } from "../lib/cms-service";
import { useCurrentUser } from "../components/UserContext";
import type { ArticleRecord, ArticleStatus } from "../types";

const PAGE_SIZE = 5;

export default function ArticleListPage() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();

  // --- 列表状态 ---
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // --- 筛选与分页 ---
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | "all">(
    "all"
  );
  const [page, setPage] = useState(1);

  // --- 删除确认 ---
  const [deleteTarget, setDeleteTarget] = useState<ArticleRecord | null>(null);

  // --- 数据加载 ---
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getArticles(
        { keyword, status: statusFilter },
        { page, pageSize: PAGE_SIZE }
      );
      setArticles(result.list);
      setTotal(result.total);
    } catch (err) {
      console.error("加载文章列表失败:", err);
      setArticles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter, page]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // --- 搜索 ---
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = () => {
    setKeyword(searchInput);
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // --- 状态筛选 ---
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as ArticleStatus | "all");
    setPage(1);
  };

  // --- 分页 ---
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handlePrev = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) setPage(page + 1);
  };

  // --- 权限判断 ---
  const canEditArticle = (article: ArticleRecord): boolean => {
    if (!currentUser) return false;
    return currentUser.role === "admin" || article.authorId === currentUser.uid;
  };

  // --- 删除 ---
  const handleDeleteClick = (article: ArticleRecord) => {
    setDeleteTarget(article);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteArticle(deleteTarget._id);
      setDeleteTarget(null);
      fetchArticles();
    } catch (err) {
      console.error("删除文章失败:", err);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  // --- 退出登录 ---
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div data-testid="articles-page" className="page articles-page">
      {/* 工具栏 */}
      <div data-testid="articles-toolbar" className="toolbar">
        <div className="toolbar-left">
          <button
            data-testid="article-create-button"
            className="btn btn-primary"
            onClick={() => navigate("/articles/new")}
          >
            新建文章
          </button>

          <div className="search-group">
            <input
              data-testid="article-search-input"
              type="text"
              placeholder="按标题搜索..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <button
              data-testid="article-search-submit"
              className="btn"
              onClick={handleSearch}
            >
              搜索
            </button>
          </div>

          <select
            data-testid="article-status-filter"
            className="status-filter"
            value={statusFilter}
            onChange={handleStatusChange}
          >
            <option value="all">全部状态</option>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
          </select>

          <button
            data-testid="articles-refresh-button"
            className="btn"
            onClick={fetchArticles}
          >
            刷新
          </button>
        </div>

        <div className="toolbar-right">
          {currentUser && (
            <div data-testid="toolbar-user-info" className="toolbar-user-info">
              <span className="toolbar-user-name">{currentUser.displayName}</span>
              <span
                data-testid="role-badge"
                className={`role-badge role-badge-${currentUser.role}`}
              >
                {currentUser.role === "admin" ? "管理员" : "编辑"}
              </span>
            </div>
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

      {/* 列表 */}
      {loading && (
        <div data-testid="articles-loading" className="loading">
          加载中...
        </div>
      )}

      {!loading && articles.length === 0 && (
        <div data-testid="articles-empty" className="empty">
          暂无文章
        </div>
      )}

      {!loading && articles.length > 0 && (
        <table data-testid="articles-table" className="articles-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>作者</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => {
              const canEdit = canEditArticle(article);
              return (
                <tr key={article._id} data-testid="article-row">
                  <td data-testid="article-row-title">{article.title}</td>
                  <td data-testid="article-row-author" className="author-cell">
                    {article.authorName || "--"}
                  </td>
                  <td data-testid="article-row-status">
                    <span
                      className={`status-badge status-${article.status}`}
                    >
                      {article.status === "draft" ? "草稿" : "已发布"}
                    </span>
                  </td>
                  <td data-testid="article-row-updated-at">
                    {article.updatedAt}
                  </td>
                  <td className="row-actions">
                    {canEdit ? (
                      <>
                        <button
                          data-testid="article-row-edit"
                          className="btn btn-sm"
                          onClick={() =>
                            navigate(`/articles/${article._id}/edit`)
                          }
                        >
                          编辑
                        </button>
                        <button
                          data-testid="article-row-delete"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteClick(article)}
                        >
                          删除
                        </button>
                      </>
                    ) : (
                      <span className="no-permission">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* 分页 */}
      {total > 0 && (
        <div data-testid="pagination" className="pagination">
          <button
            data-testid="pagination-prev"
            className="btn btn-sm"
            onClick={handlePrev}
            disabled={page <= 1}
          >
            上一页
          </button>
          <span data-testid="pagination-current" className="page-info">
            {page}
          </span>
          <span className="page-info">/ {totalPages}</span>
          <button
            data-testid="pagination-next"
            className="btn btn-sm"
            onClick={handleNext}
            disabled={page >= totalPages}
          >
            下一页
          </button>
          <span data-testid="pagination-size" className="page-size">
            每页 {PAGE_SIZE} 条
          </span>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div
            data-testid="delete-confirm-dialog"
            className="modal-dialog"
          >
            <p>
              确定要删除文章「{deleteTarget.title}」吗？此操作不可撤销。
            </p>
            <div className="modal-actions">
              <button
                data-testid="delete-cancel-button"
                className="btn"
                onClick={handleDeleteCancel}
              >
                取消
              </button>
              <button
                data-testid="delete-confirm-button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
