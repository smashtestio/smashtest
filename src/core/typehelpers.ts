/* eslint-disable @typescript-eslint/no-explicit-any*/
import type { Dictionary, IterateeShorthand, Many, NotVoid, NumericDictionary, PartialObject } from 'lodash'
import mapValuesLodash from 'lodash/mapValues.js'
import { default as pickByLodash, default as pickLodash } from 'lodash/pickBy.js'

export type PossibleValues<T> = { [K in keyof T]-?: T[K] }[keyof T];

// Modified from node_modules\@types\lodash\common\common.d.ts
// prettier-ignore
// eslint-disable-next-line
type ObjectIteratorKeyOf<TObject, TResult> = (value: PossibleValues<TObject>, key: keyof TObject, collection: TObject) => TResult
// prettier-ignore
type ValueKeyIterateeKeyOf<T> = ((value: T[keyof T], key: keyof T) => NotVoid) | IterateeShorthand<T>

// prettier-ignore
interface MapValues {
    // eslint-disable-next-line
    <T extends object, TResult>(obj: T | null | undefined, callback: ObjectIteratorKeyOf<T, TResult>): { [P in keyof T]: TResult }
    // eslint-disable-next-line
    <T extends object, Key extends keyof NumericDictionary<T>[number]>(collection: Dictionary<T> | NumericDictionary<T> | null | undefined, iteratee?: Key): { [P in keyof Dictionary<T>]: T[Key] }
}

export const mapValues = mapValuesLodash as MapValues;

// prettier-ignore
// Modified from node_modules\@types\lodash\common\object.d.ts
type Pick = <T extends object>(object: T | null | undefined, ...paths: Array<Many<keyof T | 'toJSON'>>) => PartialObject<T>
export const pick = pickLodash as Pick;

// prettier-ignore
// type PickBy = <T>(object: Dictionary<T> | null | undefined, predicate?: ValueKeyIterateeKeyOf<T>) => Dictionary<T>;
type PickBy = <T>(object: T | null | undefined, predicate?: ValueKeyIterateeKeyOf<T>) => Partial<T>;
export const pickBy = pickByLodash as PickBy;

// Ref: https://dev.to/lucianbc/union-type-merging-in-typescript-9al
type CommonKeys<T extends object> = keyof T;
type AllKeys<T> = T extends any ? keyof T : never;
type Subtract<A, C> = A extends C ? never : A;
type NonCommonKeys<T extends object> = Subtract<AllKeys<T>, CommonKeys<T>>;
type PickType<T, K extends AllKeys<T>> = T extends { [k in K]?: any } ? T[K] : undefined;
type PickTypeOf<T, K extends string | number | symbol> = K extends AllKeys<T> ? PickType<T, K> : never;
export type Merge<T extends object> = {
    [k in CommonKeys<T>]: PickTypeOf<T, k>;
} & {
    [k in NonCommonKeys<T>]: PickTypeOf<T, k>;
};

// A super hacky better Entries based on a union-to-tuple trick
// https://stackoverflow.com/questions/55127004/how-to-transform-union-type-to-tuple-type/55128956#55128956
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type LastOf<Obj, T extends keyof Obj> = UnionToIntersection<
    T extends any ? () => T extends keyof Obj ? T : never : never
> extends () => infer R
    ? R
    : never;

export type Push<T extends any[], V> = [...T, V];

export type _Entries<
    Obj,
    T extends keyof Obj = keyof Obj,
    L extends keyof Obj = LastOf<Obj, T> extends keyof Obj ? LastOf<Obj, T> : never,
    N = [T] extends [never] ? true : false
> = true extends N ? [] : Push<_Entries<Obj, Exclude<T, L>>, [L, Obj[L]]>;

interface Entries {
    <T>(object: T): T extends Array<any> ? Array<[number, T[number]]> : _Entries<T>;
}

export const entries = Object.entries as Entries;
