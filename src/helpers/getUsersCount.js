const { User } = require("../../models");
const { ROW_LIMIT } = require("../variables/constants");

const getUsersCount = async () => {
  const totalRecords = await User.count();
  return totalRecords > 0 ? Math.ceil(totalRecords / ROW_LIMIT) : 0;
};

module.exports = getUsersCount;
