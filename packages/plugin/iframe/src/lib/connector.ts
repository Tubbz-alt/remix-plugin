import type { Message, Api, ApiMap } from '@remixproject/plugin-utils';
import { RemixApi } from '@remixproject/plugin-api';
import {
  ClientConnector,
  connectClient,
  applyApi,
  Client,
  PluginClient,
  isHandshake,
  PluginOptions,
  checkOrigin
} from '@remixproject/plugin'

import { listenOnThemeChanged } from './theme'


export class IframeConnector implements ClientConnector {
  source: Window
  origin: string

  constructor(private options: PluginOptions<any>) {}

  /** Send a message to the engine */
  send(message: Partial<Message>) {
    if (this.source) {
      this.source.postMessage(message, this.origin)
    } else if (isHandshake(message)) {
      window.parent.postMessage(message, '*')
    }
  }

  /** Get messae from the engine */
  on(cb: (message: Partial<Message>) => void) {
    window.addEventListener('message', async (event: MessageEvent) => {
      if (!event.source) throw new Error('No source')
      // Check that the origin is the right one
      const isGoodOrigin = await checkOrigin(event.origin, this.options)
      if (!isGoodOrigin) return
      if (!event.data) throw new Error('No data')
      if (isHandshake(event.data)) {
        this.source = event.source as Window
        this.origin = event.origin
      }
      cb(event.data)

    }, false)
  }
}

/**
 * Connect an Iframe client to a web engine
 * @param client An optional iframe client to connect to the engine
 * @example Let the function create a client
 * ```typescript
 * const client = createClient()
 * ```
 * @example With a custom client
 * ```typescript
 * class MyPlugin extends PluginClient {
 *  methods = ['hello']
 *  hello() {
 *   console.log('Hello World')
 *  }
 * }
 * const client = createClient(new MyPlugin())
 * ```
 */
export const createClient = <
  P extends Api,
  App extends ApiMap = RemixApi
>(client: PluginClient<P, App> = new PluginClient()): Client<P, App> => {
  const c = client as any
  const options = client.options
  const connector = new IframeConnector(options)
  connectClient(connector, c)
  applyApi(c)
  if (!options.customTheme) {
    listenOnThemeChanged(c)
  }
  return c as Client<P, App>
}
