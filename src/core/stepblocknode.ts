import StepNode from './stepnode.js';

/**
 * Represents a plain step block (non-multi-level) within a Tree
 * NOTE: Multi-level step blocks are implemented as function declaration/call pairs under the hood
 */
class StepBlockNode extends StepNode {
    steps: StepNode[] = [];

    constructor(id?: number) {
        super(id);
    }
}

export default StepBlockNode;
