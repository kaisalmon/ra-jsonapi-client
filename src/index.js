import { stringify } from 'qs';
import merge from 'deepmerge';
import _ from 'lodash';
import axios from 'axios';
import {
  GET_LIST,
  GET_ONE,
  CREATE,
  UPDATE,
  DELETE,
  GET_MANY,
  GET_MANY_REFERENCE,
} from './actions';

import defaultSettings from './default-settings';
import { NotImplementedError } from './errors';
import init from './initializer';

// Set HTTP interceptors.
init();

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
export default (apiUrl, userSettings = {}) => (type, resource, params) => {
  let url = '';
  const settings = merge(defaultSettings, userSettings);

  const options = {
    headers: settings.headers,
  };
  switch (type) {
    case GET_LIST: {
      const { page, perPage } = params.pagination;

      // Create query with pagination params.
      const query = {
        'page[offset]': (page - 1) * perPage,
        'page[limit]': perPage,
      };

      Object.keys(params.filter).forEach((f) => {
        /** ************************************************
        * Sometimes queries need to be searched with the ":"
        * which indicates that the search should be a "contains"
        * search.
        * However if the search term does not match the JOI for the
        * field the API will blow up.
        ************************************************* */
        if (f === 'approvalStatus' || params.filter[f] === true || params.filter[f] === false) {
          query[`filter[${f}]`] = `${params.filter[f]}`;
        } else if (params.filter[f].startsWith('!:')) {
          const fWithoutWildcard = params.filter[f].slice(2);
          query[`filter[${f}]`] = fWithoutWildcard;
        } else {
          query[`filter[${f}]`] = `:${params.filter[f]}`;
        }
      });
      if (params.sort) {
        const { order, field } = params.sort;
        const sign = order === 'ASC' ? '' : '-';
        query.sort = `${sign}${field}`;
      }
      url = `${apiUrl}/${resource}?${stringify(query)}`;
      break;
    }

    case GET_ONE:

      url = `${apiUrl}/${resource}/${params.id}`;
      break;

    case CREATE:
      url = `${apiUrl}/${resource}`;
      options.method = 'POST';
      options.data = JSON.stringify({
        data: { type: resource, attributes: params.data },
      });
      break;

    case UPDATE: {
      url = `${apiUrl}/${resource}/${params.id}`;

      const data = {
        data: {
          id: params.id,
          type: resource,
          attributes: _.omit(params.data, ['relationships']),
        },
      };

      options.method = 'PATCH';
      options.data = JSON.stringify(data);
      break;
    }

    case DELETE:
      url = `${apiUrl}/${resource}/${params.id}`;
      options.method = 'DELETE';
      break;

    case GET_MANY: {
      const { ids } = params;
      const query = ids.map(id => `filter[id]=${id}`).join('&');
      url = `${apiUrl}/${resource}?${query}`;
      console.log(params, query, url);
      break;
    }

    case GET_MANY_REFERENCE: {
      const query = `filter[${params.target}]=${params.id}`;
      url = `${apiUrl}/${resource}?${query}`;
      break;
    }

    case GET_MANY_REFERENCE: {
      const { page, perPage } = params.pagination;

      // Create query with pagination params.
      const query = {
        'page[number]': page,
        'page[size]': perPage,
      };

      // Add all filter params to query.
      Object.keys(params.filter || {}).forEach((key) => {
        query[`filter[${key}]`] = params.filter[key];
      });

      // Add the reference id to the filter params.
      query[`filter[${params.target}]`] = params.id;

      url = `${apiUrl}/${resource}?${stringify(query)}`;
      break;
    }

    default:
      throw new NotImplementedError(`Unsupported Data Provider request type ${type}`);
  }

  return axios({ url, ...options })
    .then((response) => {
      switch (type) {
        case GET_LIST: {
          console.log(response);
          return {
            data: response.data.data.map(value => Object.assign(
              { id: value.id },
              value.attributes,
              { relationships: value.relationships },
            )),
            total: settings
              && response.data.meta.page ? response.data.meta.page[settings.total] : 0,
          };
        }

        case GET_MANY: {
          return {
            data: response.data.data.map(value => Object.assign(
              { id: value.id },
              value.attributes,
              { relationships: value.relationships },
            )),
            total: response.data.meta.page[settings.total],
          };
        }


        case GET_MANY_REFERENCE: {
          const rawdata = response.data.data;
          const data = rawdata.map(e => ({ ...e.attributes, ...e.relationships, id: e.id }));
          return {
            data,
            total: data.length,
          };
        }

        case GET_ONE: {
          const { id, attributes, relationships } = response.data.data;
          return {
            data: {
              id, ...attributes, relationships,
            },
          };
        }

        case CREATE: {
          const { id, attributes } = response.data.data;

          return {
            data: {
              id, ...attributes,
            },
          };
        }

        case UPDATE: {
          const { id, attributes } = response.data.data;

          return {
            data: {
              id, ...attributes,
            },
          };
        }

        case DELETE: {
          return {
            data: { id: params.id },
          };
        }

        default:
          throw new NotImplementedError(`Unsupported Data Provider request type ${type}`);
      }
    });
};
