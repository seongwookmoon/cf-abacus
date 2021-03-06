'use strict';

const { buildUsage, withEndTimestamp, withStartTimestamp, withProcessedTimestamp, withDefaultBlueprint, withBlueprint,
  withResourceInstanceId, withAccumulatedUsage, buildAccumulatedUsage, withMetricName, withCurrentDayQuantity, 
  withCurrentMonthQuantity } = require('../usage-builder');
 
const { testResourceInstanceIDs, times } = require('./usageDocumentFieldsConstants');   

const { aggregatesInitialUsageExpected } = require('./expected/expectedForInitialAggregatedUsage'); 
const { aggregatesWithExistingResourceExpected } = require('./expected/expectedFoAggregateWithExistingUsage');
const { shiftsMonthWindowsExpected } = require('./expected/expectedForShiftWindows');
const { aggregatesToZeroExpected } = require('./expected/expectedForAggregatesWithZero');
const { previousMonthExpected } = require('./expected/expectedForPreviousMonth');

const usageForAggregatesInitialUsage = buildUsage(
  withDefaultBlueprint(), 
  withResourceInstanceId(testResourceInstanceIDs[0]),
  withStartTimestamp(times.endOfOctoberTwelveAM),
  withEndTimestamp(times.endOfOctoberTwelveThirtyAM),
  withProcessedTimestamp(times.endOfOctoberTwelveThirtyAM),
  withAccumulatedUsage([
    buildAccumulatedUsage(
      withMetricName('heavy_api_calls'),
      withCurrentDayQuantity({ current: 12 }),
      withCurrentMonthQuantity({ current: 12 })
    ),
    buildAccumulatedUsage(
      withMetricName('memory'),
      withCurrentDayQuantity({ current: {
        consumed: 518400000,
        consuming: 6,
        since: times.endOfOctoberTwelveAM
      } }),
      withCurrentMonthQuantity({ current: {
        consumed: 13996800000,
        consuming: 6,
        since: times.endOfOctoberTwelveAM
      } })
    )
  ]
  ));

const aggregatesUsageWithExistingResource = {
  withSameResourceId: buildUsage(
    withDefaultBlueprint(),
    withResourceInstanceId(testResourceInstanceIDs[0]),
    withStartTimestamp(times.endOfOctoberTwelveThirtyAM),
    withEndTimestamp(times.endOfOctoberOneAM),
    withProcessedTimestamp(times.endOfOctoberOneAM + 1),
    withAccumulatedUsage([
      buildAccumulatedUsage(
        withMetricName('heavy_api_calls'),
        withCurrentDayQuantity({ previous: 12, current: 22 }),
        withCurrentMonthQuantity({ previous: 12, current: 22 })
      ),
      buildAccumulatedUsage(
        withMetricName('memory'),
        withCurrentDayQuantity({
          previous: {
            consumed: 518400000,
            consuming: 6,
            since: times.endOfOctoberTwelveAM
          },
          current: { 
            consumed: 684000000, 
            consuming: 8, 
            since: times.endOfOctoberTwelveThirtyAM }
        }),
        withCurrentMonthQuantity({
          previous: {
            consumed: 13996800000,
            consuming: 6,
            since: times.endOfOctoberTwelveAM
          },
          current: {
            consumed: 18655200000,
            consuming: 8,
            since: times.endOfOctoberTwelveThirtyAM
          }
        })
      )  
    ])
  ),
  withDifferentResourceId: buildUsage(
    withDefaultBlueprint(),
    withResourceInstanceId(testResourceInstanceIDs[1]),
    withStartTimestamp(times.endOfOctoberOneAM),
    withEndTimestamp(times.endOfOctoberOneThirtyAM),
    withProcessedTimestamp(times.endOfOctoberOneThirtyAM),
    withAccumulatedUsage([
      buildAccumulatedUsage(
        withMetricName('heavy_api_calls'),
        withCurrentDayQuantity({ current: 8 }),
        withCurrentMonthQuantity({ current: 8 })
      ),
      buildAccumulatedUsage(
        withMetricName('memory'),
        withCurrentDayQuantity({
          current: {
            consumed: 236400000,
            consuming: 3,
            since: times.endOfOctoberOneAM
          }
        }),
        withCurrentMonthQuantity({
          current: {
            consumed: 6975600000,
            consuming: 3,
            since: times.endOfOctoberOneAM
          }
        })
      )  
    ])
  )
};

