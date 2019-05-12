const http = require('http');

const createHttpError = require('http-errors');

const properties = new WeakMap();

function errorGenerator(code) {
  let stringCode = String(code);
  let numericCode = Number.parseInt(stringCode);

  if (Number.isNaN(numericCode) || !http.STATUS_CODES.hasOwnProperty(stringCode)) {
    throw new Error(`Invalid status code: ${stringCode}`);
  }

  let err = new Error(http.STATUS_CODES[stringCode]);

  err.status = err.statusCode = numericCode;

  return err;
}

class View {
  constructor() {
    let methods = http.METHODS.filter(d => {
      let method = d.toLowerCase();

      return typeof this[method] === 'function';
    }).join(',');

    properties.set(this, {
      methods: methods,
    });
  }

  options(req, res, next) {
    let methods = properties.get(this).methods;

    res.setHeader('Allowed', methods);
    res.sendStatus(204);
  }

  static handler(options = {}) {
    let Constructor = this;
    let instance = new Constructor();
    let errors;

    if (typeof options.errors === 'function') {
      errors = options.errors;
    } else if (typeof this.errors === 'function') {
      errors = this.errors;
    } else {
      errors = createHttpError;
    }

    async function middleware(req, res, next) {
      let method = typeof req.method === 'string' ? req.method.toLowerCase() : '';
      let handler = instance[method];

      if (typeof handler !== 'function') {
        let err = errors(405);

        next(err);
      } else {
        try {
          await handler.call(instance, ...arguments);
        } catch (err) {
          next(err);
        }
      }
    }

    return middleware;
  }
}

module.exports = View;
