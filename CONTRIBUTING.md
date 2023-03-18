# Debugging
To debug easy-branch-creator the following steps needs to be executed:

1. Ensure [dependencies for node-gyp](https://github.com/nodejs/node-gyp#installation) are configured. 
1. If you don't have one yet, [create a Visual Studio Marketplace Publisher](https://learn.microsoft.com/en-us/azure/devops/extend/publish/integration?view=azure-devops#create-a-publisher).
1. In Azure DevOps, create a Personal Access Token with scopes `Marketplace - Acquire` and `Marketplace - Manage`.
1. In [vss-extension.json](./vss-extension.json ) in the `publisher` property, replace `bluebasher` with your `publisherId` 
1. In [configs/dev.json](./configs/dev.json ) in the `id` property, replace `bluebasher` with your `publisherId` 
1. Run `npm install`
1. Run `npm run publish:dev`
   - Supply the Personal Access Token when the command requests it.
   - If you get this error `error:0308010C:digital envelope routines::unsupported`, then run command `$env:NODE_OPTIONS = "--openssl-legacy-provider"`
1. In Visual Studio Marketplace, share the extension wth your Azure DevOps Organisation.
1. In your Azure DevOps Organisation, install the extension.
1. Run `npm start`
1. Open https://localhost:3000
   - Accept the insecure connection.
1. Go to  your Azure DevOps Organisation and use easy-branch-creator.
1. Any modifications to easy-branch-creator will be hot-reloaded.