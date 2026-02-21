/**
 * Form-related types for handling form state and validation
 */

export interface FormField<T = any> {
  name: string;
  label: string;
  type: FormFieldType;
  value?: T;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  validation?: Validation;
  options?: FormOption[];
  rows?: number;
  pattern?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export type FormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'tel'
  | 'number'
  | 'date'
  | 'datetime-local'
  | 'time'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'file'
  | 'hidden';

export interface FormOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface Validation {
  required?: boolean | string;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: (value: any) => boolean | string;
}

export interface FormError {
  field: string;
  message: string;
  type?: 'required' | 'pattern' | 'minLength' | 'maxLength' | 'custom';
}

export interface FormState<T = any> {
  values: T;
  errors: FormError[];
  touched: Record<string, boolean>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
}

export interface FormActions<T = any> {
  setFieldValue: (field: string, value: any) => void;
  setFieldError: (field: string, error: string) => void;
  setFieldTouched: (field: string, touched: boolean) => void;
  setValues: (values: Partial<T>) => void;
  resetForm: () => void;
  submitForm: () => Promise<void>;
}

export interface FormConfig<T = any> {
  initialValues: T;
  fields: FormField[];
  onSubmit: (values: T) => Promise<void>;
  validate?: (values: T) => FormError[];
}

export interface FormSubmission {
  isSubmitting: boolean;
  error?: string;
  success: boolean;
  message?: string;
}
