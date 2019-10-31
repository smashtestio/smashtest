# Contributing

## Questions

Please ask support questions on our [Gitter](https://gitter.im/smashtestio/community)

## Issues

You can report bugs or request features on our [GitHub issues page](https://github.com/smashtestio/smashtest/issues)

If you submit a bug, please include your machine details (OS, browser version, etc.) and a reproducible set of steps.

## Contributing to the Source Code

Before submitting code, please discuss your proposed change on our Gitter or on the corresponding GitHub issue,
if one exists already. Another person may be already working on your feature/fix and you may receive valuable feedback.

If your change is accepted, you may open up an issue on GitHub, describe your change in detail, and assign it to yourself.

When you're ready, please open up a pull request (PR) on GitHub.
If you don't have push access yet, ask on Gitter and we'll grant it to you.

Thank you for your contribution!

### Code rules

- If your PR changes any behavior or fixes an issue, it should have an associated unit and/or functional test(s)
    - The exception is `cli.js`, which is currently manually tested
- Please include [JSDoc](https://devhints.io/jsdoc) for all functions and classes

## Running Smashtest locally

After cloning the project, in the top project directory, run `./src/cli.js` where you'd normally run `smashtest`.
This will run your local code instead of the regular Smashtest.

## Testing Smashtest locally

### Unit tests

- From the top project directory, run `mocha tests/core/*.js tests/packages/*.js`
    - Some unit tests are marked skipped. These tests have special requirements and need to be run individually from time to time.
- For code coverage, install `nyc` from npm, then run `npm test`. Reports will be available at
    - `/coverage/lcov-report/src/index.html`
    - `/coverage/lcov-report/packages/js/index.html`

### Package functional tests

- Smashtest packages implement the built-in steps that handle browser automation with selenium webdriver, as well as REST APIs
- Functional tests for these packages are written in smash code itself
- From the top project directory, run `smashtest tests/packages/*.smash --groups=[browsers]`
    - Set `--groups` to the list of browsers you want to test in (e.g., `chrome,firefox,safari,ie,edge`)

### Running examples

- Smashtest comes with examples of both [UI](https://github.com/smashtestio/smashtest/tree/master/examples/web-ui/todomvc) and
[API](https://github.com/smashtestio/smashtest/tree/master/examples/api/onwater) testing
- The comments at the top of `main.smash` (in both examples) contain valuable info
- Run `smashtest` inside the directory of the example you want to run

## Important links

- [Smashtest documentation](https://smashtest.io/)
- [Gitter](https://gitter.im/smashtestio/community)
- [GitHub](https://github.com/smashtestio/smashtest)
- [NPM](https://www.npmjs.com/package/smashtest)
- [WebdriverJS documentation](https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver)

## Grammars

Grammars provide syntax highlighting in code editors, and are stored in their own GitHub repos:
- [Atom](https://github.com/smashtestio/language-smash) | [issues](https://github.com/smashtestio/language-smash/issues)
- [VSCode](https://github.com/smashtestio/smash-language-vscode) | [issues](https://github.com/smashtestio/smash-language-vscode/issues)

Please test changes you make to any of the grammars by opening up `tests/highlighting/grammartest.smash` and visually inspecting it
