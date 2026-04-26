export default {
  'request.error.validation': 'Errore di validazione',
  'request.error.login-failed': 'Login fallito, verifica nome utente e password',
  'request.error.token-expired': 'Sessione scaduta, effettua nuovamente il login',
  'request.error.unknown': 'Errore sconosciuto',
  'request.error.network': 'Errore di rete, verifica la connessione',
  'request.error.server': 'Errore del server, riprova più tardi',
  'request.error.forbidden': 'Risorsa proibita',
  'request.error.not-found': 'Risorsa non trovata',

  // Autenticazione
  'UNAUTHENTICATED': 'Accesso non autorizzato, effettua nuovamente il login',
  'INVALID_CREDENTIALS': 'Nome utente o password non validi',
  'CAPTCHA_REQUIRED': 'Inserisci il captcha',
  'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN': 'Captcha richiesto dopo login fallito',
  'CAPTCHA_INVALID': 'Captcha non valido',
  'INVALID_TOKEN': 'Token di autenticazione non valido o scaduto',
  'TOKEN_EXPIRED': 'Sessione scaduta, effettua nuovamente il login',
  'USER_INFO_INVALID': 'Informazioni utente non valide',

  // Autorizzazione
  'UNAUTHORIZED_ACCESS': 'Accesso non autorizzato',
  'VIEW_PERMISSION_DENIED': 'Nessun permesso per visualizzare informazioni altri utenti',
  'CURRENT_COMPANY_NOT_FOUND': 'Informazioni azienda corrente non trovate',
  'MENU_ACCESS_DENIED': 'Nessun permesso per accedere a questo menu',
  'MENU_SERVICE_NOT_CONFIGURED': 'Servizio accesso menu non configurato',
  'FORBIDDEN': 'Accesso proibito',

  // Validazione
  'VALIDATION_ERROR': 'Validazione richiesta fallita',
  'INVALID_OLD_PASSWORD': 'Password originale errata',

  // Risorsa
  'RESOURCE_NOT_FOUND': 'Risorsa non trovata',
  'USER_NOT_FOUND': 'Utente non trovato',
  'COMPANY_NOT_FOUND': 'Azienda non trovata',

  // Operazione aziendale
  'INVALID_OPERATION': 'Operazione non valida',
  'OPERATION_NOT_SUPPORTED': 'Operazione non supportata',
  'USER_NAME_EXISTS': 'Nome utente già esistente',
  'EMAIL_EXISTS': 'Email già esistente',
  'PHONE_NUMBER_EXISTS': 'Numero di telefono già esistente',
  'USER_NOT_AUTHENTICATED': 'Informazioni autenticazione utente non trovate',

  // Azienda
  'COMPANY_NOT_MEMBER': 'Non sei membro di questa azienda',
  'COMPANY_CREATOR_CANNOT_LEAVE': 'Sei il creatore di questa azienda e non puoi lasciarla',
  'COMPANY_SOLE_ADMIN_CANNOT_LEAVE': 'Sei il solo amministratore di questa azienda',
  'COMPANY_INACTIVE': 'Azienda non attiva, contatta l\'amministratore',
  'COMPANY_EXPIRED': 'Azienda scaduta, contatta l\'amministratore per rinnovare',

  // Ruolo/Permesso
  'ROLE_NOT_FOUND': 'Ruolo non trovato',
  'ROLE_NAME_EXISTS': 'Nome ruolo già esistente',
  'SYSTEM_ROLE_CANNOT_DELETE': 'Impossibile eliminare ruolo amministratore sistema',
  'CANNOT_REMOVE_LAST_ADMIN': 'Impossibile rimuovere ultimo ruolo amministratore',
  'PERMISSION_NOT_FOUND': 'Permesso non trovato',
  'PERMISSION_CODE_EXISTS': 'Codice permesso già esistente',

  // Menu/Notifica
  'MENU_NOT_FOUND': 'Menu non trovato',
  'MENU_NAME_EXISTS': 'Nome menu già esistente',
  'CANNOT_DELETE_MENU_WITH_CHILDREN': 'Impossibile eliminare menu con sottomenu',
  'NOTICE_NOT_FOUND': 'Notifica non trovata',

  // Utente/Azienda esteso
  'USER_INACTIVE': 'Account utente disabilitato',
  'CANNOT_DELETE_SELF': 'Impossibile eliminare il proprio account',
  'CANNOT_DELETE_CURRENT_USER': 'Impossibile eliminare l\'utente attualmente connesso',
  'CANNOT_MODIFY_OWN_ROLE': 'Impossibile modificare il proprio ruolo',
  'MAX_USERS_REACHED': 'Numero massimo utenti raggiunto',
  'COMPANY_CODE_EXISTS': 'Codice azienda già esistente',
  'INVALID_COMPANY_CODE': 'Formato codice azienda non valido',
  'COMPANY_REQUIRED': 'Informazioni azienda non trovate',

  // Organizzazione
  'ORGANIZATION_NOT_FOUND': 'Nodo organizzazione non trovato',
  'ORGANIZATION_NAME_EXISTS': 'Nome nodo organizzazione già esistente',
  'ORGANIZATION_CODE_EXISTS': 'Codice nodo organizzazione già esistente',
  'PARENT_CANNOT_BE_SELF': 'Il genitore non può essere il nodo corrente',
  'PARENT_CANNOT_BE_DESCENDANT': 'Il genitore non può essere un nodo figlio',
  'CANNOT_DELETE_WITH_CHILDREN': 'Elimina prima i nodi figli',

  // Validazione formato
  'INVALID_EMAIL_FORMAT': 'Formato email non valido',
  'INVALID_PHONE_FORMAT': 'Formato numero telefono non valido',
  'INVALID_USERNAME_FORMAT': 'Formato nome utente non valido',
  'PASSWORD_TOO_SHORT': 'La password deve avere almeno 6 caratteri',
  'PASSWORD_TOO_LONG': 'La password non può superare 50 caratteri',

  // Operazione generale
  'OPERATION_FAILED': 'Operazione fallita',

  // File
  'AVATAR_TOO_LARGE': 'Immagine avatar troppo grande',

  // Server
  'SERVER_ERROR': 'Errore interno del server',
};