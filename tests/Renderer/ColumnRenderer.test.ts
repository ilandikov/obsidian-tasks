import { GlobalQuery } from '../../src/Config/GlobalQuery';
import { State } from '../../src/Obsidian/Cache';
import { Query } from '../../src/Query/Query';
import { getQueryForQueryRenderer } from '../../src/Query/QueryRendererHelper';
import type { QueryResult } from '../../src/Query/QueryResult';
import { HtmlQueryResultsRenderer } from '../../src/Renderer/HtmlQueryResultsRenderer';
import { createAndAppendElement } from '../../src/Renderer/TaskLineRenderer';
import { TasksFile } from '../../src/Scripting/TasksFile';
import { Priority } from '../../src/Task/Priority';
import type { Task } from '../../src/Task/Task';
import { mockApp } from '../__mocks__/obsidian';
import { TaskBuilder } from '../TestingTools/TaskBuilder';
import { makeHtmlQueryRendererParameters, mockHTMLRenderer, verifyRenderedTasks } from './RenderingTestHelpers';

class ColumnRenderer {
    private readonly taskListRenderer: HtmlQueryResultsRenderer;

    constructor(taskListRenderer: HtmlQueryResultsRenderer) {
        this.taskListRenderer = taskListRenderer;
    }

    async render(queryResult: QueryResult, container: HTMLDivElement) {
        const columnContainer = createAndAppendElement('div', container);
        columnContainer.classList.add('tasks-columns');
        this.taskListRenderer.content = columnContainer;

        const column = createAndAppendElement('div', columnContainer);
        column.classList.add('tasks-column');

        queryResult.taskGroups.groups.forEach((group) => {
            group.groupHeadings.forEach((heading) => {
                const title = createAndAppendElement('div', column);
                title.classList.add('tasks-column-title');
                title.textContent = heading.displayName;
            });
        });

        await this.taskListRenderer.renderQuery(State.Warm, queryResult);
    }
}

class FakeListRenderer extends HtmlQueryResultsRenderer {
    constructor(source: string, allTasks: Task[]) {
        const tasksFile = new TasksFile('stub-path.md');
        const query = getQueryForQueryRenderer(source, GlobalQuery.getInstance(), tasksFile);

        super(
            () => Promise.resolve(),
            null,
            mockApp,
            mockHTMLRenderer,
            makeHtmlQueryRendererParameters(allTasks),
            source,
            tasksFile,
            query,
        );
    }

    public async renderQuery(_state: State, _queryResult: QueryResult): Promise<void> {
        // @ts-expect-error inject fake HTML tag
        createAndAppendElement('fake-task-list', this.content);
    }
}

describe('column rendering', () => {
    it('should render task list without columns', async () => {
        const source = '';
        const tasks: Task[] = [];
        const queryResult = new Query(source).applyQueryToTasks(tasks);
        const container = document.createElement('div');

        await new ColumnRenderer(new FakeListRenderer(source, tasks)).render(queryResult, container);

        verifyRenderedTasks(container, []);
    });

    it('should render task list with priority columns', async () => {
        const source = 'view columns by priority';
        const tasks: Task[] = [new TaskBuilder().priority(Priority.High).build()];
        const queryResult = new Query(source).applyQueryToTasks(tasks);
        const container = document.createElement('div');

        await new ColumnRenderer(new FakeListRenderer(source, tasks)).render(queryResult, container);

        verifyRenderedTasks(container, []);
    });
});
