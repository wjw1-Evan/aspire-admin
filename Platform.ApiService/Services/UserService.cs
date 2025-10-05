using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class UserService
{
    private readonly IMongoCollection<AppUser> _users;

    public UserService(IMongoDatabase database)
    {
        _users = database.GetCollection<AppUser>("users");
    }

    public async Task<List<AppUser>> GetAllUsersAsync()
    {
        return await _users.Find(user => true).ToListAsync();
    }

    public async Task<AppUser?> GetUserByIdAsync(string id)
    {
        return await _users.Find(user => user.Id == id).FirstOrDefaultAsync();
    }

    public async Task<AppUser> CreateUserAsync(CreateUserRequest request)
    {
        var user = new AppUser
        {
            Username = request.Name,
            Email = request.Email,
            Role = "user", // 默认为普通用户
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _users.InsertOneAsync(user);
        return user;
    }

    public async Task<AppUser?> UpdateUserAsync(string id, UpdateUserRequest request)
    {
        var filter = Builders<AppUser>.Filter.Eq(user => user.Id, id);
        var update = Builders<AppUser>.Update
            .Set(user => user.UpdatedAt, DateTime.UtcNow);

        if (!string.IsNullOrEmpty(request.Name))
            update = update.Set(user => user.Username, request.Name);
        
        if (!string.IsNullOrEmpty(request.Email))
            update = update.Set(user => user.Email, request.Email);

        var result = await _users.UpdateOneAsync(filter, update);
        
        if (result.ModifiedCount > 0)
        {
            return await GetUserByIdAsync(id);
        }
        
        return null;
    }

    public async Task<bool> DeleteUserAsync(string id)
    {
        var result = await _users.DeleteOneAsync(user => user.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<List<AppUser>> SearchUsersByNameAsync(string name)
    {
        var filter = Builders<AppUser>.Filter.Regex(user => user.Username, new MongoDB.Bson.BsonRegularExpression(name, "i"));
        return await _users.Find(filter).ToListAsync();
    }

    public async Task<bool> DeactivateUserAsync(string id)
    {
        var filter = Builders<AppUser>.Filter.Eq(user => user.Id, id);
        var update = Builders<AppUser>.Update
            .Set(user => user.IsActive, false)
            .Set(user => user.UpdatedAt, DateTime.UtcNow);

        var result = await _users.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> ActivateUserAsync(string id)
    {
        var filter = Builders<AppUser>.Filter.Eq(user => user.Id, id);
        var update = Builders<AppUser>.Update
            .Set(user => user.IsActive, true)
            .Set(user => user.UpdatedAt, DateTime.UtcNow);

        var result = await _users.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }
}
