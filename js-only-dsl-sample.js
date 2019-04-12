JS-only DSL
===========
Action(Parent, Child), where Parent and Child are either an action (function) or array of actions (functions)
    In the example below, open() returns a function (that will be called when the time comes)
    Implementation = recursively walk the tree, generate mocha by calling describe() for each branch and it() for each step

_() is an empty action




_([
open('chrome'),
open('firefox'),
open('safari')
], [

    navigateTo('google.com', [

        click('.button1', [
            click('.button1'),
            click('.button2'),
            click('.button3')
        ]),

        click('.button2'),
        click('.button3', [
            () => { x = 3 },
            parentStep([
                seq([
                    stepOne(),
                    stepTwo()
                ])
            ])
        ]),
        actionWithBranches(4)
    ])
])

function actionWithBranches(x) { return _(() => {
    _([
        click('.button' + x),
        click('.button2'),
        click('.button3')
    ])
})}





Open 'Chrome'
Open 'Firefox'
Open 'Safari'

    Navigate to 'google.com'

        Click '.button1'
            Click '.button1'
            Click '.button2'
            Click '.button3'

        Click '.button2'
        Click '.button3'
            {X} = '3'

            Parent step
                ..
                Step one
                Step two

        Action with branches 4

* Action with branches {{X}}
    Click '.button{{X}}'
    Click '.button2'
    Click '.button3'






Open Chrome
Open Firefox
Open Safari

    Navigate to 'google.com'

        Click [Button 1]
            Click [Button 1]
            Click [Button 2]
            Click [Button 3]

        Click [Button 2]
        Click [Button 3]
            {X} = '3'
