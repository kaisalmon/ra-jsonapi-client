import jsonapiClient from '../src/index';

const assert = require('assert');

const token = 'blah.dee.blah';

const settings = {
  headers: {
    Authorization: `Bearer ${token}`,
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
  },
};

const client = jsonapiClient('http://blogo-backdoor.eu-west-1.elasticbeanstalk.com/v1', settings);


describe('HOLIDAY EXTRAS DIALECT', () => {
  describe('healthcheck', () => {
    it('returns data', (done) => {
      client('GET_LIST', 'influencers', {
        pagination: { page: 1, perPage: 25 },
      })
        .then((response) => {
          const { data } = response;
          assert.ok(data);

          const influencer = data[0];
          assert.ok(influencer.email);
          done();
        })
        .catch((e) => {
          console.log(e);
          assert.fail(e);
          done();
        });
    });
  });
});
