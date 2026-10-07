import * as ping from './ping.js';
import * as info from './info.js';
export const endpoints=[ping,info];
export function findEndpoint(path,method){return endpoints.find(e=>e.meta.path===path&&e.meta.method===method);}
