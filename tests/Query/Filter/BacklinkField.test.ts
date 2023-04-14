import { BacklinkField } from '../../../src/Query/Filter/BacklinkField';
import { fromLine } from '../../TestHelpers';

describe('backlink', () => {
    it('should provide the backlink', () => {
        const folderField = new BacklinkField();

        expect(folderField.value(fromLine({ line: '- [ ] do' }))).toStrictEqual('Unknown Location');
        expect(folderField.value(fromLine({ line: '- [ ] do', path: 'folder/file.md' }))).toStrictEqual('file');
        expect(folderField.value(fromLine({ line: '- [ ] do', path: 'a_b/_c_d_/_fi_le_.md' }))).toStrictEqual(
            '\\_fi\\_le\\_',
        );
        expect(
            folderField.value(fromLine({ line: '- [ ] do', path: 'file.md', precedingHeader: 'topic' })),
        ).toStrictEqual('file > topic');
        expect(
            folderField.value(fromLine({ line: '- [ ] do', path: 'fi_le.md', precedingHeader: 'topic _ita_' })),
        ).toStrictEqual('fi\\_le > topic _ita_');
    });
});

describe('grouping by backlink', () => {
    it('supports grouping methods correctly', () => {
        const field = new BacklinkField();
        expect(field.supportsGrouping()).toEqual(true);

        const fieldGrouper = field.createGrouper();
        expect(fieldGrouper.property).toEqual('backlink');
    });

    it.each([
        // no location supplied
        [undefined, 'heading', ['Unknown Location']],

        // no heading supplied
        ['a/b/c.md', undefined, ['c']],

        ['a/b/c.md', 'heading', ['c > heading']],
        // If file name and heading are identical, avoid duplication ('c > c')
        ['a/b/c.md', 'c', ['c']],
        // underscores in file name component are escaped
        // but underscores in the heading component are not
        ['a/b/_c_.md', 'heading _italic text_', ['\\_c\\_ > heading _italic text_']],
    ])(
        'task "%s" with path "%s" should have groups: %s',
        (path: string | undefined, heading: string | undefined, groups: string[]) => {
            // Arrange
            const grouper = new BacklinkField().createGrouper().grouper;
            const t = '- [ ] xyz';

            // Assert
            expect(grouper(fromLine({ line: t, path: path, precedingHeader: heading }))).toEqual(groups);
        },
    );
});
