const { gql } = require("apollo-server-express");

const typeDefs = gql`
  enum Status {
    PENDING
    ACEPT
    DENIED
    NONE
  }

  type Login {
    id: ID!
    email: String
    username: String
    image: String
    friends: [FriendStatus]
  }

  type User {
    id: ID!
    email: String
    password: String
    secret: String
    secretPassword: String
    username: String
    image: String
    friend(id: ID!): FriendStatus
  }

  type FriendStatus {
    id: ID
    requestUserId: ID
    targetUserId: ID
    status: Status
  }

  type Post {
    id: ID!
    title: String
    text: String
    user: User
    createdAt: String
    updatedAt: String
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
    login(email: String, password: String): Login
    listUsers(excludeId: ID): [User]
    getPost(id: ID): Post
    listPosts(userId: ID): [Post]
  }

  type Mutation {
    signup(
      email: String
      password: String
      secret: String
      secretPassword: String
    ): Login
    updateProfile(id: ID!, username: String, email: String, image: String): User
    recoverPassword(email: String): RecoverResponse
    changePassword(
      id: ID
      secretPassword: String
      oldPassword: String
      newPassword: String!
      recoverToken: String
    ): Boolean
    addFriend(requestId: ID!, targetId: ID): Boolean
    updateFriend(id: ID!, status: Status!): User
    createPost(title: String, text: String, userId: ID): Post
    updatePost(id: ID!, title: String, text: String): Post
    deletePost(id: ID!): DeletePostResponse
  }

  type Subscription {
    userCreated: User
    userUpdated: User
    postCreated(userId: ID!): Post
    postUpdated(userId: ID!): Post
    postDeleted(userId: ID!): DeletePostResponse
  }
`;

module.exports = typeDefs;
