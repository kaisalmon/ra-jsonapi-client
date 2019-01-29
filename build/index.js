'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _qs = require('qs');

var _deepmerge = require('deepmerge');

var _deepmerge2 = _interopRequireDefault(_deepmerge);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _actions = require('./actions');

var _defaultSettings = require('./default-settings');

var _defaultSettings2 = _interopRequireDefault(_defaultSettings);

var _errors = require('./errors');

var _initializer = require('./initializer');

var _initializer2 = _interopRequireDefault(_initializer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Set HTTP interceptors.
(0, _initializer2.default)();

/**
 * Maps react-admin queries to a JSONAPI REST API
 *
 * @param {string} apiUrl the base URL for the JSONAPI
 * @param {string} userSettings Settings to configure this client.
 *
 * @param {string} type Request type, e.g GET_LIST
 * @param {string} resource Resource name, e.g. "posts"
 * @param {Object} payload Request parameters. Depends on the request type
 * @returns {Promise} the Promise for a data response
 */

exports.default = function (apiUrl) {
  var userSettings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return function (type, resource, params) {
    var url = '';
    var settings = (0, _deepmerge2.default)(_defaultSettings2.default, userSettings);

    var options = {
      headers: settings.headers
    };
    console.log('HERE:::', type);
    switch (type) {
      case _actions.GET_LIST:
        {
          var _params$pagination = params.pagination,
              page = _params$pagination.page,
              perPage = _params$pagination.perPage;
          // TODO: Allow sorting, filtering etc.

          var query = {
            'page[offset]': (page - 1) * perPage,
            'page[limit]': perPage
          };

          Object.keys(params.filter).forEach(function (f) {
            /** ************************************************
            * Sometimes queries need to be searched with the ":"
            * which indicates that the search should be a "contains"
            * search.
            * However if the search term does not match the JOI for the
            * field the API will blow up.
            ************************************************* */
            if (f === 'approvalStatus' || params.filter[f] === true || params.filter[f] === false) {
              query['filter[' + f + ']'] = '' + params.filter[f];
            } else {
              query['filter[' + f + ']'] = ':' + params.filter[f];
            }
          });
          console.log(params);
          if (params.sort) {
            console.log('SORT STUFF');
            var _params$sort = params.sort,
                order = _params$sort.order,
                field = _params$sort.field;

            var sign = order === 'DESC' ? '' : '-';
            query.sort = '' + sign + field;
          }
          url = apiUrl + '/' + resource + '?' + (0, _qs.stringify)(query);
          console.log(url);
          break;
        }

      case _actions.GET_ONE:

        url = apiUrl + '/' + resource + '/' + params.id;
        break;

      case _actions.CREATE:
        url = apiUrl + '/' + resource;
        options.method = 'POST';
        options.data = JSON.stringify({
          data: { type: resource, attributes: params.data }
        });
        break;

      case _actions.UPDATE:
        {
          url = apiUrl + '/' + resource + '/' + params.id;

          var data = {
            data: {
              id: params.id,
              type: resource,
              attributes: params.data
            }
          };

          options.method = 'PATCH';
          options.data = JSON.stringify(data);
          break;
        }

      case _actions.DELETE:
        url = apiUrl + '/' + resource + '/' + params.id;
        options.method = 'DELETE';
        break;

      case _actions.GET_MANY:
        {
          var ids = params.ids;

          var _query = ids.map(function (id) {
            return 'filter[id]=' + id;
          }).join('&');
          url = apiUrl + '/' + resource + '?' + _query + '}';
          console.log(params, _query, url);
          break;
        }

      case _actions.GET_MANY_REFERENCE:
        {
          var _query2 = 'filter[' + params.target + ']=' + params.id;
          url = apiUrl + '/' + resource + '?' + _query2;
          break;
        }

      default:
        throw new _errors.NotImplementedError('Unsupported Data Provider request type ' + type);
    }

    return (0, _axios2.default)(_extends({ url: url }, options)).then(function (response) {
      switch (type) {
        case _actions.GET_LIST:
          {
            console.log(response);
            return {
              data: response.data.data.map(function (value) {
                return Object.assign({ id: value.id }, value.attributes, { relationships: value.relationships });
              }),
              total: settings && response.data.meta.page ? response.data.meta.page[settings.total] : 0
            };
          }

        case _actions.GET_MANY:
          {
            return {
              data: response.data.data.map(function (value) {
                return Object.assign({ id: value.id }, value.attributes, { relationships: value.relationships });
              }),
              total: response.data.meta.page[settings.total]
            };
          }

        case _actions.GET_MANY_REFERENCE:
          {
            var rawdata = response.data.data;
            var _data = rawdata.map(function (e) {
              return _extends({}, e.attributes, { id: e.id });
            });
            return {
              data: _data,
              total: _data.length
            };
          }

        case _actions.GET_ONE:
          {
            var _response$data$data = response.data.data,
                id = _response$data$data.id,
                attributes = _response$data$data.attributes,
                relationships = _response$data$data.relationships;

            return {
              data: _extends({
                id: id }, attributes, { relationships: relationships
              })
            };
          }

        case _actions.CREATE:
          {
            var _response$data$data2 = response.data.data,
                _id = _response$data$data2.id,
                _attributes = _response$data$data2.attributes;


            return {
              data: _extends({
                id: _id }, _attributes)
            };
          }

        case _actions.UPDATE:
          {
            var _response$data$data3 = response.data.data,
                _id2 = _response$data$data3.id,
                _attributes2 = _response$data$data3.attributes;


            return {
              data: _extends({
                id: _id2 }, _attributes2)
            };
          }

        case _actions.DELETE:
          {
            return {
              data: { id: params.id }
            };
          }

        default:
          throw new _errors.NotImplementedError('Unsupported Data Provider request type ' + type);
      }
    });
  };
};