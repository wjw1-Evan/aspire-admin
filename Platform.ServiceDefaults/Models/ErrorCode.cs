namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 统一错误码常量与消息字典
/// 前端通过 errorCode 优先查找 i18n 翻译，message 作为 fallback 显示
/// 服务层抛异常时使用错误码字符串（如 throw new AuthenticationException(ErrorCode.Unauthenticated)），
/// BusinessExceptionFilter 自动检测已知错误码，将 message 替换为人类可读中文
/// </summary>
public static class ErrorCode
{
    // ──────────────────────────────────────────────
    // 认证相关 (Authentication)
    // ──────────────────────────────────────────────

    /// <summary>未认证（未登录或 Token 无效）</summary>
    public const string Unauthenticated = "UNAUTHENTICATED";

    /// <summary>Token 无效或已过期</summary>
    public const string InvalidToken = "INVALID_TOKEN";

    /// <summary>Token 已过期</summary>
    public const string TokenExpired = "TOKEN_EXPIRED";

    /// <summary>用户信息无效（无法从 Token 中获取用户标识）</summary>
    public const string UserInfoInvalid = "USER_INFO_INVALID";

    /// <summary>用户名或密码错误</summary>
    public const string InvalidCredentials = "INVALID_CREDENTIALS";

    /// <summary>需要验证码</summary>
    public const string CaptchaRequired = "CAPTCHA_REQUIRED";

    /// <summary>登录失败后需要验证码</summary>
    public const string CaptchaRequiredAfterFailedLogin = "CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN";

    /// <summary>验证码无效</summary>
    public const string CaptchaInvalid = "CAPTCHA_INVALID";

    // ──────────────────────────────────────────────
    // 授权相关 (Authorization)
    // ──────────────────────────────────────────────

    /// <summary>无权访问</summary>
    public const string UnauthorizedAccess = "UNAUTHORIZED_ACCESS";

    /// <summary>禁止访问 (403)</summary>
    public const string Forbidden = "FORBIDDEN";

    /// <summary>无权访问指定菜单</summary>
    public const string MenuAccessDenied = "MENU_ACCESS_DENIED";

    /// <summary>不能删除当前登录用户</summary>
    public const string CannotDeleteCurrentUser = "CANNOT_DELETE_CURRENT_USER";

    /// <summary>菜单访问服务未配置</summary>
    public const string MenuServiceNotConfigured = "MENU_SERVICE_NOT_CONFIGURED";

    /// <summary>无权查看其他用户信息</summary>
    public const string ViewPermissionDenied = "VIEW_PERMISSION_DENIED";

    // ──────────────────────────────────────────────
    // 验证相关 (Validation)
    // ──────────────────────────────────────────────

    /// <summary>请求参数验证失败</summary>
    public const string ValidationError = "VALIDATION_ERROR";

    /// <summary>原密码错误</summary>
    public const string InvalidOldPassword = "INVALID_OLD_PASSWORD";

    // ──────────────────────────────────────────────
    // 资源相关 (Resource)
    // ──────────────────────────────────────────────

    /// <summary>资源不存在</summary>
    public const string ResourceNotFound = "RESOURCE_NOT_FOUND";

    // ──────────────────────────────────────────────
    // 业务操作相关 (Business Operation)
    // ──────────────────────────────────────────────

    /// <summary>无效操作</summary>
    public const string InvalidOperation = "INVALID_OPERATION";

    /// <summary>不支持的操作</summary>
    public const string OperationNotSupported = "OPERATION_NOT_SUPPORTED";

    /// <summary>用户名已存在</summary>
    public const string UserNameExists = "USER_NAME_EXISTS";

    /// <summary>邮箱已存在</summary>
    public const string EmailExists = "EMAIL_EXISTS";

    /// <summary>手机号已存在</summary>
    public const string PhoneNumberExists = "PHONE_NUMBER_EXISTS";

    /// <summary>用户不存在</summary>
    public const string UserNotFound = "USER_NOT_FOUND";

    /// <summary>用户未认证</summary>
    public const string UserNotAuthenticated = "USER_NOT_AUTHENTICATED";

    // ──────────────────────────────────────────────
    // 企业相关 (Company)
    // ──────────────────────────────────────────────

    /// <summary>不是该企业的有效成员</summary>
    public const string CompanyNotMember = "COMPANY_NOT_MEMBER";

