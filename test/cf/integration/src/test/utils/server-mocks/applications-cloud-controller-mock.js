'use strict';

const express = require('abacus-express');
const debug = require('abacus-debug')('cloud-controller-mock');
const randomPort = 0;

const createMockServiceData = require('./mock-service-data');

// OAuth Authorization header format: "Bearer <token-value>"
const extractOAuthToken = (authHeader) => {
  if (authHeader) return authHeader.split(' ')[1];

  return undefined;
};

module.exports = () => {
  let app;
  let server;

  const applicationUsageEventsData = createMockServiceData();

  const start = () => {
    app = express();

    app.get('/v2/app_usage_events', (req, res) => {
      debug('Retrieved app usage events request. Query: %j', req.query);
      applicationUsageEventsData.requests().push({
        token: extractOAuthToken(req.header('Authorization')),
        afterGuid: req.query.after_guid
      });
      const currentRequestReturn = applicationUsageEventsData.nextResponse();
      const result = currentRequestReturn || [];
      debug('Returning app usage events: %j', result);
      res.send({
        resources: result
      });
    });

    server = app.listen(randomPort);
    return server.address();
  };

  const stop = (cb) => {
    server.close(cb);
  };

  return {
    start,
    address: () => server.address(),
    usageEvents: applicationUsageEventsData,
    stop
  };
};
