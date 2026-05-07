// 副本集初始化脚本
// 该脚本会在 MongoDB 启动后执行，用于初始化副本集
config = {
  _id: "rs0",
  version: 1,
  members: [
    { _id: 0, host: "localhost:27017" }
  ]
};
rs.initiate(config);
