const crypto = require('crypto');
const path = require('path');

const express = require('express');
const request = require('request-promise-native').defaults({
  resolveWithFullResponse: true,
  simple: false,
});

const View = require('@locals/main');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SOCKET_DIR = path.resolve(ROOT_DIR, 'tmp', 'test', 'sockets');

describe('whatever', () => {
  beforeEach(async () => {
    const pid = crypto.randomBytes(4).toString('hex');
    const socket = path.resolve(SOCKET_DIR, `${pid}.sock`);
    const app = express();
    const server = await new Promise(resolve => {
      const server = app.listen(socket, () => {
        resolve(server);
      });
    });

    Object.assign(this, {
      app: app,
      server: server,
      socket: socket,
    });
  });

  afterEach(() => {
    this.server.close();
  });

  it("should return a 200 status code with the correct body content when there's a method handler mapped to an inbound request", async () => {
    class TestView extends View {
      get(req, res) {
        res.send('some random content');
      }
    }

    this.app.use('/', TestView.handler());

    const response = await request({
      method: 'GET',
      uri: `http://unix:${this.socket}:/`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('some random content');
  });

  it('should return a 204 status code in response to an OPTIONS verb with available methods listed in the `Allowed` header', async () => {
    class TestView extends View {
      get(req, res) {
        res.sendStatus(204);
      }

      post(req, res) {
        res.sendStatus(204);
      }
    }

    this.app.use('/', TestView.handler());

    const response = await request({
      method: 'OPTIONS',
      uri: `http://unix:${this.socket}:/`,
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['allowed']).toBe('GET,OPTIONS,POST');
  });

  it('should allow for overriding the options method', async () => {
    class TestView extends View {
      options(req, res) {
        res.send('foo');
      }
    }

    this.app.use('/', TestView.handler());

    const response = await request({
      method: 'OPTIONS',
      uri: `http://unix:${this.socket}:/`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('foo');
    expect(response.headers['allowed']).toBeUndefined();
  });

  it("should return a 405 status code when there's no method handler mapped to an inbound request", async () => {
    class TestView extends View {}

    this.app.use('/', TestView.handler());

    const response = await request({
      method: 'GET',
      uri: `http://unix:${this.socket}:/`,
    });

    expect(response.statusCode).toBe(405);
  });

  it('should yield to subsequent middleware', async () => {
    const spy = jest.fn();

    class TestView extends View {
      get(req, res, next) {
        spy();
        next();
      }
    }

    function middleware(req, res) {
      res.send('barbaz');
    }

    this.app.use('/', TestView.handler(), middleware);

    const response = await request({
      method: 'GET',
      uri: `http://unix:${this.socket}:/`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('barbaz');
    expect(spy.mock.calls.length).toBe(1);
  });

  it('should emit errors raised within a synchronous verb method when there are no error middleware functions mounted', async () => {
    class TestView extends View {
      get(req, res, next) {
        throw new Error('oops');
      }
    }

    this.app.use('/', TestView.handler());

    const response = await request({
      method: 'GET',
      uri: `http://unix:${this.socket}:/`,
    });

    expect(response.statusCode).toBe(500);
  });

  it('should yield to error processing middleware when an error is raised within a synchronous verb method', async () => {
    class TestView extends View {
      get(req, res, next) {
        throw new Error('oops');
      }
    }

    function middleware(err, req, res, next) {
      res.sendStatus(503);
    }

    this.app.use('/', TestView.handler(), middleware);

    const response = await request({
      method: 'GET',
      uri: `http://unix:${this.socket}:/`,
    });

    expect(response.statusCode).toBe(503);
  });

  it('should emit errors raised within an asynchronous verb method when there are no error middleware functions mounted', async () => {
    class TestView extends View {
      async get(req, res, next) {
        throw new Error('oops');
      }
    }

    this.app.use('/', TestView.handler());

    const response = await request({
      method: 'GET',
      uri: `http://unix:${this.socket}:/`,
    });

    expect(response.statusCode).toBe(500);
  });

  it('should yield to error processing middleware when an error is raised within an asynchronous verb method', async () => {
    class TestView extends View {
      async get(req, res, next) {
        throw new Error('oops');
      }
    }

    function middleware(err, req, res, next) {
      res.status(503);
      res.send('oh no');
    }

    this.app.use('/', TestView.handler(), middleware);

    const response = await request({
      method: 'GET',
      uri: `http://unix:${this.socket}:/`,
    });

    expect(response.statusCode).toBe(503);
    expect(response.body).toBe('oh no');
  });

  it('should allow for overriding default error generator with a supplied `errors` option', async () => {
    class TestView extends View {}

    this.app.use(
      '/',
      TestView.handler({
        errors: function() {
          let error = new Error('whatever');

          error.code = error.statusCode = 401;

          return error;
        },
      }),
    );

    const response = await request({
      method: 'GET',
      uri: `http://unix:${this.socket}:/`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should allow for overriding default error generator with a class property `errors` set', async () => {
    class TestView extends View {}

    TestView.errors = function() {
      let error = new Error('whatever');

      error.code = error.statusCode = 401;

      return error;
    };

    this.app.use('/', TestView.handler());

    const response = await request({
      method: 'GET',
      uri: `http://unix:${this.socket}:/`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should defer to `errors` specified in the options when both the class property is set and options are provided', async () => {
    class TestView extends View {}

    TestView.errors = function() {
      let error = new Error('whatever');

      error.code = error.statusCode = 401;

      return error;
    };

    this.app.use(
      '/',
      TestView.handler({
        errors: function() {
          let error = new Error('whatever');

          error.code = error.statusCode = 403;

          return error;
        },
      }),
    );

    const response = await request({
      method: 'GET',
      uri: `http://unix:${this.socket}:/`,
    });

    expect(response.statusCode).toBe(403);
  });
});
