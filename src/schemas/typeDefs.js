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
    block: Boolean
  }

  type Post {
    id: ID!
    title: String
    text: String
    user: User
    createdAt: String
    updatedAt: String
  }

  type UserSubscriptionsResponse {
    user: User
    totalPages: Int
  }

  type PostSubscriptionsResponse {
    post: Post
    totalPages: Int
  }

  type RecoverResponse {
    token: String
    secret: String
  }

  type DeletePostResponse {
    id: ID
    userId: ID
    totalPages: Int
  }

  type UsersFriendsSubscription {
    friend: FriendStatus
    action: String
  }

  type UserFriendsSubscription {
    post: Post
    totalPages: Int
    action: String
    userId: ID
  }

  type PaginatedUsers {
    users: [User]
    totalPages: Int
    totalRecords: Int
  }

  type PaginatedPosts {
    posts: [Post]
    totalPages: Int
  }

  input ListUsersFilters {
    excludeId: ID!
    page: Int!
    statusIn: [Status]
    statusNotIn: [Status]
    search: String
  }

  type Query {
    login(email: String, password: String): Login
    listUsers(excludeId: ID!, page: Int!, search: String): PaginatedUsers
    listFriends(filters: ListUsersFilters): PaginatedUsers
    listRequests(
      userId: ID!
      page: Int!
      search: String
      own: Boolean
    ): PaginatedUsers
    listBlockedUsers(excludeId: ID!, page: Int!, search: String): PaginatedUsers
    getPost(id: ID): Post
    listPosts(userId: ID, page: Int): PaginatedPosts
    listFriendsPosts(userId: ID, page: Int): PaginatedPosts
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
    userCreated: UserSubscriptionsResponse
    userUpdated: UserSubscriptionsResponse
    friendsChange(userId: ID!): UsersFriendsSubscription
    postCreated(userId: ID!): PostSubscriptionsResponse
    postUpdated(userId: ID!): PostSubscriptionsResponse
    postDeleted(userId: ID!): DeletePostResponse
    friendsPostsChanges(userId: ID!): UserFriendsSubscription
  }
`;

module.exports = typeDefs;
