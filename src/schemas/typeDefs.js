const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type User {
    id: ID!
    email: String
    password: String
    secret: String
    secretPassword: String
  }

  type Post {
    id: ID!
    title: String
    text: String
    user: User
  }

  type RecoverResponse {
    token: String
    secret: String
  }

  type DeletePostResponse {
    id: ID
    userId: ID
  }

  type Query {
    login(email: String, password: String): User
    getPost(id: ID): Post
    listPosts(userId: ID): [Post]
  }

  type Mutation {
    signup(
      email: String
      password: String
      secret: String
      secretPassword: String
    ): User
    recoverPassword(email: String): RecoverResponse
    changePassword(
      id: ID
      secretPassword: String
      oldPassword: String
      newPassword: String!
      recoverToken: String
    ): Boolean
    createPost(title: String, text: String, userId: ID): Post
    updatePost(id: ID!, title: String, text: String): Post
    deletePost(id: ID!): DeletePostResponse
  }

  type Subscription {
    userCreated: User
    postCreated(userId: ID!): Post
    postUpdated(userId: ID!): Post
    postDeleted(userId: ID!): DeletePostResponse
  }
`;

module.exports = typeDefs;
