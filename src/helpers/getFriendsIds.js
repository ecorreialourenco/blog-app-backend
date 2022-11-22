const { Friend } = require("../../models");
const { Op } = require("sequelize");

const getFriendsIds = async (userId) => {
  const ids = [];
  const friends = await Friend.findAll({
    where: {
      [Op.or]: [{ requestUserId: userId }, { targetUserId: userId }],
      status: "ACEPT",
    },
  });
  friends.forEach((item) => {
    !ids.includes(item.requestUserId) && ids.push(item.requestUserId);
    !ids.includes(item.targetUserId) && ids.push(item.targetUserId);
  });
  return ids;
};

module.exports = getFriendsIds;
