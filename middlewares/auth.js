const axios = require("axios");

const withAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization;

      const response = await axios.get(
        `${process.env.API_GATEWAY}/account-service/account/me`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      req.user = response.data;

      next();
    } catch (error) {
      res.status(401);
      return next(new Error("Unauthorized"));
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error("Unauthorized, no token!"));
  }
};

const withRoleAdmin = async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new Error("Unauthorized, admin only!"));
  }

  next();
};

module.exports = { withAuth, withRoleAdmin };
