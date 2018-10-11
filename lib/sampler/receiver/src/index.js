'use strict';

const httpStatus = require('http-status-codes');
const { bind } = require('underscore');
const { MongoClient } = require('mongodb');
const { ProvisioningClient, createAuthHeaderProvider } = require('abacus-api');
const { createSpanDAO } = require('abacus-sampler-storage');
const { createHealthMonitor } = require('abacus-healthmonitor');
const oauth = require('abacus-oauth');
const urienv = require('abacus-urienv');
const webapp = require('abacus-webapp');
const { Presenter, events } = require('./lib/presenter');
const { Controller } = require('./lib/controller');
const { validateJsonMediaType } = require('./lib/json-media-type-validator');
const { EventSchemaValidator } = require('./lib/event-schema-validator');
const { SlackValidator } = require('./lib/slack-validator');

const twoMonthsInMs = 2 * 30 * 24 * 60 * 60 * 1000;
const oneMinuteInMs = 60 * 1000;

const threshold = parseInt(process.env.HEALTHCHECK_THRESHOLD) || oneMinuteInMs;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const slack = {
  pastInterval: process.env.SAMPLER_SLACK_PAST_INTERVAL || twoMonthsInMs,
  futureInterval: process.env.SAMPLER_SLACK_FUTURE_INTERVAL || twoMonthsInMs
};

const uris = urienv({
  db_uri: 5984,
  auth_server: 9882,
  provisioning: 9880
});

const isSecured = () => process.env.SECURED == 'true';

const listen = (app) => new Promise((resolve, reject) => {
  app.listen(undefined, (err) => {
    if (err)
      reject(err);
    else
      resolve();
  });
});

const startApp = async () => {
  const authHeaderProvider = await createAuthHeaderProvider(isSecured(), {
    uaaUrl: uris.auth_server,
    clientId: clientId,
    clientSecret: clientSecret,
    scopes: 'abacus.usage.write'
  });
  const provisioningClient = new ProvisioningClient(uris.provisioning, authHeaderProvider);

  const mongoClient = await MongoClient.connect(uris.db_uri, {
    j: true,
    w: 'majority',
    wtimeout: 5000
  });
  const spanDAO = await createSpanDAO(mongoClient, 'spans');
  const controller = new Controller({
    spanDAO: spanDAO,
    provisioningClient: provisioningClient
  });
  const presenter = new Presenter(controller,
    new EventSchemaValidator(),
    new SlackValidator(slack));


  const app = webapp();
  if (isSecured())
    app.use(oauth.authorizer(process.env.JWTKEY, process.env.JWTALGO, ['abacus.sampler.usage.write']));

  app.use('/v1/events', validateJsonMediaType);

  app.post('/v1/events/start', bind(presenter.handleStart, presenter));
  app.post('/v1/events/stop', bind(presenter.handleStop, presenter));
  app.post('/v1/mappings', bind(presenter.handleMappings, presenter));

  const eventsHealthMonitor = createHealthMonitor(presenter, threshold, {
    success: [events.start.successful, events.start.conflict,
      events.stop.successful, events.stop.conflict, events.stop.missingSpan, events.stop.outOfOrder],
    failure: [events.start.failure, events.stop.failure]
  });
  const mappingsHealthMonitor = createHealthMonitor(presenter, threshold, {
    success: [events.mappings.successful, events.mappings.conflict],
    failure: [events.mappings.failure]
  });
  app.get('/v1/healthcheck', (req, res) => {
    const healthy = eventsHealthMonitor.healthy() && mappingsHealthMonitor.healthy();
    res.status(healthy ? httpStatus.OK : httpStatus.INTERNAL_SERVER_ERROR).send({
      healthy
    });
  });
  await listen(app);
};

module.exports = {
  runCLI: async () => await startApp()
};