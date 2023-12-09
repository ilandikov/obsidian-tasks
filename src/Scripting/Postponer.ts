import type { Moment, unitOfTime } from 'moment';
import { Task } from '../Task';
import { TasksDate } from './TasksDate';

export function shouldShowPostponeButton(task: Task) {
    const hasAValidHappensDate = task.happensDates.some((date) => {
        return !!date?.isValid();
    });

    return !task.isDone && hasAValidHappensDate;
}

export type HappensDate = keyof Pick<Task, 'startDate' | 'scheduledDate' | 'dueDate'>;

/**
 * Gets a {@link HappensDate} field from a {@link Task} with the following priority: due > scheduled > start.
 * If the task has no happens field {@link HappensDate}, null is returned.
 *
 * @param task
 */
export function getDateFieldToPostpone(task: Task): HappensDate | null {
    if (task.dueDate) {
        return 'dueDate';
    }

    if (task.scheduledDate) {
        return 'scheduledDate';
    }

    if (task.startDate) {
        return 'startDate';
    }

    return null;
}

export function createPostponedTask(
    task: Task,
    dateFieldToPostpone: HappensDate,
    timeUnit: unitOfTime.DurationConstructor,
    amount: number,
) {
    const dateToPostpone = task[dateFieldToPostpone];
    const postponedDate = new TasksDate(dateToPostpone).postpone(timeUnit, amount);
    const postponedTask = new Task({ ...task, [dateFieldToPostpone]: postponedDate });
    return { postponedDate, postponedTask };
}

export function postponementSuccessMessage(postponedDate: Moment, dateFieldToPostpone: HappensDate) {
    // TODO all logic for invalid dates
    const postponedDateString = postponedDate?.format('DD MMM YYYY');
    return `Task's ${dateFieldToPostpone} postponed until ${postponedDateString}`;
}
