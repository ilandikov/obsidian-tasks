/**
 * @jest-environment jsdom
 */
import moment from 'moment';
import { TaskFieldHTMLData, TaskFieldRenderer } from '../src/TaskFieldRenderer';
import { TaskBuilder } from './TestingTools/TaskBuilder';

window.moment = moment;

const fieldRenderer = new TaskFieldRenderer();

describe('Field Layouts Container tests', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2023-11-19'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should add a data attribute for an existing component (date)', () => {
        const task = new TaskBuilder().dueDate('2023-11-20').build();
        const span = document.createElement('span');

        fieldRenderer.addDataAttribute(span, task, 'dueDate');

        expect(Object.keys(span.dataset).length).toEqual(1);
        expect(span.dataset['taskDue']).toEqual('future-1d');
    });

    it('should add a data attribute for an existing component (not date)', () => {
        const task = TaskBuilder.createFullyPopulatedTask();
        const span = document.createElement('span');

        fieldRenderer.addDataAttribute(span, task, 'priority');

        expect(Object.keys(span.dataset).length).toEqual(1);
        expect(span.dataset['taskPriority']).toEqual('medium');
    });
    it('should not add any data attributes for a missing component', () => {
        const task = new TaskBuilder().build();
        const span = document.createElement('span');

        fieldRenderer.addDataAttribute(span, task, 'recurrenceRule');

        expect(Object.keys(span.dataset).length).toEqual(0);
    });
});

describe('Field Layout Detail tests', () => {
    it('should supply a class name', () => {
        const fieldLayoutDetail = new TaskFieldHTMLData('task-description', '', () => {
            return '';
        });
        expect(fieldLayoutDetail.className).toEqual('task-description');
    });

    it('should add a data attribute with a value and a name', () => {
        const fieldLayoutDetail = new TaskFieldHTMLData('task-priority', 'taskPriority', () => {
            return 'highest';
        });
        const span = document.createElement('span');

        fieldLayoutDetail.addDataAttribute(span, new TaskBuilder().build(), 'priority');

        expect(span).toHaveDataAttributes('taskPriority: highest');
    });

    it('should not add a data attribute without a name', () => {
        const fieldLayoutDetail = new TaskFieldHTMLData('task-due', '', () => {
            return 'past-far';
        });
        const span = document.createElement('span');

        fieldLayoutDetail.addDataAttribute(span, new TaskBuilder().build(), 'dueDate');

        expect(span).toHaveDataAttributes('');
    });

    it.failing('should not add a data attribute with a name but without value', () => {
        const fieldLayoutDetail = new TaskFieldHTMLData('task-start', 'taskStart', () => {
            return '';
        });
        const span = document.createElement('span');

        fieldLayoutDetail.addDataAttribute(span, new TaskBuilder().build(), 'startDate');

        expect(span).toHaveDataAttributes('');
    });
});