    /// <summary>企业创建者不允许退出</summary>
    public const string CompanyCreatorCannotLeave = "COMPANY_CREATOR_CANNOT_LEAVE";

    /// <summary>企业唯一管理员不允许退出</summary>
    public const string CompanySoleAdminCannotLeave = "COMPANY_SOLE_ADMIN_CANNOT_LEAVE";

    /// <summary>未找到当前企业信息</summary>
    public const string CurrentCompanyNotFound = "CURRENT_COMPANY_NOT_FOUND";

    /// <summary>企业不存在</summary>
    public const string CompanyNotFound = "COMPANY_NOT_FOUND";

    /// <summary>企业未激活</summary>
    public const string CompanyInactive = "COMPANY_INACTIVE";

    /// <summary>企业已过期</summary>
    public const string CompanyExpired = "COMPANY_EXPIRED";

    // ──────────────────────────────────────────────
    // 文件相关 (File)
    // ──────────────────────────────────────────────

    /// <summary>头像数据过大</summary>
    public const string AvatarTooLarge = "AVATAR_TOO_LARGE";

    /// <summary>文件不存在</summary>
    public const string FileNotFound = "FILE_NOT_FOUND";

    /// <summary>文件类型不支持生成缩略图</summary>
    public const string FileThumbnailNotSupported = "FILE_THUMBNAIL_NOT_SUPPORTED";

    /// <summary>生成缩略图失败</summary>
    public const string FileThumbnailGenerationFailed = "FILE_THUMBNAIL_GENERATION_FAILED";

    /// <summary>缩略图不存在且无法生成</summary>
    public const string FileThumbnailNotAvailable = "FILE_THUMBNAIL_NOT_AVAILABLE";

    /// <summary>缩略图文件不存在或已被删除</summary>
    public const string FileThumbnailDeleted = "FILE_THUMBNAIL_DELETED";

    /// <summary>文件类型不支持预览</summary>
    public const string FilePreviewNotSupported = "FILE_PREVIEW_NOT_SUPPORTED";

    /// <summary>不支持的预览类型</summary>
    public const string FilePreviewTypeNotSupported = "FILE_PREVIEW_TYPE_NOT_SUPPORTED";

    /// <summary>生成预览失败</summary>
    public const string FilePreviewGenerationFailed = "FILE_PREVIEW_GENERATION_FAILED";

    /// <summary>模块不能为空</summary>
    public const string ModuleRequired = "MODULE_REQUIRED";

    /// <summary>数据类型不能为空</summary>
    public const string DataTypeRequired = "DATA_TYPE_REQUIRED";

    /// <summary>不支持的模块</summary>
    public const string UnsupportedModule = "UNSUPPORTED_MODULE";

    /// <summary>不支持的数据类型</summary>
    public const string UnsupportedDataType = "UNSUPPORTED_DATA_TYPE";

    /// <summary>项目不存在</summary>
    public const string ProjectNotFound = "PROJECT_NOT_FOUND";

    /// <summary>无权删除项目</summary>
    public const string ProjectDeleteUnauthorized = "PROJECT_DELETE_UNAUTHORIZED";

    /// <summary>项目成员已存在</summary>
    public const string ProjectMemberAlreadyExists = "PROJECT_MEMBER_ALREADY_EXISTS";

    // ──────────────────────────────────────────────
    // 角色/权限相关 (Role/Permission)
    // ──────────────────────────────────────────────

    /// <summary>角色不存在</summary>
    public const string RoleNotFound = "ROLE_NOT_FOUND";

    /// <summary>角色名称已存在</summary>
    public const string RoleNameExists = "ROLE_NAME_EXISTS";

    /// <summary>不能删除系统管理员角色</summary>
    public const string SystemRoleCannotDelete = "SYSTEM_ROLE_CANNOT_DELETE";

    /// <summary>不能移除最后一个管理员的角色</summary>
    public const string CannotRemoveLastAdmin = "CANNOT_REMOVE_LAST_ADMIN";

    /// <summary>权限不存在</summary>
    public const string PermissionNotFound = "PERMISSION_NOT_FOUND";

    /// <summary>权限代码已存在</summary>
    public const string PermissionCodeExists = "PERMISSION_CODE_EXISTS";

    // ──────────────────────────────────────────────
    // 菜单/通知相关 (Menu/Notice)
    // ──────────────────────────────────────────────

    /// <summary>菜单不存在</summary>
    public const string MenuNotFound = "MENU_NOT_FOUND";

