export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  account_type: string;
  country: string;
  is_verified: boolean;
  date_joined: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}
