export default {
  'request.error.validation': '유효성 검사 오류',
  'request.error.login-failed': '로그인 실패, 사용자 이름과 비밀번호를 확인하세요',
  'request.error.token-expired': '세션이 만료되었습니다, 다시 로그인하세요',
  'request.error.unknown': '알 수 없는 오류',
  'request.error.network': '네트워크 오류, 연결을 확인하세요',
  'request.error.server': '서버 오류, 나중에 다시 시도하세요',
  'request.error.forbidden': ' 금지된 리소스',
  'request.error.not-found': '리소스를 찾을 수 없음',

  // 인증 (Authentication)
  'UNAUTHENTICATED': '인증되지 않음, 다시 로그인하세요',
  'INVALID_CREDENTIALS': '사용자 이름 또는 비밀번호가 잘못됨',
  'CAPTCHA_REQUIRED': 'captcha를 입력하세요',
  'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN': '로그인 실패 후 captcha 필요',
  'CAPTCHA_INVALID': '잘못된 captcha',
  'INVALID_TOKEN': '인증 토큰이 유효하지 않거나 만료됨',
  'TOKEN_EXPIRED': '세션이 만료됨, 다시 로그인하세요',
  'USER_INFO_INVALID': '잘못된 사용자 정보',

  // 승인 (Authorization)
  'UNAUTHORIZED_ACCESS': '권한 없음',
  'VIEW_PERMISSION_DENIED': '다른 사용자 정보 조회 권한 없음',
  'CURRENT_COMPANY_NOT_FOUND': '현재 회사 정보를 찾을 수 없음',
  'MENU_ACCESS_DENIED': '이 메뉴에 접근할 권한이 없음',
  'MENU_SERVICE_NOT_CONFIGURED': '메뉴 접근 서비스가 구성되지 않음',
  'FORBIDDEN': '접근 금지',

  // 검증 (Validation)
  'VALIDATION_ERROR': '요청 검증 실패',
  'INVALID_OLD_PASSWORD': '기존 비밀번호가 잘못됨',

  // 리소스 (Resource)
  'RESOURCE_NOT_FOUND': '리소스를 찾을 수 없음',
  'USER_NOT_FOUND': '사용자를 찾을 수 없음',
  'COMPANY_NOT_FOUND': '회사를 찾을 수 없음',

  // 업무 조정 (Business Operation)
  'INVALID_OPERATION': '잘못된 작업',
  'OPERATION_NOT_SUPPORTED': '지원되지 않는 작업',
  'USER_NAME_EXISTS': '사용자 이름이 이미 존재함',
  'EMAIL_EXISTS': '이메일이 이미 존재함',
  'PHONE_NUMBER_EXISTS': '전화번호가 이미 존재함',
  'USER_NOT_AUTHENTICATED': '사용자 인증 정보를 찾을 수 없음',

  // 회사 (Company)
  'COMPANY_NOT_MEMBER': '이 회사의 구성원이 아닙니다',
  'COMPANY_CREATOR_CANNOT_LEAVE': '이 회사의 생성자므로 탈퇴할 수 없음',
  'COMPANY_SOLE_ADMIN_CANNOT_LEAVE': '이 회사의 유일한 관리자입니다',
  'COMPANY_INACTIVE': '회사가 활성화되지 않음, 관리자에게 문의하세요',
  'COMPANY_EXPIRED': '회사가 만료됨, 관리자에게 문의하여 갱신하세요',

  // 역할/권한 (Role/Permission)
  'ROLE_NOT_FOUND': '역할을 찾을 수 없음',
  'ROLE_NAME_EXISTS': '역할 이름이 이미 존재함',
  'SYSTEM_ROLE_CANNOT_DELETE': '시스템 관리자 역할은 삭제할 수 없음',
  'CANNOT_REMOVE_LAST_ADMIN': '마지막 관리자 역할은 삭제할 수 없음',
  'PERMISSION_NOT_FOUND': '권한을 찾을 수 없음',
  'PERMISSION_CODE_EXISTS': '권한 코드가 이미 존재함',

  // 메뉴/알림 (Menu/Notice)
  'MENU_NOT_FOUND': '메뉴를 찾을 수 없음',
  'MENU_NAME_EXISTS': '메뉴 이름이 이미 존재함',
  'CANNOT_DELETE_MENU_WITH_CHILDREN': '하위 메뉴가 있는 메뉴는 삭제할 수 없음',
  'NOTICE_NOT_FOUND': '알림을 찾을 수 없음',

  // 사용자/회사 확장 (User/Company Extended)
  'USER_INACTIVE': '사용자 계정이 비활성화됨',
  'CANNOT_DELETE_SELF': '자신의 계정은 삭제할 수 없음',
  'CANNOT_MODIFY_OWN_ROLE': '자신의 역할은 수정할 수 없음',
  'MAX_USERS_REACHED': '최대 사용자 수에 도달함',
  'COMPANY_CODE_EXISTS': '회사 코드가 이미 존재함',
  'INVALID_COMPANY_CODE': '잘못된 회사 코드 형식',
  'COMPANY_REQUIRED': '회사 정보를 찾을 수 없음',

  // 조직架构 (Organization)
  'ORGANIZATION_NOT_FOUND': '조직 노드를 찾을 수 없음',
  'ORGANIZATION_NAME_EXISTS': '조직 노드 이름이 이미 존재함',
  'ORGANIZATION_CODE_EXISTS': '조직 노드 코드가 이미 존재함',
  'PARENT_CANNOT_BE_SELF': '부모는 현재 노드가 될 수 없음',
  'PARENT_CANNOT_BE_DESCENDANT': '부모는 현재 노드의 하위 노드가 될 수 없음',
  'CANNOT_DELETE_WITH_CHILDREN': '먼저 하위 노드를 삭제하세요',

  // 형식 검증 (Format Validation)
  'INVALID_EMAIL_FORMAT': '잘못된 이메일 형식',
  'INVALID_PHONE_FORMAT': '잘못된 전화번호 형식',
  'INVALID_USERNAME_FORMAT': '잘못된 사용자 이름 형식',
  'PASSWORD_TOO_SHORT': '비밀번호는 6자 이상이어야 합니다',
  'PASSWORD_TOO_LONG': '비밀번호는 50자를 초과할 수 없습니다',

  // 일반 작업 (General Operation)
  'OPERATION_FAILED': '작업 실패',

  // 파일 (File)
  'AVATAR_TOO_LARGE': '아바타 이미지가 너무 큼',

  // 서버 (Server)
  'SERVER_ERROR': '내부 서버 오류',
};