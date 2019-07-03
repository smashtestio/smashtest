# SmashTEST - Test 10x Faster

## What is SmashTEST?

SmashTEST is a language for describing test cases.

Greatly speed up your automated testing by storing tests in a tree.

Trees represent how we think when we're testing. They allow you to list all the permutations that branch off from any given page or input.

- Test in multiple browsers and device types
- Test UI and API
- Run in parallel, locally or in CI
- Steps are human-readable
- Awesome live reports

## Sample .smash file

```
Open Chrome
Open Firefox
Open IE

    Navigate to 'site.com'

        Click ['Sign In']

            Type {username} into [username box]

                {username} = 'joe'
                {username} = 'bob'
                {username} = 'mary'

                    Verify success

                {username} = 'baduser'

                    Verify error
```

represents

```
Test Case 1                        Test Case 2                        Test Case 3
-----------                        -----------                        -----------
Open Chrome                        Open Firefox                       Open IE
Navigate to 'site.com'             Navigate to 'site.com'             Navigate to 'site.com'
Click ['Sign In']                  Click ['Sign In']                  Click ['Sign In']
Type 'joe' into [username box]     Type 'joe' into [username box]     Type 'joe' into [username box]
Verify success                     Verify success                     Verify success


Test Case 4                        Test Case 5                        Test Case 6
-----------                        -----------                        -----------
Open Chrome                        Open Firefox                       Open IE
Navigate to 'site.com'             Navigate to 'site.com'             Navigate to 'site.com'
Click ['Sign In']                  Click ['Sign In']                  Click ['Sign In']
Type 'bob' into [username box]     Type 'bob' into [username box]     Type 'bob' into [username box]
Verify success                     Verify success                     Verify success


Test Case 7                        Test Case 8                        Test Case 9
-----------                        -----------                        -----------
Open Chrome                        Open Firefox                       Open IE
Navigate to 'site.com'             Navigate to 'site.com'             Navigate to 'site.com'
Click ['Sign In']                  Click ['Sign In']                  Click ['Sign In']
Type 'mary' into [username box]    Type 'mary' into [username box]    Type 'mary' into [username box]
Verify success                     Verify success                     Verify success


Test Case 10                       Test Case 11                       Test Case 12
------------                       ------------                       ------------
Open Chrome                        Open Firefox                       Open IE
Navigate to 'site.com'             Navigate to 'site.com'             Navigate to 'site.com'
Click ['Sign In']                  Click ['Sign In']                  Click ['Sign In']
Type 'baduser' into [username box] Type 'baduser' into [username box] Type 'baduser' into [username box]
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

### Usage

`smashtest [.smash files to run] [options]`

Use `smashtest -?` to list options

### More documentation coming soon...
