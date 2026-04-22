export default {
  'request.error.validation': 'Doğrulama Hatası',
  'request.error.login-failed': 'Giriş başarısız, kullanıcı adı ve şifrenizi kontrol edin',
  'request.error.token-expired': 'Oturum süresi doldu, lütfen tekrar giriş yapın',
  'request.error.unknown': 'Bilinmiyor Hata',
  'request.error.network': 'Ağ hatası, bağlantınızı kontrol edin',
  'request.error.server': 'Sunucu hatası, lütfen daha sonra tekrar deneyin',
  'request.error.forbidden': 'Yasaklı kaynak',
  'request.error.not-found': 'Kaynak bulunamadı',

  // Kimlik Doğrulama
  'UNAUTHENTICATED': 'Yetkisiz erişim, lütfen tekrar giriş yapın',
  'INVALID_CREDENTIALS': 'Kullanıcı adı veya şifre geçersiz',
  'CAPTCHA_REQUIRED': 'Lütfen güvenlik kodunu girin',
  'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN': 'Başarısız girişten sonra güvenlik kodu gerekli',
  'CAPTCHA_INVALID': 'Geçersiz güvenlik kodu',
  'INVALID_TOKEN': 'Kimlik doğrulama belirteci geçersiz veya süresi dolmuş',
  'TOKEN_EXPIRED': 'Oturum süresi doldu, lütfen tekrar giriş yapın',
  'USER_INFO_INVALID': 'Geçersiz kullanıcı bilgileri',

  // Yetkilendirme
  'UNAUTHORIZED_ACCESS': 'Yetkisiz erişim',
  'VIEW_PERMISSION_DENIED': 'Diğer kullanıcı bilgilerini görüntüleme izniniz yok',
  'CURRENT_COMPANY_NOT_FOUND': 'Mevcut şirket bilgileri bulunamadı',
  'MENU_ACCESS_DENIED': 'Bu menüye erişim izniniz yok',
  'MENU_SERVICE_NOT_CONFIGURED': 'Menü erişim servisi yapılandırılmamış',
  'FORBIDDEN': 'Erişim yasak',

  // Doğrulama
  'VALIDATION_ERROR': 'İstek doğrulaması başarısız',
  'INVALID_OLD_PASSWORD': 'Eski şifre yanlış',

  // Kaynak
  'RESOURCE_NOT_FOUND': 'Kaynak bulunamadı',
  'USER_NOT_FOUND': 'Kullanıcı bulunamadı',
  'COMPANY_NOT_FOUND': 'Şirket bulunamadı',

  // İşletme Operasyonu
  'INVALID_OPERATION': 'Geçersiz operasyon',
  'OPERATION_NOT_SUPPORTED': 'Desteklenmeyen operasyon',
  'USER_NAME_EXISTS': 'Kullanıcı adı zaten mevcut',
  'EMAIL_EXISTS': 'E-posta zaten mevcut',
  'PHONE_NUMBER_EXISTS': 'Telefon numarası zaten mevcut',
  'USER_NOT_AUTHENTICATED': 'Kullanıcı kimlik doğrulama bilgileri bulunamadı',

  // Şirket
  'COMPANY_NOT_MEMBER': 'Bu şirketin üyesi değilsiniz',
  'COMPANY_CREATOR_CANNOT_LEAVE': 'Bu şirketin kurucususunuz, ayrılamazsınız',
  'COMPANY_SOLE_ADMIN_CANNOT_LEAVE': 'Bu şirketin tek yöneticisisiniz',
  'COMPANY_INACTIVE': 'Şirket aktif değil, yöneticiyle iletişime geçin',
  'COMPANY_EXPIRED': 'Şirket süresi dolmuş, yenilemek için yöneticiyle iletişime geçin',

  // Rol/İzin
  'ROLE_NOT_FOUND': 'Rol bulunamadı',
  'ROLE_NAME_EXISTS': 'Rol adı zaten mevcut',
  'SYSTEM_ROLE_CANNOT_DELETE': 'Sistem yöneticisi rolü silinemez',
  'CANNOT_REMOVE_LAST_ADMIN': 'Son yönetici rolü kaldırılamaz',
  'PERMISSION_NOT_FOUND': 'İzin bulunamadı',
  'PERMISSION_CODE_EXISTS': 'İzin kodu zaten mevcut',

  // Menü/Bildirim
  'MENU_NOT_FOUND': 'Menü bulunamadı',
  'MENU_NAME_EXISTS': 'Menü adı zaten mevcut',
  'CANNOT_DELETE_MENU_WITH_CHILDREN': 'Alt menülerle menü silinemez',
  'NOTICE_NOT_FOUND': 'Bildirim bulunamadı',

  // Kullanıcı/Şirket Genişletilmiş
  'USER_INACTIVE': 'Kullanıcı hesabı devre dışı bırakılmış',
  'CANNOT_DELETE_SELF': 'Kendi hesabınızı silemezsiniz',
  'CANNOT_MODIFY_OWN_ROLE': 'Kendi rolünüzü değiştiremezsiniz',
  'MAX_USERS_REACHED': 'Maksimum kullanıcı sayısına ulaşıldı',
  'COMPANY_CODE_EXISTS': 'Şirket kodu zaten mevcut',
  'INVALID_COMPANY_CODE': 'Geçersiz şirket kodu formatı',
  'COMPANY_REQUIRED': 'Şirket bilgileri bulunamadı',

  // Organizasyon
  'ORGANIZATION_NOT_FOUND': 'Organizasyon düğümü bulunamadı',
  'ORGANIZATION_NAME_EXISTS': 'Organizasyon düğüm adı zaten mevcut',
  'ORGANIZATION_CODE_EXISTS': 'Organizasyon düğüm kodu zaten mevcut',
  'PARENT_CANNOT_BE_SELF': 'Üst düğüm mevcut düğüm olamaz',
  'PARENT_CANNOT_BE_DESCENDANT': 'Üst düğüm mevcut düğümün alt düğümü olamaz',
  'CANNOT_DELETE_WITH_CHILDREN': 'Önce alt düğümleri silin',

  // Format Doğrulama
  'INVALID_EMAIL_FORMAT': 'Geçersiz e-posta formatı',
  'INVALID_PHONE_FORMAT': 'Geçersiz telefon numarası formatı',
  'INVALID_USERNAME_FORMAT': 'Geçersiz kullanıcı adı formatı',
  'PASSWORD_TOO_SHORT': 'Şifre en az 6 karakter olmalı',
  'PASSWORD_TOO_LONG': 'Şifre 50 karakteri geçemez',

  // Genel Operasyon
  'OPERATION_FAILED': 'Operasyon başarısız',

  // Dosya
  'AVATAR_TOO_LARGE': 'Avatar resmi çok büyük',

  // Sunucu
  'SERVER_ERROR': 'Sunucu iç hatası',
};