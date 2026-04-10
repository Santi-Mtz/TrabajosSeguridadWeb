export type LoginRequestDto = {
  email: string;
  password: string;
};

export type LoginResponseData = {
  id: number;
  username: string;
  email: string;
  login_date: string;
  permissions: string[];
};

export type ApiResponse<T> = {
  statusCode: number;
  intOpCode: string;
  message: string;
  data: T | null;
};
