export default {
  'request.error.validation': 'Erreur de validation',
  'request.error.login-failed': 'Échec de connexion, vérifiez votre nom utilisateur et mot de passe',
  'request.error.token-expired': 'Session expirée, veuillez vous reconnecter',
  'request.error.unknown': 'Erreur inconnue',
  'request.error.network': 'Erreur réseau, vérifiez votre connexion',
  'request.error.server': 'Erreur serveur, réessayez plus tard',
  'request.error.forbidden': 'Ressource interdite',
  'request.error.not-found': 'Ressource non trouvée',

  // Authentification
  'UNAUTHENTICATED': 'Accès non autorisé, reconnectez-vous',
  'INVALID_CREDENTIALS': 'Nom utilisateur ou mot de passe invalide',
  'CAPTCHA_REQUIRED': 'Veuillez entrer le captcha',
  'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN': 'Captcha requis après échec de connexion',
  'CAPTCHA_INVALID': 'Captcha invalide',
  'INVALID_TOKEN': 'Jeton d\'authentification invalide ou expiré',
  'TOKEN_EXPIRED': 'Session expirée, reconnectez-vous',
  'USER_INFO_INVALID': 'Informations utilisateur invalides',

  // Autorisation
  'UNAUTHORIZED_ACCESS': 'Accès non autorisé',
  'VIEW_PERMISSION_DENIED': 'Pas le droit de voir les informations des autres utilisateurs',
  'CURRENT_COMPANY_NOT_FOUND': 'Informations entreprise actuelle non trouvées',
  'MENU_ACCESS_DENIED': 'Pas le droit d\'accéder à ce menu',
  'MENU_SERVICE_NOT_CONFIGURED': 'Service d\'accès au menu non configuré',
  'FORBIDDEN': 'Accès interdit',

  // Validation
  'VALIDATION_ERROR': 'Échec de la validation de la requête',
  'INVALID_OLD_PASSWORD': 'Ancien mot de passe incorrect',

  // Ressource
  'RESOURCE_NOT_FOUND': 'Ressource non trouvée',
  'USER_NOT_FOUND': 'Utilisateur non trouvé',
  'COMPANY_NOT_FOUND': 'Entreprise non trouvée',

  // Opération métier
  'INVALID_OPERATION': 'Opération invalide',
  'OPERATION_NOT_SUPPORTED': 'Opération non prise en charge',
  'USER_NAME_EXISTS': 'Nom utilisateur déjà existant',
  'EMAIL_EXISTS': 'Email déjà existant',
  'PHONE_NUMBER_EXISTS': 'Numéro de téléphone déjà existant',
  'USER_NOT_AUTHENTICATED': 'Informations d\'authentification utilisateur non trouvées',

  // Entreprise
  'COMPANY_NOT_MEMBER': 'Vous n\'êtes pas membre de cette entreprise',
  'COMPANY_CREATOR_CANNOT_LEAVE': 'Vous êtes le créateur de cette entreprise et ne pouvez pas partir',
  'COMPANY_SOLE_ADMIN_CANNOT_LEAVE': 'Vous êtes le seul administrateur de cette entreprise',
  'COMPANY_INACTIVE': 'Entreprise inactive, contactez l\'administrateur',
  'COMPANY_EXPIRED': 'Entreprise expirée, contactez l\'administrateur pour renouveler',

  // Rôle/Permission
  'ROLE_NOT_FOUND': 'Rôle non trouvé',
  'ROLE_NAME_EXISTS': 'Nom de rôle déjà existant',
  'SYSTEM_ROLE_CANNOT_DELETE': 'Impossible de supprimer le rôle administrateur système',
  'CANNOT_REMOVE_LAST_ADMIN': 'Impossible de supprimer le dernier rôle administrateur',
  'PERMISSION_NOT_FOUND': 'Permission non trouvée',
  'PERMISSION_CODE_EXISTS': 'Code de permission déjà existant',

  // Menu/Notification
  'MENU_NOT_FOUND': 'Menu non trouvé',
  'MENU_NAME_EXISTS': 'Nom de menu déjà existant',
  'CANNOT_DELETE_MENU_WITH_CHILDREN': 'Impossible de supprimer le menu avec des sous-menus',
  'NOTICE_NOT_FOUND': 'Notification non trouvée',

  // Utilisateur/Entreprise étendu
  'USER_INACTIVE': 'Compte utilisateur désactivé',
  'CANNOT_DELETE_SELF': 'Impossible de supprimer votre propre compte',
  'CANNOT_MODIFY_OWN_ROLE': 'Impossible de modifier votre propre rôle',
  'MAX_USERS_REACHED': 'Nombre maximum d\'utilisateurs atteint',
  'COMPANY_CODE_EXISTS': 'Code entreprise déjà existant',
  'INVALID_COMPANY_CODE': 'Format de code entreprise invalide',
  'COMPANY_REQUIRED': 'Informations entreprise non trouvées',

  // Organisation
  'ORGANIZATION_NOT_FOUND': 'Nœud d\'organisation non trouvé',
  'ORGANIZATION_NAME_EXISTS': 'Nom de nœud d\'organisation déjà existant',
  'ORGANIZATION_CODE_EXISTS': 'Code de nœud d\'organisation déjà existant',
  'PARENT_CANNOT_BE_SELF': 'Le parent ne peut pas être le nœud actuel',
  'PARENT_CANNOT_BE_DESCENDANT': 'Le parent ne peut pas être un nœud enfant',
  'CANNOT_DELETE_WITH_CHILDREN': 'Veuillez supprimer les nœuds enfants d\'abord',

  // Validation de format
  'INVALID_EMAIL_FORMAT': 'Format d\'email invalide',
  'INVALID_PHONE_FORMAT': 'Format de numéro de téléphone invalide',
  'INVALID_USERNAME_FORMAT': 'Format de nom utilisateur invalide',
  'PASSWORD_TOO_SHORT': 'Le mot de passe doit contenir au moins 6 caractères',
  'PASSWORD_TOO_LONG': 'Le mot de passe ne peut pas dépasser 50 caractères',

  // Opération générale
  'OPERATION_FAILED': 'Échec de l\'opération',

  // Fichier
  'AVATAR_TOO_LARGE': 'Image d\'avatar trop volumineuse',

  // Serveur
  'SERVER_ERROR': 'Erreur interne du serveur',
};