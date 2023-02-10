/**
 * @jest-environment jsdom
 */
import moment from 'moment';
import { DueDateField } from '../../../src/Query/Filter/DueDateField';
import type { FilterOrErrorMessage } from '../../../src/Query/Filter/Filter';
import { TaskBuilder } from '../../TestingTools/TaskBuilder';
import { testFilter } from '../../TestingTools/FilterTestHelpers';
import { toBeValid, toHaveExplanation } from '../../CustomMatchers/CustomMatchersForFilters';
import {
    expectTaskComparesAfter,
    expectTaskComparesBefore,
    expectTaskComparesEqual,
} from '../../CustomMatchers/CustomMatchersForSorting';

window.moment = moment;

expect.extend({
    toHaveExplanation,
    toBeValid,
});

function testTaskFilterForTaskWithDueDate(filter: FilterOrErrorMessage, dueDate: string | null, expected: boolean) {
    const builder = new TaskBuilder();
    testFilter(filter, builder.dueDate(dueDate), expected);
}

describe('due date', () => {
    it('by due date (before)', () => {
        // Arrange
        const filter = new DueDateField().createFilterOrErrorMessage('due before 2022-04-20');

        // Act, Assert
        testTaskFilterForTaskWithDueDate(filter, null, false);
        testTaskFilterForTaskWithDueDate(filter, '2022-04-15', true);
        testTaskFilterForTaskWithDueDate(filter, '2022-04-20', false);
        testTaskFilterForTaskWithDueDate(filter, '2022-04-25', false);
    });

    it('due date is invalid', () => {
        // Arrange
        const filter = new DueDateField().createFilterOrErrorMessage('due date is invalid');

        // Act, Assert
        testTaskFilterForTaskWithDueDate(filter, null, false);
        testTaskFilterForTaskWithDueDate(filter, '2022-04-15', false);
        testTaskFilterForTaskWithDueDate(filter, '2022-02-30', true); // 30 February is not valid
        testTaskFilterForTaskWithDueDate(filter, '2022-00-01', true); // month 0 not valid
        testTaskFilterForTaskWithDueDate(filter, '2022-13-01', true); // month 13 not valid
    });

    describe('date range test', () => {
        beforeAll(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date(2022, 0, 15)); // 2022-01-15
        });

        afterAll(() => {
            jest.useRealTimers();
        });

        it.each([
            ['last', 'week', '2022-01-02', '2022-01-03', '2022-01-09', '2022-01-10'],
            ['this', 'week', '2022-01-09', '2022-01-10', '2022-01-16', '2022-01-17'],
            ['next', 'week', '2022-01-16', '2022-01-17', '2022-01-23', '2022-01-24'],

            ['last', 'month', '2021-11-30', '2021-12-01', '2021-12-31', '2022-01-01'],
            ['this', 'month', '2021-12-31', '2022-01-01', '2022-01-31', '2022-02-01'],
            ['next', 'month', '2021-01-31', '2022-02-01', '2022-02-28', '2022-03-01'],

            ['last', 'quarter', '2021-09-30', '2021-10-01', '2021-12-31', '2022-01-01'],
            ['this', 'quarter', '2021-12-31', '2022-01-01', '2022-03-31', '2022-04-01'],
            ['next', 'quarter', '2021-03-31', '2022-04-01', '2022-06-30', '2022-07-01'],

            ['last', 'year', '2020-12-31', '2021-01-01', '2021-12-31', '2022-01-01'],
            ['this', 'year', '2021-12-31', '2022-01-01', '2022-12-31', '2023-01-01'],
            ['next', 'year', '2022-12-31', '2023-01-01', '2023-12-31', '2024-01-01'],
        ])(
            'due %s %s (After %s, between %s and %s, before %s)',
            (
                indicator: string,
                range: string,
                dateBefore: string,
                dateBegin: string,
                dateEnd: string,
                dateAfter: string,
            ) => {
                const filter = new DueDateField().createFilterOrErrorMessage(`due ${indicator} ${range}`);

                // Test filter presence
                expect(filter).toBeValid();

                // Test filter function
                testTaskFilterForTaskWithDueDate(filter, null, false);
                testTaskFilterForTaskWithDueDate(filter, dateBefore, false);
                testTaskFilterForTaskWithDueDate(filter, dateBegin, true);
                testTaskFilterForTaskWithDueDate(filter, dateEnd, true);
                testTaskFilterForTaskWithDueDate(filter, dateAfter, false);
            },
        );
    });
});

describe('explain due date queries', () => {
    it('should explain explicit date', () => {
        const filterOrMessage = new DueDateField().createFilterOrErrorMessage('due before 2023-01-02');
        expect(filterOrMessage).toHaveExplanation('due date is before 2023-01-02 (Monday 2nd January 2023)');
    });

    it('implicit "on" gets added to explanation', () => {
        const filterOrMessage = new DueDateField().createFilterOrErrorMessage('due 2023-01-02');
        expect(filterOrMessage).toHaveExplanation('due date is on 2023-01-02 (Monday 2nd January 2023)');
    });
});

describe('sorting by due', () => {
    const date1 = new TaskBuilder().dueDate('2021-01-12').build();
    const date2 = new TaskBuilder().dueDate('2022-12-23').build();

    it('supports Field sorting methods correctly', () => {
        const field = new DueDateField();
        expect(field.supportsSorting()).toEqual(true);
    });

    it('sort by due', () => {
        // Arrange
        const sorter = new DueDateField().createNormalSorter();

        // Assert
        expectTaskComparesBefore(sorter, date1, date2);
        expectTaskComparesAfter(sorter, date2, date1);
        expectTaskComparesEqual(sorter, date2, date2);
    });

    it('sort by due reverse', () => {
        // Arrange
        const sorter = new DueDateField().createReverseSorter();

        // Assert
        expectTaskComparesAfter(sorter, date1, date2);
        expectTaskComparesBefore(sorter, date2, date1);
        expectTaskComparesEqual(sorter, date2, date2);
    });
});
