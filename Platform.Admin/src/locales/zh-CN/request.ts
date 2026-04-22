export default {
    'request.error.validation': '验证错误',
    'request.error.login-failed': '登录失败，请检查用户名和密码',
    'request.error.token-expired': '登录已过期，请重新登录',
    'request.error.unknown': '未知错误',
    'request.error.network': '网络错误，请检查您的网络连接',
    'request.error.server': '服务器错误，请稍后重试',
    'request.error.forbidden': '无权访问此资源',
    'request.error.not-found': '未找到请求的资源',

    // ── 认证相关 (Authentication) ──
    'UNAUTHENTICATED': '未授权访问，请重新登录',
    'INVALID_TOKEN': '认证令牌无效或已过期',
    'TOKEN_EXPIRED': '登录已过期，请重新登录',
    'USER_INFO_INVALID': '用户信息无效',
    'INVALID_CREDENTIALS': '用户名或密码错误',
    'CAPTCHA_REQUIRED': '请输入图形验证码',
    'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN': '为了安全，此后登录需输入图形验证码',
    'CAPTCHA_INVALID': '图形验证码错误，请重新输入',

    // ── 授权相关 (Authorization) ──
    'UNAUTHORIZED_ACCESS': '无权访问',
    'FORBIDDEN': '禁止访问',
    'MENU_ACCESS_DENIED': '无权访问该功能',
    'MENU_SERVICE_NOT_CONFIGURED': '菜单访问服务未配置',
    'VIEW_PERMISSION_DENIED': '无权查看其他用户信息',

    // ── 验证相关 (Validation) ──
    'VALIDATION_ERROR': '请求参数验证失败',

    // ── 资源相关 (Resource) ──
    'RESOURCE_NOT_FOUND': '资源不存在',

    // ── 业务操作相关 (Business Operation) ──
    'INVALID_OPERATION': '操作无效',
    'OPERATION_NOT_SUPPORTED': '不支持的操作',
    'USER_NAME_EXISTS': '用户名已存在',
    'EMAIL_EXISTS': '邮箱已存在',
    'PHONE_NUMBER_EXISTS': '手机号已存在',
    'USER_NOT_FOUND': '用户不存在',

    // ── 企业相关 (Company) ──
    'COMPANY_NOT_MEMBER': '您不是该企业的有效成员',
    'COMPANY_CREATOR_CANNOT_LEAVE': '您是该企业的创建者，不允许退出',
    'COMPANY_SOLE_ADMIN_CANNOT_LEAVE': '您是企业唯一的管理员，请先转让管理员权限或注销企业',
    'CURRENT_COMPANY_NOT_FOUND': '未找到当前企业信息',

    // ── 文件相关 (File) ──
    'AVATAR_TOO_LARGE': '头像数据过大，请选择小于 2MB 的图片',

    // ── 服务器错误 (Server) ──
    'SERVER_ERROR': '服务器内部错误',
};