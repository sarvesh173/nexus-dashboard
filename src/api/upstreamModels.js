import { request } from './client.js';

/** Read NVIDIA's public model catalogue for the optional import dialog. */
export function fetchNvidiaModels(options = {}) {
  return request('https://integrate.api.nvidia.com/v1/models', {
    ...options,
    timeoutMs: options.timeoutMs ?? 3500,
  });
}

export default fetchNvidiaModels;
