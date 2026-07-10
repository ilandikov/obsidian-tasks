import type { App } from 'obsidian';
import { GlobalQuery } from '../../src/Config/GlobalQuery';
import { State } from '../../src/Obsidian/Cache';
import type { FilterOrErrorMessage } from '../../src/Query/Filter/FilterOrErrorMessage';
import { Query } from '../../src/Query/Query';
import { getQueryForQueryRenderer } from '../../src/Query/QueryRendererHelper';
import {
    type HTMLQueryRendererParameters,
    HtmlQueryResultsRenderer,
} from '../../src/Renderer/HtmlQueryResultsRenderer';
import { MarkdownQueryResultsRenderer } from '../../src/Renderer/MarkdownQueryResultsRenderer';
import type { TasksFile } from '../../src/Scripting/TasksFile';
import type { Task } from '../../src/Task/Task';
import { mockApp } from '../__mocks__/obsidian';
import { verifyWithFileExtension } from '../TestingTools/ApprovalTestHelpers';
import { prettifyHTML } from '../TestingTools/HTMLHelpers';
import { createTestTasksFile } from '../TestingTools/TasksFileHelpers';
import { toMarkdown } from '../TestingTools/TestHelpers';

export const mockHTMLRenderer = async (_obsidianApp: App, text: string, element: HTMLSpanElement, _path: string) => {
    // Contrary to the default mockTextRenderer(),
    // instead of the rendered HTMLSpanElement.innerText,
    // we need the plain HTML here like in TaskLineRenderer.renderComponentText(),
    // to ensure that description and tags are retained.
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    while (doc.body.firstChild) {
        element.appendChild(doc.body.firstChild);
    }
};

export const mockTextRenderer = async (_obsidianApp: App, text: string, element: HTMLSpanElement, _path: string) => {
    element.innerText = text;
};

export function makeHtmlQueryRendererParameters(allTasks: Task[]): HTMLQueryRendererParameters {
    return {
        allTasks: () => allTasks,
        allMarkdownFiles: () => [],
        backlinksClickHandler: () => Promise.resolve(),
        backlinksMousedownHandler: () => Promise.resolve(),
        editTaskPencilClickHandler: () => {},
    };
}

export function createMarkdownRenderer(source: string) {
    const tasksFile = createTestTasksFile('query.md');
    const query = new Query(source, tasksFile);

    const renderer = new MarkdownQueryResultsRenderer(source, tasksFile, query);
    return { renderer, query };
}

export async function renderMarkdown(source: string, tasks: Task[]) {
    const { renderer, query } = createMarkdownRenderer(source);
    const queryResult = query.applyQueryToTasks(tasks);
    await renderer.renderQuery(State.Warm, queryResult);
    return {
        markdown: '\n' + renderer.markdown,
        queryResult,
        rerenderWithFilter: async (filter: FilterOrErrorMessage) => {
            expect(filter).toBeValid();

            const filteredResult = queryResult.applyFilter(filter.filter!);
            await renderer.renderQuery(State.Warm, filteredResult);
            return { filteredMarkdown: '\n' + renderer.markdown };
        },
    };
}

export function tasksMarkdownAndPrettifiedHtml(container: HTMLDivElement, allTasks: Task[]) {
    const tasksAsMarkdown = `<!--
${toMarkdown(allTasks)}
-->\n\n`;

    const prettyHTML = prettifyHTML(container.outerHTML);
    return { tasksAsMarkdown, prettyHTML };
}

export function verifyRenderedTasks(container: HTMLDivElement, allTasks: Task[]): void {
    const { tasksAsMarkdown, prettyHTML } = tasksMarkdownAndPrettifiedHtml(container, allTasks);
    verifyWithFileExtension(tasksAsMarkdown + prettyHTML, 'html');
}

export function makeHtmlRenderer(source: string, tasksFile: TasksFile, allTasks: Task[]) {
    const query = getQueryForQueryRenderer(source, GlobalQuery.getInstance(), tasksFile);

    const renderer = new HtmlQueryResultsRenderer(
        () => Promise.resolve(),
        null,
        mockApp,
        mockHTMLRenderer,
        makeHtmlQueryRendererParameters(allTasks),
        source,
        tasksFile,
        query,
    );
    return { query, renderer };
}
