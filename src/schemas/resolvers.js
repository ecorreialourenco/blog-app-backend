const { User, Post, Friend, sequelize } = require("../../models");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const { PubSub, withFilter } = require("graphql-subscriptions");
const dotenv = require("dotenv");
const getFriendsIds = require("../helpers/getFriendsIds");

dotenv.config({
  path: !!process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});
// loading .env file

const pubsub = new PubSub();
const JWT_SECRET = process.env.JWT_SECRET;

const resolvers = {
  Query: {
    async login(_, { email, password }) {
      const user = await User.findOne({ where: { email } });
      const valid = !!user && (await bcrypt.compare(password, user.password));
      return valid ? user : null;
    },
    async listUsers(_, { excludeId }) {
      if (excludeId) {
        return await User.findAll({
          where: { id: { [Op.not]: excludeId } },
        });
      }
      return await User.findAll({
        order: sequelize.literal("username"),
      });
    },
    async getPost(_, { id }) {
      return await Post.findOne({
        where: { id },
      });
    },
    async listPosts(_, { userId }) {
      return await Post.findAll({
        where: { userId },
        order: sequelize.literal("createdAt DESC"),
      });
    },
    async listFriendsPosts(_, { userId }) {
      const ids = await getFriendsIds(userId);

      return await Post.findAll({
        where: { userId: { [Op.in]: ids } },
        order: sequelize.literal("createdAt DESC"),
      });
    },
  },

  Mutation: {
    async signup(_, args) {
      const { email, password, secret, secretPassword } = args;

      const user = await User.create({
        email,
        password: await bcrypt.hash(password, 10),
        secret,
        secretPassword: await bcrypt.hash(secretPassword, 10),
      });

      pubsub.publish("USER_CREATED", { userCreated: user });

      return user;
    },
    async updateProfile(_, args) {
      const { id, username, email, image } = args;

      await User.update({ username, email, image }, { where: { id } });

      const user = await User.findOne({ where: { id } });
      pubsub.publish("USER_UPDATED", { userUpdated: user });

      return user;
    },
    async recoverPassword(_, { email }) {
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
    },
    async changePassword(_, args) {
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
        valid && (await User.update({ password: newPassword }, { where: id }));
      }
      return valid;
    },
    async addFriend(_, args) {
      const { requestId, targetId } = args;

      const newFriend = await Friend.create({
        requestUserId: requestId,
        targetUserId: targetId,
        status: "PENDING",
      });

      pubsub.publish("FRIENDS_CHANGED", {
        friendsChange: {
          friend: newFriend,
          action: "add",
        },
      });

      return !!newFriend;
    },
    async updateFriend(_, args) {
      const { id, status } = args;

      const friendToUpdate = await Friend.findOne({ where: { id } });

      if (status === "NONE") {
        await Friend.destroy({ where: { id } });
      } else {
        await Friend.update({ status }, { where: { id } });
      }

      const friendId =
        status === "NONE"
          ? friendToUpdate.targetUserId
          : friendToUpdate.requestUserId;

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
    },
    async createPost(_, args) {
      const { title, text, userId } = args;

      const post = await Post.create({ title, text, userId });

      pubsub.publish("POST_CREATED", { postCreated: post });

      const friendsIds = await getFriendsIds(userId);
      pubsub.publish("FRIENDS_POST_CHANGED", {
        friendsPostsChanges: {
          post,
          action: "added",
          ids: friendsIds,
        },
      });

      return post;
    },
    async updatePost(_, args) {
      const { id, title, text } = args;

      await Post.update({ title, text }, { where: { id } });

      const post = await Post.findOne({
        where: { id },
      });

      pubsub.publish("POST_UPDATED", { postUpdated: post });

      const friendsIds = await getFriendsIds(post.userId);
      pubsub.publish("FRIENDS_POST_CHANGED", {
        friendsPostsChanges: {
          post,
          action: "updated",
          ids: friendsIds,
        },
      });

      return post;
    },
    async deletePost(_, { id }) {
      const post = await Post.findOne({ where: { id } });
      if (post) {
        await Post.destroy({ where: { id } });
        pubsub.publish("POST_DELETED", {
          postDeleted: { id, userId: post.userId },
        });

        const friendsIds = await getFriendsIds(post.userId);
        pubsub.publish("FRIENDS_POST_CHANGED", {
          friendsPostsChanges: {
            post,
            action: "deleted",
            ids: friendsIds,
          },
        });

        return { id, userId: post.userId };
      }
      return null;
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
        (payload, variables) =>
          !!payload &&
          payload.postCreated &&
          payload.postCreated.userId.toString() === variables.userId.toString()
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

  Login: {
    friends: async (parent) =>
      await Friend.findAll({
        where: {
          [Op.or]: [{ requestUserId: parent.id }, { targetUserId: parent.id }],
        },
      }),
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
