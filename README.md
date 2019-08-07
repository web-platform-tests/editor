# [Editor](https://editor.center/#/new)
An online web application to reduce web issues directly to webplatform tests.

### See it live
Visit [editor.center](https://editor.center/#/new) to get started!

### Features
1. Protoyping HTML, CSS, and Javascript code. See sample code rendered on page.
1. Examine CSS properties of rendered elements. Inspect elements similar to the developer tools avaliable in your browser.
1. Add expected values for properties to test against. Useful to test how elements render on various browsers.
1. Save prototype tests with your Github account to load later. Or search and load tests made by others.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to
agree to a Contributor License Agreement (CLA) declaring that you have the right to,
and actually do, grant us the rights to use your contribution. For details, visit
https://cla.microsoft.com.


### Requirements
You will need [node.js with npm](https://nodejs.org/en/download/) and [MongoDB](https://www.mongodb.com/download-center#community) installed.

Run `npm i -g typescript` (in terminal) to install typescript on your machine.

### Project Setup

1. Run `npm i` (in terminal while inside the project) to install the required packages.
1. If using a version of MongoDB different from 3.6, update the file `mongo.cmd` at line
```C:\Program Files\MongoDB\Server\3.6\bin\mongod.exe``` 
to the version of MongoDB installed. (**3.6** to your version)
1. Create a path `uploads/db` from the root of the project. Local MongoDB data will be saved here.
1. Run `mongo.cmd` command first. (double-click cmd file from the file explorer or run `./mongo.cmd` from terminal)
1. Run `complie.cmd` on any changes made.
1. Run `start.cmd` to start running locally at <http://localhost:3000>

### Getting Started
This project was completed in [Typescript](http://www.typescriptlang.org/). For more information on developing in Typescript [here](http://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html).

`editor-vm.tsx` contains the model of the data that the view is in sync with and displays.

`editor.tsx` contains the elements and the logic of the view. View elements are written using the [React and JSX](https://reactjs.org/docs/jsx-in-depth.html) syntax, but under the hood use [mithril](https://mithril.js.org/jsx.html) as base for a [custom framework](wwwroot/src/lib/editor-framework.tsx). Essentially each `Tag` represent a DOM element, and can define (bound) attributes which you can use to pass data into it. Additionally, you can define helper functions within the scope of the element, and use local state where appropriate.

This project uses the [Monaco (Visual Studio Code Online Editor)](https://github.com/Microsoft/monaco-editor) as its editor. You can find its definition in [monaco.d.ts](wwwroot/src/lib/monaco.d.ts)

Run `compile.cmd` on any changes made to compile the Typescript into Javascript to use.


### Submitting Contributions
When you submit a pull request, a CLA-bot will automatically determine whether you need
to provide a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the
instructions provided by the bot. You will only need to do this once across all repositories using our CLA.

### Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Contact

### Issues
Any issues related to the project can be found [here](https://github.com/MicrosoftEdge/editor/issues). Feel free to submit more for any feature requests or bugs.

### Reporting Security Issues

Security issues and bugs should be reported privately, via email, to the Microsoft Security
Response Center (MSRC) at [secure@microsoft.com](mailto:secure@microsoft.com). You should
receive a response within 24 hours. If for some reason you do not, please follow up via
email to ensure we received your original message. Further information, including the
[MSRC PGP](https://technet.microsoft.com/en-us/security/dn606155) key, can be found in
the [Security TechCenter](https://technet.microsoft.com/en-us/security/default).

### License
This project is under MIT license described in detail [here](LICENSE.txt).
