const { GraphQLError } = require("graphql");

const forbidenError = () => {
  throw new GraphQLError("You are not authorized to perform this action.", {
    extensions: {
      code: "FORBIDDEN",
    },
  });
};

module.exports = { forbidenError };