    /// <summary>菜单名称已存在</summary>
    public const string MenuNameExists = "MENU_NAME_EXISTS";

    /// <summary>不能删除有子菜单的菜单</summary>
    public const string CannotDeleteMenuWithChildren = "CANNOT_DELETE_MENU_WITH_CHILDREN";

    /// <summary>通知不存在</summary>
    public const string NoticeNotFound = "NOTICE_NOT_FOUND";

    // ──────────────────────────────────────────────
    // 用户/企业扩展 (User/Company Extended)
    // ──────────────────────────────────────────────

    /// <summary>用户已被禁用</summary>
    public const string UserInactive = "USER_INACTIVE";

    /// <summary>不能删除自己的账户</summary>
    public const string CannotDeleteSelf = "CANNOT_DELETE_SELF";

    /// <summary>不能修改自己的角色</summary>
    public const string CannotModifyOwnRole = "CANNOT_MODIFY_OWN_ROLE";

    /// <summary>已达到最大用户数限制</summary>
    public const string MaxUsersReached = "MAX_USERS_REACHED";

    /// <summary>企业代码已存在</summary>
    public const string CompanyCodeExists = "COMPANY_CODE_EXISTS";

    /// <summary>企业代码格式不正确</summary>
    public const string InvalidCompanyCode = "INVALID_COMPANY_CODE";

    /// <summary>未找到企业信息</summary>
    public const string CompanyRequired = "COMPANY_REQUIRED";

    // ──────────────────────────────────────────────
    // 组织架构相关 (Organization)
    // ──────────────────────────────────────────────

    /// <summary>组织节点不存在</summary>
    public const string OrganizationNotFound = "ORGANIZATION_NOT_FOUND";

    /// <summary>组织节点名称已存在</summary>
    public const string OrganizationNameExists = "ORGANIZATION_NAME_EXISTS";

    /// <summary>组织节点编码已存在</summary>
    public const string OrganizationCodeExists = "ORGANIZATION_CODE_EXISTS";

    /// <summary>父级不能是当前节点</summary>
    public const string ParentCannotBeSelf = "PARENT_CANNOT_BE_SELF";

    /// <summary>父级不能是当前节点的子节点</summary>
    public const string ParentCannotBeDescendant = "PARENT_CANNOT_BE_DESCENDANT";

    /// <summary>请先删除下级节点后再删除当前节点</summary>
    public const string CannotDeleteWithChildren = "CANNOT_DELETE_WITH_CHILDREN";

    // ──────────────────────────────────────────────
    // 格式验证相关 (Format Validation)
    // ──────────────────────────────────────────────

    /// <summary>邮箱格式不正确</summary>
    public const string InvalidEmailFormat = "INVALID_EMAIL_FORMAT";

    /// <summary>手机号格式不正确</summary>
    public const string InvalidPhoneFormat = "INVALID_PHONE_FORMAT";

    /// <summary>用户名格式不正确</summary>
    public const string InvalidUsernameFormat = "INVALID_USERNAME_FORMAT";

    /// <summary>密码长度过短</summary>
    public const string PasswordTooShort = "PASSWORD_TOO_SHORT";

    /// <summary>密码长度过长</summary>
    public const string PasswordTooLong = "PASSWORD_TOO_LONG";

    // ──────────────────────────────────────────────
    // DataAnnotation 验证错误码 (Validation Attributes)
    // ──────────────────────────────────────────────

    /// <summary>用户名必填</summary>
    public const string ValidationUsernameRequired = "VALIDATION_USERNAME_REQUIRED";

    /// <summary>用户名长度超出限制</summary>
    public const string ValidationUsernameTooLong = "VALIDATION_USERNAME_TOO_LONG";

    /// <summary>用户名长度不足</summary>
    public const string ValidationUsernameTooShort = "VALIDATION_USERNAME_TOO_SHORT";

    /// <summary>密码必填</summary>
    public const string ValidationPasswordRequired = "VALIDATION_PASSWORD_REQUIRED";

    /// <summary>密码长度不足</summary>
    public const string ValidationPasswordTooShort = "VALIDATION_PASSWORD_TOO_SHORT";

    /// <summary>密码长度超限</summary>
    public const string ValidationPasswordTooLong = "VALIDATION_PASSWORD_TOO_LONG";

