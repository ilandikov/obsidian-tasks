import type { Task } from '../Task';
import type { Grouper } from './Grouper';
import { GroupDisplayHeadingSelector } from './GroupDisplayHeadingSelector';
import { TaskGroupingTree } from './TaskGroupingTree';
import { TaskGroup } from './TaskGroup';

/**
 * Store all the groups of tasks generated by any 'group by'
 * instructions in the task block.
 *
 * The groups are stored in array of {@link TaskGroup} objects.
 * @see {@link Grouper}
 * @see {@link Query.grouping}
 */
export class TaskGroups {
    private _groupers: Grouper[];
    private _groups: TaskGroup[] = new Array<TaskGroup>();
    private _totalTaskCount = 0;

    /**
     * Constructor for {@link TaskGroups}
     * @param {Grouper[]} groups - 0 or more {@link Grouper} objects,
     *                              1 per 'group by' line in the task query block
     * @param {Task[]} tasks - all the tasks matching the query, already sorted
     */
    constructor(groups: Grouper[], tasks: Task[]) {
        // Grouping doesn't change the number of tasks, and all the tasks
        // will be shown in at least one group.
        this._totalTaskCount = tasks.length;
        this._groupers = groups;

        const taskGroupingTree = new TaskGroupingTree(groups, tasks);
        this.addTaskGroups(taskGroupingTree);

        this.sortTaskGroups();

        this.setGroupsHeadings(taskGroupingTree);
    }

    /**
     * Return the {@link Grouper} objects, 1 per 'group by' line in the tasks query block.
     */
    public get groupers(): Grouper[] {
        return this._groupers;
    }

    /**
     * All the tasks matching the query, grouped together, and in the order
     * that they should be displayed.
     *
     * If the tasks are ungrouped, a single {@link TaskGroup} will be returned,
     * with no heading names.
     */
    public get groups(): TaskGroup[] {
        return this._groups;
    }

    /**
     * The total number of unique tasks matching the query.
     *
     * Note that tasks may be displayed more than once. For example any tasks with more than one
     * tag will be displayed multiple times if grouped by Tag.
     * So summing the number of tasks in all the {@link groups} can give a larger number than
     * this.
     */
    public totalTasksCount() {
        return this._totalTaskCount;
    }

    /**
     * A human-readable representation of all the task groups.
     *
     * Note that this is used in snapshot testing, so if the format is
     * changed, the snapshots will need to be updated.
     */
    public toString(): string {
        let output = '';
        output += 'Groupers (if any):\n';
        for (const grouper of this._groupers) {
            const reverseText = grouper.reverse ? ' reverse' : '';
            output += `- ${grouper.property}${reverseText}\n`;
        }
        for (const taskGroup of this.groups) {
            output += taskGroup.toString();
            output += '\n---\n';
        }
        const totalTasksCount = this.totalTasksCount();
        output += `\n${totalTasksCount} tasks\n`;
        return output;
    }

    private addTaskGroups(taskGroupingTree: TaskGroupingTree) {
        for (const [groups, tasks] of taskGroupingTree.groupingTreeStorage) {
            const taskGroup = new TaskGroup(groups, tasks);
            this.addTaskGroup(taskGroup);
        }
    }

    private addTaskGroup(taskGroup: TaskGroup) {
        this._groups.push(taskGroup);
    }

    private sortTaskGroups() {
        const compareFn = (group1: TaskGroup, group2: TaskGroup) => {
            // Compare two TaskGroup objects, sorting them by the group names at each grouping level.
            const groupNames1 = group1.groups;
            const groupNames2 = group2.groups;
            // The containers are guaranteed to be identical sizes,
            // they have one value for each 'group by' line in the query.
            for (let i = 0; i < groupNames1.length; i++) {
                // For now, we only have one sort option: sort by the names of the groups.
                // In future, we will add control over the sorting of group headings,
                // which will likely involve adjusting this code to sort by applying a Comparator
                // to the first Task in each group.
                const grouper = this._groupers[i];
                const result = groupNames1[i].localeCompare(groupNames2[i], undefined, { numeric: true });
                if (result !== 0) {
                    return grouper.reverse ? -result : result;
                }
            }
            // identical if we reach here
            return 0;
        };
        this._groups.sort(compareFn);
    }

    private setGroupsHeadings(taskGroupingTree: TaskGroupingTree) {
        const displayHeadingSelector = new GroupDisplayHeadingSelector(
            taskGroupingTree.groupingTreeStorage,
            this._groupers,
        );
        for (const group of this._groups) {
            group.setGroupHeadings(displayHeadingSelector.getHeadingsForTaskGroup(group.groups));
        }
    }
}