const usageForShiftsCorrectly = {
  october: {
    twelveThirtyAM: buildUsage(
      withBlueprint(usageForAggregatesInitialUsage),
      withAccumulatedUsage([
        buildAccumulatedUsage(
          withMetricName('heavy_api_calls'),
          withCurrentDayQuantity({ current: 12 }),
          withCurrentMonthQuantity({ current: 12 })
        )])
    ) },
  november: {
    fourAM: buildUsage(
      withBlueprint(usageForAggregatesInitialUsage),
      withProcessedTimestamp(times.endOfOctoberTwelveThirtyAM),
      withStartTimestamp(times.endOfOctoberTwelveThirtyAM),
      withEndTimestamp(times.startOfNovemberFourAM),
      withAccumulatedUsage([
        buildAccumulatedUsage(
          withMetricName('heavy_api_calls'),
          withCurrentDayQuantity({ previous: 12, current: 22 }),
          withCurrentMonthQuantity({ previous: 12, current: 22 })
        )]))
  }
};

const aggregatesWithZeroUsage = {
  october: { 
    twelveThirtyAM: usageForShiftsCorrectly.october.twelveThirtyAM,
    oneAM: buildUsage(
      withBlueprint(usageForShiftsCorrectly.october.twelveThirtyAM),
      withStartTimestamp(times.endOfOctoberTwelveThirtyAM),
      withEndTimestamp(times.endOfOctoberOneAM),
      withProcessedTimestamp(times.endOfOctoberOneAM),
      withAccumulatedUsage([
        buildAccumulatedUsage(
          withMetricName('heavy_api_calls'),
          withCurrentDayQuantity({ previous: 12, current: 0 }),
          withCurrentMonthQuantity({ previous: 12, current: 0 })
        )])
    )
  }
};

const previousMonthUsage = {
  october: {
    twelveThirtyAM: usageForShiftsCorrectly.october.twelveThirtyAM,
    oneAM: buildUsage(
      withBlueprint(usageForShiftsCorrectly.october.twelveThirtyAM),
      withStartTimestamp(times.endOfOctoberTwelveThirtyAM),
      withEndTimestamp(times.endOfOctoberOneAM),
      withProcessedTimestamp(times.endOfOctoberOneAM),
      withAccumulatedUsage([
        buildAccumulatedUsage(
          withMetricName('heavy_api_calls'),
          withCurrentDayQuantity({ previous: 12, current: 22 }),
          withCurrentMonthQuantity({ previous: 12, current: 22 })
        )])
    )
  }, 
  november: buildUsage(
    withBlueprint(usageForShiftsCorrectly.october.twelveThirtyAM),
    withStartTimestamp(times.startOfNovemberFourAM),
    withEndTimestamp(times.startOfNovemberFourAM),
    withProcessedTimestamp(times.startOfNovemberFourAM),
    withAccumulatedUsage([
      buildAccumulatedUsage(
        withMetricName('heavy_api_calls'),
        withCurrentDayQuantity({ previous: 12, current: 22 }),
        withCurrentMonthQuantity({ previous: 12, current: 22 })
      )])
  )
};

const previousMonthFixture = {
  usage: previousMonthUsage,
  expected: previousMonthExpected
};

const aggregatesInitialUsageFixture = {
  usage: usageForAggregatesInitialUsage,
  expected: aggregatesInitialUsageExpected
};

const aggregatesWithExisitingUsageFixture = {
  usage: aggregatesUsageWithExistingResource,
  expected: aggregatesWithExistingResourceExpected
};

const shiftsMonthWindowsFixture = {
  usage: usageForShiftsCorrectly,
  expected: shiftsMonthWindowsExpected
};

const aggregatesWithZeroFixture = {
  usage: aggregatesWithZeroUsage,
  expected: aggregatesToZeroExpected
};

const createUnprocessableEntityUsage = (quantity) => buildUsage(
  withBlueprint(aggregatesUsageWithExistingResource.withSameResourceId),
  withAccumulatedUsage([buildAccumulatedUsage(
    withMetricName('heavy_api_calls'),
    withCurrentDayQuantity({ current: quantity }),
    withCurrentMonthQuantity({ current: quantity })
  )]));

const unprocessableEntityFixture = {
  withNull: createUnprocessableEntityUsage(null),
  withNaN: createUnprocessableEntityUsage(NaN),
  withUndefined: createUnprocessableEntityUsage(undefined)
};

module.exports = { 
  aggregatesInitialUsageFixture, 
  aggregatesWithExisitingUsageFixture, 
  shiftsMonthWindowsFixture, 
  aggregatesWithZeroFixture, 
  unprocessableEntityFixture, 
  previousMonthFixture
};