    /// <summary>邮箱必填</summary>
    public const string ValidationEmailRequired = "VALIDATION_EMAIL_REQUIRED";

    /// <summary>邮箱格式无效</summary>
    public const string ValidationEmailInvalid = "VALIDATION_EMAIL_INVALID";

    /// <summary>验证码必填</summary>
    public const string ValidationCaptchaRequired = "VALIDATION_CAPTCHA_REQUIRED";

    /// <summary>验证码长度无效</summary>
    public const string ValidationCaptchaInvalid = "VALIDATION_CAPTCHA_INVALID";

    /// <summary>当前密码必填</summary>
    public const string ValidationCurrentPasswordRequired = "VALIDATION_CURRENT_PASSWORD_REQUIRED";

    /// <summary>新密码必填</summary>
    public const string ValidationNewPasswordRequired = "VALIDATION_NEW_PASSWORD_REQUIRED";

    /// <summary>确认密码必填</summary>
    public const string ValidationConfirmPasswordRequired = "VALIDATION_CONFIRM_PASSWORD_REQUIRED";

    /// <summary>刷新令牌必填</summary>
    public const string ValidationRefreshTokenRequired = "VALIDATION_REFRESH_TOKEN_REQUIRED";

    /// <summary>密码和确认密码不一致</summary>
    public const string ValidationPasswordsNotMatch = "VALIDATION_PASSWORDS_NOT_MATCH";

    /// <summary>角色名称必填</summary>
    public const string ValidationRoleNameRequired = "VALIDATION_ROLE_NAME_REQUIRED";

    /// <summary>角色名称长度不足</summary>
    public const string ValidationRoleNameTooShort = "VALIDATION_ROLE_NAME_TOO_SHORT";

    /// <summary>角色名称长度超限</summary>
    public const string ValidationRoleNameTooLong = "VALIDATION_ROLE_NAME_TOO_LONG";

    /// <summary>角色描述长度超限</summary>
    public const string ValidationRoleDescriptionTooLong = "VALIDATION_ROLE_DESCRIPTION_TOO_LONG";

    /// <summary>验证码ID必填</summary>
    public const string ValidationCaptchaIdRequired = "VALIDATION_CAPTCHA_ID_REQUIRED";

    /// <summary>验证码答案长度不足</summary>
    public const string ValidationCaptchaAnswerTooShort = "VALIDATION_CAPTCHA_ANSWER_TOO_SHORT";

    /// <summary>验证码答案长度超限</summary>
    public const string ValidationCaptchaAnswerTooLong = "VALIDATION_CAPTCHA_ANSWER_TOO_LONG";

    /// <summary>验证码答案长度范围无效</summary>
    public const string ValidationCaptchaAnswerLengthRange = "VALIDATION_CAPTCHA_ANSWER_LENGTH_RANGE";

    /// <summary>年龄超出有效范围</summary>
    public const string ValidationAgeRange = "VALIDATION_AGE_RANGE";

    /// <summary>姓名长度超限</summary>
    public const string ValidationNameTooLong = "VALIDATION_NAME_TOO_LONG";

    /// <summary>角色定义必填</summary>
    public const string ValidationRoleDefinitionRequired = "VALIDATION_ROLE_DEFINITION_REQUIRED";

    /// <summary>角色定义长度不足</summary>
    public const string ValidationRoleDefinitionTooShort = "VALIDATION_ROLE_DEFINITION_TOO_SHORT";

    /// <summary>角色定义长度超限</summary>
    public const string ValidationRoleDefinitionTooLong = "VALIDATION_ROLE_DEFINITION_TOO_LONG";

    /// <summary>AI角色无效</summary>
    public const string ValidationAiRoleInvalid = "VALIDATION_AI_ROLE_INVALID";

    /// <summary>走访日期必填</summary>
    public const string ValidationVisitDateRequired = "VALIDATION_VISIT_DATE_REQUIRED";

    /// <summary>头像数据过大</summary>
    public const string ValidationAvatarTooLarge = "VALIDATION_AVATAR_TOO_LARGE";

    /// <summary>用户名长度范围无效</summary>
    public const string ValidationUsernameLengthRange = "VALIDATION_USERNAME_LENGTH_RANGE";

    /// <summary>密码长度不符合要求</summary>
    public const string ValidationPasswordInvalidLength = "VALIDATION_PASSWORD_INVALID_LENGTH";

