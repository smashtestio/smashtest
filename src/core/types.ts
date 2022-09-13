import StepNode from './stepnode';

export type UserValue = unknown;

export type StepNodeIndex = { [key: number]: StepNode };

export type Error =
    | string
    | {
          blockError: true;
          text: string;
          obj: unknown;
          key?: string;
      };
