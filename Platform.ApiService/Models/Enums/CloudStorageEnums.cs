namespace Platform.ApiService.Models;

public enum FileItemType
{
    File = 0,
    Folder = 1
}

public enum FileStatus
{
    Active = 0,
    InRecycleBin = 1,
    Deleted = 2
}

public enum ShareType
{
    Link = 0,
    Internal = 1,
    Public = 2
}

public enum SharePermission
{
    View = 0,
    Download = 1,
    Edit = 2,
    Full = 3
}