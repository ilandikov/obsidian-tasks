/**
 * A node in the grouping tree. The node contains the
 * list of values matching the path from the root so far, and its children
 * are the further grouping of those values.
 *
 */
export class GroupingTreeNode<T> {
    children: Map<string, GroupingTreeNode<T>> = new Map();
    values: T[] = [];

    constructor(values: T[]) {
        this.values = values;
    }

    /**
     * Recursively traverse the tree to generate all the paths to the leaves.
     * This function returns a map from every leaf path, to the list of values
     * matching this path.
     * NOTE: The node itself doesn't get included in the generated paths.
     */
    generateNodePath(pathSoFar: string[] = []): Map<string[], T[]> {
        const nodePath = new Map();
        if (this.children.size == 0) {
            // Base case: Leaf node. Populate the results map with the path to
            // this node, and the values that match this path.
            nodePath.set([...pathSoFar], this.values);
            return nodePath;
        }

        for (const [property, child] of this.children) {
            pathSoFar.push(property);
            const childPath = child.generateNodePath(pathSoFar);
            childPath.forEach((value, key) => nodePath.set(key, value));
            pathSoFar.pop();
        }
        return nodePath;
    }
}
