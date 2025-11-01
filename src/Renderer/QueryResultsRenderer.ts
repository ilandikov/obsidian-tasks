import { type App, type Component, Notice, type TFile } from 'obsidian';
import { GlobalFilter } from '../Config/GlobalFilter';
import { GlobalQuery } from '../Config/GlobalQuery';
import { postponeButtonTitle, shouldShowPostponeButton } from '../DateTime/Postponer';
import type { IQuery } from '../IQuery';
import { QueryLayout } from '../Layout/QueryLayout';
import { TaskLayout } from '../Layout/TaskLayout';
import { PerformanceTracker } from '../lib/PerformanceTracker';
import { State } from '../Obsidian/Cache';
import type { GroupDisplayHeading } from '../Query/Group/GroupDisplayHeading';
import type { TaskGroups } from '../Query/Group/TaskGroups';
import { explainResults, getQueryForQueryRenderer } from '../Query/QueryRendererHelper';
import type { QueryResult } from '../Query/QueryResult';
import type { TasksFile } from '../Scripting/TasksFile';
import type { ListItem } from '../Task/ListItem';
import { Task } from '../Task/Task';
import { PostponeMenu } from '../ui/Menus/PostponeMenu';
import { showMenu } from '../ui/Menus/TaskEditingMenu';
import { HtmlQueryResultsRenderer, type QueryResultsRendererGetters } from './HtmlQueryResultsRenderer';
import { TaskLineRenderer, type TextRenderer, createAndAppendElement } from './TaskLineRenderer';

export type BacklinksEventHandler = (ev: MouseEvent, task: Task) => Promise<void>;
export type EditButtonClickHandler = (event: MouseEvent, task: Task, allTasks: Task[]) => void;

/**
 * Represent the parameters required for rendering a query with {@link QueryResultsRenderer}.
 *
 * This interface contains all the necessary properties and handlers to manage
 * and display query results such as tasks, markdown files, and certain event handlers
 * for user interactions, like handling backlinks and editing tasks.
 */
export interface QueryRendererParameters {
    allTasks: Task[];
    allMarkdownFiles: TFile[];
    backlinksClickHandler: BacklinksEventHandler;
    backlinksMousedownHandler: BacklinksEventHandler;
    editTaskPencilClickHandler: EditButtonClickHandler;
}

/**
 * The `QueryResultsRenderer` class is responsible for rendering the results
 * of a query applied to a set of tasks.
 *
 * It handles the construction of task groupings and the application of visual styles.
 */
export class QueryResultsRenderer extends HtmlQueryResultsRenderer {
    /**
     * The complete text in the instruction block, such as:
     * ```
     *   not done
     *   short mode
     * ```
     *
     * This does not contain the Global Query from the user's settings.
     * Use {@link getQueryForQueryRenderer} to get this value prefixed with the Global Query.
     */
    public readonly source: string;

    public getters: QueryResultsRendererGetters = {
        source: () => this.source,
        tasksFile: () => this._tasksFile,
        query: () => this.query,
    };

    // The path of the file that contains the instruction block, and cached data from that file.
    // This can be updated when the query file's frontmatter is modified.
    // It is up to the caller to determine when to do this though.
    private _tasksFile: TasksFile;

    public query: IQuery;
    protected queryType: string; // whilst there is only one query type, there is no point logging this value

    constructor(
        className: string,
        source: string,
        tasksFile: TasksFile,
        renderMarkdown: (
            app: App,
            markdown: string,
            el: HTMLElement,
            sourcePath: string,
            component: Component,
        ) => Promise<void>,
        obsidianComponent: Component | null,
        obsidianApp: App,
        textRenderer: TextRenderer = TaskLineRenderer.obsidianMarkdownRenderer,
    ) {
        super(renderMarkdown, obsidianComponent, obsidianApp, textRenderer);
        this.setGetters(this.getters);

        this.source = source;
        this._tasksFile = tasksFile;

        // The engine is chosen on the basis of the code block language. Currently,
        // there is only the main engine for the plugin, this allows others to be
        // added later.
        switch (className) {
            case 'block-language-tasks':
                this.query = this.makeQueryFromSourceAndTasksFile();
                this.queryType = 'tasks';
                break;

            default:
                this.query = this.makeQueryFromSourceAndTasksFile();
                this.queryType = 'tasks';
                break;
        }
    }

