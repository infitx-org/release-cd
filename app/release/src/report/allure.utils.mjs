import * as allure from 'allure-js-commons';
import { logger } from '../logger.mjs'

const log = logger.child({ module: 'allureUtils' });

const wrapStep = (keyword, stepFn) => {
  return (stepText, callback) => {
    const stepName = `${keyword} ${stepText}`;
    return stepFn(stepText, async (...args) => {
      return allure.step(stepName, async () => callback(...args));
    });
  };
};

const wrapSteps = ({ given, when, then, and, but } = {}) => ({
  given: wrapStep('Given', given),
  when: wrapStep('When', when),
  then: wrapStep('Then', then),
  and: and ? wrapStep('And', and) : undefined,
  but: but ? wrapStep('But', but) : undefined,
});

const withAllureSteps = (testCallback) => {
  return (jestCucumberContext) => {
    const wrappedContext = wrapSteps(jestCucumberContext);
    return testCallback(wrappedContext);
  };
};

const withAttachmentJSON = (title, json, withLog = false) => {
  allure.attachment(title, JSON.stringify(json, null, 2), 'application/json')
  if (withLog) log.info(title, { json })
};

export const withAttachmentCSV = (title, rows) => {
  if (!rows?.length) return allure.attachment(title, '', 'text/csv');

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => row[h] ?? '').join(','))
  ].join('\n');

  return allure.attachment(title, csv, 'text/csv');
};

const withTags = (tags = []) => tags.forEach(tag => allure.tag(tag))

export default {
  withAllureSteps,
  withAttachmentJSON,
  withAttachmentCSV,
  withTags
};
