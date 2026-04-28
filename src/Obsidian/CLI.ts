import type TasksPlugin from '../main';
import { Query } from '../Query/Query';
import type { Task } from '../Task/Task';

export function registerCLIHandlers(plugin: TasksPlugin): void {
    plugin.registerCliHandler(
        'tasks-plugin:query',
        '',
        { source: { value: '<instructions>', description: 'Search instructions', required: true } },
        (cliData) => {
            const source = cliData.source;
            const tasks = plugin.getTasks();
            return cliSearch(source, tasks);
        },
    );
}

export function cliSearch(source: string, tasks: Task[]): string {
    const queryResult = new Query(source).applyQueryToTasks(tasks);
    return queryResult.asMarkdown();
}
