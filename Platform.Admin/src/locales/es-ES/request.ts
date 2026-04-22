export default {
  'request.error.validation': 'Error de validación',
  'request.error.login-fayed': 'Error de inicio de sesión, verifica tu nombre de usuario y contraseña',
  'request.error.token-expired': 'Sesión expirada, por favor inicia sesión de nuevo',
  'request.error.unknown': 'Error desconocido',
  'request.error.network': 'Error de red, verifica tu conexión',
  'request.error.server': 'Error del servidor, por favor intenta más tarde',
  'request.error.forbidden': 'Recurso prohibido',
  'request.error.not-found': 'Recurso no encontrado',

  // Autenticación
  'UNAUTHENTICATED': 'Acceso no autorizado, por favor inicia sesión de nuevo',
  'INVALID_CREDENTIALS': 'Nombre de usuario o contraseña inválidos',
  'CAPTCHA_REQUIRED': 'Por favor ingresa el captcha',
  'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN': 'Captcha requerido después de error de inicio de sesión',
  'CAPTCHA_INVALID': 'Captcha inválido',
  'INVALID_TOKEN': 'Token de autenticación inválido o expirado',
  'TOKEN_EXPIRED': 'Sesión expirada, por favor inicia sesión de nuevo',
  'USER_INFO_INVALID': 'Información de usuario inválida',

  // Autorización
  'UNAUTHORIZED_ACCESS': 'Acceso no autorizado',
  'VIEW_PERMISSION_DENIED': 'Sin permiso para ver información de otros usuarios',
  'CURRENT_COMPANY_NOT_FOUND': 'Información de empresa actual no encontrada',
  'MENU_ACCESS_DENIED': 'Sin permiso para acceder a este menú',
  'MENU_SERVICE_NOT_CONFIGURED': 'Servicio de acceso al menú no configurado',
  'FORBIDDEN': 'Acceso prohibido',

  // Validación
  'VALIDATION_ERROR': 'Error en la validación de la solicitud',
  'INVALID_OLD_PASSWORD': 'Contraseña original incorrecta',

  // Recurso
  'RESOURCE_NOT_FOUND': 'Recurso no encontrado',
  'USER_NOT_FOUND': 'Usuario no encontrado',
  'COMPANY_NOT_FOUND': 'Empresa no encontrada',

  // Operación de negocio
  'INVALID_OPERATION': 'Operación inválida',
  'OPERATION_NOT_SUPPORTED': 'Operación no soportada',
  'USER_NAME_EXISTS': 'El nombre de usuario ya existe',
  'EMAIL_EXISTS': 'El correo electrónico ya existe',
  'PHONE_NUMBER_EXISTS': 'El número de teléfono ya existe',
  'USER_NOT_AUTHENTICATED': 'Información de autenticación de usuario no encontrada',

  // Empresa
  'COMPANY_NOT_MEMBER': 'No eres miembro de esta empresa',
  'COMPANY_CREATOR_CANNOT_LEAVE': 'Eres el creador de esta empresa y no puedes abandonarla',
  'COMPANY_SOLE_ADMIN_CANNOT_LEAVE': 'Eres el único administrador de esta empresa',
  'COMPANY_INACTIVE': 'Empresa inactiva, por favor contacta al administrador',
  'COMPANY_EXPIRED': 'Empresa expirada, por favor contacta al administrador para renovar',

  // Rol/Permiso
  'ROLE_NOT_FOUND': 'Rol no encontrado',
  'ROLE_NAME_EXISTS': 'El nombre del rol ya existe',
  'SYSTEM_ROLE_CANNOT_DELETE': 'No se puede eliminar el rol de administrador del sistema',
  'CANNOT_REMOVE_LAST_ADMIN': 'No se puede eliminar el último rol de administrador',
  'PERMISSION_NOT_FOUND': 'Permiso no encontrado',
  'PERMISSION_CODE_EXISTS': 'El código de permiso ya existe',

  // Menú/Notificación
  'MENU_NOT_FOUND': 'Menú no encontrado',
  'MENU_NAME_EXISTS': 'El nombre del menú ya existe',
  'CANNOT_DELETE_MENU_WITH_CHILDREN': 'No se puede eliminar el menú con submenús',
  'NOTICE_NOT_FOUND': 'Notificación no encontrada',

  // Usuario/Empresa extendido
  'USER_INACTIVE': 'Cuenta de usuario deshabilitada',
  'CANNOT_DELETE_SELF': 'No puedes eliminar tu propia cuenta',
  'CANNOT_MODIFY_OWN_ROLE': 'No puedes modificar tu propio rol',
  'MAX_USERS_REACHED': 'Número máximo de usuarios alcanzado',
  'COMPANY_CODE_EXISTS': 'El código de empresa ya existe',
  'INVALID_COMPANY_CODE': 'Formato de código de empresa inválido',
  'COMPANY_REQUIRED': 'Información de empresa no encontrada',

  // Organización
  'ORGANIZATION_NOT_FOUND': 'Nodo de organización no encontrado',
  'ORGANIZATION_NAME_EXISTS': 'El nombre del nodo de organización ya existe',
  'ORGANIZATION_CODE_EXISTS': 'El código del nodo de organización ya existe',
  'PARENT_CANNOT_BE_SELF': 'El padre no puede ser el nodo actual',
  'PARENT_CANNOT_BE_DESCENDANT': 'El padre no puede ser un nodo hijo',
  'CANNOT_DELETE_WITH_CHILDREN': 'Por favor elimina los nodos hijos primero',

  // Validación de formato
  'INVALID_EMAIL_FORMAT': 'Formato de correo electrónico inválido',
  'INVALID_PHONE_FORMAT': 'Formato de número de teléfono inválido',
  'INVALID_USERNAME_FORMAT': 'Formato de nombre de usuario inválido',
  'PASSWORD_TOO_SHORT': 'La contraseña debe tener al menos 6 caracteres',
  'PASSWORD_TOO_LONG': 'La contraseña no puede exceder 50 caracteres',

  // Operación general
  'OPERATION_FAILED': 'Error en la operación',

  // Archivo
  'AVATAR_TOO_LARGE': 'La imagen de avatar es muy grande',

  // Servidor
  'SERVER_ERROR': 'Error interno del servidor',
};