import {Storefront} from "./storefront";
import {IGatewayConfiguration, IPageConfiguration} from "./types";
import {Page} from "./page";

class SentryConnectorStorefront {
  static loadFromSentry(storefront: Storefront, cb: Function) {
    console.log('Starting PuzzleJs Storefront from Sentry configuration');
    let pageList = false;
    let gatewayConfiguration = false;

    const checkValidation = () => {
      if (pageList && gatewayConfiguration) {
        console.log('Ready to start');
        cb();
      }
    };

    storefront.sentrySocket.client.on('gateways', (gateways: IGatewayConfiguration[]) => {
      storefront.config.gateways = gateways;
      gatewayConfiguration = true;
      checkValidation();
    });

    storefront.sentrySocket.client.on('pages', (pages: IPageConfiguration[]) => {
      storefront.config.pages = pages.map(page => ({
        ...page,
        condition: page.condition ? eval(page.condition as unknown as string) : undefined,
        fragments: page.fragments
      }));
      pageList = true;
      checkValidation();
    });

    storefront.sentrySocket.client.on('page.delete', name => {
      storefront.pages.delete(name);
    });

    storefront.sentrySocket.client.on('page.update', async (data: { name: string, page: IPageConfiguration }) => {
      console.log(`Updating page ${data.name} from Sentry`);
      const pageExists = storefront.pages.get(data.name);
      const newPage = new Page(data.page.html, storefront.gateways, data.name, data.page.condition ? eval(data.page.condition as unknown as string) : undefined, data.page.fragments);
      await newPage.reCompile();
      storefront.pages.set(data.name, newPage);
      if (!pageExists) {
        storefront.addPage(data.page);
      } else {
        pageExists.cleanUpEvents();
      }
      console.log(`Updated page ${data.name} from Sentry`);
    });

    storefront.sentrySocket.client.emit('gateways.get');
    storefront.sentrySocket.client.emit('pages.get');
  }
}

export {
  SentryConnectorStorefront
};
