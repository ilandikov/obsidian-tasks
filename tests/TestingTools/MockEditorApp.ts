import type { App } from 'obsidian';

/** Minimal editor host for modal tests; it does not emulate CodeMirror or Markdown rendering. */
export function createMockEditorApp(): App {
    class MockMarkdownEditor {
        _loaded = true;
        editorEl: HTMLElement;
        private cleanups: (() => void)[] = [];

        constructor(
            public app: App,
            public containerEl: HTMLElement,
            public owner: object,
        ) {
            this.editorEl = containerEl.appendChild(this.activeCM.contentDOM);
        }

        activeCM = {
            get hasFocus() {
                return document.activeElement === this.contentDOM;
            },
            contentDOM: document.createElement('div'),
            dispatch: () => {},
            state: { doc: { toString: () => this.get() } },
        };

        editor = { cm: this.activeCM, setCursor: () => {} };

        get() {
            return this.activeCM.contentDOM.textContent ?? '';
        }

        set(value: string, _clearHistory: boolean) {
            this.activeCM.contentDOM.textContent = value;
        }

        register(cleanup: () => void) {
            this.cleanups.push(cleanup);
        }

        unload() {
            this._loaded = false;
            this.cleanups.splice(0).forEach((cleanup) => cleanup());
            this.onunload();
        }

        onunload() {}
        destroy() {}
    }

    // The resolver walks two prototype levels to find the shared editor base class.
    class MockScrollableMarkdownEditor extends MockMarkdownEditor {}

    return {
        scope: {},
        keymap: { pushScope: () => {}, popScope: () => {} },
        workspace: { activeEditor: null, setActiveLeaf: () => {} },
        embedRegistry: {
            embedByExtension: {
                md: ({ app, containerEl }: { app: App; containerEl: HTMLElement }) => ({
                    editable: false,
                    editMode: undefined as MockScrollableMarkdownEditor | undefined,
                    showEditor() {
                        this.editMode = new MockScrollableMarkdownEditor(app, containerEl, {});
                    },
                    unload() {
                        this.editMode?.unload();
                    },
                }),
            },
        },
    } as unknown as App;
}
