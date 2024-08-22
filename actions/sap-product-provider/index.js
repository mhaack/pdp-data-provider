const { Core } = require('@adobe/aio-sdk');
const {
  errorResponse,
  stringParameters,
  checkMissingRequestInputs,
  checkOverlayPaths,
} = require('../utils');
const Handlebars = require('handlebars');
const fs = require('fs');
const { registerHelpers } = require('./helpers');

let template = '';

async function fetchContent(params, logger) {
  const result = {};
  const apiEndpoint = params.API_ENDPOINT || '';
  const productId = params.__ow_headers['x-content-source-location'] || '';

  const url = new URL(apiEndpoint);
  url.searchParams.append('$filter', `{"products.technicalName": "${productId}"}`);

  logger.info(url.toString());
  const backEndAuth = params.__ow_headers.authorization;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: backEndAuth,
  };

  const res = await fetch(url, { headers });
  result.statusCode = res.status;
  if (!res.ok) {
    result.error = await res.text();
  } else {
    result.content = await res.json();
  }
  return result;
}

// main function that will be executed by Adobe I/O Runtime
async function main(params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });

  try {
    logger.debug(stringParameters(params));

    // check for overlay paths
    if (!checkOverlayPaths(params)) {
      return errorResponse(404, `${params.__ow_path} is not an overlay path`, logger);
    }

    // check for missing request input parameters and headers
    const requiredHeaders = ['x-content-source-location', 'authorization'];
    const errorMessage = checkMissingRequestInputs(params, [], requiredHeaders);
    if (errorMessage) {
      // return and log client errors
      return errorResponse(400, errorMessage, logger);
    }

    // fetch the product content from the backend
    const productId = params.__ow_headers['x-content-source-location'] || '';
    if (productId === '') {
      return errorResponse(404, 'Missing product identifier', logger);
    }

    const { content, error, statusCode } = await fetchContent(params, logger);
    if (error) {
      return errorResponse(statusCode, error, logger);
    }
    
    // compile main template & partials
    const templateNames = params.TEMPLATES || [];
    templateNames.forEach((templateName) => {
      const templateContent = fs.readFileSync(__dirname + `/templates/${templateName}.html`, 'utf-8');
      if (templateContent) {
        if (templateName === 'page') {
          template = Handlebars.compile(templateContent);
        } {
          Handlebars.registerPartial(templateName, templateContent);
        }
      }
    });
    
    // register custom Handlebars helpers
    registerHelpers();
    
    // render the main template with the content
    const html = template(content.products[0]);
    const response = {
      statusCode: 200,
      body: html,
    };

    logger.info(`${response.statusCode}: successful request`);
    return response;
  } catch (error) {
    logger.error(error);
    return errorResponse(500, 'server error', logger);
  }
}

exports.main = main;
