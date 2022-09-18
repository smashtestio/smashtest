// Elementfinder, which runs in the browser. This code must not import any
// runtime variable, only types.
import { BrowserElementFinder, ElementFinderPayload, SearchRecordEntry } from '../../core/types';

export const browserFunction = function (_payload: string, parentElem: Element, browserConsoleOutput: boolean) {
    const payload = JSON.parse(_payload) as ElementFinderPayload;
    const ef = payload.ef;
    const definedProps = payload.definedProps;

    const searchRecord: SearchRecordEntry[] = [];

    findEF(ef, parentElem ? [...parentElem.querySelectorAll('*'), parentElem] : [...document.querySelectorAll('*')]);

    const matches = ef.matchMeElems && ef.matchMeElems.length > 0 ? ef.matchMeElems : ef.matchedElems;

    if (browserConsoleOutput) {
        console.log('');
        console.log('%c-- Finding ElementFinder --', 'color: blueviolet');
        console.log(ef.fullStr);

        if (parentElem) {
            console.log('Within parent element:');
            console.log(parentElem);
        }

        if (matches.length === 0) {
            console.log('%cNo matches found', 'color: red');
        }
        else if (matches.length === 1) {
            console.log('%cMatch found', 'color: green');
            console.log(matches[0]);
        }
        else {
            console.log('%cMatches found', 'color: green');
            console.log(matches);
        }

        console.log('Search details');
        console.log(searchRecord);

        console.log('Advanced');
        console.log({
            ef: ef,
            definedProps: definedProps
        });
    }

    return {
        ef: ef,
        matches: matches
    };

    /**
     * Finds elements from pool that match the given ef
     * Sets ef.matchedElems, ef.matchMeElems, ef.error, and/or ef.blockErrors
     * @param {ElementFinder} ef - The ElementFinder to match
     * @param {Array of Element} pool - Array of DOM elements from which to choose from
     * @param {Boolean} [additive] - If true, add to ef's existing matchedElems (don't clear it out)
     * @param {Boolean} [single] - If true, ignore ef's counter and uses a counter of 1x
     */
    function findEF(ef: BrowserElementFinder, pool: Element[], additive?: boolean, single?: boolean) {
        ef.blockErrors = ef.blockErrors ?? [];
        ef.matchMeElems = ef.matchMeElems ?? [];
        ef.matchedElems = ef.matchedElems ?? [];

        // Clear out existing state
        if (!additive) {
            ef.blockErrors = [];
            ef.matchedElems = [];
            ef.error = null;
        }

        let min = ef.counter.min;
        let max = ef.counter.max;
        if (single) {
            min = 1;
            max = 1;
        }

        const topElems = findTopEF(ef, pool);
        const originalTopElemCount = topElems.length;

        if (!hasTopErrors(ef)) {
            if (ef.isElemArray) {
                if (ef.isAnyOrder) {
                    // Element array, any order
                    // Remove from topElems the elems that match up with a child EF
                    let foundElems: HTMLElement[] = [];
                    for (let i = 0; i < ef.children.length; i++) {
                        const childEF = ef.children[i];
                        findEF(childEF, topElems);
                        removeFromArr(topElems, childEF.matchedElems);
                        foundElems = [...foundElems, ...childEF.matchedElems];
                    }

                    if (topElems.length > 0) {
                        // Set block error for each of topElems still around (these elems weren't matched by the elem array)
                        for (let i = 0; i < topElems.length; i++) {
                            const topElem = topElems[i];
                            ef.blockErrors.push({ header: 'missing', body: elemSummary(topElem) });
                        }
                    }
                    else {
                        // Successful match
                        ef.matchedElems = foundElems;
                    }
                }
                else {
                    // Element array, in order
                    let indexE = 0; // index within topElems
                    let indexC = 0; // index within ef.children

                    while (indexE < topElems.length || indexC < ef.children.length) {
                        // while at least one index is valid
                        const currTopElem = topElems[indexE];
                        const currChildEF = ef.children[indexC];

                        if (!currChildEF) {
                            // indexC went over the edge
                            ef.blockErrors.push({ header: 'missing', body: elemSummary(currTopElem) });
                            indexE++;
                        }
                        else if (!currTopElem) {
                            // indexE went over the edge
                            if (currChildEF.matchedElems) {
                                if (currChildEF.matchedElems.length < currChildEF.counter.min) {
                                    currChildEF.error = 'only found ' + currChildEF.matchedElems.length;
                                    ef.error = true;
                                }
                            }
                            else {
                                currChildEF.error = 'not found';
                                ef.error = true;
                            }

                            indexC++;
                        }
                        else {
                            // both indexes still good
                            const matchesBefore = [...(currChildEF.matchedElems ?? [])];
                            findEF(currChildEF, [currTopElem], true, true);
                            const matchedElemensCount = currChildEF.matchedElems?.length ?? 0;

                            if (matchedElemensCount > matchesBefore.length) {
                                // currChildEF matches currTopElem
                                indexE++;

                                if (matchedElemensCount == currChildEF.counter.max) {
                                    indexC++;
                                }
                            }
                            else {
                                if (matchedElemensCount == 0) {
                                    if (hasChildErrors(currChildEF)) {
                                        currChildEF.error = true;
                                    }
                                    else {
                                        currChildEF.error = 'doesn\'t match ' + elemSummary(currTopElem);
                                    }
                                    ef.error = true;
                                    indexE++;
                                }
                                else if (matchedElemensCount < currChildEF.counter.min) {
                                    currChildEF.error = 'only found ' + matchedElemensCount;
                                    ef.error = true;
                                }

                                indexC++;
                            }
                        }
                    }
                }
            }
            else {
                // Normal EF
                for (let i = 0; i < topElems.length && (max === undefined || i < max); ) {
                    const topElem = topElems[i];
                    const pool = [...topElem.querySelectorAll('*')]; // all elements under topElem
                    let remove = false;

                    for (let j = 0; j < ef.children.length; j++) {
                        const childEF = ef.children[j];
                        if (pool.length == 0) {
                            remove = true; // topElem has no children left, but more children are expected, so remove topElem from contention
                            break;
                        }

                        findEF(childEF, pool);

                        if (hasTopErrors(childEF)) {
                            remove = true; // topElem's children don't match, so remove it from contention
                            break;
                        }

                        const elemsMatchingChild = childEF.matchedElems;

                        if (ef.isAnyOrder) {
                            // Remove all elemsMatchingChild and their descendants from pool
                            removeFromArr(pool, elemsMatchingChild);
                            elemsMatchingChild.forEach(function (elem) {
                                removeFromArr(pool, [...elem.querySelectorAll('*')]);
                            });
                        }
                        else {
                            // Remove from pool all elems before the last elem in elemsMatchingChild
                            pool.splice(0, pool.indexOf(elemsMatchingChild[elemsMatchingChild.length - 1]) + 1);
                        }
                    }

                    if (remove) {
                        removeFromArr(topElems, [topElem]);
                    }
                    else {
                        i++;
                    }
                }

                if (topElems.length == 0) {
                    if (min > 0) {
                        if (originalTopElemCount == 1) {
                            ef.error = 'found, but doesn\'t contain the right children';
                        }
                        else {
                            ef.error = originalTopElemCount + ' found, but none contain the right children';
                            clearErrorsOfChildren(ef);
                        }

                        if (!ef.isAnyOrder) {
                            ef.error += ' (in the right order)';
                        }
                    }
                }
                else if (topElems.length < min) {
                    ef.error = 'only found ' + topElems.length;
                }
            }
        }

        if (!hasTopErrors(ef)) {
            // Success. Set ef.matchedElems
            if (max !== undefined) {
                ef.matchedElems = ef.matchedElems.concat(topElems.slice(0, max)); // only take up to max elems
            }
            else {
                ef.matchedElems = ef.matchedElems.concat(topElems);
            }

            // Copy over matchedElems if this EF has matchMe set
            if (ef.matchMe) {
                ef.matchMeElems = [...ef.matchMeElems, ...ef.matchedElems];
            }

            // Copy over matchMeElems from children (only elements that aren't already in ef.matchMeElems)
            ef.children.forEach(function (childEF) {
                if (childEF.matchMeElems) {
                    for (let i = 0; i < childEF.matchMeElems.length; i++) {
                        const matchMeElem = childEF.matchMeElems[i];
                        if (ef.matchMeElems.indexOf(matchMeElem) == -1) {
                            ef.matchMeElems.push(matchMeElem);
                        }
                    }
                }
            });

            clearErrorsOfChildren(ef);
        }
    }

    /**
     * @return {Array of Element} Elements from pool that match the top line in ef. Ignores the counter.
     */
    function findTopEF(ef: BrowserElementFinder, pool: Element[]) {
        const props = ef.props.map((prop) => prop.prop);

        const record: SearchRecordEntry = {
            'Searching for EF': ef.line,
            '[1] divide into props': props,
            '[2] before': pool,
            '[3] apply each prop': [],
            '[4] after': []
        };

        searchRecord.push(record);

        for (let i = 0; i < ef.props.length; i++) {
            const prop = ef.props[i];
            let approvedElems: Element[] = [];

            if (!Object.prototype.hasOwnProperty.call(definedProps, prop.def)) {
                ef.error = 'ElementFinder prop \'' + prop.def + '\' is not defined';
                return [];
            }

            const defs = definedProps[prop.def];
            for (let j = 0; j < defs.length; j++) {
                const def = defs[j];
                if (typeof def === 'object') {
                    // def is an EF
                    def.counter = { min: 1 }; // match multiple elements
                    findEF(def, pool);
                    const matched =
                        def.matchMeElems && def.matchMeElems.length > 0 ? def.matchMeElems : def.matchedElems;
                    approvedElems = approvedElems.concat(intersectArr(pool, matched));
                }
                else if (typeof def === 'string') {
                    // stringified function
                    const f = eval('(' + def + ')');
                    approvedElems = approvedElems.concat(f(pool, prop.input));
                }
            }

            let fromPool = null;
            if (browserConsoleOutput) {
                fromPool = [];
                for (let i = 0; i < pool.length; i++) {
                    fromPool.push(pool[i]);
                }
            }

            pool = prop.not ? intersectArrNot(pool, approvedElems) : intersectArr(pool, approvedElems);

            if (browserConsoleOutput) {
                const props = [];
                for (let i = 0; i < ef.props.length; i++) {
                    props.push(ef.props[i].prop);
                }
                const propApplication = {
                    'Applying prop': prop.prop,
                    '[1] definitions': defs,
                    '[2] before': fromPool,
                    '[3] after': pool
                };

                record['[3] apply each prop'].push(propApplication);
                record['[4] after'] = pool;
            }

            if (pool.length == 0) {
                if (ef.counter.min > 0) {
                    ef.error = 'not found (zero matches after `' + prop.prop + '` applied)';
                }
                break;
            }
        }

        return pool;
    }

    /**
     * @return {Boolean} true if the given EF's top parent has errors, false otherwise (only applies to top EF, not children)
     */
    function hasTopErrors(ef: BrowserElementFinder) {
        return ef.error || (ef.blockErrors && ef.blockErrors.length > 0);
    }

    /**
     * @return {Boolean} true if the given EF's children have errors, false otherwise
     */
    function hasChildErrors(ef: BrowserElementFinder) {
        for (let i = 0; i < ef.children.length; i++) {
            const childEF = ef.children[i];
            if (childEF.error || (childEF.blockErrors && childEF.blockErrors.length > 0)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return {String} A summary of the given elem
     */
    function elemSummary(elem: Element) {
        return (
            elem.tagName.toLowerCase() +
            (elem.id ? '#' + elem.id : '') +
            (elem.className ? elem.className.trim().replace(/^\s*|\s+/g, '.') : '')
        );
    }

    /**
     * Clears errors of the given EF's children
     */
    function clearErrorsOfChildren(ef: BrowserElementFinder) {
        for (let i = 0; i < ef.children.length; i++) {
            const childEF = ef.children[i];
            childEF.error = null;
            childEF.blockErrors = [];
            clearErrorsOfChildren(childEF);
        }
    }

    /**
     * @param {Array} arr1
     * @param {Array} arr2
     * @return {Array} Array consisting of items found in both arr1 and arr2
     */
    function intersectArr<T>(arr1: T[], arr2: T[]) {
        const newArr = [];
        for (let i = 0; i < arr1.length; i++) {
            for (let j = 0; j < arr2.length; j++) {
                if (arr1[i] === arr2[j]) {
                    newArr.push(arr1[i]);
                    break;
                }
            }
        }

        return newArr;
    }

    /**
     * @param {Array} arr1
     * @param {Array} arr2
     * @return {Array} Array consisting of items found in arr1 and not in arr2
     */
    function intersectArrNot<T>(arr1: T[], arr2: T[]) {
        const newArr = [];
        for (let i = 0; i < arr1.length; i++) {
            let found = false;
            for (let j = 0; j < arr2.length; j++) {
                if (arr1[i] === arr2[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                newArr.push(arr1[i]);
            }
        }

        return newArr;
    }

    /**
     * Removes from array arr the items inside array items
     */
    function removeFromArr<T>(arr: T[], items: T[]) {
        for (let i = 0; i < arr.length; ) {
            if (items.indexOf(arr[i]) !== -1) {
                arr.splice(i, 1);
            }
            else {
                i++;
            }
        }
    }
};
