# Smashtest • Generate tests fast

[![npm version](https://badge.fury.io/js/smashtest.svg)](https://badge.fury.io/js/smashtest)
[![Join the chat at https://gitter.im/smashtestio/community](https://badges.gitter.im/smashtestio/community.svg)](https://gitter.im/smashtestio/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## What is Smashtest?

[Smashtest](https://smashtest.io) is an open-source tool and language for rapidly generating tests.

Greatly speed up your web automated testing by writing tests in a tree-like format.

Trees represent how we think when we're testing. They allow us to list all the permutations that branch off from any given point.

- Multiple browsers and devices
- UI and API
- Run tests in parallel
- Human-readable steps
- Awesome live reports
- Run locally or in CI/CD

## Sample test

```
Open Chrome
Open Firefox
Open Safari

    Navigate to 'site.com'

        Click 'Sign In'

            Type {username:} into 'username box'

                {username} is 'joe'
                {username} is 'bob'
                {username} is 'mary'

                    Verify success

                {username} is 'baduser'

                    Verify error
```

represents

```
Test Case 1                        Test Case 2                        Test Case 3
-----------                        -----------                        -----------
Open Chrome                        Open Firefox                       Open Safari
Navigate to 'site.com'             Navigate to 'site.com'             Navigate to 'site.com'
Click 'Sign In'                    Click 'Sign In'                    Click 'Sign In'  
Type 'joe' into 'username box'     Type 'joe' into 'username box'     Type 'joe' into 'username box'
Verify success                     Verify success                     Verify success


Test Case 4                        Test Case 5                        Test Case 6
-----------                        -----------                        -----------
Open Chrome                        Open Firefox                       Open Safari
Navigate to 'site.com'             Navigate to 'site.com'             Navigate to 'site.com'
Click 'Sign In'                    Click 'Sign In'                    Click 'Sign In'  
Type 'bob' into 'username box'     Type 'bob' into 'username box'     Type 'bob' into 'username box'
Verify success                     Verify success                     Verify success


Test Case 7                        Test Case 8                        Test Case 9
-----------                        -----------                        -----------
Open Chrome                        Open Firefox                       Open Safari
Navigate to 'site.com'             Navigate to 'site.com'             Navigate to 'site.com'
Click 'Sign In'                    Click 'Sign In'                    Click 'Sign In'  
Type 'mary' into 'username box'    Type 'mary' into 'username box'    Type 'mary' into 'username box'
Verify success                     Verify success                     Verify success


Test Case 10                       Test Case 11                       Test Case 12
------------                       ------------                       ------------
Open Chrome                        Open Firefox                       Open Safari
Navigate to 'site.com'             Navigate to 'site.com'             Navigate to 'site.com'
Click 'Sign In'                    Click 'Sign In'                    Click 'Sign In'  
Type 'baduser' into 'username box' Type 'baduser' into 'username box' Type 'baduser' into 'username box'
Verify error                       Verify error                       Verify error
```

which represents

```
Test Case 1
-----------
let driver = await new Builder().forBrowser('chrome').build();
await driver.get('http://site.com');
let signInButton = await driver.findElement(By.id('#sign-in'));
await signInButton.click();
await driver.wait(until.elementLocated(By.id('#username-box')), 10000);
let usernameBox = await driver.findElement(By.id('#username-box'));
await usernameBox.sendKeys('joe');
await driver.wait(until.elementLocated(By.id('#success-element')), 10000);


Test Case 2
-----------
let driver = await new Builder().forBrowser('firefox').build();
await driver.get('http://site.com');
let signInButton = await driver.findElement(By.id('#sign-in'));
await signInButton.click();
await driver.wait(until.elementLocated(By.id('#username-box')), 10000);
let usernameBox = await driver.findElement(By.id('#username-box'));
await usernameBox.sendKeys('joe');
await driver.wait(until.elementLocated(By.id('#success-element')), 10000);


etc.
```

### Installation

`npm install smashtest`

### Usage

`smashtest [.smash files to run] [options]`

Use `smashtest -?` to list options

### Full documentation

[See smashtest.io](https://smashtest.io) for full documentation, setup, tutorials, and screenshots

