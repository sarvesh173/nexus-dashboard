import { request } from './client.js';

/** Resolve a model's upstream context/output limits through the backend. */
export function fetchModelContext({ model, provider } = {}, options = {}) {
  const query = new URLSearchParams({
    model: String(model ?? ''),
    provider: String(provider ?? ''),
  });
  return request(`/api/model/context?${query.toString()}`, options);
}

export default fetchModelContext;
