export interface ILogin {
  userEmail: string;
  password: string;
  role?: string;
}

export interface ILoginResponse {
  userEmail?: string;
  email?: string;
  token: string;
  accessToken?: string; // Some APIs might use accessToken instead of token
  role?: string;
  id?: string;
  cartId?: string;
  // For responses that wrap data in a 'data' property
  data?: {
    token?: string;
    accessToken?: string;
    email?: string;
    userEmail?: string;
    role?: string;
    id?: string;
    cartId?: string;
  };
  // For success/failure responses
  success?: boolean;
  message?: string;
}
