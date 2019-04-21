const Comparer = require('../../comparer.js');
const Constants = require('../../constants.js');

class API {
    /**
     * @param {RunInstance} [runInstance] - The current RunInstance
     * @param {Object} [response] - The response that came back, if any
     */
    constructor(host, response) {
        this.headers = {};
        this.runInstance = runInstance;
        this.response = response;
    }

    /**
     * Sets http headers
     * @param {Object} headers - Object where each key is an http header name and each value is an http header value
     * @return {Object} This object
     */
    headers(headers) {
        this.headers = headers;
        return this;
    }

    /**
     * Sets the http body and sends the request
     * @param {String or Object} body - Sets the body to this string, or to JSON if this is an Object
     */
    body(body) {
        if(typeof body == 'object') {
            body = JSON.stringify(body);
        }
        else if(typeof body != 'string'){
            throw new Error("Body has to be string or object");
        }

        // Read the step text for the http method and url

        let currStep = this.runInstance.currStep;
        if(!currStep) {
            throw new Error("There was no current step when body() was called");
        }

        let method = null;
        let url = null;

        const API_STEP = `^(GET|HEAD|POST|PUT|DELETE|CONNECT|OPTIONS|TRACE|PATCH)\\s+((` + Constants.STRING_LITERAL.source + `)|(` + Constants.VAR.source + `))\\s*$`;
        let matches = currStep.text.match(API_STEP);
        if(matches) {
            method = matches[1];

            url = this.runInstance.replaceVars(matches[2]);
            if(matches[2].matches(Constants.STRING_LITERAL)) {
                url = utils.stripQuotes(url);
            }
        }
        else {
            throw new Error("Invalid API call step. Format is <http method> '<url here>'.");
        }

        // If there's no domain in url, use the value of {host}. If there is no {host}, throw an error.






        // send the request





    }

    /**
     * @throws {Error} If expectedObj doesn't match json response (see comparer.js, Comparer.expect())
     */
    matches(expectedObj) {
        Comparer.expect(this.response.body).to.match(expectedObj);
    }
}
module.exports = API;
