'use strict';

module.exports = {
  asyncHandler: require('./async-handler'),
  localsMiddleware: require('./locals.middleware'),
  authMiddleware: require('./auth.middleware'),
  roleMiddleware: require('./role.middleware'),
  errorMiddleware: require('./error.middleware'),
  rateLimitMiddleware: require('./rate-limit.middleware'),
  csrfMiddleware: require('./csrf.middleware'),
};
