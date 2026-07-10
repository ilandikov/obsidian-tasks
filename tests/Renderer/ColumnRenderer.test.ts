import { Query } from '../../src/Query/Query';
import type { QueryResult } from '../../src/Query/QueryResult';
import { createAndAppendElement } from '../../src/Renderer/TaskLineRenderer';
import { verifyRenderedTasks } from './RenderingTestHelpers';

class ColumnRenderer {
    render(_queryResult: QueryResult, container: HTMLDivElement) {
        const columnContainer = createAndAppendElement('div', container);
        columnContainer.classList.add('tasks-column-container');
    }
}

describe('column rendering', () => {
    it('should render task count if no tasks were found', () => {
        const queryResult = new Query('').applyQueryToTasks([]);
        const container = document.createElement('div');

        new ColumnRenderer().render(queryResult, container);

        verifyRenderedTasks(container, []);
    });
});