    /// <summary>当前密码长度超限</summary>
    public const string ValidationCurrentPasswordTooLong = "VALIDATION_CURRENT_PASSWORD_TOO_LONG";

    /// <summary>角色名称长度范围无效</summary>
    public const string ValidationRoleNameLengthRange = "VALIDATION_ROLE_NAME_LENGTH_RANGE";

    /// <summary>角色定义长度范围无效</summary>
    public const string ValidationRoleDefinitionLengthRange = "VALIDATION_ROLE_DEFINITION_LENGTH_RANGE";

    // ──────────────────────────────────────────────
    // 通用操作 (General Operation)
    // ──────────────────────────────────────────────

    /// <summary>操作失败</summary>
    public const string OperationFailed = "OPERATION_FAILED";

    // ──────────────────────────────────────────────
    // 服务器错误 (Server)
    // ──────────────────────────────────────────────

    /// <summary>服务器内部错误</summary>
    public const string ServerError = "SERVER_ERROR";

    // ──────────────────────────────────────────────
    // 公文相关 (Document)
    // ──────────────────────────────────────────────

    /// <summary>公文不存在</summary>
    public const string DocumentNotFound = "DOCUMENT_NOT_FOUND";

    /// <summary>流程实例不存在</summary>
    public const string WorkflowInstanceNotFound = "WORKFLOW_INSTANCE_NOT_FOUND";

    /// <summary>流程定义不存在</summary>
    public const string WorkflowDefinitionNotFound = "WORKFLOW_DEFINITION_NOT_FOUND";

    /// <summary>表单定义不存在</summary>
    public const string FormDefinitionNotFound = "FORM_DEFINITION_NOT_FOUND";

    /// <summary>公文标题不能为空</summary>
    public const string DocumentTitleRequired = "DOCUMENT_TITLE_REQUIRED";

    /// <summary>流程定义ID不能为空</summary>
    public const string WorkflowDefinitionIdRequired = "WORKFLOW_DEFINITION_ID_REQUIRED";

    /// <summary>文档ID不能为空</summary>
    public const string DocumentIdRequired = "DOCUMENT_ID_REQUIRED";

    /// <summary>请求参数不能为空</summary>
    public const string RequestParamRequired = "REQUEST_PARAM_REQUIRED";

    /// <summary>拒绝原因不能为空</summary>
    public const string RejectReasonRequired = "REJECT_REASON_REQUIRED";

    /// <summary>退回目标节点不能为空</summary>
    public const string ReturnTargetNodeRequired = "RETURN_TARGET_NODE_REQUIRED";

    /// <summary>退回原因不能为空</summary>
    public const string ReturnReasonRequired = "RETURN_REASON_REQUIRED";

    /// <summary>转办目标用户不能为空</summary>
    public const string DelegateTargetUserRequired = "DELEGATE_TARGET_USER_REQUIRED";

    /// <summary>流程节点未配置表单定义ID</summary>
    public const string WorkflowNodeNotConfigured = "WORKFLOW_NODE_NOT_CONFIGURED";

    /// <summary>流程实例当前无待处理节点</summary>
    public const string NoPendingNode = "NO_PENDING_NODE";

    /// <summary>流程图形定义不合法</summary>
    public const string InvalidWorkflowGraph = "INVALID_WORKFLOW_GRAPH";

    /// <summary>审批节点缺少审批配置</summary>
    public const string ApprovalNodeMissingConfig = "APPROVAL_NODE_MISSING_CONFIG";

    /// <summary>审批节点审批人规则不能为空</summary>
    public const string ApprovalNodeEmptyApprovers = "APPROVAL_NODE_EMPTY_APPROVERS";

    /// <summary>流程节点不能为空</summary>
    public const string WorkflowNodesEmpty = "WORKFLOW_NODES_EMPTY";

    /// <summary>存在重复的节点ID</summary>
    public const string DuplicateNodeId = "DUPLICATE_NODE_ID";

    /// <summary>流程必须包含开始节点</summary>
    public const string MissingStartNode = "MISSING_START_NODE";

    /// <summary>流程只能包含一个开始节点</summary>
    public const string MultipleStartNodes = "MULTIPLE_START_NODES";

    /// <summary>流程必须包含结束节点</summary>
    public const string MissingEndNode = "MISSING_END_NODE";

    /// <summary>连接线源或目标节点为空</summary>
    public const string EdgeSourceTargetEmpty = "EDGE_SOURCE_TARGET_EMPTY";

