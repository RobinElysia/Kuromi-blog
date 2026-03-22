export interface Post {
  id: number;
  author: string;
  title?: string;
  tags?: string[];
  content: string;
  imageUrl?: string;
  hasImage?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  createdAt: string;
  comments: CommentItem[];
}

export interface User {
  username: string;
  role: "admin" | "guest";
}

export interface CommentItem {
  id: number;
  postId: number;
  author: string;
  content: string;
  createdAt: string;
}
