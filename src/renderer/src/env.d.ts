/// <reference types="vite/client" />

import type { TurboAPI } from '../../preload/index'

declare global {
  interface Window {
    api: TurboAPI
  }
}
