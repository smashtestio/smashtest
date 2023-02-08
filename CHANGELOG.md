# Changelog

## 1.8.1

- Sync versions, npm package and changelog

## 1.8.0

- Smashtest has been migrated to Typescript runtime. If you're installing Smashtest as a global package (npm i -g), you have to install ts-node as well
- Migrated from CJS to ESM
- The `i()` API accepts ESM and `.ts` modules as well. ESM and `.ts` modules need to be awaited (`await i()`), CJS modules can be used with pure `i()` as before. The most compatible way is to always use `await i(...)`
- Runtime errors no longer dump the stack trace to the console.
- REPL commands have been curated, irrelevant factory Node commands are removed ([#78](https://github.com/smashtestio/smashtest/pull/78))
- Added REPL command `.copy (c): Copy all evaluated passed commands to the clipboard` ([#78](https://github.com/smashtestio/smashtest/pull/78))
- Sinon now intercepts `fetch` requests ([e1e9ca7](https://github.com/smashtestio/smashtest/commit/e1e9ca79545f1901ccade12388808587f57d4d5d))
- Fixed numerous bugs
  - Sinon not being injected as a local dep ([3337b86](https://github.com/smashtestio/smashtest/commit/3337b867b43f7be65850c1cefdf25d10e01bd1af))
  - Runtime error in `not$` called with a non-visible WebElement ([ecb7514](https://github.com/smashtestio/smashtest/commit/ecb7514fcbe16d08d8800c3b532c061c300a4b72))
  - Null error on the 'resume' command in REPL when the session finishes ([17c56f3](https://github.com/smashtestio/smashtest/commit/17c56f39c53977539d36a73b455a938e7783454c))
  - BrowserInstance::isAlertOpen() always returned false ([60ca46](https://github.com/smashtestio/smashtest/commit/60ca46cccde83cd11ce05d0fcbb5257a693365d1))
  - The steps were not printed to the console in the browser during debugging ([baf85b9](https://github.com/smashtestio/smashtest/commit/baf85b9881a4d5bd23896221a4680a69e76a4ef4))

## 1.7.0

- New 'Verify element is state' and 'Verify every element is state' steps

## 1.6.18

- Fixed bug in branchifying .. step blocks

## 1.6.17

- Added await to setting viewport rect

## 1.6.16

- Fixed UnexpectedAlertOpenError exception before a step completes with an alert being open

## 1.6.15

- Fixed parsing of body in API response

## 1.6.14

- Fixed UnexpectedAlertOpenError exception after a step completes with an alert being open
- Fixed bug related to repeating the previous step in the REPL
- Simplified way to access the response object in API tests
- Increased wait time for iframe switching

## 1.6.13

- Fixed bug where correctly empty element arrays threw an error

## 1.6.12

- Further fix for CSS.escape() failing in IE/Edge

## 1.6.11

- Fix for CSS.escape() failing in IE/Edge

## 1.6.10

- Fixed blank elapsed counter in a stopped run's report
- Updated colors in report

## 1.6.9

- Polyfilled EF injected js to work with IE11/Edge

## 1.6.8

- Logs to console now come out when logged, not at the end of the step
- Refactoring and cleanup

## 1.6.7

- Fix for EF browser console output not coming out in non-debug REPLs

## 1.6.6

- Fixed ordering in browser console of EFs that are defined by other EFs

## 1.6.5

- Fixed bug that was removing 'visible' prop
- Logs now outputted to console in REPL
- Cleaned up EF browser console output
- EF outputs to browser console only in debug mode
- Fixed REPL not being able to take indented code blocks (usually happens when pasting)
- Better quoting in function call logs
- Fixed console output for express debug mode

## 1.6.4

- Fixed 'textbox' prop in IE
- Steps that do not have code blocks will come out as bright gray in both report and REPL
- No screenshots for steps with no code blocks (including textual steps)

## 1.6.3

- Fixed passing in globs from the command line in windows
- Fixed "DevTools listening" console output in windows

## 1.6.2

- Fixed color issue in comparer output in unit tests
- Allow multi-word props in a space-separated prop list
- Fix bug with accessing Comparer in code blocks

## 1.6.1

- Fixed back and forward errors in Chrome
- Fixed clicking issue in Safari
- Ability to selectively run branches with groups, freq, $, ~ simultaneously
- Verify steps now wait for up to 2 secs, in par with $()
- Implicit visible and clickable props applied in front (fixes issue with these props coming after ords)
- New special format for EFs using spaces to separate props (much easier to read and understand)

## 1.6.0

- New 'textbox' ElementFinder prop
- Better use of ElementFinder props in UI example

## 1.5.17

- Refactored generating a step's filename/line number
- Cleaned up REPL's filename/line number output for each step

## 1.5.16

- Fixed lack of test trace in console errors
- Removed unused branch functions
- Moved branch output code into branch object

## 1.5.15

- Fixed missing bracketed-strings in parse regexes

## 1.5.14

- Removed unnecessary Init step from Use browser

## 1.5.13

- Removed crossorigin attribute from report due to problems with chrome

## 1.5.12

- Simplified function call and function declaration filenames/linenumbers in report, removed excess logging

## 1.5.11

- Fixed lack of filenames/line numbers in stack trace for function not found error

## 1.5.10

- Removed unnecessary code to mitigate ECONNREFUSED errors, which were fixed by correcting an environment variable [(issue)](https://github.com/smashtestio/smashtest/issues/30)

## 1.5.9

- Added new 60s default timeout for all steps [(issue)](https://github.com/smashtestio/smashtest/issues/53)
- Added function to adjust default timeout for the current branch
