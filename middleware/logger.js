const morgan = require('morgan');

// Custom token for request body
morgan.token('body', (req) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        const sanitizedBody = { ...req.body };
        // Remove sensitive information
        delete sanitizedBody.password;
        delete sanitizedBody.token;
        return JSON.stringify(sanitizedBody);
    }
    return '';
});

// Custom token for response body
morgan.token('response-body', (req, res) => {
    if (res.locals.responseBody) {
        return JSON.stringify(res.locals.responseBody);
    }
    return '';
});

// Development format
const developmentFormat = ':method :url :status :response-time ms - :body - :response-body';

// Production format
const productionFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

// Create loggers using console output
const successLogger = morgan(process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat);

const errorLogger = morgan(process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat, {
    skip: (req, res) => res.statusCode < 400
});

// Capture response body middleware
const captureResponseBody = (req, res, next) => {
    const oldJson = res.json;
    res.json = function (body) {
        res.locals.responseBody = body;
        return oldJson.call(this, body);
    };
    next();
};

module.exports = {
    successLogger,
    errorLogger,
    captureResponseBody
}; 