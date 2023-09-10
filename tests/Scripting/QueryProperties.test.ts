import { expandPlaceholders } from '../../src/Scripting/ExpandPlaceholders';
import { makeQueryContext } from '../../src/lib/QueryContext';

import { MarkdownTable } from '../TestingTools/VerifyMarkdownTable';
import { addBackticks, determineExpressionType, formatToRepresentType } from './ScriptingTestHelpers';

describe('query', () => {
    function verifyFieldDataForReferenceDocs(fields: string[]) {
        const markdownTable = new MarkdownTable(['Field', 'Type', 'Example']);
        const path = 'root/sub-folder/file containing query.md';
        const queryContext = makeQueryContext(path);
        for (const field of fields) {
            const value1 = expandPlaceholders('{{' + field + '}}', queryContext);
            const cells = [
                addBackticks(field),
                addBackticks(determineExpressionType(value1)),
                addBackticks(formatToRepresentType(value1)),
            ];
            markdownTable.addRow(cells);
        }
        markdownTable.verifyForDocs();
    }

    it('file properties', () => {
        verifyFieldDataForReferenceDocs([
            'query.file.path',
            'query.file.root',
            'query.file.folder',
            'query.file.filename',
        ]);
    });
});