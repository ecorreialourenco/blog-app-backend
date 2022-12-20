const { User, Post, Friend, sequelize } = require("../../models");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const { PubSub, withFilter } = require("graphql-subscriptions");
const dotenv = require("dotenv");
const getFriendsIds = require("../helpers/getFriendsIds");
const { ROW_LIMIT } = require("../variables/constants");
const getUsersCount = require("../helpers/getUsersCount");
const getPostsCountById = require("../helpers/getPostsCountById");
const { GraphQLError } = require("graphql");
const { forbidenError } = require("../helpers/forbiden");

dotenv.config({
  path: !!process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});
// loading .env file

const pubsub = new PubSub();
const JWT_SECRET = process.env.JWT_SECRET;

const resolvers = {
  Query: {
    async login(_, { email, password }) {
      try {
        const user = await User.findOne({ where: { email } });
        const valid = !!user && (await bcrypt.compare(password, user.password));
        if (valid) {
          return jsonwebtoken.sign(
            {
              user: {
                id: user.id,
                username: user.username,
                email: user.email,
                image: user.image,
              },
            },
            JWT_SECRET,
            {
              expiresIn: "1d",
            }
          );
        }

        return null;
      } catch (err) {
        return err;
      }
    },
    async getUser(_, { id }, context) {
      try {
        if (context && context.id) {
          const user = await User.findOne({
            where: { id },
          });

          return user;
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
    async listUsers(_, { page, search }, context) {
      try {
        if (context && context.id) {
          // Finds the users list who block this user
          const blockedBy = await Friend.findAll({
            where: {
              requestUserId: context.id,
              block: true,
            },
          });
          // Get the id's of the users who have blocked the user
          const excludeIds = blockedBy.map((friend) => friend.targetUserId);
          excludeIds.push(context.id);

          if (!!search) {
            userFilters = {
              [Op.or]: [
                {
                  id: { [Op.notIn]: excludeIds },
                  username: {
                    [Op.startsWith]: search,
                  },
                },
                {
                  id: { [Op.notIn]: excludeIds },
                  email: {
                    [Op.startsWith]: search,
                  },
                },
              ],
            };
          } else {
            userFilters = {
              id: { [Op.notIn]: excludeIds },
            };
          }

          const users = await User.findAll({
            where: userFilters,
            order: sequelize.literal("username"),
            offset: !!page ? page * ROW_LIMIT : 0,
            limit: ROW_LIMIT,
          });
          const total = await User.count({ where: userFilters });
          const totalPages = total > 0 ? Math.ceil(total / ROW_LIMIT) : 0;

          return { users, totalPages, totalRecords: total };
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
    async listFriends(_, { filters }, context) {
      try {
        if (context && context.id) {
          const { page, statusIn, statusNotIn, search } = filters;
          // Check not blocked users friends with or without specific status
          let statusFilters = {};

          if (!!statusIn && statusIn.length) {
            statusFilters = {
              [Op.or]: [
                {
                  requestUserId: context.id,
                  status: { [Op.in]: statusIn },
                },
                {
                  targetUserId: context.id,
                  status: { [Op.in]: statusIn },
                },
              ],
            };
          } else if (!!statusNotIn && statusNotIn.length) {
            statusFilters = {
              [Op.or]: [
                {
                  requestUserId: context.id,
                  status: { [Op.notIn]: statusIn },
                },
                {
                  targetUserId: context.id,
                  status: { [Op.notIn]: statusIn },
                },
              ],
            };
          } else {
            statusFilters = {
              [Op.or]: [
                { requestUserId: context.id },
                { targetUserId: context.id },
              ],
            };
          }

          const filteredFriendsByStatus = await Friend.findAll({
            where: statusFilters,
          });

          const friendsIds = filteredFriendsByStatus.map((friend) =>
            friend.targetUserId !== parseInt(context.id)
              ? friend.targetUserId
              : friend.requestUserId
          );
          let userFilters = {};
          if (!!search) {
            userFilters = {
              [Op.or]: [
                {
                  id: { [Op.in]: friendsIds },
                  username: {
                    [Op.startsWith]: search,
                  },
                },
                {
                  id: { [Op.in]: friendsIds },
                  email: {
                    [Op.startsWith]: search,
                  },
                },
              ],
            };
          } else {
            userFilters = {
              id: { [Op.in]: friendsIds },
            };
          }

          const users = await User.findAll({
            where: userFilters,
            order: sequelize.literal("username"),
            offset: !!page ? page * ROW_LIMIT : 0,
            limit: ROW_LIMIT,
          });
          const total = await User.count({ where: userFilters });
          const totalPages = total > 0 ? Math.ceil(total / ROW_LIMIT) : 0;

          return { users, totalPages, totalRecords: total };
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
    async listRequests(_, { filters }, context) {
      try {
        if (context && context.id) {
          const { userId, page, search, own } = filters;

          const friendsFilters = own
            ? { requestUserId: userId, status: "PENDING", block: false }
            : { targetUserId: userId, status: "PENDING", block: false };

          const requests = await Friend.findAll({ where: friendsFilters });

          const friendsIds = requests.map((friend) =>
            own ? friend.targetUserId : friend.requestUserId
          );

          let userFilters = {};
          if (!!search) {
            userFilters = {
              [Op.or]: [
                {
                  id: { [Op.in]: friendsIds },
                  username: {
                    [Op.startsWith]: search,
                  },
                },
                {
                  id: { [Op.in]: friendsIds },
                  email: {
                    [Op.startsWith]: search,
                  },
                },
              ],
            };
          } else {
            userFilters = {
              id: { [Op.in]: friendsIds },
            };
          }

          const users = await User.findAll({
            where: userFilters,
            order: sequelize.literal("username"),
            offset: !!page ? page * ROW_LIMIT : 0,
            limit: ROW_LIMIT,
          });
          const total = await User.count({ where: userFilters });
          const totalPages = total > 0 ? Math.ceil(total / ROW_LIMIT) : 0;

          return { users, totalPages, totalRecords: total };
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
    async listBlockedUsers(_, { page, search }, context) {
      try {
        if (context && context.id) {
          const usersBlocked = await Friend.findAll({
            where: {
              targetUserId: context.id,
              block: true,
            },
          });

          const excludeIds = usersBlocked.map((friend) => friend.requestUserId);
          excludeIds.push(context.id);

          let userFilters = {};
          if (!!search) {
            userFilters = {
              [Op.or]: [
                {
                  id: { [Op.in]: excludeIds },
                  username: {
                    [Op.startsWith]: search,
                  },
                },
                {
                  id: { [Op.in]: excludeIds },
                  email: {
                    [Op.startsWith]: search,
                  },
                },
              ],
            };
          } else {
            userFilters = {
              id: { [Op.in]: excludeIds },
            };
          }

          const users = await User.findAll({
            where: userFilters,
            order: sequelize.literal("username"),
            offset: !!page ? page * ROW_LIMIT : 0,
            limit: ROW_LIMIT,
          });
          const total = await User.count({ where: userFilters });
          const totalPages = total > 0 ? Math.ceil(total / ROW_LIMIT) : 0;

          return { users, totalPages, totalRecords: total };
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
    async getPost(_, { id }, context) {
      try {
        if (context && context.id) {
          return await Post.findOne({
            where: { id },
          });
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
    async listPosts(_, { userId, page }, context) {
      try {
        if (context && context.id) {
          const posts = await Post.findAll({
            where: { userId },
            order: sequelize.literal("createdAt DESC"),
            offset: !!page ? page * ROW_LIMIT : 0,
            limit: ROW_LIMIT,
          });
          const totalPages = await getPostsCountById(userId);

          return { posts, totalPages };
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
    async listFriendsPosts(_, { userId, page }, context) {
      try {
        if (context && context.id) {
          const ids = await getFriendsIds(userId);

          const posts = await Post.findAll({
            where: { userId: { [Op.in]: ids } },
            order: sequelize.literal("createdAt DESC"),
            offset: !!page ? page * ROW_LIMIT : 0,
            limit: ROW_LIMIT,
          });
          const totalPages = await getPostsCountById(ids);

          return { posts, totalPages };
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
  },

  Mutation: {
    async signup(_, args) {
      try {
        const { email, password, secret, secretPassword } = args;

        const user = await User.create({
          email,
          password: await bcrypt.hash(password, 10),
          secret,
          secretPassword: await bcrypt.hash(secretPassword, 10),
        });
        const totalPages = await getUsersCount();

        pubsub.publish("USER_CREATED", { userCreated: { user, totalPages } });

        return jsonwebtoken.sign(
          {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              image: user.image,
            },
          },
          JWT_SECRET,
          {
            expiresIn: "1d",
          }
        );
      } catch (err) {
        return err;
      }
    },
    async recoverPassword(_, { email }) {
      try {
        const user = await User.findOne({ where: { email } });

        if (!!user) {
          const token = jsonwebtoken.sign({ user }, JWT_SECRET, {
            expiresIn: "1h",
          });

          return {
            token,
            secret: user.secret,
          };
        }

        return {
          token: "",
          secret: "",
        };
      } catch (err) {
        return err;
      }
    },
    async changePassword(_, args) {
      try {
        const { id, secretPassword, oldPassword, newPassword, recoverToken } =
          args;
        const userToken = jsonwebtoken.verify(
          recoverToken,
          JWT_SECRET,
          (err, decoded) => {
            return !err && decoded;
          }
        );
        let valid = false;
        if (!!userToken) {
          // Change password using recovery mode
          valid = await bcrypt.compare(
            secretPassword,
            userToken.user.secretPassword
          );
          valid &&
            (await User.update(
              { password: newPassword },
              { where: { id: userToken.user.id } }
            ));
        } else if (id) {
          valid = await bcrypt.compare(newPassword, oldPassword);
          valid &&
            (await User.update({ password: newPassword }, { where: id }));
        }
        return valid;
      } catch (err) {
        return err;
      }
    },
    async updateProfile(_, args, context) {
      try {
        if (context && context.id) {
          const { id, username, email, image } = args;

          await User.update({ username, email, image }, { where: { id } });

          const user = await User.findOne({ where: { id } });
          const totalPages = await getUsersCount();

          pubsub.publish("USER_UPDATED", { userUpdated: { user, totalPages } });

          return user;
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
    async addFriend(_, args, context) {
      try {
        if (context && context.id) {
          const { requestId, targetId } = args;

          const newFriend = await Friend.create({
            requestUserId: requestId,
            targetUserId: targetId,
            status: "PENDING",
            block: false,
          });

          pubsub.publish("FRIENDS_CHANGED", {
            friendsChange: {
              friend: newFriend,
              action: "add",
            },
          });

          return !!newFriend;
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
    async updateFriend(_, args, context) {
      try {
        if (context && context.id) {
          const { id, status, block } = args;

          const friendToUpdate = await Friend.findOne({ where: { id } });

          if (status === "NONE") {
            await Friend.destroy({ where: { id } });
          } else {
            await Friend.update(
              { status, block: !!block ? block : false },
              { where: { id } }
            );
          }

          const friendId =
            status === "NONE"
              ? friendToUpdate.targetUserId
              : friendToUpdate.requestUserId;
          block;

          const user = await User.findOne({
            where: { id: friendId },
          });

          const updatedFriend = await Friend.findOne({ where: { id } });
          pubsub.publish("FRIENDS_CHANGED", {
            friendsChange: {
              friend: !!updatedFriend ? updatedFriend : friendToUpdate,
              action: status === "NONE" ? "delete" : "change",
            },
          });

          return user;
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
    async createPost(_, args, context) {
      try {
        if (context && context.id) {
          const { title, text, userId } = args;

          const post = await Post.create({ title, text, userId });
          const totalPages = await getPostsCountById(userId);
          pubsub.publish("POST_CREATED", { postCreated: { post, totalPages } });

          const friendsIds = await getFriendsIds(userId);
          const friendTotalPages = await getPostsCountById(friendsIds);
          pubsub.publish("FRIENDS_POST_CHANGED", {
            friendsPostsChanges: {
              post,
              action: "added",
              ids: friendsIds,
              totalPages: friendTotalPages,
            },
          });

          return post;
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
    async updatePost(_, args, context) {
      try {
        if (context && context.id) {
          const { id, title, text } = args;

          await Post.update({ title, text }, { where: { id } });

          const post = await Post.findOne({
            where: { id },
          });
          const totalPages = await getPostsCountById(userId);
          pubsub.publish("POST_UPDATED", { postUpdated: { post, totalPages } });

          const friendsIds = await getFriendsIds(post.userId);
          const friendTotalPages = await getPostsCountById(friendsIds);
          pubsub.publish("FRIENDS_POST_CHANGED", {
            friendsPostsChanges: {
              post,
              action: "updated",
              ids: friendsIds,
              totalPages: friendTotalPages,
            },
          });

          return post;
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
    async deletePost(_, { id }, context) {
      try {
        if (context && context.id) {
          const post = await Post.findOne({ where: { id } });
          if (post) {
            await Post.destroy({ where: { id } });
            const totalPages = await getPostsCountById(userId);
            pubsub.publish("POST_DELETED", {
              postDeleted: { id, userId: post.userId, totalPages },
            });

            const friendsIds = await getFriendsIds(post.userId);
            const friendTotalPages = await getPostsCountById(friendsIds);
            pubsub.publish("FRIENDS_POST_CHANGED", {
              friendsPostsChanges: {
                post,
                action: "deleted",
                ids: friendsIds,
                totalPages: friendTotalPages,
              },
            });

            return { id, userId: post.userId };
          }
          return null;
        }

        forbidenError();
      } catch (err) {
        return err;
      }
    },
  },
  Subscription: {
    userCreated: {
      subscribe: () => pubsub.asyncIterator(["USER_CREATED"]),
    },
    userUpdated: {
      subscribe: () => pubsub.asyncIterator(["USER_UPDATED"]),
    },
    friendsChange: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(["FRIENDS_CHANGED"]),
        (payload, variables) => {
          if (payload.friendsChange) {
            const { friend } = payload.friendsChange;

            return (
              friend.requestUserId.toString() === variables.userId.toString() ||
              friend.targetUserId.toString() === variables.userId.toString()
            );
          }
          return null;
        }
      ),
    },
    postCreated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(["POST_CREATED"]),
        async (payload, variables) =>
          !!payload &&
          payload.postCreated &&
          payload.postCreated.post &&
          payload.postCreated.post.userId.toString() ===
            variables.userId.toString()
      ),
    },
    postUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(["POST_UPDATED"]),
        (payload, variables) =>
          !!payload &&
          payload.postUpdated &&
          payload.postUpdated.userId.toString() === variables.userId.toString()
      ),
    },
    postDeleted: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(["POST_DELETED"]),
        (payload, variables) =>
          !!payload &&
          payload.postDeleted &&
          payload.postDeleted.userId.toString() === variables.userId.toString()
      ),
    },
    friendsPostsChanges: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(["FRIENDS_POST_CHANGED"]),
        async (payload, variables) =>
          !!payload &&
          payload.friendsPostsChanges.ids.includes(parseInt(variables.userId))
      ),
    },
  },

  User: {
    friend: async (parent, { id }) =>
      await Friend.findOne({
        where: {
          [Op.or]: [
            { requestUserId: parent.id, targetUserId: id },
            { requestUserId: id, targetUserId: parent.id },
          ],
        },
      }),
  },
  Post: {
    user: async (parent) =>
      await User.findOne({ where: { id: parent.userId } }),
  },
};

module.exports = resolvers;
