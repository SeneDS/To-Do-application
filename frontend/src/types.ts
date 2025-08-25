export type Filter = "all" | "open" | "inprogress" | "completed";
export type AuthMode = "login" | "register";

export interface Todo {
  id?: number;
  title: string;
  description: string;
  inprogress: boolean;
  completed: boolean;
}

export interface Flash {
  text: string;
  type: "success" | "danger" | "info" | "warning";
}

export interface Tokens {
  access: string;
  refresh?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  first_name: string;
  last_name: string;
  email: string;
}
