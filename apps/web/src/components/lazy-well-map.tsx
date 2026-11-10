'use client';

import dynamic from 'next/dynamic';

import { MapLoading } from './lazy-loading';

/**
 * MapLibre weighs about 1 MB and needs the browser, so it is loaded after the page shell
 * instead of being part of the initial bundle and of the server render.
 */
export const LazyWellMap = dynamic(() => import('./well-map').then((module) => module.WellMap), {
  ssr: false,
  loading: MapLoading,
});