    /// <summary>连接线源和目标不能相同（不支持自环）</summary>
    public const string EdgeSelfLoopNotAllowed = "EDGE_SELF_LOOP_NOT_ALLOWED";

    /// <summary>连接线源节点不存在</summary>
    public const string EdgeSourceNotFound = "EDGE_SOURCE_NOT_FOUND";

    /// <summary>连接线目标节点不存在</summary>
    public const string EdgeTargetNotFound = "EDGE_TARGET_NOT_FOUND";

    /// <summary>存在重复的连接线</summary>
    public const string DuplicateEdge = "DUPLICATE_EDGE";

    /// <summary>存在从开始节点不可达的节点</summary>
    public const string UnreachableNodes = "UNREACHABLE_NODES";

    /// <summary>从开始节点无法到达任何结束节点</summary>
    public const string NoPathToEndNode = "NO_PATH_TO_END_NODE";

    /// <summary>开始节点没有出边</summary>
    public const string StartNodeNoOutgoing = "START_NODE_NO_OUTGOING";

    /// <summary>结束节点没有入边</summary>
    public const string EndNodeNoIncoming = "END_NODE_NO_INCOMING";

    /// <summary>节点没有出边</summary>
    public const string NodeNoOutgoing = "NODE_NO_OUTGOING";

    /// <summary>节点没有入边</summary>
    public const string NodeNoIncoming = "NODE_NO_INCOMING";

    /// <summary>不支持的节点类型</summary>
    public const string UnsupportedNodeType = "UNSUPPORTED_NODE_TYPE";

    /// <summary>审批节点超时时间必须为非负数</summary>
    public const string ApprovalTimeoutNegative = "APPROVAL_TIMEOUT_NEGATIVE";

    /// <summary>条件节点缺少出边</summary>
    public const string ConditionNodeNoOutgoing = "CONDITION_NODE_NO_OUTGOING";

    /// <summary>条件节点的出边需包含条件或默认路径</summary>
    public const string ConditionNodeInvalidPaths = "CONDITION_NODE_INVALID_PATHS";

    // ──────────────────────────────────────────────
    // 错误码 → 人类可读消息字典
    // BusinessExceptionFilter 检测到异常消息为已知错误码时，
    // 自动将 errorCode 设为该错误码，message 设为字典中的中文消息
    // ──────────────────────────────────────────────

