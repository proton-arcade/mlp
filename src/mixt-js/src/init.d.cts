import type { Mixt } from '../types/index.js';

export declare function init(authToken?: string): Mixt;
export declare function getAuthToken(guiOrigin?: string): Promise<string>;
