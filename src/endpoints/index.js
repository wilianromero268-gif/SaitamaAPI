import * as ping from './ping.js';
import * as info from './info.js';
import * as ytsearch from './ytsearch.js';

export const endpoints=[
  ping,
  info,
  ytsearch
];

export function findEndpoint(path,method){
  return endpoints.find(
    e=>e.meta.path===path&&e.meta.method===method
  );
}
