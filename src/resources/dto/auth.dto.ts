export interface RegisterDto {
  username: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginDto {
  identifier?: string;
  email?: string;
  password: string;
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  nonce?: string;
}

export interface RefreshDto {
  refresh_token: string;
}
