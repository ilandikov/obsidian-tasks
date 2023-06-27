/**
 * Various rendering options for a query.
 * See applyOptions below when adding options here.
 */
export class LayoutOptions {
    shortMode: boolean = false;
    explainQuery: boolean = false;
    hideOptions: HideOptions = new HideOptions();

    constructor(partialOptions?: Partial<LayoutOptions>) {
        if (partialOptions) {
            Object.assign(this, partialOptions);
        }
    }
}

export class HideOptions {
    taskCount: boolean = false;
    backlinks: boolean = false;
    priority: boolean = false;
    createdDate: boolean = false;
    startDate: boolean = false;
    scheduledDate: boolean = false;
    doneDate: boolean = false;
    dueDate: boolean = false;
    recurrenceRule: boolean = false;
    editButton: boolean = false;
    urgency: boolean = true;

    constructor(partialOptions?: Partial<HideOptions>) {
        if (partialOptions) {
            Object.assign(this, partialOptions);
        }
    }
}

export type TaskLayoutComponent =
    | 'description'
    | 'priority'
    | 'recurrenceRule'
    | 'createdDate'
    | 'startDate'
    | 'scheduledDate'
    | 'dueDate'
    | 'doneDate'
    | 'blockLink';

/**
 * This represents the desired layout of tasks when they are rendered in a given configuration.
 * The layout is used when flattening the task to a string and when rendering queries, and can be
 * modified by applying {@link LayoutOptions} objects.
 */
export class TaskLayout {
    public defaultLayout: TaskLayoutComponent[] = [
        'description',
        'priority',
        'recurrenceRule',
        'createdDate',
        'startDate',
        'scheduledDate',
        'dueDate',
        'doneDate',
        'blockLink',
    ];
    public layoutComponents: TaskLayoutComponent[];
    public hiddenComponents: TaskLayoutComponent[] = [];
    public options: LayoutOptions;
    public specificClasses: string[] = [];

    constructor(options?: LayoutOptions, components?: TaskLayoutComponent[]) {
        if (options) {
            this.options = options;
        } else {
            this.options = new LayoutOptions();
        }
        if (components) {
            this.layoutComponents = components;
        } else {
            this.layoutComponents = this.defaultLayout;
        }
        this.layoutComponents = this.applyOptions(this.options);
    }

    /**
     * Return a new list of components with the given options applied.
     */
    applyOptions(layoutOptions: LayoutOptions): TaskLayoutComponent[] {
        // Remove a component from the taskComponents array if the given layoutOption criteria is met,
        // and add to the layout's specific classes list the class that denotes that this component
        // isn't in the layout
        const removeIf = (
            taskComponents: TaskLayoutComponent[],
            shouldRemove: boolean,
            componentToRemove: TaskLayoutComponent,
        ) => {
            if (shouldRemove) {
                this.specificClasses.push(`tasks-layout-hide-${componentToRemove}`);
                this.hiddenComponents.push(componentToRemove);
                return taskComponents.filter((element) => element != componentToRemove);
            } else {
                return taskComponents;
            }
        };
        const markHiddenQueryComponent = (hidden: boolean, hiddenComponentName: string) => {
            if (hidden) {
                this.specificClasses.push(`tasks-layout-hide-${hiddenComponentName}`);
            }
        };
        // Remove components from the layout according to the task options. These represent the existing task options,
        // so some components (e.g. the description) are not here because there are no layout options to remove them.
        let newComponents = this.layoutComponents;
        newComponents = removeIf(newComponents, layoutOptions.hideOptions.priority, 'priority');
        newComponents = removeIf(newComponents, layoutOptions.hideOptions.recurrenceRule, 'recurrenceRule');
        newComponents = removeIf(newComponents, layoutOptions.hideOptions.createdDate, 'createdDate');
        newComponents = removeIf(newComponents, layoutOptions.hideOptions.startDate, 'startDate');
        newComponents = removeIf(newComponents, layoutOptions.hideOptions.scheduledDate, 'scheduledDate');
        newComponents = removeIf(newComponents, layoutOptions.hideOptions.dueDate, 'dueDate');
        newComponents = removeIf(newComponents, layoutOptions.hideOptions.doneDate, 'doneDate');
        // The following components are handled in QueryRenderer.ts and thus are not part of the same flow that
        // hides TaskLayoutComponent items. However, we still want to have 'tasks-layout-hide' items for them
        // (see https://github.com/obsidian-tasks-group/obsidian-tasks/issues/1866).
        // This can benefit from some refactoring, i.e. render these components in a similar flow rather than
        // separately.
        markHiddenQueryComponent(layoutOptions.hideOptions.urgency, 'urgency');
        markHiddenQueryComponent(layoutOptions.hideOptions.backlinks, 'backlinks');
        markHiddenQueryComponent(layoutOptions.hideOptions.editButton, 'edit-button');
        if (layoutOptions.shortMode) this.specificClasses.push('tasks-layout-short-mode');
        return newComponents;
    }
}
