<script lang="ts">
    import type { App } from 'obsidian';
    import { onMount } from 'svelte';
    import { EmbeddableMarkdownEditor } from './EmbeddableMarkdownEditor';
    import { defaultEditModalShowSettings } from '../Config/EditModalShowSettings';

    import { TASK_FORMATS, getSettings } from '../Config/Settings';
    import type { Status } from '../Statuses/Status';
    import type { Task } from '../Task/Task';
    import { settingsStore } from './SettingsStore';
    import DateEditor from './DateEditor.svelte';
    import Dependency from './Dependency.svelte';
    import { EditableTask } from './EditableTask';
    import { labelContentWithAccessKey } from './EditTaskHelpers';
    import PriorityEditor from './PriorityEditor.svelte';
    import RecurrenceEditor from './RecurrenceEditor.svelte';
    import StatusEditor from './StatusEditor.svelte';

    // These exported variables are passed in as props by TaskModal.onOpen():
    export let task: Task;
    export let onSubmit: (updatedTasks: Task[]) => void | Promise<void>;
    export let statusOptions: Status[];
    export let allTasks: Task[];
    export let app: App;

    const {
        // NEW_TASK_FIELD_EDIT_REQUIRED
        startDateSymbol,
        scheduledDateSymbol,
        dueDateSymbol,
        cancelledDateSymbol,
        createdDateSymbol,
        doneDateSymbol,
    } = TASK_FORMATS.tasksPluginEmoji.taskSerializer.symbols;

    let mdEditorElement: HTMLDivElement;
    let mdEditor: EmbeddableMarkdownEditor;

    let editableTask = EditableTask.fromTask(task, allTasks);

    let isDescriptionValid: boolean = true;

    let isCancelledDateValid: boolean = true;
    let isCreatedDateValid: boolean = true;
    let isDoneDateValid: boolean = true;
    let isDueDateValid: boolean = true;
    let isScheduledDateValid: boolean = true;
    let isStartDateValid: boolean = true;

    let isRecurrenceValid: boolean = true;

    let withAccessKeys: boolean = true;
    let formIsValid: boolean = true;

    let mountComplete = false;

    $: accesskey = (key: string) => (withAccessKeys ? key : null);
    $: formIsValid =
        isDueDateValid &&
        isRecurrenceValid &&
        isScheduledDateValid &&
        isStartDateValid &&
        isDescriptionValid &&
        isCancelledDateValid &&
        isCreatedDateValid &&
        isDoneDateValid;
    $: isDescriptionValid = editableTask.description.trim() !== '';

    $: isShownInEditModal = { ...defaultEditModalShowSettings, ...$settingsStore.isShownInEditModal };
    $: fieldGroups = $settingsStore.editModalFieldOrder;

    onMount(() => {
        settingsStore.set(getSettings());

        const { provideAccessKeys } = getSettings();
        withAccessKeys = provideAccessKeys;

        mountComplete = true;
        _initEditor().then(() => _focusEditor());

        // Put the cursor in the Description field, ready to type. On a phone this has to wait for
        // the modal to finish sliding up first, or the keyboard drags the form down with it
        // TODO reinstate this or write alternative or prove that this is not needed
        // focusOnceClearOfKeyboard(descriptionInput);
    });

    const _initEditor = async () => {
        mdEditor = new EmbeddableMarkdownEditor(app, mdEditorElement, {
            value: `${editableTask.description}`,
            placeholder: 'Take out the trash',
            onEnter: () => {
                _onSubmit();
                return true;
            },
            onChange: (update) => {
                if (!update.docChanged) return;
                // NOTE: this causes undo to break because it replaces the last change
                // but also causes a change thereby popping and pushing an event.
                _removeLinebreaksFromDescription();
                // _preventHeadingFormatting();
                return true;
            },
            onEscape: () => _onClose(),
        });
        // set the cursor to the final character on intial load
        mdEditor.editor?.setCursor(mdEditor.get().length);
    };

    const _focusEditor = () => {
        setTimeout(() => {
            mdEditorElement.focus();
        }, 0);
    };

    const _onClose = () => {
        mdEditor.destroy();
        onSubmit([]);
    };

    const _onDescriptionKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.isComposing) {
            e.preventDefault();
            if (formIsValid) _onSubmit();
        }
    };

    // Prevents newlines
    // If a newline is detected, we remove it by regex search and replace
    const _removeLinebreaksFromDescription = () => {
        // detect whether there are any break line characters
        if (mdEditor.get().match(/[\r\n]+/g)) {
            // wrapped into a timer to run after a paste/drop/insert
            setTimeout(() => {
                mdEditor.set(mdEditor.get().replace(/[\r\n]+/g, ' '), false);
            }, 0);
        }
    };

    // Prevents heading rendering by detecting if single line content starts with any valid markdown heading followed by a space. If so, removes the space.
    // Visually this looks like you are not allowed to type a space after a `#`.
    // const _preventHeadingFormatting = () => {
    //     // regex matches between 1 and 6 leading `#` symbols followed by a space
    //     if (mdEditor.get().match(/^(#{1,6})\s/)) {
    //         mdEditor.set(mdEditor.get().replace(/^(#{1,6})\s/, '$1'), false);
    //     }
    // };

    const _onSubmit = async () => {
        editableTask.description = mdEditor.get();
        const newTasks = await editableTask.applyEdits(task, allTasks);
        onSubmit(newTasks);
    };