    /// <summary>
    /// 错误码对应的人类可读消息字典
    /// key = 错误码字符串，value = 中文 fallback 消息
    /// </summary>
    public static readonly Dictionary<string, string> ErrorMessages = new()
    {
        // 认证
        [Unauthenticated] = "未找到用户认证信息",
        [InvalidCredentials] = "用户名或密码错误",
        [CaptchaRequired] = "请输入验证码",
        [CaptchaRequiredAfterFailedLogin] = "登录失败后需要输入验证码",
        [CaptchaInvalid] = "验证码错误",
        [InvalidToken] = "令牌无效",
        [TokenExpired] = "令牌已过期",
        [UserInfoInvalid] = "用户信息无效",
        // 授权
        [UnauthorizedAccess] = "无权执行此操作",
        [ViewPermissionDenied] = "无权查看其他用户信息",
        [CurrentCompanyNotFound] = "未找到当前企业信息",
        [MenuAccessDenied] = "无权访问指定菜单",
        [CannotDeleteCurrentUser] = "不能删除当前登录用户",
        [MenuServiceNotConfigured] = "菜单访问服务未配置",
        [Forbidden] = "禁止访问",
        // 验证
        [ValidationError] = "请求参数验证失败",
        [InvalidOldPassword] = "原密码错误",
        // 资源
        [ResourceNotFound] = "资源不存在",
        [UserNotFound] = "用户不存在",
        [CompanyNotFound] = "企业不存在",
        // 业务
        [InvalidOperation] = "无效操作",
        [OperationNotSupported] = "不支持的操作",
        [UserNameExists] = "用户名已存在",
        [EmailExists] = "邮箱已存在",
        [PhoneNumberExists] = "手机号已存在",
        [UserNotAuthenticated] = "未找到用户认证信息",
        // 企业
        [CompanyNotMember] = "您不是该企业的有效成员",
        [CompanyCreatorCannotLeave] = "企业创建者不允许退出",
        [CompanySoleAdminCannotLeave] = "企业唯一管理员不允许退出",
        [CompanyInactive] = "企业未激活，请联系管理员",
        [CompanyExpired] = "企业已过期，请联系管理员续费",
        // 角色/权限
        [RoleNotFound] = "角色不存在",
        [RoleNameExists] = "角色名称已存在",
        [SystemRoleCannotDelete] = "不能删除系统管理员角色",
        [CannotRemoveLastAdmin] = "不能移除最后一个管理员的角色",
        [PermissionNotFound] = "权限不存在",
        [PermissionCodeExists] = "权限代码已存在",
        // 菜单/通知
        [MenuNotFound] = "菜单不存在",
        [MenuNameExists] = "菜单名称已存在",
        [CannotDeleteMenuWithChildren] = "不能删除有子菜单的菜单，请先删除子菜单",
        [NoticeNotFound] = "通知不存在",
        // 用户/企业扩展
        [UserInactive] = "用户已被禁用",
        [CannotDeleteSelf] = "不能删除自己的账户",
        [CannotModifyOwnRole] = "不能修改自己的角色",
        [MaxUsersReached] = "已达到最大用户数限制",
        [CompanyCodeExists] = "企业代码已存在",
        [InvalidCompanyCode] = "企业代码格式不正确",
        [CompanyRequired] = "未找到企业信息",
        // 组织架构
        [OrganizationNotFound] = "组织节点不存在",
        [OrganizationNameExists] = "组织节点名称已存在",
        [OrganizationCodeExists] = "组织节点编码已存在",
        [ParentCannotBeSelf] = "父级不能选择当前节点",
        [ParentCannotBeDescendant] = "父级不能选择当前节点的子节点",
        [CannotDeleteWithChildren] = "请先删除下级节点后再删除当前节点",
        // 格式验证
        [InvalidEmailFormat] = "邮箱格式不正确",
        [InvalidPhoneFormat] = "手机号格式不正确",
        [InvalidUsernameFormat] = "用户名格式不正确",
        [PasswordTooShort] = "密码长度不能少于6个字符",
        [PasswordTooLong] = "密码长度不能超过50个字符",
        // DataAnnotation 验证
        [ValidationUsernameRequired] = "用户名不能为空",
        [ValidationUsernameTooLong] = "用户名长度不能超过50个字符",
        [ValidationUsernameTooShort] = "用户名长度不能少于3个字符",
        [ValidationPasswordRequired] = "密码不能为空",
        [ValidationPasswordTooLong] = "密码长度不能超过50个字符",
        [ValidationPasswordTooShort] = "密码长度不能少于6个字符",
        [ValidationEmailRequired] = "邮箱不能为空",
        [ValidationEmailInvalid] = "邮箱格式不正确",
        [ValidationCaptchaRequired] = "验证码不能为空",
        [ValidationCaptchaInvalid] = "验证码必须为6位",
        [ValidationCurrentPasswordRequired] = "当前密码不能为空",
        [ValidationNewPasswordRequired] = "新密码不能为空",
        [ValidationConfirmPasswordRequired] = "确认密码不能为空",
        [ValidationRefreshTokenRequired] = "刷新令牌不能为空",
        [ValidationPasswordsNotMatch] = "新密码和确认密码不一致",
        [ValidationRoleNameRequired] = "角色名称不能为空",
        [ValidationRoleNameTooShort] = "角色名称长度不能少于2个字符",
        [ValidationRoleNameTooLong] = "角色名称长度不能超过50个字符",
        [ValidationRoleDescriptionTooLong] = "描述长度不能超过200个字符",
        [ValidationCaptchaIdRequired] = "验证码ID不能为空",
        [ValidationCaptchaAnswerTooShort] = "验证码答案长度不能少于1个字符",
        [ValidationCaptchaAnswerTooLong] = "验证码答案长度不能超过10个字符",
        [ValidationCaptchaAnswerLengthRange] = "验证码答案长度不符合要求",
        [ValidationAgeRange] = "年龄必须在0-150之间",
        [ValidationNameTooLong] = "姓名长度不能超过50个字符",
        [ValidationRoleDefinitionRequired] = "角色定义不能为空",
        [ValidationRoleDefinitionTooShort] = "角色定义长度不能少于1个字符",
        [ValidationRoleDefinitionTooLong] = "角色定义长度不能超过2000个字符",
        [ValidationAiRoleInvalid] = "Role 必须是 user、assistant 或 system",
        [ValidationVisitDateRequired] = "走访时间不能为空",
        [ValidationAvatarTooLarge] = "头像数据过大，请选择更小的图片",
        [ValidationUsernameLengthRange] = "用户名长度不符合要求",
        [ValidationPasswordInvalidLength] = "密码长度不符合要求",
        [ValidationCurrentPasswordTooLong] = "当前密码长度超限",
        [ValidationRoleNameLengthRange] = "角色名称长度不符合要求",
        [ValidationRoleDefinitionLengthRange] = "角色定义长度不符合要求",
        // 通用操作
        [OperationFailed] = "操作失败",
        // 文件
        [AvatarTooLarge] = "头像数据过大，请选择小于 2MB 的图片",
        [FileNotFound] = "文件不存在",
        [FileThumbnailNotSupported] = "该文件类型不支持生成缩略图",
        [FileThumbnailGenerationFailed] = "生成缩略图失败",
        [FileThumbnailNotAvailable] = "缩略图不存在且无法生成",
        [FileThumbnailDeleted] = "缩略图文件不存在或已被删除",
        [FilePreviewNotSupported] = "该文件类型不支持预览",
        [FilePreviewTypeNotSupported] = "不支持的预览类型",
        [FilePreviewGenerationFailed] = "生成预览失败",
        [ModuleRequired] = "模块不能为空",
        [DataTypeRequired] = "数据类型不能为空",
        [UnsupportedModule] = "不支持的模块",
        [UnsupportedDataType] = "不支持的数据类型",
        [ProjectNotFound] = "项目不存在",
        [ProjectDeleteUnauthorized] = "无权删除此项目",
        [ProjectMemberAlreadyExists] = "该用户已经是项目成员",
        // 服务器
        [ServerError] = "服务器内部错误",
        // 公文
        [DocumentNotFound] = "公文不存在",
        [WorkflowInstanceNotFound] = "流程实例不存在",
        [WorkflowDefinitionNotFound] = "流程定义不存在",
        [FormDefinitionNotFound] = "表单定义不存在",
        [DocumentTitleRequired] = "公文标题不能为空",
        [WorkflowDefinitionIdRequired] = "流程定义ID不能为空",
        [DocumentIdRequired] = "文档ID不能为空",
        [RequestParamRequired] = "请求参数不能为空",
        [RejectReasonRequired] = "拒绝原因不能为空",
        [ReturnTargetNodeRequired] = "退回目标节点不能为空",
        [ReturnReasonRequired] = "退回原因不能为空",
        [DelegateTargetUserRequired] = "转办目标用户不能为空",
        [WorkflowNodeNotConfigured] = "流程节点未配置表单定义ID",
        [NoPendingNode] = "流程实例当前无待处理节点",
        [InvalidWorkflowGraph] = "流程图形定义不合法",
        [ApprovalNodeMissingConfig] = "审批节点缺少审批配置",
        [ApprovalNodeEmptyApprovers] = "审批节点审批人规则不能为空",
        [WorkflowNodesEmpty] = "流程节点不能为空",
        [DuplicateNodeId] = "存在重复的节点ID",
        [MissingStartNode] = "流程必须包含开始节点",
        [MultipleStartNodes] = "流程只能包含一个开始节点",
        [MissingEndNode] = "流程必须包含结束节点",
        [EdgeSourceTargetEmpty] = "连接线源或目标节点为空",
        [EdgeSelfLoopNotAllowed] = "连接线源和目标不能相同（不支持自环）",
        [EdgeSourceNotFound] = "连接线源节点不存在",
        [EdgeTargetNotFound] = "连接线目标节点不存在",
        [DuplicateEdge] = "存在重复的连接线",
        [UnreachableNodes] = "存在从开始节点不可达的节点",
        [NoPathToEndNode] = "从开始节点无法到达任何结束节点",
        [StartNodeNoOutgoing] = "开始节点没有出边",
        [EndNodeNoIncoming] = "结束节点没有入边",
        [NodeNoOutgoing] = "节点没有出边",
        [NodeNoIncoming] = "节点没有入边",
        [UnsupportedNodeType] = "不支持的节点类型",
        [ApprovalTimeoutNegative] = "审批节点超时时间必须为非负数",
        [ConditionNodeNoOutgoing] = "条件节点缺少出边",
        [ConditionNodeInvalidPaths] = "条件节点的出边需包含条件或默认路径",
    };
}
