import { createStore } from '@/lib/engine';

const globalRef = globalThis;
if (!globalRef.__MOGGAMBL_STORE__) {
  globalRef.__MOGGAMBL_STORE__ = createStore();
}

export const store = globalRef.__MOGGAMBL_STORE__;