</script>

<!--
Availability of access keys:
- A: Start
- B: Before this
- C: Created
- D: Due
- E: After this
- F: Only future dates
- G:
- H: High
- I: Highest
- J:
- K:
- L: Low
- M: Medium
- N: Normal
- O: Lowest
- P:
- Q:
- R: Recurs
- S: Scheduled
- T: Description
- U: Status
- V:
- W:
- X: Done
- Y:
- Z:
- -: Cancelled
-->

<form class="tasks-modal" on:submit|preventDefault={_onSubmit}>
    <!-- NEW_TASK_FIELD_EDIT_REQUIRED -->

    <!-- --------------------------------------------------------------------------- -->
    <!--  Description  -->
    <!-- --------------------------------------------------------------------------- -->
    <section class="tasks-modal-description-section">
        <label for="description">{@html labelContentWithAccessKey('Description', accesskey('t'))}</label>
        <!-- svelte-ignore a11y-accesskey -->
        <div class="outer-div" bind:this={mdEditorElement} accesskey={accesskey('t')}></div>
    </section>

    <!--
    The groups below, and the fields within each group, are rendered in the order
    chosen by the user in OptionsModal. Rendering them in that order (rather than
    reordering them with CSS) keeps the Tab order the same as the visual order.
    -->
    {#each fieldGroups as group, groupIndex (group)}
        {@const isLastGroup = groupIndex === fieldGroups.length - 1}
        {#if group.includes('priority')}
            <!-- --------------------------------------------------------------------------- -->
            <!--  Priority  -->
            <!-- --------------------------------------------------------------------------- -->
            {#if isShownInEditModal.priority}
                <section class="tasks-modal-priority-section">
                    <PriorityEditor bind:priority={editableTask.priority} {withAccessKeys} />
                </section>
                {#if !isLastGroup}
                    <hr/>
                {/if}
            {/if}
        {:else if group.includes('recurrence')}
            <!-- --------------------------------------------------------------------------- -->
            <!--  Dates  -->
            <!-- --------------------------------------------------------------------------- -->
            <section class="tasks-modal-dates-section">
                {#each group as field (field)}
                    {#if isShownInEditModal[field]}
                        {#if field === 'recurrence'}
                            <!-- --------------------------------------------------------------------------- -->
                            <!--  Recurrence  -->
                            <!-- --------------------------------------------------------------------------- -->
                            <RecurrenceEditor {editableTask} bind:isRecurrenceValid accesskey={accesskey('r')} />
                        {:else if field === 'due'}
                            <!-- --------------------------------------------------------------------------- -->
                            <!--  Due Date  -->
                            <!-- --------------------------------------------------------------------------- -->
                            <DateEditor
                                id="due"
                                dateSymbol={dueDateSymbol}
                                bind:date={editableTask.dueDate}
                                bind:isDateValid={isDueDateValid}
                                forwardOnly={editableTask.forwardOnly}
                                accesskey={accesskey('d')}
                            />
                        {:else if field === 'scheduled'}
                            <!-- --------------------------------------------------------------------------- -->
                            <!--  Scheduled Date  -->
                            <!-- --------------------------------------------------------------------------- -->
                            <DateEditor
                                id="scheduled"
                                dateSymbol={scheduledDateSymbol}
                                bind:date={editableTask.scheduledDate}
                                bind:isDateValid={isScheduledDateValid}
                                forwardOnly={editableTask.forwardOnly}
                                accesskey={accesskey('s')}
                            />
                        {:else if field === 'start'}
                            <!-- --------------------------------------------------------------------------- -->
                            <!--  Start Date  -->
                            <!-- --------------------------------------------------------------------------- -->
                            <DateEditor
                                id="start"
                                dateSymbol={startDateSymbol}
                                bind:date={editableTask.startDate}
                                bind:isDateValid={isStartDateValid}
                                forwardOnly={editableTask.forwardOnly}
                                accesskey={accesskey('a')}
                            />
                        {/if}
                    {/if}
                {/each}

                <!-- --------------------------------------------------------------------------- -->
                <!--  Only future dates  -->
                <!-- --------------------------------------------------------------------------- -->
                {#if isShownInEditModal.due || isShownInEditModal.scheduled || isShownInEditModal.start}
                    <div class="future-dates-only" id="only-future-dates">
                        <label for="forwardOnly"
                            >{@html labelContentWithAccessKey('Only future dates:', accesskey('f'))}</label
                        >
                        <!-- svelte-ignore a11y-accesskey -->
                        <input
                            bind:checked={editableTask.forwardOnly}
                            id="forwardOnly"
                            type="checkbox"
                            class="task-list-item-checkbox tasks-modal-checkbox"
                            accesskey={accesskey('f')}
                        />
                    </div>
                {/if}
            </section>
            {#if !isLastGroup && (isShownInEditModal.due || isShownInEditModal.scheduled || isShownInEditModal.start)}
                <hr/>
            {/if}
        {:else if group.includes('before_this')}
            <!-- --------------------------------------------------------------------------- -->
            <!--  Dependencies  -->
            <!-- --------------------------------------------------------------------------- -->
            <section class="tasks-modal-dependencies-section">
                {#if allTasks.length > 0 && mountComplete}
                    {#each group as field (field)}
                        {#if isShownInEditModal[field]}
                            {#if field === 'before_this'}
                                <!-- --------------------------------------------------------------------------- -->
                                <!--  Blocked By Tasks  -->
                                <!-- --------------------------------------------------------------------------- -->
                                <Dependency
                                    id="before_this"
                                    type="blockedBy"
                                    labelText="Before this"
                                    {task}
                                    {editableTask}
                                    {allTasks}
                                    {_onDescriptionKeyDown}
                                    accesskey={accesskey('b')}
                                    placeholder="Search for tasks that the task being edited depends on..."
                                />
                            {:else if field === 'after_this'}
                                <!-- --------------------------------------------------------------------------- -->
                                <!--  Blocking Tasks  -->
                                <!-- --------------------------------------------------------------------------- -->
                                <Dependency
                                    id="after_this"
                                    type="blocking"
                                    labelText="After this"
                                    {task}
                                    {editableTask}
                                    {allTasks}
                                    {_onDescriptionKeyDown}
                                    accesskey={accesskey('e')}
                                    placeholder="Search for tasks that depend on this task being done..."
                                />
                            {/if}
                        {/if}
                    {/each}
                {:else}
                    <div><i>Blocking and blocked by fields are disabled when vault tasks is empty</i></div>
                {/if}
            </section>
            {#if !isLastGroup && (isShownInEditModal.before_this || isShownInEditModal.after_this)}
                <hr/>
            {/if}
        {:else if group.includes('status')}
            <section class="tasks-modal-dates-section">
                {#each group as field (field)}
                    {#if isShownInEditModal[field]}
                        {#if field === 'status'}
                            <!-- --------------------------------------------------------------------------- -->
                            <!--  Status  -->
                            <!-- --------------------------------------------------------------------------- -->
                            <StatusEditor {task} bind:editableTask {statusOptions} accesskey={accesskey('u')} />
                        {:else if field === 'created'}
                            <!-- --------------------------------------------------------------------------- -->
                            <!--  Created Date  -->
                            <!-- --------------------------------------------------------------------------- -->
                            <DateEditor
                                id="created"
                                dateSymbol={createdDateSymbol}
                                bind:date={editableTask.createdDate}
                                bind:isDateValid={isCreatedDateValid}
                                forwardOnly={editableTask.forwardOnly}
                                accesskey={accesskey('c')}
                            />
                        {:else if field === 'done'}
                            <!-- --------------------------------------------------------------------------- -->
                            <!--  Done Date  -->
                            <!-- --------------------------------------------------------------------------- -->
                            <DateEditor
                                id="done"
                                dateSymbol={doneDateSymbol}
                                bind:date={editableTask.doneDate}
                                bind:isDateValid={isDoneDateValid}
                                forwardOnly={editableTask.forwardOnly}
                                accesskey={accesskey('x')}
                            />
                        {:else if field === 'cancelled'}
                            <!-- --------------------------------------------------------------------------- -->
                            <!--  Cancelled Date  -->
                            <!-- --------------------------------------------------------------------------- -->
                            <DateEditor
                                id="cancelled"
                                dateSymbol={cancelledDateSymbol}
                                bind:date={editableTask.cancelledDate}
                                bind:isDateValid={isCancelledDateValid}
                                forwardOnly={editableTask.forwardOnly}
                                accesskey={accesskey('-')}
                            />
                        {/if}
                    {/if}
                {/each}
            </section>
            {#if !isLastGroup && (isShownInEditModal.status || isShownInEditModal.created || isShownInEditModal.done || isShownInEditModal.cancelled)}
                <hr/>
            {/if}
        {/if}
    {/each}

    <!--
    The 'mousedown|preventDefault' below stops these buttons needing to be tapped
    twice on mobile.

    While a field has focus, TaskModal.scss adds up to 360px of padding below the
    modal content, so that the sticky button bar can be scrolled clear of the
    software keyboard. WebKit does not give a <button> focus when it is tapped, but
    it does blur the focused text field - so tapping Apply removes that padding
    mid-tap and moves the button bar by several hundred pixels. The button is then no
    longer under the finger, and the browser delivers the click to the <form> rather
    than to the button, making the first tap appear to do nothing.

    Cancelling the default action of 'mousedown' leaves focus where it is, so the
    padding stays and the buttons do not move while they are being tapped. It does
    not affect the click itself, nor keyboard activation.
    -->
    <section class="tasks-modal-button-section">
        <button disabled={!formIsValid} type="submit" class="mod-cta" on:mousedown|preventDefault>Apply </button>
        <button type="button" on:click={_onClose} on:mousedown|preventDefault>Cancel</button>
    </section>
</form>
