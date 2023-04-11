import type { Moment } from 'moment';
import type { Task } from '../../Task';
import { compareByDate } from '../../lib/DateTools';
import type { GrouperFunction } from '../Grouper';
import type { FilterFunction } from './Filter';
import { FilterInstructions } from './FilterInstructions';
import type { DateFilterFunction } from './DateField';
import { DateField } from './DateField';

/**
 * Support the 'happens' search instruction, which searches all of
 * start, scheduled and due dates.
 */
export class HappensDateField extends DateField {
    constructor() {
        const filterInstructions = new FilterInstructions();
        filterInstructions.add('has happens date', (task: Task) => this.dates(task).some((date) => date !== null));
        filterInstructions.add('no happens date', (task: Task) => !this.dates(task).some((date) => date !== null));
        super(filterInstructions);
    }

    public fieldName(): string {
        return 'happens';
    }

    protected fieldNameForExplanation() {
        return 'due, start or scheduled';
    }

    /**
     * Returns {@link earliestDate}
     * @param task
     */
    public date(task: Task): Moment | null {
        return this.earliestDate(task);
    }

    /**
     * Return the task's start, scheduled and due dates, any or all of which may be null.
     */
    public dates(task: Task): (Moment | null)[] {
        return Array.of(task.startDate, task.scheduledDate, task.dueDate);
    }

    /**
     * Return the earliest of the dates used by 'happens' in the given task, or null if none set.
     *
     * Generally speaking, the earliest date is considered to be the highest priority,
     * as it is the first point at which the user might wish to act on the task.
     * @param task
     */
    public earliestDate(task: Task): Moment | null {
        const happensDates = new HappensDateField().dates(task);
        const sortedHappensDates = happensDates.sort(compareByDate);
        return sortedHappensDates[0];
    }

    protected filterResultIfFieldMissing() {
        return false;
    }

    protected getFilter(dateFilterFunction: DateFilterFunction): FilterFunction {
        return (task: Task) => {
            return this.dates(task).some((date) => dateFilterFunction(date));
        };
    }

    public grouper(): GrouperFunction {
        return (task: Task) => {
            const earliestDateIfAny = new HappensDateField().earliestDate(task);
            return [this.stringFromDate(earliestDateIfAny)];
        };
    }

    private stringFromDate(date: moment.Moment | null): string {
        if (date === null) {
            return `No ${this.fieldName()} date`;
        }
        return date.format(DateField.groupDateFormat);
    }
}