    private makeQueryFromSourceAndTasksFile() {
        return getQueryForQueryRenderer(this.getters.source(), GlobalQuery.getInstance(), this.getters.tasksFile());
    }

    public get tasksFile(): TasksFile {
        return this.getters.tasksFile();
    }

    /**
     * Reload the query with new file information, such as to update query placeholders.
     * @param newFile
     */
    public setTasksFile(newFile: TasksFile) {
        this._tasksFile = newFile;
        this.rereadQueryFromFile();
    }

    /**
     * Reads the query from the source file and tasks file.
     *
     * This is for when some change in the vault invalidates the current
     * Query object, and so it needs to be reloaded.
     *
     * For example, the user edited their Tasks plugin settings in some
     * way that changes how the query is interpreted, such as changing a
     * 'presets' definition.
     */
    public rereadQueryFromFile() {
        this.query = this.makeQueryFromSourceAndTasksFile();
    }

    public get filePath(): string | undefined {
        return this.tasksFile?.path ?? undefined;
    }

    public async render(
        state: State | State.Warm,
        tasks: Task[],
        content: HTMLDivElement,
        queryRendererParameters: QueryRendererParameters,
    ) {
        await this.renderQuery(state, tasks, content, queryRendererParameters);
    }

    private async renderQuery(
        state: State | State.Warm,
        tasks: Task[],
        content: HTMLDivElement,
        queryRendererParameters: QueryRendererParameters,
    ) {
        // Don't log anything here, for any state, as it generates huge amounts of
        // console messages in large vaults, if Obsidian was opened with any
        // notes with tasks code blocks in Reading or Live Preview mode.
        const error = this.getters.query().error;
        if (state === State.Warm && error === undefined) {
            await this.renderQuerySearchResults(tasks, state, content, queryRendererParameters);
        } else if (error !== undefined) {
            this.renderErrorMessage(content, error);
        } else {
            this.renderLoadingMessage(content);
        }
    }

    private async renderQuerySearchResults(
        tasks: Task[],
        state: State.Warm,
        content: HTMLDivElement,
        queryRendererParameters: QueryRendererParameters,
    ) {
        const queryResult = this.explainAndPerformSearch(state, tasks, content);

        if (queryResult.searchErrorMessage !== undefined) {
            // There was an error in the search, for example due to a problem custom function.
            this.renderErrorMessage(content, queryResult.searchErrorMessage);
            return;
        }

        await this.renderSearchResults(queryResult, content, queryRendererParameters);
    }

    private explainAndPerformSearch(state: State.Warm, tasks: Task[], content: HTMLDivElement) {
        const measureSearch = new PerformanceTracker(`Search: ${this.getters.query().queryId} - ${this.filePath}`);
        measureSearch.start();

        this.getters.query().debug(`[render] Render called: plugin state: ${state}; searching ${tasks.length} tasks`);

        if (this.getters.query().queryLayoutOptions.explainQuery) {
            this.createExplanation(content);
        }

        const queryResult = this.getters.query().applyQueryToTasks(tasks);

        measureSearch.finish();
        return queryResult;
    }

    private async renderSearchResults(
        queryResult: QueryResult,
        content: HTMLDivElement,
        queryRendererParameters: QueryRendererParameters,
    ) {
        const measureRender = new PerformanceTracker(`Render: ${this.getters.query().queryId} - ${this.filePath}`);
        measureRender.start();

        this.addCopyButton(content, queryResult);

        await this.addAllTaskGroups(queryResult.taskGroups, content, queryRendererParameters);

        const totalTasksCount = queryResult.totalTasksCount;
        this.addTaskCount(content, queryResult);

        this.getters.query().debug(`[render] ${totalTasksCount} tasks displayed`);

        measureRender.finish();
    }

    private renderErrorMessage(content: HTMLDivElement, errorMessage: string) {
        content.createDiv().innerHTML = '<pre>' + `Tasks query: ${errorMessage.replace(/\n/g, '<br>')}` + '</pre>';
    }

    private renderLoadingMessage(content: HTMLDivElement) {
        content.setText('Loading Tasks ...');
    }

