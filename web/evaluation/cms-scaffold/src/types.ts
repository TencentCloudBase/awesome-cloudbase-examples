/**
 * 文章状态：草稿 / 已发布
 */
export type ArticleStatus = "draft" | "published";

/**
 * 用户角色：管理员 / 编辑
 * - admin：可查看/编辑/删除所有文章
 * - editor：可查看所有文章，但只能编辑/删除自己创建的文章
 */
export type UserRole = "admin" | "editor";

/**
 * 当前登录用户信息
 */
export interface CurrentUser {
  uid: string;
  displayName: string; // 用户名或用户显示名
  role: UserRole;
}

/**
 * 文章数据记录
 */
export interface ArticleRecord {
  _id: string;
  title: string;
  summary: string;
  coverImage: string | null;
  content: string;
  status: ArticleStatus;
  authorId: string;    // 创建者 UID
  authorName: string;  // 创建者显示名
  createdAt: string;
  updatedAt: string;
}

/**
 * 文章表单数据（创建/编辑时使用）
 */
export interface ArticleFormData {
  title: string;
  summary: string;
  content: string;
  status: ArticleStatus;
  coverImage: string | null;
  coverFile: File | null;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * 列表筛选参数
 */
export interface ListFilter {
  keyword: string;
  status: ArticleStatus | "all";
}
