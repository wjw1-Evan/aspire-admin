export default {
    'request.error.validation': '驗證錯誤',
    'request.error.login-failed': '登入失敗，請檢查使用者名稱和密碼',
    'request.error.token-expired': '登入已過期，請重新登入',
    'request.error.unknown': '未知的錯誤',
    'request.error.network': '網路錯誤，請檢查您的網路連線',
    'request.error.server': '伺服器錯誤，請稍後重試',
    'request.error.forbidden': '無權存取此資源',
    'request.error.not-found': '找不到請求的資源',

    // ── 認證相關 (Authentication) ──
    'UNAUTHENTICATED': '未經授權存取，請重新登入',
    'INVALID_CREDENTIALS': '使用者名稱或密碼錯誤',
    'CAPTCHA_REQUIRED': '請輸入圖形驗證碼',
    'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN': '為確保安全，此後登入需輸入圖形驗證碼',
    'CAPTCHA_INVALID': '圖形驗證碼錯誤，請重新輸入',
    'INVALID_TOKEN': '認證權杖無效或已過期',
    'TOKEN_EXPIRED': '登入已過期，請重新登入',
    'USER_INFO_INVALID': '使用者資訊無效',

    // ── 授權相關 (Authorization) ──
    'UNAUTHORIZED_ACCESS': '無權存取',
    'VIEW_PERMISSION_DENIED': '無權查看其他使用者資訊',
    'CURRENT_COMPANY_NOT_FOUND': '找不到目前的企業資訊',
    'MENU_ACCESS_DENIED': '無權存取該選單',
    'MENU_SERVICE_NOT_CONFIGURED': '選單存取服務未設定',
    'FORBIDDEN': '禁止存取',

    // ── 驗證相關 (Validation) ──
    'VALIDATION_ERROR': '請求參數驗證失敗',
    'INVALID_OLD_PASSWORD': '原始密碼錯誤',

    // ── 資源相關 (Resource) ──
    'RESOURCE_NOT_FOUND': '資源不存在',
    'USER_NOT_FOUND': '使用者不存在',
    'COMPANY_NOT_FOUND': '企業不存在',

    // ── 業務操作相關 (Business Operation) ──
    'INVALID_OPERATION': '操作無效',
    'OPERATION_NOT_SUPPORTED': '不支援的操作',
    'USER_NAME_EXISTS': '使用者名稱已存在',
    'EMAIL_EXISTS': '電子郵件已存在',
    'PHONE_NUMBER_EXISTS': '手機號碼已存在',
    'USER_NOT_AUTHENTICATED': '找不到使用者認證資訊',

    // ── 企業相關 (Company) ──
    'COMPANY_NOT_MEMBER': '您不是該企業的有效成員',
    'COMPANY_CREATOR_CANNOT_LEAVE': '您是該企業的建立者，不允許退出',
    'COMPANY_SOLE_ADMIN_CANNOT_LEAVE': '您是企業唯一的管理員，請先轉讓管理員權限或註銷企業',
    'COMPANY_INACTIVE': '企業未啟用，請聯絡管理員',
    'COMPANY_EXPIRED': '企業已過期，請聯絡管理員續費',

    // ── 角色/權限相關 (Role/Permission) ──
    'ROLE_NOT_FOUND': '角色不存在',
    'ROLE_NAME_EXISTS': '角色名稱已存在',
    'SYSTEM_ROLE_CANNOT_DELETE': '不能刪除系統管理員角色',
    'CANNOT_REMOVE_LAST_ADMIN': '不能移除最後一個管理員的角色',
    'PERMISSION_NOT_FOUND': '權限不存在',
    'PERMISSION_CODE_EXISTS': '權限代碼已存在',

    // ── 選單/通知相關 (Menu/Notice) ──
    'MENU_NOT_FOUND': '選單不存在',
    'MENU_NAME_EXISTS': '選單名稱已存在',
    'CANNOT_DELETE_MENU_WITH_CHILDREN': '不能刪除有子選單的選單，請先刪除子選單',
    'NOTICE_NOT_FOUND': '通知不存在',

    // ── 使用者/企業擴充 (User/Company Extended) ──
    'USER_INACTIVE': '使用者已被停用',
    'CANNOT_DELETE_SELF': '不能刪除自己的帳戶',
    'CANNOT_MODIFY_OWN_ROLE': '不能修改自己的角色',
    'MAX_USERS_REACHED': '已达到最大使用者數限制',
    'COMPANY_CODE_EXISTS': '企業代碼已存在',
    'INVALID_COMPANY_CODE': '企業代碼格式不正確',
    'COMPANY_REQUIRED': '找不到企業資訊',

    // ─��� 組織架構相關 (Organization) ──
    'ORGANIZATION_NOT_FOUND': '組織節點不存在',
    'ORGANIZATION_NAME_EXISTS': '組織節點名稱已存在',
    'ORGANIZATION_CODE_EXISTS': '組織節點代碼已存在',
    'PARENT_CANNOT_BE_SELF': '父級不能選擇目前的節點',
    'PARENT_CANNOT_BE_DESCENDANT': '父級不能選擇目前節點的子節點',
    'CANNOT_DELETE_WITH_CHILDREN': '請先刪除下級節點後再刪除目前的節點',

    // ── 格式驗證相關 (Format Validation) ──
    'INVALID_EMAIL_FORMAT': '電子郵件格式不正確',
    'INVALID_PHONE_FORMAT': '手機號碼格式不正確',
    'INVALID_USERNAME_FORMAT': '使用者名稱格式不正確',
    'PASSWORD_TOO_SHORT': '密碼長度不能少於6個字元',
    'PASSWORD_TOO_LONG': '密碼長度不能超過50個字元',

    // ── 通用操作 (General Operation) ──
    'OPERATION_FAILED': '操作失敗',

    // ── 檔案相關 (File) ──
    'AVATAR_TOO_LARGE': '頭像資料過大，請選擇小於 2MB 的圖片',

    // ── 伺服器錯誤 (Server) ──
    'SERVER_ERROR': '伺服器內部錯誤',
};