    // Use the 'explain' instruction to enable this
    private createExplanation(content: HTMLDivElement) {
        const explanationAsString = explainResults(
            this.getters.source(),
            GlobalFilter.getInstance(),
            GlobalQuery.getInstance(),
            this.getters.tasksFile(),
        );

        const explanationsBlock = createAndAppendElement('pre', content);
        explanationsBlock.classList.add('plugin-tasks-query-explanation');
        explanationsBlock.setText(explanationAsString);
        content.appendChild(explanationsBlock);
    }

    private addCopyButton(content: HTMLDivElement, queryResult: QueryResult) {
        const copyButton = createAndAppendElement('button', content);
        copyButton.textContent = 'Copy results';
        copyButton.classList.add('plugin-tasks-copy-button');
        copyButton.addEventListener('click', async () => {
            await navigator.clipboard.writeText(queryResult.asMarkdown());
            new Notice('Results copied to clipboard');
        });
    }

    private async addAllTaskGroups(
        tasksSortedLimitedGrouped: TaskGroups,
        content: HTMLDivElement,
        queryRendererParameters: QueryRendererParameters,
    ) {
        for (const group of tasksSortedLimitedGrouped.groups) {
            // If there were no 'group by' instructions, group.groupHeadings
            // will be empty, and no headings will be added.
            await this.addGroupHeadings(content, group.groupHeadings);

            const renderedListItems: Set<ListItem> = new Set();
            await this.createTaskList(group.tasks, content, queryRendererParameters, renderedListItems);
        }
    }

    private async createTaskList(
        listItems: ListItem[],
        content: HTMLElement,
        queryRendererParameters: QueryRendererParameters,
        renderedListItems: Set<ListItem>,
    ): Promise<void> {
        const taskList = createAndAppendElement('ul', content);

        taskList.classList.add('contains-task-list', 'plugin-tasks-query-result');
        taskList.classList.add(...new TaskLayout(this.getters.query().taskLayoutOptions).generateHiddenClasses());
        taskList.classList.add(...new QueryLayout(this.getters.query().queryLayoutOptions).getHiddenClasses());

        const groupingAttribute = this.getGroupingAttribute();
        if (groupingAttribute && groupingAttribute.length > 0) taskList.dataset.taskGroupBy = groupingAttribute;

        const taskLineRenderer = new TaskLineRenderer({
            textRenderer: this.textRenderer,
            obsidianApp: this.obsidianApp,
            obsidianComponent: this.obsidianComponent,
            parentUlElement: taskList,
            taskLayoutOptions: this.getters.query().taskLayoutOptions,
            queryLayoutOptions: this.getters.query().queryLayoutOptions,
        });

        for (const [listItemIndex, listItem] of listItems.entries()) {
            if (this.getters.query().queryLayoutOptions.hideTree) {
                /* Old-style rendering of tasks:
                 *  - What is rendered:
                 *      - Only task lines that match the query are rendered, as a flat list
                 *  - The order that lines are rendered:
                 *      - Tasks are rendered in the order specified in 'sort by' instructions and default sort order.
                 */
                if (listItem instanceof Task) {
                    await this.addTask(taskList, taskLineRenderer, listItem, listItemIndex, queryRendererParameters);
                }
            } else {
                /* New-style rendering of tasks:
                 *  - What is rendered:
                 *      - Task lines that match the query are rendered, as a tree.
                 *      - Currently, all child tasks and list items of the found tasks are shown,
                 *        including any child tasks that did not match the query.
                 *  - The order that lines are rendered:
                 *      - The top-level/outermost tasks are sorted in the order specified in 'sort by'
                 *        instructions and default sort order.
                 *      - Child tasks (and list items) are shown in their original order in their Markdown file.
                 */
                await this.addTaskOrListItemAndChildren(
                    taskList,
                    taskLineRenderer,
                    listItem,
                    listItemIndex,
                    queryRendererParameters,
                    listItems,
                    renderedListItems,
                );
            }
        }

        content.appendChild(taskList);
    }

    private willBeRenderedLater(listItem: ListItem, renderedListItems: Set<ListItem>, listItems: ListItem[]) {
        const closestParentTask = listItem.findClosestParentTask();
        if (!closestParentTask) {
            return false;
        }

        if (!renderedListItems.has(closestParentTask)) {
            // This task is a direct or indirect child of another task that we are waiting to draw,
            // so don't draw it yet, it will be done recursively later.
            if (listItems.includes(closestParentTask)) {
                return true;
            }
        }

        return false;
    }

