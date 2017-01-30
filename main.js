'use strict';

const http = require('http');

const httpErrors = require('http-errors');


let viewMethods = new WeakMap();


class View {
	constructor() {
		let self = this;

		let methods = http.METHODS.filter(function(d) {
			let method = d.toLowerCase();

			return typeof self[method] === 'function';
		}).join(',');

		viewMethods.set(this, methods);
	}

	options(req, res, next) {
		let methods = viewMethods.get(this);

		res.setHeader('Allowed', methods);
		res.sendStatus(204);
	}

	static handler(options = {}) {
		let Constructor = this;
		let instance = new Constructor();
		let errors = (typeof options.errors === 'function') ? options.errors : httpErrors;

		function middleware(req, res, next) {
			let method = (typeof req.method === 'string') ? req.method.toLowerCase() : '';
			let handler = instance[method];

			if (typeof handler !== 'function') {
				let error = errors(405);

				next(error);
			}
			else {
				handler.call(instance, req, res, next);
			}
		}

		return middleware;
	}
}


module.exports = View;
