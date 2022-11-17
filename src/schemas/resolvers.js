const { User, Post, sequelize } = require("../../models");
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const { PubSub, withFilter } = require("graphql-subscriptions");

const pubsub = new PubSub();
const JWT_SECRET = "n5MqTNsiP86vivvKxEZuUtez6CubPH96C5DUm7QC9JA";

const resolvers = {
  Query: {
    async login(_, { email, password }) {
      const user = await User.findOne({ where: { email } });
      const valid = !!user && (await bcrypt.compare(password, user.password));
      return valid ? user : null;
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
    async createPost(_, args) {
      const { title, text, userId } = args;

      const post = await Post.create({
        title,
        text,
        userId,
      });

      pubsub.publish("POST_CREATED", { postCreated: post });

      return post;
    },
    async updatePost(_, args) {
      const { id, title, text } = args;

      await Post.update(
        {
          title,
          text,
        },
        { where: { id } }
      );

      const post = await Post.findOne({
        where: { id },
      });

      pubsub.publish("POST_UPDATED", { postUpdated: post });

      return post;
    },
    async deletePost(_, { id }) {
      const post = await Post.findOne({ where: { id } });
      if (post) {
        
        await Post.destroy({ where: { id } });
        pubsub.publish("POST_DELETED", {
          postDeleted: { id, userId: post.userId },
        });

        console.log(
          "🚀 ~ file: resolvers.js ~ line 132 ~ deletePost ~ id, userId: post.userId ",
          { id, userId: post.userId }
        );
        return { id, userId: post.userId };
      }
      return null;
    },
  },

  Subscription: {
    userCreated: {
      subscribe: () => pubsub.asyncIterator(["USER_CREATED"]),
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
        (payload, variables) => {
          return (
            !!payload &&
            payload.postDeleted &&
            payload.postDeleted.userId.toString() ===
              variables.userId.toString()
          );
        }
      ),
    },
  },
};

module.exports = resolvers;