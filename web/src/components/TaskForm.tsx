import { useState, type FormEvent } from 'react';
import {
  DEFAULT_PRIORITY,
  DEFAULT_STATUS,
  DESCRIPTION_MAX,
  TITLE_MAX,
  taskFormSchema,
  type TaskFormValues,
} from '@mwe/shared';
import { ApiError } from '../api/client';
import { PriorityChip, StatusChip } from './Chip';
import { Banner, Button, PriorityOptions, StatusOptions } from './ui';

interface TaskFormProps {
  mode: 'create' | 'edit';
  initial?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
}

type Errors = Partial<Record<keyof TaskFormValues, string>>;

/**
 * THE one form for both create and edit (no duplicated form logic).
 * Validation uses the same zod schema as the API, so the rules can never drift apart.
 */
export function TaskForm({ mode, initial, onSubmit, onCancel }: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    priority: initial?.priority ?? DEFAULT_PRIORITY,
    status: initial?.status ?? DEFAULT_STATUS,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const validate = (v: TaskFormValues): Errors => {
    const r = taskFormSchema.safeParse(v);
    if (r.success) return {};
    return Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
  };

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: validate(next)[key] })); // re-check a field once it showed an error
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) {
      document.getElementById(`field-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSubmit(taskFormSchema.parse(values));
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, 'INTERNAL', 'Could not save the task');
      setErrors(apiErr.fieldErrors()); // server-side 422 messages land on the right field
      setFormError(apiErr);
    } finally {
      setSaving(false);
    }
  };

  const fieldProps = (name: keyof TaskFormValues) => ({
    id: `field-${name}`,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `error-${name}` : undefined,
  });
  const fieldError = (name: keyof TaskFormValues) =>
    errors[name] && (
      <p className="field__error" id={`error-${name}`}>
        {errors[name]}
      </p>
    );

  return (
    <div className="form-layout">
    <form className="card form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <Banner tone="error">
          {formError.code === 'CONFLICT'
            ? 'Someone else changed this task while you were editing. Reload the page to see the latest version.'
            : formError.message}
        </Banner>
      )}

      <div className="field">
        <label htmlFor="field-title">
          Title <span className="field__req">(required)</span>
        </label>
        <input
          {...fieldProps('title')}
          value={values.title}
          maxLength={TITLE_MAX + 50}
          onChange={(e) => set('title', e.target.value)}
          autoFocus
        />
        {fieldError('title')}
      </div>

      <div className="field">
        <label htmlFor="field-description">Description</label>
        <textarea
          {...fieldProps('description')}
          rows={7}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
        />
        <p className="field__hint">
          {values.description.length} / {DESCRIPTION_MAX}
        </p>
        {fieldError('description')}
      </div>

      <div className="form__row">
        <div className="field">
          <label htmlFor="field-priority">Priority</label>
          <select {...fieldProps('priority')} value={values.priority} onChange={(e) => set('priority', e.target.value as TaskFormValues['priority'])}>
            <PriorityOptions />
          </select>
          {fieldError('priority')}
        </div>

        {/* New tasks always start in the default status (brief assumption); status is editable afterwards. */}
        {mode === 'edit' && (
          <div className="field">
            <label htmlFor="field-status">Status</label>
            <select {...fieldProps('status')} value={values.status} onChange={(e) => set('status', e.target.value as TaskFormValues['status'])}>
              <StatusOptions />
            </select>
            {fieldError('status')}
          </div>
        )}
      </div>

      <div className="form__actions">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {saving ? 'Saving…' : mode === 'create' ? 'Create task' : 'Save changes'}
        </Button>
      </div>
    </form>

    {/* Live preview: how the task will read in the list, from the same values the form submits. */}
    <aside className="form-aside" aria-label="Preview">
      <div className="card preview">
        <h2 className="preview__heading">Preview</h2>
        <p className="muted preview__hint">How it will look in the list.</p>
        <div className="preview__row">
          <p className={`preview__title ${values.title.trim() ? '' : 'muted'}`}>{values.title.trim() || 'Title'}</p>
          {values.description.trim() && <p className="preview__desc muted">{values.description.trim()}</p>}
          <div className="preview__chips">
            <StatusChip value={values.status} />
            <PriorityChip value={values.priority} />
          </div>
        </div>
      </div>
    </aside>
    </div>
  );
}