    private alreadyRendered(listItem: ListItem, renderedListItems: Set<ListItem>) {
        return renderedListItems.has(listItem);
    }

    private async addTaskOrListItemAndChildren(
        taskList: HTMLUListElement,
        taskLineRenderer: TaskLineRenderer,
        listItem: ListItem,
        taskIndex: number,
        queryRendererParameters: QueryRendererParameters,
        listItems: ListItem[],
        renderedListItems: Set<ListItem>,
    ) {
        if (this.alreadyRendered(listItem, renderedListItems)) {
            return;
        }

        if (this.willBeRenderedLater(listItem, renderedListItems, listItems)) {
            return;
        }

        const listItemElement = await this.addTaskOrListItem(
            taskList,
            taskLineRenderer,
            listItem,
            taskIndex,
            queryRendererParameters,
        );
        renderedListItems.add(listItem);

        if (listItem.children.length > 0) {
            await this.createTaskList(listItem.children, listItemElement, queryRendererParameters, renderedListItems);
            listItem.children.forEach((childTask) => {
                renderedListItems.add(childTask);
            });
        }
    }

    private async addTaskOrListItem(
        taskList: HTMLUListElement,
        taskLineRenderer: TaskLineRenderer,
        listItem: ListItem,
        taskIndex: number,
        queryRendererParameters: QueryRendererParameters,
    ) {
        if (listItem instanceof Task) {
            return await this.addTask(taskList, taskLineRenderer, listItem, taskIndex, queryRendererParameters);
        }

        return await this.addListItem(taskList, taskLineRenderer, listItem, taskIndex);
    }

    private async addListItem(
        taskList: HTMLUListElement,
        taskLineRenderer: TaskLineRenderer,
        listItem: ListItem,
        listItemIndex: number,
    ) {
        return await taskLineRenderer.renderListItem(taskList, listItem, listItemIndex);
    }

    private async addTask(
        taskList: HTMLUListElement,
        taskLineRenderer: TaskLineRenderer,
        task: Task,
        taskIndex: number,
        queryRendererParameters: QueryRendererParameters,
    ) {
        const isFilenameUnique = this.isFilenameUnique({ task }, queryRendererParameters.allMarkdownFiles);
        const listItem = await taskLineRenderer.renderTaskLine({
            task,
            taskIndex,
            isTaskInQueryFile: this.filePath === task.path,
            isFilenameUnique,
        });

        // Remove all footnotes. They don't re-appear in another document.
        const footnotes = listItem.querySelectorAll('[data-footnote-id]');
        footnotes.forEach((footnote) => footnote.remove());

        const extrasSpan = createAndAppendElement('span', listItem);
        extrasSpan.classList.add('task-extras');

        if (!this.getters.query().queryLayoutOptions.hideUrgency) {
            this.addUrgency(extrasSpan, task);
        }

        const shortMode = this.getters.query().queryLayoutOptions.shortMode;

        if (!this.getters.query().queryLayoutOptions.hideBacklinks) {
            this.addBacklinks(extrasSpan, task, shortMode, isFilenameUnique, queryRendererParameters);
        }

        if (!this.getters.query().queryLayoutOptions.hideEditButton) {
            this.addEditButton(extrasSpan, task, queryRendererParameters);
        }

        if (!this.getters.query().queryLayoutOptions.hidePostponeButton && shouldShowPostponeButton(task)) {
            this.addPostponeButton(extrasSpan, task, shortMode);
        }

        taskList.appendChild(listItem);

        return listItem;
    }

    private addEditButton(listItem: HTMLElement, task: Task, queryRendererParameters: QueryRendererParameters) {
        const editTaskPencil = createAndAppendElement('a', listItem);
        editTaskPencil.classList.add('tasks-edit');
        editTaskPencil.title = 'Edit task';
        editTaskPencil.href = '#';

        editTaskPencil.addEventListener('click', (event: MouseEvent) =>
            queryRendererParameters.editTaskPencilClickHandler(event, task, queryRendererParameters.allTasks),
        );
    }

    private addUrgency(listItem: HTMLElement, task: Task) {
        const text = new Intl.NumberFormat().format(task.urgency);
        const span = createAndAppendElement('span', listItem);
        span.textContent = text;
        span.classList.add('tasks-urgency');
    }

