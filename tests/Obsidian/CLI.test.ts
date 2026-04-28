import { cliSearch } from '../../src/Obsidian/CLI';
import { TaskBuilder } from '../TestingTools/TaskBuilder';

describe('CLI search', () => {
    it('should execute empty query', () => {
        const tasks = [new TaskBuilder().build()];
        const query = '';

        expect(cliSearch(query, tasks)).toMatchInlineSnapshot(`
            "
            - [ ] my description
            "
        `);
    });

    it('should execute description search', () => {
        const tasks = [
            new TaskBuilder().description('find me').build(),
            new TaskBuilder().description('but not me').build(),
        ];
        const query = 'description includes find';

        expect(cliSearch(query, tasks)).toMatchInlineSnapshot(`
            "
            - [ ] find me
            "
        `);
    });
});
