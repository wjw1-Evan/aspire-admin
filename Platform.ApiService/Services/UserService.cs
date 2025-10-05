using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class UserService
{
    private readonly IMongoCollection<User> _users;

    public UserService(IMongoDatabase database)
    {
        
        _users = database.GetCollection<User>("users");
    }

    public async Task<List<User>> GetAllUsersAsync()
    {
        return await _users.Find(user => true).ToListAsync();
    }

    public async Task<User?> GetUserByIdAsync(string id)
    {
        return await _users.Find(user => user.Id == id).FirstOrDefaultAsync();
    }

    public async Task<User> CreateUserAsync(CreateUserRequest request)
    {
        var user = new User
        {
            Name = request.Name,
            Email = request.Email,
            Age = request.Age,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _users.InsertOneAsync(user);
        return user;
    }

    public async Task<User?> UpdateUserAsync(string id, UpdateUserRequest request)
    {
        var filter = Builders<User>.Filter.Eq(user => user.Id, id);
        var update = Builders<User>.Update
            .Set(user => user.UpdatedAt, DateTime.UtcNow);

        if (!string.IsNullOrEmpty(request.Name))
            update = update.Set(user => user.Name, request.Name);
        
        if (!string.IsNullOrEmpty(request.Email))
            update = update.Set(user => user.Email, request.Email);
        
        if (request.Age.HasValue)
            update = update.Set(user => user.Age, request.Age.Value);

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

    public async Task<List<User>> SearchUsersByNameAsync(string name)
    {
        var filter = Builders<User>.Filter.Regex(user => user.Name, new MongoDB.Bson.BsonRegularExpression(name, "i"));
        return await _users.Find(filter).ToListAsync();
    }
}
