namespace Platform.ApiService.Models;

public enum ChatMessageType
{
    Text,
    Image,
    File,
    System
}

public enum NoticeIconItemType
{
    Notification,
    Message,
    Event,
    Task,
    Todo
}

public enum PasswordStrengthLevel
{
    Weak = 0,
    Fair = 1,
    Good = 2,
    Strong = 3,
    VeryStrong = 4
}

public enum DocumentStatus
{
    Draft = 0,
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    Archived = 4
}

public enum FormFieldType
{
    Text,
    TextArea,
    Number,
    Date,
    DateTime,
    Select,
    Radio,
    Checkbox,
    Switch,
    Attachment
}

public enum FormTarget
{
    Document,
    Instance
}