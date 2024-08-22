const Handlebars = require('handlebars');

function registerHelpers() {
  Handlebars.registerHelper('cardLinks', function (string) {
    let label = 'Read more';

    switch (string) {
      case 'VIDEO':
        label = 'Watch video';
        break;
      case 'PDF':
        label = 'Download PDF';
        break;
      case 'LINK':
        label = 'Visit website';
        break;
    }
    return label;
  });

  Handlebars.registerHelper('filter', function (array, key, value) {
    return array.filter(function (item) {
      return item[key] === value;
    });
  });
}

module.exports = {
  registerHelpers,
};
