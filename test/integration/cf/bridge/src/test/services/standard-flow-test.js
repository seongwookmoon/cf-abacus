'use strict';

const _ = require('underscore');
const isEqual = _.isEqual;

const happyTestsDefinition = require('../test-definitions/standard-flow-test-def');
const servicesFixture = require('./fixture');

const tests = (fixture) => {
  return context('verify Cloud Controller', () => {
    it('Service Usage Events recieved correct service guids ', () => {
      const cloudControllerMock = fixture.externalSystemsMocks().cloudController;

      const expectedGuids = [fixture.defaultUsageEvent.serviceGuid];
      const requests = cloudControllerMock.usageEvents.requests();
      const unmatching = requests.filter((request) => !isEqual(request.serviceGuids, expectedGuids));
      expect(unmatching).to.deep.equal([]);
    });

    it('Services service received correct parameters', () => {
      const cloudControllerMock = fixture.externalSystemsMocks().cloudController;

      const expectedRequests = [{
        token: fixture.oauth.cfAdminToken,
        serviceLabels: [fixture.defaultUsageEvent.serviceLabel]
      }];
      expect(cloudControllerMock.serviceGuids.requests()).to.deep.equal(expectedRequests);
    });
  });
};

describe('services-bridge standard flow tests', () => {
  before(() => {
    servicesFixture.externalSystemsMocks().cloudController.serviceGuids.return.always({
      [servicesFixture.defaultUsageEvent.serviceLabel]: servicesFixture.defaultUsageEvent.serviceGuid
    });
  });

  happyTestsDefinition
    .fixture(servicesFixture)
    .customTests(tests)
    .build();
});