    /**
     * Display headings for a group of tasks.
     * @param content
     * @param groupHeadings - The headings to display. This can be an empty array,
     *                        in which case no headings will be added.
     * @private
     */
    private async addGroupHeadings(content: HTMLDivElement, groupHeadings: GroupDisplayHeading[]) {
        for (const heading of groupHeadings) {
            await this.addGroupHeading(content, heading);
        }
    }

    private async addGroupHeading(content: HTMLDivElement, group: GroupDisplayHeading) {
        // Headings nested to 2 or more levels are all displayed with 'h6:
        let header: keyof HTMLElementTagNameMap = 'h6';
        if (group.nestingLevel === 0) {
            header = 'h4';
        } else if (group.nestingLevel === 1) {
            header = 'h5';
        }

        const headerEl = createAndAppendElement(header, content);
        headerEl.classList.add('tasks-group-heading');

        if (this.obsidianComponent === null) {
            return;
        }
        await this.renderMarkdown(
            this.obsidianApp,
            group.displayName,
            headerEl,
            this.getters.tasksFile().path,
            this.obsidianComponent,
        );
    }

    private addBacklinks(
        listItem: HTMLElement,
        task: Task,
        shortMode: boolean,
        isFilenameUnique: boolean | undefined,
        queryRendererParameters: QueryRendererParameters,
    ) {
        const backLink = createAndAppendElement('span', listItem);
        backLink.classList.add('tasks-backlink');

        if (!shortMode) {
            backLink.append(' (');
        }

        const link = createAndAppendElement('a', backLink);

        link.rel = 'noopener';
        link.target = '_blank';
        link.classList.add('internal-link');
        if (shortMode) {
            link.classList.add('internal-link-short-mode');
        }

        let linkText: string;
        if (shortMode) {
            linkText = ' 🔗';
        } else {
            linkText = task.getLinkText({ isFilenameUnique }) ?? '';
        }

        link.text = linkText;

        // Go to the line the task is defined at
        link.addEventListener('click', async (ev: MouseEvent) => {
            await queryRendererParameters.backlinksClickHandler(ev, task);
        });

        link.addEventListener('mousedown', async (ev: MouseEvent) => {
            await queryRendererParameters.backlinksMousedownHandler(ev, task);
        });

        if (!shortMode) {
            backLink.append(')');
        }
    }
    private addPostponeButton(listItem: HTMLElement, task: Task, shortMode: boolean) {
        const amount = 1;
        const timeUnit = 'day';
        const buttonTooltipText = postponeButtonTitle(task, amount, timeUnit);

        const button = createAndAppendElement('a', listItem);
        button.classList.add('tasks-postpone');
        if (shortMode) {
            button.classList.add('tasks-postpone-short-mode');
        }
        button.title = buttonTooltipText;

        button.addEventListener('click', (ev: MouseEvent) => {
            ev.preventDefault(); // suppress the default click behavior
            ev.stopPropagation(); // suppress further event propagation
            PostponeMenu.postponeOnClickCallback(button, task, amount, timeUnit);
        });

        /** Open a context menu on right-click.
         */
        button.addEventListener('contextmenu', async (ev: MouseEvent) => {
            showMenu(ev, new PostponeMenu(button, task));
        });
    }

    private addTaskCount(content: HTMLDivElement, queryResult: QueryResult) {
        if (!this.getters.query().queryLayoutOptions.hideTaskCount) {
            const taskCount = createAndAppendElement('div', content);
            taskCount.classList.add('task-count');
            taskCount.textContent = queryResult.totalTasksCountDisplayText();
        }
    }

    private isFilenameUnique({ task }: { task: Task }, allMarkdownFiles: TFile[]): boolean | undefined {
        // Will match the filename without extension (the file's "basename").
        const filenameMatch = task.path.match(/([^/]*)\..+$/i);
        if (filenameMatch === null) {
            return undefined;
        }

        const filename = filenameMatch[1];
        const allFilesWithSameName = allMarkdownFiles.filter((file: TFile) => {
            if (file.basename === filename) {
                // Found a file with the same name (it might actually be the same file, but we'll take that into account later.)
                return true;
            }
        });

        return allFilesWithSameName.length < 2;
    }

    private getGroupingAttribute() {
        const groupingRules: string[] = [];
        for (const group of this.getters.query().grouping) {
            groupingRules.push(group.property);
        }
        return groupingRules.join(',');
    }
}
