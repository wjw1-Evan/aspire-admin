export interface CurrentUser {
  id?: string;
  userId?: string;
  username?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
  roles?: string[];
  permissions?: string[];
  menus?: any[];
  isLogin?: boolean;
  currentCompanyId?: string;
  currentCompanyName?: string;
  currentCompanyDisplayName?: string;
  currentCompanyLogo?: string;
  access?: string;
  tags?: Array<{ key?: string; label?: string }>;
}

export interface LoginResult {
  status?: string;
  type?: string;
  currentAuthority?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
}

export interface CaptchaResult {
  captchaId?: string;
  imageData?: string;
  captchaImage?: string;
}
