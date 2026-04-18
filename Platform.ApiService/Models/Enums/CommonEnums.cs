namespace Platform.ApiService.Models;

public enum ChatMessageType
{
    Text,
    Image,
    File,
    System
}


public enum PasswordStrengthLevel
{
    Weak = 0,
    Medium = 1,
    Strong = 2,
    VeryStrong = 3
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