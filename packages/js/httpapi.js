const request = require('request');
const Comparer = require('./comparer.js');
const Constants = require('../../constants.js');

/**
 * Wraps HTTP request/response functionality
 * Stores response in a Response object, which can be quickly verified with a Comparer expected object
 */
class HttpApi {
    /**
     * @param {RunInstance} [runInstance] - The current RunInstance
     */
    constructor(runInstance) {
        this.runInstance = runInstance;
    }

    /**
     * Makes an HTTP request using the given request library function and args
     * For internal use only
     * See request() in https://github.com/request/request for details on functions that can be used
     * @return {Promise} Promise that resolves with a Response object, when it is received. Response will also be stored in {response} global variable.
     */
    makeReq(func, args) {
        let uri = typeof args[0] == 'string' ? args[0] : args[1].uri;
        let method = (args[0].hasOwnProperty('method') ? args[0].method : null) || (args[1].hasOwnProperty('method') ? args[1].method : null);
        this.runInstance.log(`Request: ${method.toUpperCase()} ${uri}`);

        return new Promise((resolve, reject) => {
            func(...args, (error, response, body) => {
                let responseObj = new this.Response(this.runInstance, error, response, body);
                this.runInstance.g('response', responseObj);
                resolve(responseObj);
            });
        });
    }

    /**
     * Makes an HTTP request
     * See request() in https://github.com/request/request for details
     * @return {Promise} Promise that resolves when response comes back. Response will be stored in {response} variable.
     */
    request(args) {
        return this.makeReq(request, ...args);
    }

    /**
     * Sets default options for HTTP requests
     * See defaults() in https://github.com/request/request for details
     */
    defaults(options) {
        return request.defaults(options);
    }

    /**
     * Makes an HTTP GET request
     * See this.makeReq() for details on args and return value
     */
    get(args) {
        return this.makeReq(request.get, ...args);
    }

    /**
     * Makes an HTTP POST request
     * See this.makeReq() for details on args and return value
     */
    post(args) {
        return this.makeReq(request.post, ...args);
    }

    /**
     * Makes an HTTP PUT request
     * See this.makeReq() for details on args and return value
     */
    put(args) {
        return this.makeReq(request.put, ...args);
    }

    /**
     * Makes an HTTP PATCH request
     * See this.makeReq() for details on args and return value
     */
    patch(args) {
        return this.makeReq(request.patch, ...args);
    }

    /**
     * Makes an HTTP DELETE request
     * See this.makeReq() for details on args and return value
     */
    delete(args) {
        return this.makeReq(request.delete, ...args);
    }

    /**
     * Makes an HTTP DELETE request
     * See this.makeReq() for details on args and return value
     */
    del(args) {
        return this.makeReq(request.del, ...args);
    }

    /**
     * Makes an HTTP HEAD request
     * See this.makeReq() for details on args and return value
     */
    head(args) {
        return this.makeReq(request.head, ...args);
    }

    /**
     * Makes an HTTP OPTIONS request
     * See this.makeReq() for details on args and return value
     */
    options(args) {
        return this.makeReq(request.options, ...args);
    }

    /**
     * Creates a new cookie
     * See request.cookie() in https://github.com/request/request for details
     */
    cookie(str) {
        return request.cookie(str);
    }

    /**
     * Creates a new cookie jar
     * See request.jar() in https://github.com/request/request for details
     */
    jar() {
        return request.jar();
    }
}
module.exports = HttpApi;

/**
 * Response that comes from an API call
 */
HttpApi.Response = class Response {
    constructor(runInstance, error, response, body) {
        this.runInstance = runInstance;
        this.response = {
            statusCode: response && response.statusCode,
            headers: response && response.headers,
            error: error,
            body: body,
            rawBody: body,
            response: response
        };

        // If body is json, parse it
        try {
            this.response.body = JSON.parse(this.response.body);
        }
        catch(e) {}
    }

    /**
     * @throws {Error} If expectedObj doesn't match json response (see comparer.js, Comparer.expect())
     */
    verify(expectedObj) {
        let headersLog = ``;
        if(this.response.headers) {
            for(let headerName in this.response.headers) {
                if(this.response.headers.hasOwnProperty(headerName)) {
                    headersLog += `${headerName}: ${this.response.headers[headerName]}\n`;
                }
            }
        }

        let responseLog = `Response:

${this.response.statusCode}
${headersLog}
${this.response.rawBody || ``}`;
        this.runInstance.log(responseLog);

        Comparer.expect(this.response, Constants.CONSOLE_END_COLOR + Constants.CONSOLE_START_RED, Constants.CONSOLE_END_COLOR + Constants.CONSOLE_START_GRAY).to.match(expectedObj);
    }
}
