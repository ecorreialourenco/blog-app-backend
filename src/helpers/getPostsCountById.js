const { Post } = require("../../models");
const { ROW_LIMIT } = require("../variables/constants");

const getPostsCountById = async (userId) => {
  const totalRecords = await Post.count({ where: { userId } });
  return totalRecords > 0 ? Math.ceil(totalRecords / ROW_LIMIT) : 0;
};

module.exports = getPostsCountById;
