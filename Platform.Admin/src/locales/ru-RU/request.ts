export default {
  'request.error.validation': 'Ошибка валидации',
  'request.error.login-failed': 'Ошибка входа, проверьте имя пользователя и пароль',
  'request.error.token-expired': 'Сессия истекла, войдите снова',
  'request.error.unknown': 'Неизвестная ошибка',
  'request.error.network': 'Ошибка сети, проверьте подключение',
  'request.error.server': 'Ошибка сервера, попробуйте позже',
  'request.error.forbidden': 'Ресурс запрещен',
  'request.error.not-found': 'Ресурс не найден',

  // Аутентификация
  'UNAUTHENTICATED': 'Не авторизовано, войдите снова',
  'INVALID_CREDENTIALS': 'Неверное имя пользователя или пароль',
  'CAPTCHA_REQUIRED': 'Введите капчу',
  'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN': 'Требуется капча после неудачного входа',
  'CAPTCHA_INVALID': 'Неверная капча',
  'INVALID_TOKEN': 'Токен аутентификации недействителен или истек',
  'TOKEN_EXPIRED': 'Сессия истекла, войдите снова',
  'USER_INFO_INVALID': 'Неверная информация пользователя',

  // Авторизация
  'UNAUTHORIZED_ACCESS': 'Доступ запрещен',
  'VIEW_PERMISSION_DENIED': 'Нет права просматривать информацию других пользователей',
  'CURRENT_COMPANY_NOT_FOUND': 'Информация о текущей компании не найдена',
  'MENU_ACCESS_DENIED': 'Нет права доступа к этому меню',
  'MENU_SERVICE_NOT_CONFIGURED': 'Сервис доступа к меню не настроен',
  'FORBIDDEN': 'Доступ запрещен',

  // Валидация
  'VALIDATION_ERROR': 'Ошибка валидации запроса',
  'INVALID_OLD_PASSWORD': 'Неверный текущий пароль',

  // Ресурс
  'RESOURCE_NOT_FOUND': 'Ресурс не найден',
  'USER_NOT_FOUND': 'Пользователь не найден',
  'COMPANY_NOT_FOUND': 'Компания не найдена',

  // Бизнес-операция
  'INVALID_OPERATION': 'Неверная операция',
  'OPERATION_NOT_SUPPORTED': 'Операция не поддерживается',
  'USER_NAME_EXISTS': 'Имя пользователя уже существует',
  'EMAIL_EXISTS': 'Email уже существует',
  'PHONE_NUMBER_EXISTS': 'Номер телефона уже существует',
  'USER_NOT_AUTHENTICATED': 'Информация аутентификации пользователя не найдена',

  // Компания
  'COMPANY_NOT_MEMBER': 'Вы не являетесь членом этой компании',
  'COMPANY_CREATOR_CANNOT_LEAVE': 'Вы создатель этой компании и не можете покинуть её',
  'COMPANY_SOLE_ADMIN_CANNOT_LEAVE': 'Вы единственный администратор этой компании',
  'COMPANY_INACTIVE': 'Компания не активна, свяжитесь с администратором',
  'COMPANY_EXPIRED': 'Компания истекла, свяжитесь с администратором для продления',

  // Роль/Разрешение
  'ROLE_NOT_FOUND': 'Роль не найдена',
  'ROLE_NAME_EXISTS': 'Имя роли уже существует',
  'SYSTEM_ROLE_CANNOT_DELETE': 'Нельзя удалить роль системного администратора',
  'CANNOT_REMOVE_LAST_ADMIN': 'Нельзя ��далить последнюю роль администратора',
  'PERMISSION_NOT_FOUND': 'Разрешение не найдено',
  'PERMISSION_CODE_EXISTS': 'Код разрешения уже существует',

  // Меню/Уведомление
  'MENU_NOT_FOUND': 'Меню не найдено',
  'MENU_NAME_EXISTS': 'Имя меню уже существует',
  'CANNOT_DELETE_MENU_WITH_CHILDREN': 'Нельзя удалить меню с подменю',
  'NOTICE_NOT_FOUND': 'Уведомление не найдено',

  // Пользователь/Компания расширенные
  'USER_INACTIVE': 'Учетная запись пользователя отключена',
  'CANNOT_DELETE_SELF': 'Нельзя удалить свою учетную запись',
  'CANNOT_MODIFY_OWN_ROLE': 'Нельзя изменить свою роль',
  'MAX_USERS_REACHED': 'Достигнуто максимальное количество пользователей',
  'COMPANY_CODE_EXISTS': 'Код компании уже существует',
  'INVALID_COMPANY_CODE': 'Неверный формат кода компании',
  'COMPANY_REQUIRED': 'Информация о компании не найдена',

  // Организация
  'ORGANIZATION_NOT_FOUND': 'Узел организации не найден',
  'ORGANIZATION_NAME_EXISTS': 'Имя узла организации уже существует',
  'ORGANIZATION_CODE_EXISTS': 'Код узла организации уже существует',
  'PARENT_CANNOT_BE_SELF': 'Родитель не может быть текущим узлом',
  'PARENT_CANNOT_BE_DESCENDANT': 'Родитель не может быть дочерним узлом',
  'CANNOT_DELETE_WITH_CHILDREN': 'Сначала удалите дочерние узлы',

  // Валидация формата
  'INVALID_EMAIL_FORMAT': 'Неверный формат email',
  'INVALID_PHONE_FORMAT': 'Неверный формат номера телефона',
  'INVALID_USERNAME_FORMAT': 'Неверный формат имени пользователя',
  'PASSWORD_TOO_SHORT': 'Пароль должен содержать минимум 6 символов',
  'PASSWORD_TOO_LONG': 'Пароль не может превышать 50 символов',

  // Общая операция
  'OPERATION_FAILED': 'Операция не удалась',

  // Файл
  'AVATAR_TOO_LARGE': 'Изображение аватара слишком большое',

  // Сервер
  'SERVER_ERROR': 'Внутренняя ошибка сервера',
};