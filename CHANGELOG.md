# Changelog

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
