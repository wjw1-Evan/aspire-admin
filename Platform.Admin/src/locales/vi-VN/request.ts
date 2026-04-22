export default {
  'request.error.validation': 'Validation Error',
  'request.error.login-failed': 'Login failed, please check your username and password',
  'request.error.token-expired': 'Session expired, please login again',
  'request.error.unknown': 'Unknown Error',
  'request.error.network': 'Network error, please check your connection',
  'request.error.server': 'Server error, please try again later',
  'request.error.forbidden': 'Forbidden resource',
  'request.error.not-found': 'Resource not found',

  // Authentication
  'UNAUTHENTICATED': 'Unauthorized access, please log in again',
  'INVALID_CREDENTIALS': 'Invalid username or password',
  'CAPTCHA_REQUIRED': 'Please enter the captcha',
  'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN': 'Captcha required after failed login',
  'CAPTCHA_INVALID': 'Invalid captcha',
  'INVALID_TOKEN': 'Invalid or expired authentication token',
  'TOKEN_EXPIRED': 'Session expired, please log in again',
  'USER_INFO_INVALID': 'Invalid user information',

  // Authorization
  'UNAUTHORIZED_ACCESS': 'Unauthorized access',
  'VIEW_PERMISSION_DENIED': 'No permission to view other user information',
  'CURRENT_COMPANY_NOT_FOUND': 'Current company information not found',
  'MENU_ACCESS_DENIED': 'No permission to access this menu',
  'MENU_SERVICE_NOT_CONFIGURED': 'Menu access service not configured',
  'FORBIDDEN': 'Access forbidden',

  // Validation
  'VALIDATION_ERROR': 'Request validation failed',
  'INVALID_OLD_PASSWORD': 'Incorrect original password',

  // Resource
  'RESOURCE_NOT_FOUND': 'Resource not found',
  'USER_NOT_FOUND': 'User not found',
  'COMPANY_NOT_FOUND': 'Company not found',

  // Business Operation
  'INVALID_OPERATION': 'Invalid operation',
  'OPERATION_NOT_SUPPORTED': 'Operation not supported',
  'USER_NAME_EXISTS': 'Username already exists',
  'EMAIL_EXISTS': 'Email already exists',
  'PHONE_NUMBER_EXISTS': 'Phone number already exists',
  'USER_NOT_AUTHENTICATED': 'User authentication information not found',

  // Company
  'COMPANY_NOT_MEMBER': 'You are not a member of this company',
  'COMPANY_CREATOR_CANNOT_LEAVE': 'You are the creator of this company and cannot leave',
  'COMPANY_SOLE_ADMIN_CANNOT_LEAVE': 'You are the sole administrator of this company',
  'COMPANY_INACTIVE': 'Company is not active, please contact administrator',
  'COMPANY_EXPIRED': 'Company has expired, please contact administrator to renew',

  // Role/Permission
  'ROLE_NOT_FOUND': 'Role not found',
  'ROLE_NAME_EXISTS': 'Role name already exists',
  'SYSTEM_ROLE_CANNOT_DELETE': 'Cannot delete system administrator role',
  'CANNOT_REMOVE_LAST_ADMIN': 'Cannot remove the last administrator role',
  'PERMISSION_NOT_FOUND': 'Permission not found',
  'PERMISSION_CODE_EXISTS': 'Permission code already exists',

  // Menu/Notice
  'MENU_NOT_FOUND': 'Menu not found',
  'MENU_NAME_EXISTS': 'Menu name already exists',
  'CANNOT_DELETE_MENU_WITH_CHILDREN': 'Cannot delete menu with submenus',
  'NOTICE_NOT_FOUND': 'Notification not found',

  // User/Company Extended
  'USER_INACTIVE': 'User account has been disabled',
  'CANNOT_DELETE_SELF': 'Cannot delete your own account',
  'CANNOT_MODIFY_OWN_ROLE': 'Cannot modify your own role',
  'MAX_USERS_REACHED': 'Maximum number of users reached',
  'COMPANY_CODE_EXISTS': 'Company code already exists',
  'INVALID_COMPANY_CODE': 'Invalid company code format',
  'COMPANY_REQUIRED': 'Company information not found',

  // Organization
  'ORGANIZATION_NOT_FOUND': 'Organization node not found',
  'ORGANIZATION_NAME_EXISTS': 'Organization node name already exists',
  'ORGANIZATION_CODE_EXISTS': 'Organization node code already exists',
  'PARENT_CANNOT_BE_SELF': 'Parent cannot be the current node',
  'PARENT_CANNOT_BE_DESCENDANT': 'Parent cannot be a child node',
  'CANNOT_DELETE_WITH_CHILDREN': 'Please delete child nodes first',

  // Format Validation
  'INVALID_EMAIL_FORMAT': 'Invalid email format',
  'INVALID_PHONE_FORMAT': 'Invalid phone number format',
  'INVALID_USERNAME_FORMAT': 'Invalid username format',
  'PASSWORD_TOO_SHORT': 'Password must be at least 6 characters',
  'PASSWORD_TOO_LONG': 'Password cannot exceed 50 characters',

  // General Operation
  'OPERATION_FAILED': 'Operation failed',

  // File
  'AVATAR_TOO_LARGE': 'Avatar image is too large',

  // Server
  'SERVER_ERROR': 'Internal server error',
};