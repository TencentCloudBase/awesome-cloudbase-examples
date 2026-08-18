import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getArticle,
  createArticle,
  updateArticle,
} from "../lib/cms-service";
import { uploadCoverImage } from "../lib/storage-service";
import { useCurrentUser } from "../components/UserContext";
import type { ArticleFormData, ArticleStatus } from "../types";

export default function ArticleEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { currentUser } = useCurrentUser();

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [noPermission, setNoPermission] = useState(false);

  // --- 表单状态 ---
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<ArticleStatus>("draft");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 编辑模式：加载已有数据 + 权限检查 ---
  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      getArticle(id)
        .then((article) => {
          if (article) {
            // 权限检查：非 admin 且非作者，不允许编辑
            if (
              currentUser &&
              currentUser.role !== "admin" &&
              article.authorId !== currentUser.uid
            ) {
              setNoPermission(true);
              return;
            }
            setTitle(article.title);
            setSummary(article.summary);
            setContent(article.content);
            setStatus(article.status);
            setCoverImage(article.coverImage);
          }
        })
        .catch((err) => {
          console.error("加载文章失败:", err);
          setSubmitError("加载文章失败");
        })
        .finally(() => setLoading(false));
    }
  }, [isEdit, id, currentUser]);

  // --- 封面上传 ---
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverFile(file);

    // 本地预览
    const reader = new FileReader();
    reader.onload = () => {
      setCoverImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // --- 提交 ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");
    setLoading(true);

    try {
      let finalCoverImage = coverImage;

      // 如果有新文件，先上传
      if (coverFile) {
        finalCoverImage = await uploadCoverImage(coverFile);
      }

      const formData: ArticleFormData = {
        title,
        summary,
        content,
        status,
        coverImage: finalCoverImage,
        coverFile: null,
      };

      if (isEdit && id) {
        await updateArticle(id, formData);
        setSubmitSuccess("文章已更新");
      } else {
        await createArticle(formData);
        setSubmitSuccess("文章已创建");
      }

      // 成功后跳回列表
      setTimeout(() => {
        navigate("/articles");
      }, 800);
    } catch (err: any) {
      setSubmitError(err?.message || "保存失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/articles");
  };

  // --- 无权限提示 ---
  if (noPermission) {
    return (
      <div data-testid="no-permission-page" className="page editor-page">
        <div className="editor-container">
          <h1 className="editor-title">无编辑权限</h1>
          <p style={{ color: "var(--color-muted)", marginBottom: 24 }}>
            你只能编辑自己创建的文章。
          </p>
          <button className="btn" onClick={handleCancel}>
            返回列表
          </button>
        </div>
      </div>
    );
  }

  // --- 页面专属 testid ---
  const pageTestId = isEdit ? "article-edit-page" : "article-create-page";

  return (
    <div data-testid={pageTestId} className="page editor-page">
      <div data-testid="article-editor-page" className="editor-container">
        <h1 className="editor-title">
          {isEdit ? "编辑文章" : "新建文章"}
        </h1>

        <form
          data-testid="article-form"
          className="article-form"
          onSubmit={handleSubmit}
        >
          {/* 标题 */}
          <div className="form-field">
            <label htmlFor="article-title">标题</label>
            <input
              data-testid="article-title-input"
              id="article-title"
              type="text"
              placeholder="请输入文章标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* 摘要 */}
          <div className="form-field">
            <label htmlFor="article-summary">摘要</label>
            <input
              data-testid="article-summary-input"
              id="article-summary"
              type="text"
              placeholder="请输入文章摘要"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* 正文 */}
          <div className="form-field">
            <label htmlFor="article-content">正文</label>
            <textarea
              data-testid="article-content-input"
              id="article-content"
              placeholder="请输入文章正文"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              rows={10}
              required
            />
          </div>

          {/* 状态 */}
          <div className="form-field">
            <label htmlFor="article-status">状态</label>
            <select
              data-testid="article-status-select"
              id="article-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ArticleStatus)}
              disabled={loading}
            >
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
            </select>
          </div>

          {/* 封面上传 */}
          <div className="form-field">
            <label>封面图片</label>
            <div className="upload-group">
              <input
                data-testid="cover-upload-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <button
                data-testid="cover-upload-button"
                type="button"
                className="btn"
                onClick={handleUploadClick}
                disabled={loading}
              >
                选择图片
              </button>
              {coverFile && (
                <span className="file-name">{coverFile.name}</span>
              )}
            </div>
            {coverImage && (
              <div data-testid="cover-preview" className="cover-preview">
                <img src={coverImage} alt="封面预览" />
              </div>
            )}
          </div>

          {/* 错误/成功提示 */}
          {submitError && (
            <div data-testid="article-submit-error" className="form-error">
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div
              data-testid="article-submit-success"
              className="form-success"
            >
              {submitSuccess}
            </div>
          )}

          {/* 加载中 */}
          {loading && (
            <div data-testid="article-form-loading" className="form-loading">
              保存中...
            </div>
          )}

          {/* 操作按钮 */}
          <div className="form-actions">
            <button
              data-testid="article-cancel-button"
              type="button"
              className="btn"
              onClick={handleCancel}
              disabled={loading}
            >
              取消
            </button>
            <button
              data-testid="article-save-button"
              type="submit"
              className="btn btn-primary"
              disabled={loading || !title || !content}
            >
              {loading ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
